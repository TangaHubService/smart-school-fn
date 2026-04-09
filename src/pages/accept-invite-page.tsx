import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { useToast } from '../components/toast';
import { acceptInviteApi } from '../features/sprint1/sprint1.api';

const acceptInviteSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(30).or(z.literal('')),
  password: z.string().min(8).max(128),
});

type AcceptInviteForm = z.infer<typeof acceptInviteSchema>;

export function AcceptInvitePage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

  useEffect(() => {
    if (token) {
      return;
    }

    showToast({
      type: 'error',
      title: t('invite.invalidInviteTitle'),
      message: t('invite.invalidInviteMessage'),
    });
    navigate('/login', { replace: true });
  }, [navigate, showToast, t, token]);

  const form = useForm<AcceptInviteForm>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: AcceptInviteForm) =>
      acceptInviteApi({
        token,
        ...values,
        phone: values.phone.trim() ? values.phone.trim() : undefined,
      }),
    onSuccess: (result) => {
      showToast({
        type: 'success',
        title: t('invite.acceptedTitle'),
        message: t('invite.acceptedMessage'),
      });
      navigate(`/login?email=${encodeURIComponent((result as any).email)}`, {
        replace: true,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: t('invite.failedTitle'),
        message: error instanceof Error ? error.message : t('invite.failedFallback'),
      });
    },
  });

  if (!token) {
    return null;
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: 'url(/authbac.jpeg)' }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#173C7F]/60 via-black/40 to-black/70"
        aria-hidden="true"
      />
      <div className="absolute -top-48 left-8 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-56 right-8 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/30 bg-white/75 p-5 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.6)] ring-1 ring-white/20 backdrop-blur-xl sm:p-8">
        <h1 className="text-xl font-bold text-slate-900">{t('invite.title')}</h1>
        <p className="mt-1 text-sm text-slate-700">{t('invite.subtitle')}</p>

        <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-1">
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder={t('invite.firstName')} {...form.register('firstName')} />
            {form.formState.errors.firstName ? <p className="text-xs text-red-700">{form.formState.errors.firstName.message}</p> : null}
          </div>
          <div className="grid gap-1">
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder={t('invite.lastName')} {...form.register('lastName')} />
            {form.formState.errors.lastName ? <p className="text-xs text-red-700">{form.formState.errors.lastName.message}</p> : null}
          </div>
          <div className="grid gap-1">
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder={t('invite.phone')} {...form.register('phone')} />
            {form.formState.errors.phone ? <p className="text-xs text-red-700">{form.formState.errors.phone.message}</p> : null}
          </div>
          <div className="grid gap-1">
            <input type="password" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder={t('invite.password')} {...form.register('password')} />
            {form.formState.errors.password ? <p className="text-xs text-red-700">{form.formState.errors.password.message}</p> : null}
          </div>
          <button className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t('invite.accepting') : t('invite.accept')}
          </button>
        </form>
      </section>
    </main>
  );
}
