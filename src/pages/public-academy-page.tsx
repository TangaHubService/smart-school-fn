import { ArrowRight, BookOpen, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { academyApi, Program } from '../api/academy-api';
import { useAuth } from '../features/auth/auth.context';
import { Modal } from '../components/modal';
import { useToast } from '../components/toast';
import socket from '../utils/socket';
import backgroundImage from '../asset/background.jpg';
import { loginApi, registerApi } from '../features/auth/auth.api';

const ACADEMY_PLANS = [
  { id: 'weekly', name: 'Weekly Access', price: 2000, duration: 7 },
  { id: 'monthly', name: 'Monthly Access', price: 5000, duration: 30 },
  { id: 'quarterly', name: 'Quarterly Access', price: 10000, duration: 90 },
  { id: 'yearly', name: 'Yearly Access', price: 30000, duration: 365 },
];

export function PublicAcademyPage() {
  const { me, login: contextLogin, setSessionTokens } = useAuth();
  const { showToast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [paypackRef, setPaypackRef] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(ACADEMY_PLANS[1]); // Default to Monthly

  // Registration/Login state for non-authenticated users
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [authForm, setAuthForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const { data: programs, isLoading } = useQuery({
    queryKey: ['academy-programs'],
    queryFn: academyApi.getPrograms,
  });

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
    mutationFn: async () => {
      if (authMode === 'REGISTER') {
        const res = await registerApi(authForm);
        // We'll update AuthContext to handle this, but for now we need a way to log in
        // Since we have the res (LoginResponse), we can just use the login data if we expose its setter
        return res;
      } else {
        const res = await loginApi({ loginAs: 'staff' as any, email: authForm.email, password: authForm.password });
        return res;
      }
    },
    onSuccess: (data: any) => {
      setSessionTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      setShowAuthModal(false);
      setShowPurchaseModal(true);
      showToast({ type: 'success', title: 'Authenticated', message: 'Welcome to the Academy!' });
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
  }, [paypackRef, showToast]);

  const handleEnrollClick = (program: Program) => {
    setSelectedProgram(program);
    if (!me) {
      setShowAuthModal(true);
    } else {
      setShowPurchaseModal(true);
    }
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
        amount: selectedPlan.price,
        planId: selectedPlan.id,
      });
    }
  };

  return (
    <main className="bg-white">
      {/* Hero Section */}
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

      {/* Program Catalog */}
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
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={program.thumbnail}
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
                    {program.description}
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
                      Enroll
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Auth Modal (Register/Login) */}
      <Modal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title={authMode === 'REGISTER' ? 'Create Your Account' : 'Welcome Back'}
        description="Join the Public Academy to access professional courses."
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); authMutation.mutate(); }}>
          {authMode === 'REGISTER' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">First Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                  value={authForm.firstName}
                  onChange={(e) => setAuthForm({ ...authForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Last Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
                  value={authForm.lastName}
                  onChange={(e) => setAuthForm({ ...authForm, lastName: e.target.value })}
                />
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-brand-100 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand-500 transition focus:ring-2"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
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
              onClick={() => setAuthMode(authMode === 'REGISTER' ? 'LOGIN' : 'REGISTER')}
            >
              {authMode === 'REGISTER' ? 'Already have an account? Login' : 'Need an account? Register'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Purchase Modal */}
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
                    <span className="mt-1 text-lg font-black text-brand-800">{plan.price.toLocaleString()} RWF</span>
                    <span className="text-[10px] font-medium text-slate-500">{plan.duration} Days Access</span>
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
                <span>Total Amount</span>
                <span>{selectedPlan.price.toLocaleString()} RWF</span>
              </div>
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
              onClick={() => window.location.href = '/dashboard'}
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

      {/* Details Modal (Public) */}
      <Modal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={selectedProgram?.title || 'Program Details'}
        description="Comprehensive information about this certification program."
      >
        <div className="space-y-6">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={selectedProgram?.thumbnail}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</p>
                <p className="text-sm font-bold text-slate-700">{selectedProgram?.durationDays} Days</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Access</p>
                <p className="text-sm font-bold text-brand-600">Flexible Plans</p>
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
            Enroll in Program
          </button>
        </div>
      </Modal>
    </main>
  );
}
