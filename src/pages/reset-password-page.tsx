import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, Lock, Key, ArrowLeft } from 'lucide-react';
import { useState, useRef } from 'react';

import { resetPasswordApi, verifyOtpApi } from '../features/auth/auth.api';
import { resetPasswordSchema, ResetPasswordInput } from '../features/auth/auth.schema';
import { ApiClientError } from '../types/api';

function OtpBoxes({ length = 6, value, onChange }: { length?: number, value: string, onChange: (val: string) => void }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const getBufferedValue = () => value.padEnd(length, ' ');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const text = e.target.value.replace(/[^0-9]/g, '');
    if (text.length > 1) return;

    const chars = getBufferedValue().split('');
    chars[index] = text || ' ';
    const newVal = chars.join('');
    onChange(newVal.trimEnd());
    
    if (text && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const chars = getBufferedValue().split('');
      if (chars[index] !== ' ') {
        chars[index] = ' ';
        onChange(chars.join('').trimEnd());
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        chars[index - 1] = ' ';
        onChange(chars.join('').trimEnd());
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputsRef.current[focusIndex]?.focus();
    }
  };

  const bufferedValue = getBufferedValue();

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => inputsRef.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={bufferedValue[i] !== ' ' ? bufferedValue[i] : ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold bg-white/50 border border-brand-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none transition-all"
        />
      ))}
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get('step') || 'otp';
  const email = searchParams.get('email') || '';
  const otpVal = searchParams.get('otp') || '';

  const [localOtp, setLocalOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email,
      otp: otpVal,
    }
  });

  const verifyMutation = useMutation({
    mutationFn: verifyOtpApi,
    onSuccess: () => {
      setSearchParams({ step: 'new_password', email, otp: localOtp });
    },
    onError: (error: ApiClientError) => {
      setOtpError(error.message || 'Invalid or expired OTP');
    }
  });

  const mutation = useMutation({
    mutationFn: resetPasswordApi,
    onSuccess: () => {
      alert('Password reset successfully! Please login with your new password.');
      navigate('/login');
    },
  });

  const apiError = mutation.error as ApiClientError | null;

  const onOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localOtp.length < 6 || localOtp.includes(' ')) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }
    setOtpError('');
    verifyMutation.mutate({ email, otp: localOtp });
  };

  return (
    <main
      className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: 'url(/authbac.jpeg)' }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#173C7F]/70 via-black/50 to-black/70"
        aria-hidden="true"
      />
      <div className="absolute -top-48 left-8 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-56 right-8 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg bg-white/75 backdrop-blur-xl rounded-3xl border border-white/30 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.65)] ring-1 ring-white/20 p-8 sm:p-12">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xl shadow-brand-500/30">
            {step === 'otp' ? <Key className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Security Reset</h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            {step === 'otp' 
              ? `We sent a 6-digit code to ${email || 'your email'}. Enter it below.`
              : 'Secure your account by creating a new password.'}
          </p>
        </header>

        {step === 'otp' ? (
          <form className="space-y-6" onSubmit={onOtpSubmit}>
            <div>
              <label className="mb-2 block text-sm font-bold text-center text-slate-800 uppercase tracking-wide">
                Verification Code (OTP)
              </label>
              <OtpBoxes value={localOtp} onChange={setLocalOtp} length={6} />
              {otpError && <p className="mt-2 text-sm text-center text-red-600 font-medium italic">{otpError}</p>}
            </div>

            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-brand-500/20 text-sm font-bold uppercase tracking-widest text-white bg-brand-600 hover:bg-brand-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify Code'}
            </button>
            <Link
              to="/forgot-password"
              className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit((data) => mutation.mutate({ ...data, email, otp: otpVal }))}>
            <input type="hidden" {...register('email')} />
            <input type="hidden" {...register('otp')} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="newPassword" className="mb-2 block text-sm font-bold text-slate-800 uppercase tracking-wide">
                  New Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-brand-100 pl-11 px-4 py-3 text-base outline-none ring-brand-400 transition focus:ring-2 bg-white/50"
                    {...register('newPassword')}
                  />
                </div>
                {errors.newPassword && <p className="mt-2 text-sm text-red-600 font-medium italic">{errors.newPassword.message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Confirm
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-brand-100 pl-11 px-4 py-3 text-base outline-none ring-brand-400 transition focus:ring-2 bg-white/50"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && <p className="mt-2 text-sm text-red-600 font-medium italic">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {apiError && (
              <p className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-700 font-medium text-center">
                {apiError.message}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-brand-500/20 text-sm font-bold uppercase tracking-widest text-white bg-brand-600 hover:bg-brand-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {mutation.isPending ? 'Updating Account...' : 'Update Password'}
            </button>

            <button
              onClick={() => setSearchParams({ step: 'otp', email })}
              type="button"
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to OTP
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
