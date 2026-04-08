import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { forgotPasswordApi } from '../features/auth/auth.api';
import { forgotPasswordSchema, ForgotPasswordInput } from '../features/auth/auth.schema';
import { ApiClientError } from '../types/api';

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: forgotPasswordApi,
    onSuccess: (_, variables) => {
      navigate(`/reset-password?step=otp&email=${encodeURIComponent(variables.email)}`);
    },
  });

  const apiError = mutation.error as ApiClientError | null;

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

      <div className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row gap-8 bg-white/75 backdrop-blur-xl rounded-3xl border border-white/30 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.65)] ring-1 ring-white/20 overflow-hidden lg:min-h-[500px]">
        {/* Form Side */}
        <div className="flex-1 p-8 sm:p-12">
          <header className="mb-8">
            <Link to="/login" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700 transition mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('forgot.backToLogin')}
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('forgot.title')}</h1>
            <p className="mt-3 text-slate-600 leading-relaxed">
              {t('forgot.subtitle')}
            </p>
          </header>

          <form className="space-y-6" onSubmit={handleSubmit((data) => mutation.mutate(data))}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-800 uppercase tracking-wide">
                {t('forgot.registeredEmail')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder={t('forgot.emailPlaceholder')}
                  className="w-full rounded-2xl border border-brand-100 pl-10 px-4 py-3 text-base outline-none ring-brand-400 transition focus:ring-2 bg-white/50"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 font-medium italic">{errors.email.message}</p>
              )}
            </div>

            {apiError && (
              <p className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-700 font-medium">
                {apiError.message}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-brand-500/20 text-sm font-bold uppercase tracking-widest text-white bg-brand-600 hover:bg-brand-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {mutation.isPending ? t('forgot.sending') : t('forgot.sendOtp')}
            </button>
          </form>
        </div>

        {/* Info Side */}
        <div className="hidden md:flex w-80 lg:w-96 flex-col border-l border-white/20 p-8 sm:p-12">
          <div className="space-y-8">
            <h3 className="text-sm font-black text-brand-700 uppercase tracking-[0.2em]">{t('forgot.guidelines')}</h3>
            
            <ul className="space-y-6">
              {[
                "Enter your registered email to request a temporary One-Time Password.",
                "Check your inbox and spam folder for the 6-digit verification code.",
                "Use the OTP on the reset page to create your new secure password.",
                "Cannot access your email? Please contact your School Administrator for manual reset."
              ].map((tip, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-lg shadow-brand-500/20">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-700 font-medium">
                    {tip}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
