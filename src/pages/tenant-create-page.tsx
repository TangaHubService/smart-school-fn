import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { createTenantApi } from '../features/sprint1/sprint1.api';
import { ApiClientError } from '../types/api';

const createTenantFormSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  domain: z.string().trim().max(200).optional(),
  schoolDisplayName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().toLowerCase().email(),
  adminFirstName: z.string().trim().min(2).max(80),
  adminLastName: z.string().trim().min(2).max(80),
  adminPassword: z.string().min(8).max(128),
});

type CreateTenantFormValues = z.infer<typeof createTenantFormSchema>;

export function TenantCreatePage() {
  const auth = useAuth();

  const form = useForm<CreateTenantFormValues>({
    resolver: zodResolver(createTenantFormSchema),
    defaultValues: {
      code: '',
      name: '',
      domain: '',
      schoolDisplayName: '',
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
      adminPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateTenantFormValues) =>
      createTenantApi(auth.accessToken!, {
        code: values.code,
        name: values.name,
        domain: values.domain || undefined,
        school: {
          displayName: values.schoolDisplayName,
          country: 'Rwanda',
          timezone: 'Africa/Kigali',
        },
        schoolAdmin: {
          email: values.adminEmail,
          firstName: values.adminFirstName,
          lastName: values.adminLastName,
          password: values.adminPassword,
        },
      }),
  });

  const apiError = mutation.error as ApiClientError | null;

  return (
    <SectionCard
      title="Create School Tenant"
      subtitle="SuperAdmin can onboard a new school and bootstrap a SchoolAdmin account in one flow."
    >
      <form
        className="grid gap-3"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Tenant code
          <input
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="new-school"
            {...form.register('code')}
          />
        </label>
        <FieldError message={form.formState.errors.code?.message} />

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Tenant name
          <input
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="New School Rwanda"
            {...form.register('name')}
          />
        </label>
        <FieldError message={form.formState.errors.name?.message} />

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Domain (optional)
          <input
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="new-school.local"
            {...form.register('domain')}
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          School display name
          <input
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="New School Rwanda"
            {...form.register('schoolDisplayName')}
          />
        </label>
        <FieldError message={form.formState.errors.schoolDisplayName?.message} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Admin first name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...form.register('adminFirstName')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Admin last name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...form.register('adminLastName')}
            />
          </label>
        </div>
        <FieldError message={form.formState.errors.adminFirstName?.message} />
        <FieldError message={form.formState.errors.adminLastName?.message} />

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Admin email
          <input
            type="email"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...form.register('adminEmail')}
          />
        </label>
        <FieldError message={form.formState.errors.adminEmail?.message} />

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Admin password
          <input
            type="password"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...form.register('adminPassword')}
          />
        </label>
        <FieldError message={form.formState.errors.adminPassword?.message} />

        {apiError ? (
          <StateView title="Could not create tenant" message={apiError.message} />
        ) : null}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating tenant...' : 'Create tenant'}
        </button>
      </form>

      {mutation.data ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Tenant <strong>{(mutation.data as any).tenant.code}</strong> created successfully.
          <div className="mt-2">
            <Link to="/super-admin/tenants" className="font-semibold text-green-900 underline">
              Back to tenants list
            </Link>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-xs text-red-700" aria-live="polite">
      {message}
    </p>
  );
}
