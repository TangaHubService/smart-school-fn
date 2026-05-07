import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../features/auth/auth.context';
import { verifyTwoFactorSchema } from '../features/auth/auth.schema';
import { ApiClientError } from '../types/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';

export function OtpVerificationPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { pendingTwoFactor, verifyTwoFactor, resendTwoFactorOtp } = useAuth();
  const [resendTimer, setResendTimer] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<{ otp: string }>({
    resolver: zodResolver(verifyTwoFactorSchema),
    defaultValues: { otp: '' },
  });

  const otpDigits = watch('otp');

  useEffect(() => {
    if (!pendingTwoFactor) {
      navigate('/login');
    }
  }, [pendingTwoFactor, navigate]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((rt) => rt - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const verifyMutation = useMutation({
    mutationFn: async (otp: string) => {
      if (!pendingTwoFactor) throw new Error('No pending 2FA');
      return verifyTwoFactor(otp);
    },
    onSuccess: (data) => {
      const role = data.roles?.[0] ?? 'USER';
      if (role === 'SUPER_ADMIN') navigate('/super-admin-dashboard', { replace: true });
      else if (role === 'ADMIN') navigate('/admin-dashboard', { replace: true });
      else if (role === 'TEACHER') navigate('/teacher-dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!pendingTwoFactor) throw new Error('No pending 2FA');
      return resendTwoFactorOtp();
    },
    onSuccess: () => {
      setResendTimer(120);
    },
  });

  const apiError = verifyMutation.error as ApiClientError | null;

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '').slice(-1);
    const newOtp = otpDigits.split('').fill('');
    newOtp[index] = digits;
    setValue('otp', newOtp.join(''));

    if (digits && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = (otpDigits.split('').fill('') as string[]).slice(0, 6);
    pasted.split('').forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });
    setValue('otp', newOtp.join(''));

    const lastIndex = Math.min(pasted.length - 1, 5);
    const lastInput = document.getElementById(`otp-${lastIndex}`);
    lastInput?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const onSubmit = (data: { otp: string }) => {
    verifyMutation.mutate(data.otp);
  };

  if (!pendingTwoFactor) return null;

  return (
    <main
      className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: 'url(/authbac.jpeg)' }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#173C7F]/70 via-black/50 to-black/70"
        aria-hidden="true"
      />
      <div
        className="absolute -top-48 left-8 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-56 right-8 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row gap-8 bg-white/75 backdrop-blur-xl rounded-3xl border border-white/30 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.65)] ring-1 ring-white/20 overflow-hidden lg:min-h-[500px]">
        {/* Form Side */}
        <div className="flex-1 p-8 sm:p-12">
          <header className="mb-8">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700 transition mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {t('otp.title') || 'Two-Factor Authentication'}
              </h1>
            </div>
            <p className="mt-3 text-slate-600 leading-relaxed">
              {t('otp.subtitle') || 'Enter the 6-digit code sent to your email'}
            </p>
          </header>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} onPaste={handlePaste}>
            <div>
              <div className="flex gap-3 justify-center">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpDigits[index] || ''}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="h-14 w-12 rounded-2xl border border-brand-100 bg-white/50 text-center text-2xl font-bold text-slate-900 outline-none ring-brand-400 transition focus:ring-2"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              {errors.otp && (
                <p className="mt-3 text-center text-sm text-red-600 font-medium italic">
                  {errors.otp.message}
                </p>
              )}
            </div>

            {apiError && (
              <p className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-700 font-medium text-center">
                {apiError.message}
              </p>
            )}

            <button
              type="submit"
              disabled={verifyMutation.isPending || otpDigits.length < 6}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-brand-500/20 text-sm font-bold uppercase tracking-widest text-white bg-brand-600 hover:bg-brand-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                disabled={resendTimer > 0 || resendMutation.isPending}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendTimer > 0
                  ? `Resend code in ${Math.floor(resendTimer / 60)}:${String(resendTimer % 60).padStart(2, '0')}`
                  : 'Resend code'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Side */}
        <div className="hidden md:flex w-80 lg:w-96 flex-col border-l border-white/20 p-8 sm:p-12">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-brand-600" />
              <span className="text-sm font-black text-brand-700 uppercase tracking-[0.2em]">
                {t('otp.infoLabel') || 'Verification Info'}
              </span>
            </div>

            <ul className="space-y-6">
              {[
                pendingTwoFactor.email
                  ? `A 6-digit code was sent to ${pendingTwoFactor.email}`
                  : 'A 6-digit verification code has been sent to your email',
                'Enter the code within the time limit displayed above',
                'Do not share this code with anyone',
                'If you did not receive the email, check your spam folder or request a new code',
              ].map((tip, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-lg shadow-brand-500/20">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-700 font-medium">{tip}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
