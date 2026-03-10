import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  createTenantApi,
  getTenantDetailApi,
  inviteTenantAdminApi,
  listTenantsApi,
  SchoolDetail,
  TenantListItem,
  updateTenantStatusApi,
  updateTenantApi,
} from '../features/sprint1/sprint1.api';
import { ApiClientError } from '../types/api';

const createSchoolSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
  name: z.string().trim().min(2).max(120),
  domain: z.string().trim().max(200).optional(),
});

const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const editSchoolSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
  name: z.string().trim().min(2).max(120),
  domain: z.string().trim().max(200).optional(),
  schoolDisplayName: z.string().trim().min(2).max(120),
  schoolEmail: z.string().trim().email().optional().or(z.literal('')),
  schoolPhone: z.string().trim().max(40).optional().or(z.literal('')),
});

type CreateSchoolValues = z.infer<typeof createSchoolSchema>;
type InviteAdminValues = z.infer<typeof inviteAdminSchema>;
type EditSchoolValues = z.infer<typeof editSchoolSchema>;

interface CreatedSchoolState {
  tenantId: string;
  code: string;
  name: string;
}

export function TenantsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [createdSchool, setCreatedSchool] = useState<CreatedSchoolState | null>(null);
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const [editSchoolId, setEditSchoolId] = useState<string | null>(null);
  const [statusTargetSchool, setStatusTargetSchool] = useState<{ id: string; name: string; isActive: boolean } | null>(null);

  const isCreateModalOpen = searchParams.get('create') === '1';

  const createForm = useForm<CreateSchoolValues>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      code: '',
      name: '',
      domain: '',
    },
  });

  const inviteForm = useForm<InviteAdminValues>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: {
      email: '',
    },
  });

  const editForm = useForm<EditSchoolValues>({
    resolver: zodResolver(editSchoolSchema),
    defaultValues: {
      code: '',
      name: '',
      domain: '',
      schoolDisplayName: '',
      schoolEmail: '',
      schoolPhone: '',
    },
  });

  const tenantsQuery = useQuery({
    queryKey: ['super-admin-tenants', search],
    queryFn: () =>
      listTenantsApi(auth.accessToken!, {
        page: 1,
        pageSize: 50,
        search: search.trim() || undefined,
      }),
  });

  const activeDetailSchoolId = viewSchoolId ?? editSchoolId;

  const schoolDetailQuery = useQuery({
    queryKey: ['super-admin-school-detail', activeDetailSchoolId],
    queryFn: () => getTenantDetailApi(auth.accessToken!, activeDetailSchoolId!),
    enabled: Boolean(activeDetailSchoolId),
  });

  const createSchoolMutation = useMutation({
    mutationFn: (values: CreateSchoolValues) =>
      createTenantApi(auth.accessToken!, {
        code: values.code,
        name: values.name,
        domain: values.domain || undefined,
        school: {
          displayName: values.name,
          country: 'Rwanda',
          timezone: 'Africa/Kigali',
        },
      }),
    onSuccess: async (result) => {
      const school = result as {
        tenant: { id: string; code: string; name: string };
      };

      setCreatedSchool({
        tenantId: school.tenant.id,
        code: school.tenant.code,
        name: school.tenant.name,
      });
      await queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      showToast({
        type: 'success',
        title: 'School created',
        message: `${school.tenant.name} is ready for school admin invitation.`,
      });
    },
  });

  const inviteAdminMutation = useMutation({
    mutationFn: (values: InviteAdminValues) =>
      inviteTenantAdminApi(auth.accessToken!, createdSchool!.tenantId, {
        email: values.email,
        expiresInDays: 7,
      }),
    onSuccess: async (result) => {
      const response = result as { email: string; tenant: { name: string; code: string } };
      await queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      showToast({
        type: 'success',
        title: 'Invitation sent',
        message: `School admin invite sent to ${response.email}.`,
      });
      closeCreateModal();
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: (values: EditSchoolValues) =>
      updateTenantApi(auth.accessToken!, editSchoolId!, {
        code: values.code,
        name: values.name,
        domain: values.domain?.trim() ? values.domain.trim() : null,
        school: {
          displayName: values.schoolDisplayName,
          email: values.schoolEmail?.trim() ? values.schoolEmail.trim() : null,
          phone: values.schoolPhone?.trim() ? values.schoolPhone.trim() : null,
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['super-admin-school-detail', editSchoolId] }),
      ]);
      showToast({
        type: 'success',
        title: 'School updated',
        message: 'School details have been updated.',
      });
      setEditSchoolId(null);
    },
  });

  const updateSchoolStatusMutation = useMutation({
    mutationFn: (input: { tenantId: string; isActive: boolean }) =>
      updateTenantStatusApi(auth.accessToken!, input.tenantId, { isActive: input.isActive }),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      showToast({
        type: 'success',
        title: input.isActive ? 'School enabled' : 'School disabled',
        message: input.isActive
          ? 'The school is now active and can sign in again.'
          : 'The school is now deactivated, active sessions were revoked, and pending invites were canceled.',
      });
      setStatusTargetSchool(null);
    },
  });

  const tenants = useMemo(() => ((tenantsQuery.data as TenantListItem[]) ?? []) as TenantListItem[], [
    tenantsQuery.data,
  ]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      createSchoolMutation.reset();
      inviteAdminMutation.reset();
      setCreatedSchool(null);
      createForm.reset({
        code: '',
        name: '',
        domain: '',
      });
      inviteForm.reset({
        email: '',
      });
    }
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (!editSchoolId || !schoolDetailQuery.data) {
      return;
    }

    const detail = schoolDetailQuery.data as SchoolDetail;
    editForm.reset({
      code: detail.code,
      name: detail.name,
      domain: detail.domain ?? '',
      schoolDisplayName: detail.school?.displayName ?? detail.name,
      schoolEmail: detail.school?.email ?? '',
      schoolPhone: detail.school?.phone ?? '',
    });
  }, [editSchoolId, schoolDetailQuery.data, editForm]);

  function closeViewModal() {
    setViewSchoolId(null);
  }

  function closeEditModal() {
    setEditSchoolId(null);
    updateSchoolMutation.reset();
  }

  function closeDeleteModal() {
    setStatusTargetSchool(null);
    updateSchoolStatusMutation.reset();
  }

  function openCreateModal() {
    const next = new URLSearchParams(searchParams);
    next.set('create', '1');
    setSearchParams(next);
  }

  function closeCreateModal() {
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next);
  }

  const createError = createSchoolMutation.error as ApiClientError | null;
  const inviteError = inviteAdminMutation.error as ApiClientError | null;
  const detailError = schoolDetailQuery.error as ApiClientError | null;
  const updateError = updateSchoolMutation.error as ApiClientError | null;
  const updateStatusError = updateSchoolStatusMutation.error as ApiClientError | null;

  return (
    <SectionCard
      title="Schools"
      subtitle="Manage all schools onboarded on the Smart School platform."
      action={
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
        >
          Add school
        </button>
      }
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
          placeholder="Search by code, school name, or domain"
          aria-label="Search schools"
        />
        <button
          type="button"
          onClick={() => void tenantsQuery.refetch()}
          className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Refresh
        </button>
      </div>

      {tenantsQuery.isPending ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {tenantsQuery.isError ? (
        <StateView
          title="Could not load schools"
          message="Please retry. If the problem continues, check backend logs."
          action={
            <button
              type="button"
              onClick={() => void tenantsQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!tenantsQuery.isPending && !tenantsQuery.isError && !tenants.length ? (
        <EmptyState
          title="No schools yet"
          message="Create your first school to start onboarding administrators and setup."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Create first school
            </button>
          }
        />
      ) : null}

      {!tenantsQuery.isPending && !tenantsQuery.isError && tenants.length ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-brand-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">School</th>
                <th className="px-3 py-2 font-semibold">Domain</th>
                <th className="px-3 py-2 font-semibold">Setup</th>
                <th className="px-3 py-2 font-semibold">Users</th>
                <th className="px-3 py-2 font-semibold">Created</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, index) => (
                <tr key={tenant.id} className="border-t border-brand-100">
                  <td className="px-3 py-2 align-middle text-slate-600">{index + 1}</td>
                  <td className="px-3 py-2 align-middle font-mono text-xs text-slate-700">{tenant.code}</td>
                  <td className="px-3 py-2 align-middle">
                    <p className="font-semibold text-slate-900">{tenant.school?.displayName ?? tenant.name}</p>
                    <p className="text-xs text-slate-500">{tenant.name}</p>
                  </td>
                  <td className="px-3 py-2 align-middle text-slate-700">{tenant.domain ?? '-'}</td>
                  <td className="px-3 py-2 align-middle">
                    <span
                      className={[
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                        tenant.school?.setupCompletedAt
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700',
                      ].join(' ')}
                    >
                      {tenant.school?.setupCompletedAt ? 'Completed' : 'Action required'}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle text-slate-700">{tenant.activeUsers}</td>
                  <td className="px-3 py-2 align-middle text-slate-700">{tenant.createdAt.slice(0, 10)}</td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditSchoolId(null);
                          setViewSchoolId(tenant.id);
                        }}
                        className="rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewSchoolId(null);
                          setEditSchoolId(tenant.id);
                          updateSchoolMutation.reset();
                        }}
                        className="rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStatusTargetSchool({
                            id: tenant.id,
                            name: tenant.school?.displayName ?? tenant.name,
                            isActive: tenant.isActive,
                          })
                        }
                        className={
                          tenant.isActive
                            ? 'rounded-lg border border-danger-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-danger-500'
                            : 'rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700'
                        }
                      >
                        {tenant.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        open={isCreateModalOpen}
        onClose={closeCreateModal}
        title={createdSchool ? 'Invite School Admin' : 'Create School'}
        description={
          createdSchool
            ? `Step 2 of 2. Send a school admin invitation for ${createdSchool.name}.`
            : 'Step 1 of 2. Create the school workspace first.'
        }
      >
        {!createdSchool ? (
          <form className="grid gap-3" onSubmit={createForm.handleSubmit((values) => createSchoolMutation.mutate(values))}>
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              Step 1 of 2: School workspace
            </div>

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School code
              <input
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="green-school-rwanda"
                {...createForm.register('code')}
              />
            </label>
            <FieldError message={createForm.formState.errors.code?.message} />

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School name
              <input
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="Green School Rwanda"
                {...createForm.register('name')}
              />
            </label>
            <FieldError message={createForm.formState.errors.name?.message} />

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Domain (optional)
              <input
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="green.smartschool.rw"
                {...createForm.register('domain')}
              />
            </label>

            {createError ? <StateView title="Could not create school" message={createError.message} /> : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSchoolMutation.isPending}
                className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {createSchoolMutation.isPending ? 'Creating...' : 'Create school'}
              </button>
            </div>
          </form>
        ) : (
          <form className="grid gap-3" onSubmit={inviteForm.handleSubmit((values) => inviteAdminMutation.mutate(values))}>
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              Step 2 of 2: School admin invitation
            </div>

            <div className="rounded-lg border border-brand-100 bg-white px-3 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{createdSchool.name}</p>
              <p className="mt-1 text-xs text-slate-500">School code: {createdSchool.code}</p>
            </div>

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School admin email
              <input
                type="email"
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="admin@school.rw"
                {...inviteForm.register('email')}
              />
            </label>
            <FieldError message={inviteForm.formState.errors.email?.message} />

            {inviteError ? <StateView title="Could not send invitation" message={inviteError.message} /> : null}

            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  inviteAdminMutation.reset();
                  setCreatedSchool(null);
                }}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={inviteAdminMutation.isPending}
                className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {inviteAdminMutation.isPending ? 'Sending...' : 'Send invitation'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(viewSchoolId)}
        onClose={closeViewModal}
        title="School Details"
        description="View school profile, pending admin invites, and current users."
      >
        {schoolDetailQuery.isPending ? (
          <div className="grid gap-2" role="status" aria-live="polite">
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          </div>
        ) : detailError ? (
          <StateView title="Could not load school details" message={detailError.message} />
        ) : schoolDetailQuery.data ? (
          <SchoolDetailView detail={schoolDetailQuery.data as SchoolDetail} />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editSchoolId)}
        onClose={closeEditModal}
        title="Edit School"
        description="Update school workspace details without changing academic data."
      >
        {schoolDetailQuery.isPending ? (
          <div className="grid gap-2" role="status" aria-live="polite">
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          </div>
        ) : detailError ? (
          <StateView title="Could not load school for editing" message={detailError.message} />
        ) : (
          <form className="grid gap-3" onSubmit={editForm.handleSubmit((values) => updateSchoolMutation.mutate(values))}>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School code
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...editForm.register('code')} />
            </label>
            <FieldError message={editForm.formState.errors.code?.message} />

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Workspace name
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...editForm.register('name')} />
            </label>
            <FieldError message={editForm.formState.errors.name?.message} />

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Domain (optional)
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...editForm.register('domain')} />
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School display name
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...editForm.register('schoolDisplayName')} />
            </label>
            <FieldError message={editForm.formState.errors.schoolDisplayName?.message} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-slate-800">
                School email (optional)
                <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...editForm.register('schoolEmail')} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-800">
                School phone (optional)
                <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...editForm.register('schoolPhone')} />
              </label>
            </div>
            <FieldError message={editForm.formState.errors.schoolEmail?.message} />

            {updateError ? <StateView title="Could not update school" message={updateError.message} /> : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateSchoolMutation.isPending}
                className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {updateSchoolMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(statusTargetSchool)}
        onClose={closeDeleteModal}
        title={statusTargetSchool?.isActive ? 'Deactivate School' : 'Reactivate School'}
        description={
          statusTargetSchool?.isActive
            ? 'Deactivating a school signs out active sessions and revokes pending invites. The school can be reactivated later.'
            : 'Reactivating a school allows users in this school to sign in again.'
        }
      >
        <div className="grid gap-3">
          <div
            className={
              statusTargetSchool?.isActive
                ? 'rounded-lg border border-danger-100 bg-danger-50 px-3 py-3 text-sm text-danger-700'
                : 'rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-700'
            }
          >
            {statusTargetSchool?.isActive ? 'You are about to deactivate ' : 'You are about to reactivate '}
            <strong>{statusTargetSchool?.name}</strong>.
          </div>
          {updateStatusError ? (
            <StateView
              title={statusTargetSchool?.isActive ? 'Could not deactivate school' : 'Could not reactivate school'}
              message={updateStatusError.message}
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDeleteModal}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!statusTargetSchool?.id || updateSchoolStatusMutation.isPending}
              onClick={() => {
                if (!statusTargetSchool?.id) {
                  return;
                }

                updateSchoolStatusMutation.mutate({
                  tenantId: statusTargetSchool.id,
                  isActive: !statusTargetSchool.isActive,
                });
              }}
              className={
                statusTargetSchool?.isActive
                  ? 'rounded-lg border border-danger-200 bg-danger-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60'
                  : 'rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60'
              }
            >
              {updateSchoolStatusMutation.isPending
                ? statusTargetSchool?.isActive
                  ? 'Deactivating...'
                  : 'Reactivating...'
                : statusTargetSchool?.isActive
                  ? 'Deactivate school'
                  : 'Reactivate school'}
            </button>
          </div>
        </div>
      </Modal>
    </SectionCard>
  );
}

function SchoolDetailView({ detail }: { detail: SchoolDetail }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailBlock label="School code" value={detail.code} mono />
        <DetailBlock label="Workspace name" value={detail.name} />
        <DetailBlock label="Display name" value={detail.school?.displayName ?? '-'} />
        <DetailBlock label="Domain" value={detail.domain ?? '-'} />
        <DetailBlock label="Email" value={detail.school?.email ?? '-'} />
        <DetailBlock label="Phone" value={detail.school?.phone ?? '-'} />
        <DetailBlock
          label="Address"
          value={[
            detail.school?.addressLine1,
            detail.school?.addressLine2,
            detail.school?.village,
            detail.school?.cell,
            detail.school?.sector,
            detail.school?.district,
            detail.school?.province,
          ]
            .filter(Boolean)
            .join(', ') || '-'}
        />
        <DetailBlock
          label="Setup status"
          value={detail.school?.setupCompletedAt ? 'Completed' : 'Action required'}
        />
      </div>

      <div className="rounded-lg border border-brand-100 bg-white">
        <div className="border-b border-brand-100 px-4 py-3">
          <h4 className="text-sm font-bold text-slate-900">Pending Invites</h4>
        </div>
        <div className="px-4 py-3">
          {detail.pendingInvites.length ? (
            <div className="grid gap-2">
              {detail.pendingInvites.map((invite) => (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{invite.email}</p>
                    <p className="text-xs text-slate-500">{invite.roleName}</p>
                  </div>
                  <span className="text-xs text-slate-500">Expires {invite.expiresAt.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No pending invites.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-brand-100 bg-white">
        <div className="border-b border-brand-100 px-4 py-3">
          <h4 className="text-sm font-bold text-slate-900">Users</h4>
        </div>
        <div className="px-4 py-3">
          {detail.users.length ? (
            <div className="grid gap-2">
              {detail.users.map((user) => (
                <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    {user.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No users created yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-brand-100 bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={mono ? 'mt-1 font-mono text-sm text-slate-900' : 'mt-1 text-sm font-semibold text-slate-900'}>
        {value}
      </p>
    </div>
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
