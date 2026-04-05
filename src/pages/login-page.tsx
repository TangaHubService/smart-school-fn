import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FieldError, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { LoginFormValues, loginFormSchema } from '../features/auth/auth.schema';
import { ApiClientError } from '../types/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryTips, setShowRecoveryTips] = useState(false);

  const emailFromQuery = searchParams.get('email') ?? '';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: emailFromQuery,
      password: '',
    },
  });

  useEffect(() => {
    if (emailFromQuery) {
      form.setValue('identifier', emailFromQuery);
    }
  }, [emailFromQuery, form]);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormValues) => auth.login(payload),
    onSuccess: (data) => {
      if (data.roles.includes('STUDENT')) {
        navigate('/student/dashboard', { replace: true });
      } else if (data.roles.includes('PUBLIC_LEARNER')) {
        navigate('/student/courses', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    },
  });

  const apiError = loginMutation.error as ApiClientError | null;
  const formErrors = form.formState.errors as Partial<
    Record<'identifier' | 'password', FieldError>
  >;

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

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/30 bg-white/75 p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.65)] ring-1 ring-white/20 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Smart School Rwanda</h1>
        <p className="mt-2 text-sm text-slate-700">Sign in to your school workspace.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
          noValidate
        >
          <div>
            <label htmlFor="identifier" className="mb-1 block text-sm font-semibold text-slate-800">
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder="e.g. teacher@school.com or STU001"
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
              {...form.register('identifier')}
            />
            {formErrors.identifier ? (
              <p className="mt-1 text-xs text-red-700" aria-live="polite">
                {formErrors.identifier.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-800">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full rounded-xl border border-brand-200 px-3 py-2 pr-16 text-sm outline-none ring-brand-400 transition focus:ring"
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {formErrors.password ? (
              <p className="mt-1 text-xs text-red-700" aria-live="polite">
                {formErrors.password.message}
              </p>
            ) : null}
          </div>

          {apiError ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              aria-live="polite"
            >
              {apiError.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-center">
          <Link
            to="/forgot-password"
            className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition"
          >
            <HelpCircle className="h-4 w-4" />
            Forgot Password?
          </Link>
        </div>
      </section>
    </main>
  );
}
