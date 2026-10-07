import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Loader2, Lock, Users } from 'lucide-react';

import {
  academyApi,
  ACADEMY_PLANS,
  isPurchasablePlanId,
  PLAN_DESCRIPTIONS,
  splitCatalogGradesIntoBands,
  type AcademyPlanOption,
} from '../api/academy-api';
import backgroundImage from '../asset/background.jpg';
import { AppDrawer } from '../components/drawer';
import { CardGridSkeleton } from '../components/skeleton-loader';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import socket from '../utils/socket';

function cardImage(thumbnail: string | null) {
  const value = thumbnail?.trim();
  return value ? value : backgroundImage;
}

export function PublicClassPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const auth = useAuth();

  const requestedPlanId = searchParams.get('plan');
  const defaultPlan: AcademyPlanOption =
    ACADEMY_PLANS.find((plan) => plan.id === 'monthly') ?? ACADEMY_PLANS[0];
  const [selectedPlan, setSelectedPlan] = useState<AcademyPlanOption>(
    ACADEMY_PLANS.find((plan) => plan.id === requestedPlanId) ?? defaultPlan
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'>(
    'IDLE'
  );
  const [paypackRef, setPaypackRef] = useState<string | null>(null);

  const isPublicLearner =
    auth.me?.roles.includes('PUBLIC_LEARNER') || auth.me?.roles.includes('LEARNER') || false;

  const catalogQuery = useQuery({
    queryKey: ['academy-catalog-tree'],
    queryFn: academyApi.getCatalogTree,
    staleTime: 60_000,
  });

  const plansQuery = useQuery({
    queryKey: ['academy-plans'],
    queryFn: academyApi.getPlans,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const plans: AcademyPlanOption[] = useMemo(() => {
    const remote = plansQuery.data?.plans;
    if (remote?.length) {
      return remote
        .filter((p): p is typeof p & { id: AcademyPlanOption['id'] } =>
          isPurchasablePlanId(p.id)
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
          durationDays: p.durationDays,
          price: p.amount,
          description: PLAN_DESCRIPTIONS[p.id] ?? '',
        }));
    }
    return [...ACADEMY_PLANS];
  }, [plansQuery.data]);

  useEffect(() => {
    if (!isPurchasablePlanId(requestedPlanId)) {
      return;
    }
    const match = plans.find((plan) => plan.id === requestedPlanId);
    if (match) {
      setSelectedPlan(match);
    }
  }, [requestedPlanId, plans]);

  useEffect(() => {
    setSelectedPlan((prev) => {
      const match = plans.find((plan) => plan.id === prev.id);
      return match &&
        (match.price !== prev.price ||
          match.durationDays !== prev.durationDays ||
          match.name !== prev.name)
        ? match
        : prev;
    });
  }, [plans]);

  const subscriptionQuery = useQuery({
    queryKey: ['academy-subscription-summary'],
    queryFn: academyApi.getSubscriptionSummary,
    enabled: Boolean(auth.me && isPublicLearner),
  });

  const selectMutation = useMutation({
    mutationFn: (roomId: string) => academyApi.selectClass(roomId),
    onSuccess: (data) => {
      queryClient.setQueryData(['academy-subscription-summary'], data);
      void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
      setShowCheckoutModal(false);
      showToast({
        type: 'success',
        title: 'Class added',
        message: 'Every subject and course in this class is now part of your active plan.',
      });
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Could not add class',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (roomId: string) => academyApi.removeClass(roomId),
    onSuccess: (data) => {
      queryClient.setQueryData(['academy-subscription-summary'], data);
      void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
      showToast({
        type: 'success',
        title: 'Class removed',
        message: 'You now have a free slot to choose another class.',
      });
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Could not remove class',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload: { planId: AcademyPlanOption['id']; phoneNumber: string }) =>
      academyApi.startPlanCheckout(payload),
    onSuccess: (data) => {
      setPaypackRef(data.paypackRef);
      setPaymentStatus('PENDING');
      showToast({ type: 'info', title: 'Payment initiated', message: data.message });
    },
    onError: (error: unknown) => {
      setPaymentStatus('FAILED');
      showToast({
        type: 'error',
        title: 'Checkout failed',
        message: error instanceof Error ? error.message : 'Request failed',
      });
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
          message: 'Your plan is active. Enroll in this class to finish.',
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

  const academicYears = catalogQuery.data?.academicYears ?? [];

  const located = useMemo(() => {
    const orderedYears = [
      ...academicYears.filter((year) => year.isCurrent),
      ...academicYears.filter((year) => !year.isCurrent),
    ];
    for (const year of orderedYears) {
      for (const grade of year.gradeLevels) {
        const room = grade.classRooms.find((item) => item.id === classId);
        if (room) {
          const bands = splitCatalogGradesIntoBands(year.gradeLevels);
          const band =
            bands.find((item) => item.grades.some((g) => g.id === grade.id)) ?? null;
          return { year, grade, band, room };
        }
      }
    }
    return null;
  }, [academicYears, classId]);

  const currentSubscription = subscriptionQuery.data?.subscription ?? null;
  const hasActivePlan =
    currentSubscription?.status === 'ACTIVE' || currentSubscription?.status === 'TRIAL';
  const classLimit = currentSubscription?.classLimit ?? 3;
  const remainingClassSlots = currentSubscription?.remainingClassSlots ?? classLimit;

  const accessible = (subscriptionQuery.data?.accessibleClasses ?? []).some(
    (item) => item.classRoomId === classId
  );
  const selected = (subscriptionQuery.data?.selectedClasses ?? []).some(
    (item) => item.classRoomId === classId
  );
  const canAdd =
    Boolean(auth.me && isPublicLearner && hasActivePlan) &&
    !selected &&
    !accessible &&
    Boolean(currentSubscription && remainingClassSlots > 0);

  function navigateToLogin() {
    const params = new URLSearchParams({ tab: 'register', returnTo: `/programs/class/${classId}` });
    if (selectedPlan) {
      params.set('plan', selectedPlan.id);
    }
    navigate(`/login?${params.toString()}`);
  }

  function handleEnroll() {
    if (!located) return;
    if (accessible) {
      navigate('/student/courses');
      return;
    }
    if (!auth.me) {
      navigateToLogin();
      return;
    }
    if (!isPublicLearner) {
      showToast({
        type: 'error',
        title: 'Learner account required',
        message: 'Use a learner account to enroll in classes.',
      });
      return;
    }
    if (!hasActivePlan) {
      setPaymentStatus('IDLE');
      setPaypackRef(null);
      setShowCheckoutModal(true);
      return;
    }
    if (currentSubscription && remainingClassSlots <= 0 && !selected) {
      showToast({
        type: 'info',
        title: 'All slots in use',
        message: 'Remove one selected class to free a slot for another choice.',
      });
      return;
    }
    selectMutation.mutate(located.room.id);
  }

  const courseTotal =
    located?.room.subjects.reduce((sum, subject) => sum + subject.courseCount, 0) ?? 0;

  return (
    <main className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            <li>
              <Link
                to="/"
                className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">
              /
            </li>
            <li>
              <Link
                to="/programs#academy-levels"
                className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Programs
              </Link>
            </li>
            {located?.band ? (
              <>
                <li aria-hidden="true" className="text-slate-400">
                  /
                </li>
                <li>
                  <Link
                    to={`/programs/group/${located.band.key}`}
                    className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline"
                  >
                    {located.band.title}
                  </Link>
                </li>
              </>
            ) : null}
            {located ? (
              <>
                <li aria-hidden="true" className="text-slate-400">
                  /
                </li>
                <li>
                  <Link
                    to={`/programs/level/${located.grade.id}`}
                    className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline"
                  >
                    {located.grade.name}
                  </Link>
                </li>
                <li aria-hidden="true" className="text-slate-400">
                  /
                </li>
                <li aria-current="page" className="px-1 py-0.5 font-semibold text-slate-900">
                  {located.room.name}
                </li>
              </>
            ) : (
              <>
                <li aria-hidden="true" className="text-slate-400">
                  /
                </li>
                <li aria-current="page" className="px-1 py-0.5 font-semibold text-slate-900">
                  Class
                </li>
              </>
            )}
          </ol>
        </nav>

        {catalogQuery.isPending ? (
          <CardGridSkeleton count={3} className="lg:grid-cols-3" />
        ) : catalogQuery.isError || !located ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Class not found</h1>
            <p className="mx-auto mt-2 max-w-md text-slate-600">
              This class is not available right now. Back to programs to pick another class.
            </p>
            <Link
              to="/programs#academy-levels"
              className="mt-6 inline-block rounded-2xl bg-brand-500 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-brand-600"
            >
              Back to programs
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="relative overflow-hidden rounded-3xl">
                <img
                  src={cardImage(located.room.thumbnail)}
                  alt=""
                  aria-hidden="true"
                  className="aspect-[16/8] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-700 shadow-sm">
                  {located.room.subjects.length}{' '}
                  {located.room.subjects.length === 1 ? 'subject' : 'subjects'} · {courseTotal}{' '}
                  {courseTotal === 1 ? 'course' : 'courses'}
                </div>
              </div>

              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">
                {located.year.name} · {located.grade.name}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {located.room.name}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-slate-600">
                <Users className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                Enrolled students: {(located.room.enrolledCount ?? 0).toLocaleString()}
              </p>
              <p className="mt-3 max-w-2xl text-slate-600">
                Unlock every subject, course, lesson, quiz, and assignment published in{' '}
                {located.room.name}.
              </p>

              <h2 className="mt-8 text-xl font-bold tracking-tight text-slate-900">Subjects</h2>
              <ul className="mt-4 grid gap-2" aria-label={`Subjects in ${located.room.name}`}>
                {located.room.subjects.map((subject) => (
                  <li
                    key={subject.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                      <BookOpen className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {subject.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {subject.courseCount} {subject.courseCount === 1 ? 'course' : 'courses'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">
                  Enrollment
                </p>
                {accessible ? (
                  <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Accessible now
                  </p>
                ) : selected ? (
                  <p className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    Selected on plan
                  </p>
                ) : null}
                <p className="mt-4 text-4xl font-black text-slate-900">
                  {located.room.price.toLocaleString()}
                  <span className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    RWF
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  One-time class value. A plan controls how long your access stays active.
                </p>
                {currentSubscription ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {remainingClassSlots}/{classLimit} slots free · plan ends{' '}
                    {currentSubscription.expiresAt
                      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                          new Date(currentSubscription.expiresAt)
                        )
                      : 'no end date'}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={selectMutation.isPending || removeMutation.isPending}
                  onClick={handleEnroll}
                  className={[
                    'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition disabled:opacity-60',
                    accessible || canAddHere()
                      ? 'bg-brand-500 hover:bg-brand-600'
                      : 'bg-slate-400',
                  ].join(' ')}
                >
                  {!accessible ? <Lock className="h-4 w-4" aria-hidden="true" /> : null}
                  {accessible
                    ? 'Enter class'
                    : !auth.me
                      ? 'Login first'
                      : !hasActivePlan
                        ? 'Enroll now'
                        : currentSubscription &&
                            remainingClassSlots <= 0 &&
                            !selected
                          ? `${classLimit}/${classLimit} selected`
                          : 'Enroll in class'}
                </button>

                {selected ? (
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(located.room.id)}
                    disabled={removeMutation.isPending}
                    className="mt-3 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-rose-700 transition hover:bg-rose-100"
                  >
                    Remove from plan
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      <AppDrawer
        open={showCheckoutModal}
        onClose={() => {
          setShowCheckoutModal(false);
          setPaymentStatus('IDLE');
          setPaypackRef(null);
        }}
        title={`${selectedPlan.name} plan`}
        description="Activate your plan with MoMo to enroll in this class."
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
            {!hasActivePlan ? (
              <fieldset>
                <legend className="mb-2 text-sm font-bold text-slate-800">Choose a plan</legend>
                <div className="grid gap-2" role="radiogroup" aria-label="Choose a plan">
                  {plansQuery.isPending ? (
                    <p className="text-sm text-slate-500">Loading plans…</p>
                  ) : (
                    plans.map((plan) => (
                      <label
                        key={plan.id}
                        className={[
                          'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition',
                          selectedPlan.id === plan.id
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-slate-200 bg-white hover:border-brand-200',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="class-plan"
                            checked={selectedPlan.id === plan.id}
                            onChange={() => setSelectedPlan(plan)}
                            className="h-4 w-4 accent-brand-600"
                          />
                          <span>
                            <span className="block text-sm font-bold text-slate-900">
                              {plan.name}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {plan.durationDays} days access
                            </span>
                          </span>
                        </span>
                        <span className="text-sm font-bold tabular-nums text-slate-900">
                          {plan.price.toLocaleString()} RWF
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </fieldset>
            ) : null}
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
                After payment you will be enrolled straight into {located?.room.name ?? 'this class'}.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">
                MoMo phone number
              </label>
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
              Confirm the MoMo request on your phone. Once payment succeeds, your plan will activate
              here automatically.
            </p>
          </div>
        ) : paymentStatus === 'SUCCESS' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="rounded-full bg-success-50 p-4">
              <CheckCircle2 className="h-16 w-16 text-success-500" />
            </div>
            <h3 className="mt-8 text-2xl font-bold text-slate-900">Plan activated</h3>
            <p className="mt-4 text-slate-600">
              Your plan is now active. Enroll in {located?.room.name ?? 'this class'} to finish.
            </p>
            <button
              type="button"
              disabled={selectMutation.isPending || !located}
              onClick={() => {
                if (located) {
                  selectMutation.mutate(located.room.id);
                  setPaymentStatus('IDLE');
                  setPaypackRef(null);
                }
              }}
              className="mt-10 rounded-xl bg-brand-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              Enroll in class
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
      </AppDrawer>
    </main>
  );

  function canAddHere() {
    return (
      Boolean(auth.me && isPublicLearner && hasActivePlan) &&
      !selected &&
      !accessible &&
      Boolean(currentSubscription && remainingClassSlots > 0)
    );
  }
}
