import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { ApiClientError } from '../types/api';
import { useAuth } from '../features/auth/auth.context';
import { LoginFormValues, loginFormSchema } from '../features/auth/auth.schema';

export function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      tenantCode: '',
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormValues) => auth.login(payload),
    onSuccess: () => {
      navigate('/', { replace: true });
    },
  });

  const apiError = loginMutation.error as ApiClientError | null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-brand-100 bg-white/90 p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold text-brand-900">Smart School Rwanda</h1>
        <p className="mt-2 text-sm text-brand-700">Sign in to your school workspace.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
          noValidate
        >
          <div>
            <label htmlFor="tenantCode" className="mb-1 block text-sm font-semibold text-brand-800">
              School Code
            </label>
            <input
              id="tenantCode"
              type="text"
              autoComplete="organization"
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
              {...form.register('tenantCode')}
            />
            {form.formState.errors.tenantCode ? (
              <p className="mt-1 text-xs text-red-700" aria-live="polite">
                {form.formState.errors.tenantCode.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-brand-800">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="mt-1 text-xs text-red-700" aria-live="polite">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-brand-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-400 transition focus:ring"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="mt-1 text-xs text-red-700" aria-live="polite">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {apiError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" aria-live="polite">
              {apiError.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
