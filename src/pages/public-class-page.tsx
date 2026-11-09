import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { AppDrawer } from '../components/drawer';
import { CardGridSkeleton } from '../components/skeleton-loader';
import { CatalogMessage, CategoryBanner } from '../components/public/program-browse';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import socket from '../utils/socket';

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
      const isSchoolStudent =
        auth.me?.roles.includes('STUDENT') || auth.me?.roles.includes('PARENT');
      showToast({
        type: isSchoolStudent ? 'info' : 'error',
        title: isSchoolStudent ? 'School enrollment applies' : 'Learner account required',
        message: isSchoolStudent
          ? 'Your school enrolls you in classes — check My Learning, or register a separate learner account to enroll in public classes.'
          : 'Use a learner account to enroll in classes.',
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
    located?.room.subjects.reduce(
      (sum, subject) => sum + (subject.courseCount ?? subject.courses?.length ?? 0),
      0
    ) ?? 0;
  // Older API responses may omit `courses` per subject; only list what was actually sent.
  const listedCourseCount =
    located?.room.subjects.reduce((sum, subject) => sum + (subject.courses?.length ?? 0), 0) ??
    0;

  return (
    <main className="min-h-[60vh] bg-slate-50">
      <CategoryBanner
        crumbs={[
          { label: 'All Programs', to: '/programs#academy-levels' },
          ...(located?.band
            ? [{ label: located.band.title, to: `/programs/group/${located.band.key}` }]
            : []),
          ...(located && located.grade.classRooms.length > 1
            ? [{ label: located.grade.name, to: `/programs/level/${located.grade.id}` }]
            : []),
          { label: located?.room.name ?? 'Class' },
        ]}
        title={located?.room.name ?? 'Class'}
        subtitle={
          located
            ? `Unlock every subject, course, lesson, quiz, and assignment published in ${located.room.name}.`
            : undefined
        }
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {catalogQuery.isPending ? (
          <CardGridSkeleton count={3} className="lg:grid-cols-3" />
        ) : catalogQuery.isError || !located ? (
          <CatalogMessage
            title="Class not found"
            message="This class is not available right now. Go back to programs to pick another class."
            action={{ label: 'Back to programs', to: '/programs#academy-levels' }}
          />
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
            <div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-brand-500" aria-hidden="true" />
                  {located.room.subjects.length}{' '}
                  {located.room.subjects.length === 1 ? 'subject' : 'subjects'} · {courseTotal}{' '}
                  {courseTotal === 1 ? 'course' : 'courses'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-brand-500" aria-hidden="true" />
                  {(located.room.enrolledCount ?? 0).toLocaleString()} enrolled
                </span>
                <span className="text-slate-500">{located.year.name}</span>
              </div>
              <h2 className="mt-8 text-xl font-semibold tracking-tight text-slate-900">Courses</h2>
              {listedCourseCount ? (
                <ul
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                  aria-label={`Courses in ${located.room.name}`}
                >
                  {located.room.subjects.flatMap((subject) =>
                    (subject.courses ?? []).map((course) => (
                      <li
                        key={course.id}
                        className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(15,39,72,0.08)]"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                          <BookOpen className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">
                            {course.title}
                          </span>
                          <span className="block text-[13px] text-slate-500">{subject.name}</span>
                        </span>
                        {accessible ? null : (
                          <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-label="Locked until you enroll" />
                        )}
                      </li>
                    ))
                  )}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl bg-white p-6 text-sm text-slate-600">
                  Courses for this class will appear here once they are published.
                </p>
              )}
            </div>

            <div>
              <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(15,39,72,0.08),0_8px_24px_rgba(15,39,72,0.06)] lg:sticky lg:top-24">
                <h2 className="text-sm font-semibold text-slate-900">Enrollment</h2>
                {accessible ? (
                  <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Accessible now
                  </p>
                ) : selected ? (
                  <p className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    Selected on plan
                  </p>
                ) : null}
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                  {located.room.price.toLocaleString()}
                  <span className="ml-1.5 text-sm font-medium text-slate-500">
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
                    'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition disabled:opacity-60',
                    'bg-brand-500 hover:bg-brand-600',
                  ].join(' ')}
                >
                  {!accessible ? <Lock className="h-4 w-4" aria-hidden="true" /> : null}
                  {accessible
                    ? 'Enter class'
                    : !auth.me
                      ? 'Log in to enroll'
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
                    className="mt-3 w-full rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
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
}
