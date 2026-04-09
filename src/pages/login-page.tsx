import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { HelpCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { registerApi } from '../features/auth/auth.api';
import {
  type LoginFormValues,
  type RegisterInput,
  loginFormSchema,
  registerFormSchema,
} from '../features/auth/auth.schema';
import { ApiClientError } from '../types/api';

type AuthTab = 'login' | 'register';

function combineReturnTo(basePath: string | null, plan: string | null) {
  if (!basePath || !basePath.startsWith('/')) {
    return null;
  }

  const params = new URLSearchParams();
  if (plan) {
    params.set('plan', plan);
  }

  const suffix = params.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

export function LoginPage() {
  const { t } = useTranslation('auth');
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState<AuthTab>(requestedTab);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const emailFromQuery = searchParams.get('email') ?? '';
  const requestedPlan = searchParams.get('plan');
  const returnTo = useMemo(
    () => combineReturnTo(searchParams.get('returnTo'), requestedPlan),
    [requestedPlan, searchParams],
  );

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: emailFromQuery,
      password: '',
    },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: emailFromQuery,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    if (!emailFromQuery) {
      return;
    }
    loginForm.setValue('identifier', emailFromQuery);
    registerForm.setValue('email', emailFromQuery);
  }, [emailFromQuery, loginForm, registerForm]);

  function resolvePostAuthPath(roles: string[]) {
    if (returnTo) {
      return returnTo;
    }

    if (roles.includes('STUDENT')) {
      return '/student/dashboard';
    }

    if (roles.includes('PUBLIC_LEARNER')) {
      return '/student/courses';
    }

    return '/dashboard';
  }

  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormValues) => auth.login(payload),
    onSuccess: (data) => {
      navigate(resolvePostAuthPath(data.roles), { replace: true });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterInput) => registerApi(payload),
    onSuccess: (data) => {
      auth.setSessionTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      navigate(resolvePostAuthPath(data.roles), { replace: true });
    },
  });

  const loginError = loginMutation.error as ApiClientError | null;
  const registerError = registerMutation.error as ApiClientError | null;

  const helperText =
    returnTo === '/academy' || returnTo?.startsWith('/academy?')
      ? 'Create or sign in to your academy learner account, then choose your plan and subjects.'
      : t('login.subtitle');

  function switchTab(nextTab: AuthTab) {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
  }

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

      <section className="relative z-10 w-full max-w-xl rounded-3xl border border-white/30 bg-white/80 p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.65)] ring-1 ring-white/20 backdrop-blur-xl sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">{t('login.brand')}</h1>
        <p className="mt-2 text-sm text-slate-700">{helperText}</p>
        {requestedPlan ? (
          <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
            Selected plan: <span className="font-semibold capitalize">{requestedPlan}</span>
          </div>
        ) : null}

        {activeTab === 'login' ? (
          <form
            className="mt-6 space-y-4"
            onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))}
            noValidate
          >
            <div>
              <label htmlFor="identifier" className="mb-1 block text-sm font-semibold text-slate-800">
                {t('login.identifier')}
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder={t('login.identifierPlaceholder')}
                className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
                {...loginForm.register('identifier')}
              />
              {loginForm.formState.errors.identifier ? (
                <p className="mt-1 text-xs text-red-700" aria-live="polite">
                  {loginForm.formState.errors.identifier.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-slate-800">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 pr-16 text-sm outline-none ring-brand-400 transition focus:ring"
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  aria-label={showLoginPassword ? t('login.hidePasswordAria') : t('login.showPasswordAria')}
                >
                  {showLoginPassword ? t('login.hidePassword') : t('login.showPassword')}
                </button>
              </div>
              {loginForm.formState.errors.password ? (
                <p className="mt-1 text-xs text-red-700" aria-live="polite">
                  {loginForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            {loginError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {loginError.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loginMutation.isPending ? t('login.signingIn') : t('login.signIn')}
            </button>

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="font-semibold text-brand-600 transition hover:text-brand-700"
              >
                Create one
              </button>
            </p>

            <div className="pt-2 flex justify-center">
              <Link
                to="/forgot-password"
                className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition"
              >
                <HelpCircle className="h-4 w-4" />
                {t('login.forgotPassword')}
              </Link>
            </div>
          </form>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={registerForm.handleSubmit((values) => registerMutation.mutate(values))}
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="mb-1 block text-sm font-semibold text-slate-800">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
                  {...registerForm.register('firstName')}
                />
                {registerForm.formState.errors.firstName ? (
                  <p className="mt-1 text-xs text-red-700">{registerForm.formState.errors.firstName.message}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1 block text-sm font-semibold text-slate-800">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
                  {...registerForm.register('lastName')}
                />
                {registerForm.formState.errors.lastName ? (
                  <p className="mt-1 text-xs text-red-700">{registerForm.formState.errors.lastName.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="username" className="mb-1 block text-sm font-semibold text-slate-800">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
                  {...registerForm.register('username')}
                />
                {registerForm.formState.errors.username ? (
                  <p className="mt-1 text-xs text-red-700">{registerForm.formState.errors.username.message}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="register-email" className="mb-1 block text-sm font-semibold text-slate-800">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
                  {...registerForm.register('email')}
                />
                {registerForm.formState.errors.email ? (
                  <p className="mt-1 text-xs text-red-700">{registerForm.formState.errors.email.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="register-password" className="mb-1 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-brand-200 px-3 py-2 pr-16 text-sm outline-none ring-brand-400 transition focus:ring"
                    {...registerForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    {showRegisterPassword ? t('login.hidePassword') : t('login.showPassword')}
                  </button>
                </div>
                {registerForm.formState.errors.password ? (
                  <p className="mt-1 text-xs text-red-700">{registerForm.formState.errors.password.message}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold text-slate-800">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-brand-200 px-3 py-2 pr-16 text-sm outline-none ring-brand-400 transition focus:ring"
                    {...registerForm.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterConfirmPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    {showRegisterConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword ? (
                  <p className="mt-1 text-xs text-red-700">{registerForm.formState.errors.confirmPassword.message}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Use at least 8 characters with uppercase, lowercase, number, and special character.
            </div>

            {registerError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {registerError.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
            </button>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="font-semibold text-brand-600 transition hover:text-brand-700"
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
