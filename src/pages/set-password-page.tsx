import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { resolvePostAuthPath } from '../features/auth/auth-helpers';
import {
  completePasswordChangeSchema,
  isPasswordChangeChallenge,
  type CompletePasswordChangeValues,
} from '../features/auth/auth.schema';
import { ApiClientError } from '../types/api';

/**
 * Shown when someone signs in with a starter password (their username or
 * student code). They must choose their own password before getting a session.
 */
export function SetPasswordPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? null;
  const { pendingPasswordChange, completePasswordChange } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CompletePasswordChangeValues>({
    resolver: zodResolver(completePasswordChangeSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!pendingPasswordChange) {
      navigate('/login', { replace: true });
    }
  }, [pendingPasswordChange, navigate]);

  const mutation = useMutation({
    mutationFn: (values: CompletePasswordChangeValues) =>
      completePasswordChange(values.newPassword),
    onSuccess: (data) => {
      if (isPasswordChangeChallenge(data)) return;
      navigate(resolvePostAuthPath(data.roles, returnTo), { replace: true });
    },
  });

  if (!pendingPasswordChange) return null;

  const apiError = mutation.error as ApiClientError | null;
  const { errors } = form.formState;

  return (
    <main className="flex min-h-screen items-center justify-center bg-content-bg px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('setPassword.back', { defaultValue: 'Back to sign in' })}
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold text-slate-900">
            {t('setPassword.title', { defaultValue: 'Choose your own password' })}
          </h1>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {t('setPassword.subtitle', {
            defaultValue:
              'You signed in with the starter password from your school. Set a private password to continue. You will use it from now on.',
          })}
        </p>

        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-800">
              {t('setPassword.newPassword', { defaultValue: 'New password' })}
            </label>
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby="new-password-help"
              className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
              {...form.register('newPassword')}
            />
            <p id="new-password-help" className="mt-1 text-xs text-slate-500">
              {t('setPassword.rules', {
                defaultValue:
                  'At least 8 characters, with a letter and a number. Not your username or student code.',
              })}
            </p>
            {errors.newPassword ? (
              <p className="mt-1 text-sm text-danger-600">{errors.newPassword.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-800">
              {t('setPassword.confirmPassword', { defaultValue: 'Confirm new password' })}
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
              {...form.register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {t('setPassword.show', { defaultValue: 'Show passwords' })}
          </label>

          {apiError ? (
            <p
              role="alert"
              className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700"
            >
              {describeError(apiError)}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {mutation.isPending
              ? t('setPassword.saving', { defaultValue: 'Saving…' })
              : t('setPassword.submit', { defaultValue: 'Save password and continue' })}
          </button>
        </form>
      </div>
    </main>
  );
}

function describeError(error: ApiClientError): string {
  switch (error.code) {
    case 'AUTH_PASSWORD_TOO_WEAK':
      return 'Choose a password that is different from your username or student code.';
    case 'AUTH_CHALLENGE_INVALID':
      return 'This sign-in has expired. Go back and sign in again.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a few minutes and try again.';
    default:
      return error.message;
  }
}
