import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { acceptInviteApi } from '../features/sprint1/sprint1.api';
import { ApiClientError } from '../types/api';

const acceptInviteSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(30),
  password: z.string().min(8).max(128),
});

type AcceptInviteForm = z.infer<typeof acceptInviteSchema>;

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

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
      }),
    onSuccess: (result) => {
      showToast({
        type: 'success',
        title: 'Invitation accepted',
        message: 'Sign in with your email and password.',
      });
      navigate(`/login?email=${encodeURIComponent((result as any).email)}`, {
        replace: true,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Invite acceptance failed',
        message: error instanceof Error ? error.message : 'Failed to accept invite',
      });
    },
  });

  const apiError = mutation.error as ApiClientError | null;

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <StateView title="Invalid invite" message="Invite token is missing from the URL." />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
        <h1 className="text-xl font-bold text-slate-900">Accept staff invite</h1>
        <p className="mt-1 text-sm text-slate-700">Create your account to join the school.</p>

        <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-1">
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="First name" {...form.register('firstName')} />
            {form.formState.errors.firstName ? <p className="text-xs text-red-700">{form.formState.errors.firstName.message}</p> : null}
          </div>
          <div className="grid gap-1">
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="Last name" {...form.register('lastName')} />
            {form.formState.errors.lastName ? <p className="text-xs text-red-700">{form.formState.errors.lastName.message}</p> : null}
          </div>
          <div className="grid gap-1">
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="Phone number" {...form.register('phone')} />
            {form.formState.errors.phone ? <p className="text-xs text-red-700">{form.formState.errors.phone.message}</p> : null}
          </div>
          <div className="grid gap-1">
            <input type="password" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="Password" {...form.register('password')} />
            {form.formState.errors.password ? <p className="text-xs text-red-700">{form.formState.errors.password.message}</p> : null}
          </div>
          <button className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Accepting...' : 'Accept invite'}
          </button>
        </form>

        {apiError ? <StateView title="Could not accept invite" message={apiError.message} /> : null}
      </section>
    </main>
  );
}
