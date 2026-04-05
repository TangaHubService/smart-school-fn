import { ArrowRight, BookOpen, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { academyApi, Program, type ProgramEnrollment } from '../api/academy-api';
import { useAuth } from '../features/auth/auth.context';
import { Modal } from '../components/modal';
import { useToast } from '../components/toast';
import socket from '../utils/socket';
import backgroundImage from '../asset/background.jpg';
import { loginApi, registerApi } from '../features/auth/auth.api';
import { loginFormSchema, registerFormSchema } from '../features/auth/auth.schema';

const ACADEMY_PLANS = [
  { id: 'weekly', name: 'Weekly access', durationDays: 7 },
  { id: 'monthly', name: 'Monthly access', durationDays: 30 },
  { id: 'quarterly', name: 'Quarterly access', durationDays: 90 },
  { id: 'yearly', name: 'Yearly access', durationDays: 365 },
];

function programCardImage(program: Program) {
  const t = program.thumbnail?.trim();
  return t ? t : backgroundImage;
}

function enrollmentIsActive(e: Pick<ProgramEnrollment, 'isActive' | 'expiresAt'>) {
  if (!e.isActive) {
    return false;
  }
  if (!e.expiresAt) {
    return true;
  }
  return new Date(e.expiresAt).getTime() > Date.now();
}

function activeEnrollmentForProgram(programId: string, list: ProgramEnrollment[] | undefined) {
  return list?.find((e) => e.programId === programId && enrollmentIsActive(e));
}

function fieldErrorsFromZod(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && next[key] === undefined) {
      next[key] = issue.message;
    }
  }
  return next;
}

export function PublicAcademyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const highlightProgramId = useMemo(() => {
    const s = location.state as { highlightProgramId?: string } | null | undefined;
    return s?.highlightProgramId;
  }, [location.state]);

  const { me, setSessionTokens } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [paypackRef, setPaypackRef] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(ACADEMY_PLANS[1]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [authFieldErrors, setAuthFieldErrors] = useState<Record<string, string>>({});
  const [authForm, setAuthForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { data: programs, isLoading } = useQuery({
    queryKey: ['academy-programs'],
    queryFn: academyApi.getPrograms,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['academy-my-enrollments'],
    queryFn: academyApi.getMyEnrollments,
    enabled: Boolean(me),
  });

  const activeTrialExpiresAt = useMemo(() => {
    const list = enrollmentsQuery.data ?? [];
    const row = list.find(
      (e) => e.isTrial && e.expiresAt && new Date(e.expiresAt).getTime() > Date.now(),
    );
    return row?.expiresAt ?? null;
  }, [enrollmentsQuery.data]);

  const purchaseMutation = useMutation({
    mutationFn: academyApi.purchaseProgram,
    onSuccess: (data) => {
      setPaypackRef(data.paypackRef);
      setPaymentStatus('PENDING');
      showToast({ type: 'info', title: 'Payment Initiated', message: data.message });
    },
    onError: (error: any) => {
      showToast({ type: 'error', title: 'Purchase Failed', message: error.message });
    },
  });

  const authMutation = useMutation({
    mutationFn: async (vars: { kind: 'REGISTER'; payload: typeof authForm } | { kind: 'LOGIN'; payload: { identifier: string; password: string } }) => {
      if (vars.kind === 'REGISTER') {
        return registerApi(vars.payload);
      }
      return loginApi(vars.payload);
    },
    onSuccess: async (data: any, variables) => {
      setSessionTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      setShowAuthModal(false);

      let list: ProgramEnrollment[] = [];
      try {
        list = await academyApi.getMyEnrollments();
      } catch {
        list = [];
      }
      queryClient.setQueryData(['academy-my-enrollments'], list);

      const prog = selectedProgram;
      if (prog) {
        const active = activeEnrollmentForProgram(prog.id, list);
        if (active) {
          const courseId = active.program?.courseId;
          navigate(courseId ? `/student/courses/${courseId}` : '/student/courses');
          showToast({
            type: 'success',
            title: variables.kind === 'REGISTER' ? 'Account ready' : 'Welcome back',
            message: active.isTrial
              ? 'Free trial is active — opening your course. No MoMo payment needed until the trial ends.'
              : 'Opening your course.',
          });
          return;
        }
      }

      setShowPurchaseModal(true);
      showToast({
        type: 'success',
        title: variables.kind === 'REGISTER' ? 'Signed in' : 'Welcome back',
        message:
          'Complete MoMo payment below to enroll. If you are on a free trial, close this and use Open course on the program card.',
      });
    },
    onError: (error: any) => {
      showToast({ type: 'error', title: 'Auth Failed', message: error.message });
    },
  });

  useEffect(() => {
    if (paypackRef) {
      const room = `trx-${paypackRef}`;
      socket.emit('joinTransaction', { transactionId: paypackRef });
      
      const handleUpdate = (data: any) => {
        if (data.status === 'COMPLETED') {
          setPaymentStatus('SUCCESS');
          void queryClient.invalidateQueries({ queryKey: ['academy-my-enrollments'] });
          showToast({ type: 'success', title: 'Payment Successful', message: 'You are now enrolled in the program!' });
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          setPaymentStatus('FAILED');
          showToast({ type: 'error', title: 'Payment Failed', message: 'Please try again or contact support.' });
        }
      };

      socket.on('transactionUpdate', handleUpdate);
      return () => {
        socket.off('transactionUpdate', handleUpdate);
      };
    }
  }, [paypackRef, queryClient, showToast]);

  useEffect(() => {
    if (!highlightProgramId || !programs?.length || isLoading) {
      return;
    }
    const t = window.setTimeout(() => {
      document.getElementById(`academy-program-${highlightProgramId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
    return () => window.clearTimeout(t);
  }, [highlightProgramId, programs, isLoading]);

  const handleEnrollClick = (program: Program) => {
    setSelectedProgram(program);
    if (!me) {
      setShowAuthModal(true);
      return;
    }
    if (enrollmentsQuery.isPending) {
      showToast({
        type: 'info',
        title: 'Please wait',
        message: 'Checking your enrollments…',
      });
      return;
    }
    const active = activeEnrollmentForProgram(program.id, enrollmentsQuery.data);
    if (active) {
      const courseId = active.program?.courseId;
      navigate(courseId ? `/student/courses/${courseId}` : '/student/courses');
      showToast({
        type: 'success',
        title: 'You already have access',
        message: active.isTrial
          ? 'Free trial — no payment needed. Opening your course.'
          : 'Opening your course.',
      });
      return;
    }
    setShowPurchaseModal(true);
  };

  const handleDetailsClick = (program: Program) => {
    setSelectedProgram(program);
    setShowDetailsModal(true);
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProgram && phoneNumber && selectedPlan) {
      purchaseMutation.mutate({
        programId: selectedProgram.id,
        phoneNumber,
        planId: selectedPlan.id,
      });
    }
  };

  return (
    <main className="bg-white">
      <section
        className="relative flex h-[60vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-brand-950/70" />
        <div className="relative mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-brand-200 ring-1 ring-brand-400/30">
            <Sparkles className="h-3.5 w-3.5" />
            After-School Programs
          </div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">
            Smart School <span className="text-brand-400">Academy</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-gray-100">
            Master new skills with our professional certification programs.
            Designed for learners seeking career excellence.
          </p>
        </div>
      </section>

      {activeTrialExpiresAt ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-950">
          <span className="font-semibold">Free trial active</span>
          <span className="mx-1 text-emerald-800">—</span>
          Catalog access ends{' '}
          <time dateTime={activeTrialExpiresAt}>
            {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(activeTrialExpiresAt),
            )}
          </time>
          . Purchase a program to keep access after that.
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">Available Programs</h2>
          <div className="mx-auto mt-6 h-1 w-20 rounded-full bg-brand-500" />
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
            Flexible, affordable, and government-recognized certifications for the modern workforce.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {programs?.map((program) => (
              <article
                key={program.id}
                id={`academy-program-${program.id}`}
                className={[
                  'group flex flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10',
                  highlightProgramId === program.id
                    ? 'border-brand-500 ring-2 ring-brand-400/40'
                    : 'border-slate-100',
                ].join(' ')}
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={programCardImage(program)}
                    alt={program.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute right-4 top-4 rounded-2xl bg-white/90 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-600 shadow-sm backdrop-blur-md">
                    Certification
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-500">
                    <BookOpen className="h-4 w-4" />
                    {program.durationDays} Days Duration
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">{program.title}</h3>
                  <p className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-600 line-clamp-3">
                    {program.description?.trim() || 'Professional certification track.'}
                  </p>
                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => handleDetailsClick(program)}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handleEnrollClick(program)}
                      className="flex-[1.5] flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand-600"
                    >
                      {activeEnrollmentForProgram(program.id, enrollmentsQuery.data) ? 'Open course' : 'Enroll'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthFieldErrors({});
        }}
        title={authMode === 'REGISTER' ? 'Create Your Account' : 'Welcome Back'}
        description="Join the Public Academy to access professional courses."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setAuthFieldErrors({});
            if (authMode === 'REGISTER') {
              const parsed = registerFormSchema.safeParse(authForm);
              if (!parsed.success) {
                setAuthFieldErrors(fieldErrorsFromZod(parsed.error.issues));
                return;
              }
              authMutation.mutate({ kind: 'REGISTER', payload: parsed.data });
              return;
            }
            const parsed = loginFormSchema.safeParse({
              identifier: loginIdentifier,
              password: authForm.password,
            });
            if (!parsed.success) {
              setAuthFieldErrors(fieldErrorsFromZod(parsed.error.issues));
              return;
            }
            authMutation.mutate({ kind: 'LOGIN', payload: parsed.data });
          }}
        >
          {authMode === 'REGISTER' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">First Name</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                  value={authForm.firstName}
                  onChange={(e) => setAuthForm({ ...authForm, firstName: e.target.value })}
                />
                {authFieldErrors.firstName ? (
                  <p className="mt-1 text-xs text-red-600">{authFieldErrors.firstName}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Last Name</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                  value={authForm.lastName}
                  onChange={(e) => setAuthForm({ ...authForm, lastName: e.target.value })}
                />
                {authFieldErrors.lastName ? (
                  <p className="mt-1 text-xs text-red-600">{authFieldErrors.lastName}</p>
                ) : null}
              </div>
            </div>
          )}
          {authMode === 'LOGIN' ? (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email or username</label>
              <input
                type="text"
                autoComplete="username"
                placeholder="e.g. you@email.com or your_username"
                className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
              />
              {authFieldErrors.identifier ? (
                <p className="mt-1 text-xs text-red-600">{authFieldErrors.identifier}</p>
              ) : null}
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Username</label>
                <input
                  type="text"
                  placeholder="e.g. jdoe99"
                  className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                />
                {authFieldErrors.username ? (
                  <p className="mt-1 text-xs text-red-600">{authFieldErrors.username}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. jane@example.com"
                  className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
                {authFieldErrors.email ? (
                  <p className="mt-1 text-xs text-red-600">{authFieldErrors.email}</p>
                ) : null}
              </div>
            </>
          )}
          <div className={authMode === 'REGISTER' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                autoComplete={authMode === 'LOGIN' ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
              {authFieldErrors.password ? (
                <p className="mt-1 text-xs text-red-600">{authFieldErrors.password}</p>
              ) : null}
            </div>
            {authMode === 'REGISTER' ? (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                  value={authForm.confirmPassword}
                  onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                />
                {authFieldErrors.confirmPassword ? (
                  <p className="mt-1 text-xs text-red-600">{authFieldErrors.confirmPassword}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={authMutation.isPending}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {authMutation.isPending ? 'Processing...' : authMode === 'REGISTER' ? 'Register & Continue' : 'Login & Continue'}
          </button>
          <div className="text-center text-sm">
            <button
              type="button"
              className="font-semibold text-brand-600 hover:underline"
              onClick={() => {
                setAuthMode(authMode === 'REGISTER' ? 'LOGIN' : 'REGISTER');
                setAuthFieldErrors({});
              }}
            >
              {authMode === 'REGISTER' ? 'Already have an account? Login' : 'Need an account? Register'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setPaymentStatus('IDLE');
          setPaypackRef(null);
        }}
        title={`Enroll in ${selectedProgram?.title}`}
      >
        {paymentStatus === 'IDLE' ? (
          <form className="space-y-6" onSubmit={handlePurchaseSubmit}>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              <p className="font-semibold">On a free trial?</p>
              <p className="mt-1 text-emerald-900/90">
                Close this window and click <strong>Open course</strong> on the program card — MoMo is only to extend access after your trial.
              </p>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800">Select Access Plan</label>
              <div className="grid grid-cols-2 gap-3">
                {ACADEMY_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={[
                      "flex flex-col items-start rounded-2xl border p-4 transition-all text-left",
                      selectedPlan.id === plan.id
                        ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                        : "border-slate-100 bg-white hover:border-brand-200"
                    ].join(' ')}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{plan.name}</span>
                    <span className="mt-1 text-lg font-black text-brand-800">{plan.durationDays} days</span>
                    <span className="text-[10px] font-medium text-slate-500">Enrollment length</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-brand-50 p-6">
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Selected Plan</span>
                <span>{selectedPlan.name}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-brand-100 pt-2 text-lg font-bold text-brand-800">
                <span>Amount charged</span>
                <span>
                  {selectedProgram ? `${Number(selectedProgram.price).toLocaleString()} RWF` : '—'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Price is set on the program. Your plan only changes how long access stays active after payment.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">MoMo Phone Number</label>
              <input
                type="tel"
                required
                placeholder="e.g. 078XXXXXXX"
                className="w-full rounded-xl border border-brand-200 px-4 py-3 text-lg outline-none ring-brand-500 transition focus:ring-2"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="mt-2 text-xs text-slate-500">
                A payment prompt will be sent to this number via Paypack.
              </p>
            </div>

            <button
              type="submit"
              disabled={purchaseMutation.isPending}
              className="w-full rounded-xl bg-brand-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-50"
            >
              {purchaseMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initiating...
                </span>
              ) : 'Confirm Payment'}
            </button>
          </form>
        ) : paymentStatus === 'PENDING' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
              <Loader2 className="relative h-16 w-16 animate-spin text-brand-500" />
            </div>
            <h3 className="mt-8 text-xl font-bold text-slate-900">Waiting for Confirmation</h3>
            <p className="mt-4 max-w-xs text-slate-600">
              Please check your phone and enter your MoMo PIN to complete the transaction.
            </p>
            <div className="mt-8 flex gap-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:0.4s]" />
            </div>
          </div>
        ) : paymentStatus === 'SUCCESS' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="rounded-full bg-success-50 p-4">
              <CheckCircle2 className="h-16 w-16 text-success-500" />
            </div>
            <h3 className="mt-8 text-2xl font-bold text-slate-900">Welcome to the Program!</h3>
            <p className="mt-4 text-slate-600">
              Your enrollment is confirmed. You can now access all lessons and assessments.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/student/courses';
              }}
              className="mt-10 rounded-xl bg-brand-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-brand-600"
            >
              Go to My Courses
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
             <div className="rounded-full bg-danger-50 p-4">
              <Loader2 className="h-16 w-16 text-danger-500" />
            </div>
            <h3 className="mt-8 text-xl font-bold text-slate-900">Payment Failed</h3>
            <p className="mt-4 text-slate-600">
              We couldn't process your payment. Please ensure you have sufficient balance and try again.
            </p>
            <button
              onClick={() => setPaymentStatus('IDLE')}
              className="mt-10 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white"
            >
              Try Again
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={selectedProgram?.title || 'Program Details'}
        description="Comprehensive information about this certification program."
      >
        <div className="space-y-6">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={selectedProgram ? programCardImage(selectedProgram) : undefined}
              alt={selectedProgram?.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-slate-900">About the Program</h4>
            <div className="max-h-[30vh] overflow-y-auto pr-2">
               <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                {selectedProgram?.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default length</p>
                <p className="text-sm font-bold text-slate-700">{selectedProgram?.durationDays} days</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Price</p>
                <p className="text-sm font-bold text-brand-600">
                  {selectedProgram ? `${Number(selectedProgram.price).toLocaleString()} RWF` : '—'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setShowDetailsModal(false);
              handleEnrollClick(selectedProgram!);
            }}
            className="w-full rounded-2xl bg-brand-500 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-brand-600"
          >
            {selectedProgram && activeEnrollmentForProgram(selectedProgram.id, enrollmentsQuery.data)
              ? 'Open course'
              : 'Enroll in Program'}
          </button>
        </div>
      </Modal>
    </main>
  );
}
