import { ArrowRight, BookOpen, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import {
  academyApi,
  type AcademyPlanId,
  type AcademySubscriptionSummary,
  type Program,
} from '../api/academy-api';
import { Modal } from '../components/modal';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import backgroundImage from '../asset/background.jpg';
import socket from '../utils/socket';

const ACADEMY_PLANS = [
  {
    id: 'test',
    name: 'Test',
    durationDays: 1,
    price: 100,
    description: 'Quick verification plan for checkout and payment flow testing.',
  },
  {
    id: 'weekly',
    name: 'Weekly',
    durationDays: 7,
    price: 2000,
    description: 'Short sprint for focused revision and fast starts.',
  },
  {
    id: 'monthly',
    name: 'Monthly',
    durationDays: 30,
    price: 5000,
    description: 'The balanced option for consistent learning and practice.',
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    durationDays: 90,
    price: 10000,
    description: 'Longer runway for deeper progress across your selected courses.',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    durationDays: 365,
    price: 30000,
    description: 'Best value for extended access and uninterrupted momentum.',
  },
] as const satisfies Array<{
  id: Exclude<AcademyPlanId, 'trial'>;
  name: string;
  durationDays: number;
  price: number;
  description: string;
}>;

type PurchasableAcademyPlan = (typeof ACADEMY_PLANS)[number];

function programCardImage(program: Program) {
  const thumbnail = program.thumbnail?.trim();
  return thumbnail ? thumbnail : backgroundImage;
}

function isPurchasablePlanId(value: string | null): value is PurchasableAcademyPlan['id'] {
  return ACADEMY_PLANS.some((plan) => plan.id === value);
}

function formatPlanName(planCode: AcademyPlanId) {
  if (planCode === 'trial') {
    return 'Trial';
  }
  return ACADEMY_PLANS.find((plan) => plan.id === planCode)?.name ?? planCode;
}

function formatExpiry(value: string | null) {
  if (!value) {
    return 'No end date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function PublicAcademyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const auth = useAuth();

  const requestedPlanId = searchParams.get('plan');
  const defaultPlan = ACADEMY_PLANS.find((plan) => plan.id === 'monthly') ?? ACADEMY_PLANS[0];
  const [selectedPlan, setSelectedPlan] = useState<PurchasableAcademyPlan>(
    ACADEMY_PLANS.find((plan) => plan.id === requestedPlanId) ?? defaultPlan,
  );
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [paypackRef, setPaypackRef] = useState<string | null>(null);

  const highlightProgramId = useMemo(() => {
    const state = location.state as { highlightProgramId?: string } | null | undefined;
    return state?.highlightProgramId;
  }, [location.state]);

  const isPublicLearner = auth.me?.roles.includes('PUBLIC_LEARNER') ?? false;

  useEffect(() => {
    if (!isPurchasablePlanId(requestedPlanId)) {
      return;
    }
    const match = ACADEMY_PLANS.find((plan) => plan.id === requestedPlanId);
    if (match) {
      setSelectedPlan(match);
    }
  }, [requestedPlanId]);

  const programsQuery = useQuery({
    queryKey: ['academy-programs'],
    queryFn: academyApi.getPrograms,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['academy-subscription-summary'],
    queryFn: academyApi.getSubscriptionSummary,
    enabled: Boolean(auth.me && isPublicLearner),
  });

  const selectMutation = useMutation({
    mutationFn: (programId: string) => academyApi.selectProgram(programId),
    onSuccess: (data) => {
      queryClient.setQueryData(['academy-subscription-summary'], data);
      void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
      showToast({ type: 'success', title: 'Course added', message: 'This course is now part of your active plan.' });
    },
    onError: (error: any) => {
      showToast({ type: 'error', title: 'Could not add course', message: error.message });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (programId: string) => academyApi.removeProgram(programId),
    onSuccess: (data) => {
      queryClient.setQueryData(['academy-subscription-summary'], data);
      void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
      showToast({ type: 'success', title: 'Course removed', message: 'You now have a free slot to choose another course.' });
    },
    onError: (error: any) => {
      showToast({ type: 'error', title: 'Could not remove course', message: error.message });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload: { planId: PurchasableAcademyPlan['id']; phoneNumber: string }) =>
      academyApi.startPlanCheckout(payload),
    onSuccess: (data) => {
      setPaypackRef(data.paypackRef);
      setPaymentStatus('PENDING');
      showToast({ type: 'info', title: 'Payment initiated', message: data.message });
    },
    onError: (error: any) => {
      setPaymentStatus('FAILED');
      showToast({ type: 'error', title: 'Checkout failed', message: error.message });
    },
  });

  useEffect(() => {
    if (!paypackRef) {
      return;
    }

    socket.emit('joinTransaction', { transactionId: paypackRef });

    const handleUpdate = (data: { status: string }) => {
      if (data.status === 'COMPLETED') {
        setPaymentStatus('SUCCESS');
        void queryClient.invalidateQueries({ queryKey: ['academy-subscription-summary'] });
        void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
        showToast({
          type: 'success',
          title: 'Plan activated',
          message: 'Your academy plan is active. Choose up to 3 courses below.',
        });
      } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        setPaymentStatus('FAILED');
        showToast({
          type: 'error',
          title: 'Payment failed',
          message: 'The payment was not completed. Please try again.',
        });
      }
    };

    socket.on('transactionUpdate', handleUpdate);
    return () => {
      socket.off('transactionUpdate', handleUpdate);
    };
  }, [paypackRef, queryClient, showToast]);

  useEffect(() => {
    if (!highlightProgramId || !programsQuery.data?.length || programsQuery.isPending) {
      return;
    }
    const timer = window.setTimeout(() => {
      document.getElementById(`academy-program-${highlightProgramId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [highlightProgramId, programsQuery.data, programsQuery.isPending]);

  const selectedProgramsById = useMemo(() => {
    const map = new Map<string, AcademySubscriptionSummary['selectedPrograms'][number]>();
    for (const item of subscriptionQuery.data?.selectedPrograms ?? []) {
      map.set(item.programId, item);
    }
    return map;
  }, [subscriptionQuery.data?.selectedPrograms]);

  const accessibleProgramsById = useMemo(() => {
    const map = new Map<string, AcademySubscriptionSummary['accessiblePrograms'][number]>();
    for (const item of subscriptionQuery.data?.accessiblePrograms ?? []) {
      map.set(item.programId, item);
    }
    return map;
  }, [subscriptionQuery.data?.accessiblePrograms]);

  const currentSubscription = subscriptionQuery.data?.subscription ?? null;
  const hasActivePlan =
    currentSubscription?.status === 'ACTIVE' || currentSubscription?.status === 'TRIAL';

  function navigateToLogin(planId: PurchasableAcademyPlan['id']) {
    const params = new URLSearchParams({
      tab: 'register',
      returnTo: '/academy',
      plan: planId,
    });
    navigate(`/login?${params.toString()}`);
  }

  function openCourse(programId: string) {
    const access = accessibleProgramsById.get(programId);
    if (!access?.courseId) {
      showToast({
        type: 'error',
        title: 'Course unavailable',
        message: 'This program is not linked to a ready course yet.',
      });
      return;
    }
    navigate(`/student/courses/${access.courseId}`);
  }

  function handlePlanClick(plan: PurchasableAcademyPlan) {
    setSelectedPlan(plan);

    if (!auth.me) {
      navigateToLogin(plan.id);
      return;
    }

    if (!isPublicLearner) {
      showToast({
        type: 'error',
        title: 'Learner account required',
        message: 'Sign in with your public academy learner account to activate a plan.',
      });
      return;
    }

    setShowCheckoutModal(true);
  }

  function handleProgramAction(program: Program) {
    const access = accessibleProgramsById.get(program.id);
    if (access?.courseId) {
      openCourse(program.id);
      return;
    }

    if (!auth.me) {
      navigateToLogin(selectedPlan.id);
      return;
    }

    if (!isPublicLearner) {
      showToast({
        type: 'error',
        title: 'Learner account required',
        message: 'Use a public academy learner account to choose academy courses.',
      });
      return;
    }

    if (!hasActivePlan) {
      showToast({
        type: 'info',
        title: 'Choose a plan first',
        message: 'Activate or renew a plan before selecting your courses.',
      });
      return;
    }

    if (currentSubscription && currentSubscription.remainingSlots <= 0) {
      showToast({
        type: 'info',
        title: 'All slots in use',
        message: 'Remove one selected course to free a slot for another choice.',
      });
      return;
    }

    selectMutation.mutate(program.id);
  }

  const slotUsage = currentSubscription
    ? `${currentSubscription.courseLimit - currentSubscription.remainingSlots}/${currentSubscription.courseLimit}`
    : '0/3';

  return (
    <main className="bg-white">
      <section
        className="relative flex min-h-[58vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-brand-950/70" />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-brand-200 ring-1 ring-brand-400/30">
            <Sparkles className="h-3.5 w-3.5" />
            Plan-based access
          </div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">
            Smart School <span className="text-brand-400">Academy</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium text-gray-100">
            Activate a plan, then choose up to 3 academy courses you want to access.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            { step: 1, title: 'Create account', desc: 'Register or sign in with your academy learner account.' },
            { step: 2, title: 'Activate plan', desc: 'Choose the access plan that fits your testing or learning needs and pay with MoMo.' },
            { step: 3, title: 'Choose 3 courses', desc: 'Pick up to 3 linked courses under your active plan and swap later if needed.' },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">Step 1</p>
              <h2 className="mt-2 text-3xl font-bold uppercase tracking-tight text-slate-900">Choose your plan</h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                All plans unlock the same academy catalog flow. The difference is how long your chosen 3-course access stays active.
              </p>
            </div>
            {currentSubscription ? (
              <div className="rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-950">
                <p className="font-semibold">Current access</p>
                <p className="mt-1">
                  {formatPlanName(currentSubscription.planCode)} · {currentSubscription.status}
                </p>
                <p className="mt-1 text-brand-900/80">Slots used: {slotUsage}</p>
                <p className="mt-1 text-brand-900/80">Expires: {formatExpiry(currentSubscription.expiresAt)}</p>
              </div>
            ) : null}
          </div>

          {auth.me && !isPublicLearner ? (
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
              You are signed in to a workspace account. Academy plans require a public academy learner account.
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {ACADEMY_PLANS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              const isCurrentPlan = currentSubscription?.planCode === plan.id && hasActivePlan;
              return (
                <article
                  key={plan.id}
                  className={[
                    'rounded-3xl border p-6 shadow-sm transition',
                    isSelected || isCurrentPlan
                      ? 'border-brand-500 bg-brand-50 shadow-[0_24px_60px_rgba(30,90,168,0.12)]'
                      : 'border-slate-200 bg-white hover:border-brand-200',
                  ].join(' ')}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">{plan.name}</p>
                  <p className="mt-4 text-4xl font-black text-slate-900">
                    {plan.price.toLocaleString()}
                    <span className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">RWF</span>
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{plan.durationDays} days access</p>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{plan.description}</p>
                  <button
                    type="button"
                    onClick={() => handlePlanClick(plan)}
                    className="mt-6 w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-brand-600"
                  >
                    {auth.me ? (isCurrentPlan ? `Renew ${plan.name}` : `Choose ${plan.name}`) : `Continue with ${plan.name}`}
                  </button>
                </article>
              );
            })}
          </div>

          {subscriptionQuery.data?.pendingPayment ? (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-950">
              Payment pending for <span className="font-semibold capitalize">{subscriptionQuery.data.pendingPayment.planCode}</span>.
              Confirm the MoMo request on your phone to activate the plan.
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/70 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">Step 2</p>
              <h2 className="mt-2 text-3xl font-bold uppercase tracking-tight text-slate-900">Choose up to 3 courses</h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                Your plan controls time. Your selected courses control content access. Remove one selected course any time to free a slot.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900">Current slot usage</p>
              <p className="mt-1">{slotUsage} selected</p>
            </div>
          </div>

          {programsQuery.isPending ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {programsQuery.data?.map((program) => {
                const selected = selectedProgramsById.get(program.id);
                const accessible = accessibleProgramsById.get(program.id);
                const canAdd =
                  Boolean(auth.me && isPublicLearner && hasActivePlan) &&
                  !selected &&
                  !accessible &&
                  Boolean(currentSubscription && currentSubscription.remainingSlots > 0) &&
                  Boolean(program.courseId);

                return (
                  <article
                    key={program.id}
                    id={`academy-program-${program.id}`}
                    className={[
                      'group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition',
                      highlightProgramId === program.id
                        ? 'border-brand-500 ring-2 ring-brand-400/30'
                        : 'border-slate-200 hover:border-brand-200',
                    ].join(' ')}
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={programCardImage(program)}
                        alt={program.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-700 shadow-sm">
                        {program.durationDays} days default
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                        {accessible ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                            {accessible.isLegacy ? 'Legacy access' : 'Accessible now'}
                          </span>
                        ) : null}
                        {selected && !accessible ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                            Selected on plan
                          </span>
                        ) : null}
                        {!program.courseId ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            Course link pending
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">{program.title}</h3>
                      <p className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-600">
                        {program.description?.trim() || 'Professional academy track.'}
                      </p>
                      <div className="mt-6 space-y-3">
                        {accessible?.expiresAt ? (
                          <p className="text-sm text-slate-500">Access ends {formatExpiry(accessible.expiresAt)}</p>
                        ) : currentSubscription?.expiresAt ? (
                          <p className="text-sm text-slate-500">Current plan ends {formatExpiry(currentSubscription.expiresAt)}</p>
                        ) : null}

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProgram(program);
                              setShowDetailsModal(true);
                            }}
                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-50"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            disabled={selectMutation.isPending || removeMutation.isPending}
                            onClick={() => handleProgramAction(program)}
                            className={[
                              'flex-[1.35] rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition',
                              accessible?.courseId || canAdd
                                ? 'bg-brand-500 hover:bg-brand-600'
                                : 'bg-slate-400',
                            ].join(' ')}
                          >
                            {accessible?.courseId
                              ? 'Open course'
                              : !auth.me
                                ? 'Login first'
                                : !hasActivePlan
                                  ? 'Choose plan first'
                                  : currentSubscription && currentSubscription.remainingSlots <= 0 && !selected
                                    ? '3/3 selected'
                                    : !program.courseId
                                      ? 'Coming soon'
                                      : selected
                                        ? 'Selected'
                                        : 'Add to plan'}
                          </button>
                        </div>

                        {selected ? (
                          <button
                            type="button"
                            onClick={() => removeMutation.mutate(program.id)}
                            disabled={removeMutation.isPending}
                            className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-rose-700 transition hover:bg-rose-100"
                          >
                            Remove from plan
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={showCheckoutModal}
        onClose={() => {
          setShowCheckoutModal(false);
          setPaymentStatus('IDLE');
          setPaypackRef(null);
        }}
        title={`${selectedPlan.name} plan`}
        description="Activate your plan with MoMo. Your selected courses stay under the same 3-slot limit."
      >
        {paymentStatus === 'IDLE' ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              checkoutMutation.mutate({
                planId: selectedPlan.id,
                phoneNumber,
              });
            }}
          >
            <div className="rounded-2xl bg-brand-50 p-6">
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Plan</span>
                <span>{selectedPlan.name}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-brand-100 pt-3 text-lg font-bold text-brand-800">
                <span>Amount</span>
                <span>{selectedPlan.price.toLocaleString()} RWF</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                After payment, choose up to 3 linked academy courses. Renewing extends the same selected set until you change it.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">MoMo phone number</label>
              <input
                type="tel"
                required
                placeholder="e.g. 078XXXXXXX"
                className="w-full rounded-xl border border-brand-200 px-4 py-3 text-lg outline-none ring-brand-500 transition focus:ring-2"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={checkoutMutation.isPending}
              className="w-full rounded-xl bg-brand-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-50"
            >
              {checkoutMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initiating...
                </span>
              ) : (
                `Pay ${selectedPlan.price.toLocaleString()} RWF`
              )}
            </button>
          </form>
        ) : paymentStatus === 'PENDING' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
              <Loader2 className="relative h-16 w-16 animate-spin text-brand-500" />
            </div>
            <h3 className="mt-8 text-xl font-bold text-slate-900">Waiting for confirmation</h3>
            <p className="mt-4 max-w-xs text-slate-600">
              Confirm the MoMo request on your phone. Once payment succeeds, your plan will activate here automatically.
            </p>
          </div>
        ) : paymentStatus === 'SUCCESS' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="rounded-full bg-success-50 p-4">
              <CheckCircle2 className="h-16 w-16 text-success-500" />
            </div>
            <h3 className="mt-8 text-2xl font-bold text-slate-900">Plan activated</h3>
            <p className="mt-4 text-slate-600">
              Your academy plan is now active. Close this window and choose up to 3 courses from the catalog below.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowCheckoutModal(false);
                setPaymentStatus('IDLE');
                setPaypackRef(null);
              }}
              className="mt-10 rounded-xl bg-brand-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-brand-600"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <h3 className="text-xl font-bold text-slate-900">Payment failed</h3>
            <p className="mt-4 text-slate-600">We could not activate the plan. Please try again.</p>
            <button
              type="button"
              onClick={() => setPaymentStatus('IDLE')}
              className="mt-10 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white"
            >
              Try again
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={selectedProgram?.title || 'Program details'}
        description="Review this academy course before adding it to your plan."
      >
        <div className="space-y-6">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={selectedProgram ? programCardImage(selectedProgram) : undefined}
              alt={selectedProgram?.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Default course length</p>
            <p className="mt-1">{selectedProgram?.durationDays} days</p>
            <p className="mt-4 font-semibold text-slate-900">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {selectedProgram?.description?.trim() || 'Professional academy track.'}
            </p>
          </div>
          {selectedProgram ? (
            <button
              type="button"
              onClick={() => {
                setShowDetailsModal(false);
                handleProgramAction(selectedProgram);
              }}
              className="w-full rounded-2xl bg-brand-500 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-brand-600"
            >
              {accessibleProgramsById.get(selectedProgram.id)?.courseId ? 'Open course' : 'Use this course'}
            </button>
          ) : null}
        </div>
      </Modal>
    </main>
  );
}
