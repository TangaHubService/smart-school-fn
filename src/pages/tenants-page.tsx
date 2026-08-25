import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';

import { ConfirmDrawer } from '../components/confirm-drawer';
import { DrawerForm } from '../components/drawer-form';
import { AppDrawer } from '../components/drawer';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import {
  DataTable,
  DataTableToolbar,
  type DataTableColumn,
} from '../components/ui/data-table';
import { Badge } from '../components/ui/badge';
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
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
  name: z.string().trim().min(2).max(120),
  domain: z.string().trim().max(200).optional(),
  isAcademyCatalog: z.boolean().optional(),
});

const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const editSchoolSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
  name: z.string().trim().min(2).max(120),
  domain: z.string().trim().max(200).optional(),
  schoolDisplayName: z.string().trim().min(2).max(120),
  schoolEmail: z.string().trim().email().optional().or(z.literal('')),
  schoolPhone: z.string().trim().max(40).optional().or(z.literal('')),
  isAcademyCatalog: z.boolean(),
});

type CreateSchoolValues = z.infer<typeof createSchoolSchema>;
type InviteAdminValues = z.infer<typeof inviteAdminSchema>;

const tenantColumns: DataTableColumn<TenantListItem>[] = [
  {
    key: 'code',
    header: 'Code',
    mobile: 'secondary',
    render: (tenant) => (
      <span className="font-mono text-xs text-slate-700">{tenant.code}</span>
    ),
  },
  {
    key: 'name',
    header: 'School',
    mobile: 'primary',
    render: (tenant) => (
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">
          {tenant.school?.displayName ?? tenant.name}
        </span>
        <span className="block text-xs text-slate-500">{tenant.name}</span>
      </span>
    ),
  },
  {
    key: 'domain',
    header: 'Domain',
    render: (tenant) => <span className="text-slate-700">{tenant.domain ?? '—'}</span>,
  },
  {
    key: 'isAcademyCatalog',
    header: 'Academy',
    align: 'center',
    render: (tenant) =>
      tenant.isAcademyCatalog ? (
        <Badge tone="purple">Catalog</Badge>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ),
  },
  {
    key: 'setup',
    header: 'Setup',
    render: (tenant) => (
      <Badge tone={tenant.school?.setupCompletedAt ? 'success' : 'warning'}>
        {tenant.school?.setupCompletedAt ? 'Completed' : 'Action required'}
      </Badge>
    ),
  },
  {
    key: 'activeUsers',
    header: 'Users',
    align: 'center',
    render: (tenant) => <span className="tabular-nums text-slate-700">{tenant.activeUsers}</span>,
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (tenant) => (
      <span className="text-slate-700">{tenant.createdAt.slice(0, 10)}</span>
    ),
  },
];
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
  const [statusTargetSchool, setStatusTargetSchool] = useState<{
    id: string;
    name: string;
    isActive: boolean;
  } | null>(null);

  const isCreateModalOpen = searchParams.get('create') === '1';

  const createForm = useForm<CreateSchoolValues>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      code: '',
      name: '',
      domain: '',
      isAcademyCatalog: false,
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
      isAcademyCatalog: false,
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
        ...(values.isAcademyCatalog ? { isAcademyCatalog: true } : {}),
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
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not send invitation',
        message: error instanceof Error ? error.message : 'Invitation request failed.',
      });
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: (values: EditSchoolValues) =>
      updateTenantApi(auth.accessToken!, editSchoolId!, {
        code: values.code,
        name: values.name,
        domain: values.domain?.trim() ? values.domain.trim() : null,
        isAcademyCatalog: values.isAcademyCatalog,
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

  const tenants = useMemo(
    () => ((tenantsQuery.data as TenantListItem[]) ?? []) as TenantListItem[],
    [tenantsQuery.data]
  );

  useEffect(() => {
    if (!isCreateModalOpen) {
      createSchoolMutation.reset();
      inviteAdminMutation.reset();
      setCreatedSchool(null);
      createForm.reset({
        code: '',
        name: '',
        domain: '',
        isAcademyCatalog: false,
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
      isAcademyCatalog: Boolean(detail.isAcademyCatalog),
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
  const detailError = schoolDetailQuery.error as ApiClientError | null;
  const updateError = updateSchoolMutation.error as ApiClientError | null;

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
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.055)]">
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by code, school name, or domain"
          searchAriaLabel="Search schools"
          onReset={() => {
            setSearch('');
          }}
        />

        <div className="p-4">
          <DataTable<TenantListItem>
            ariaLabel="Schools"
            columns={tenantColumns}
            data={tenants}
            rowKey={(tenant) => tenant.id}
            showIndex
            loading={tenantsQuery.isPending}
            skeletonRows={6}
            error={
              tenantsQuery.isError
                ? {
                    title: 'Could not load schools',
                    message: 'Please retry. If the problem continues, check backend logs.',
                  }
                : null
            }
            onRetry={() => void tenantsQuery.refetch()}
            emptyTitle="No schools yet"
            emptyDescription="Create your first school to start onboarding administrators and setup."
            minWidth={980}
            className="border-0 shadow-none"
            rowActions={(tenant) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditSchoolId(null);
                    setViewSchoolId(tenant.id);
                  }}
                  className="rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                  className="rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                      ? 'rounded-lg border border-danger-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-danger-500 transition hover:bg-danger-50'
                      : 'rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50'
                  }
                >
                  {tenant.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <DrawerForm
        open={isCreateModalOpen}
        title={createdSchool ? 'Invite School Admin' : 'Create School'}
        onCancel={closeCreateModal}
        isLoading={createdSchool ? inviteAdminMutation.isPending : createSchoolMutation.isPending}
        submitLabel={createdSchool ? 'Send invitation' : 'Create school'}
        actions={
          createdSchool ? (
            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  inviteAdminMutation.reset();
                  setCreatedSchool(null);
                }}
                disabled={inviteAdminMutation.isPending}
                className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="submit"
                form="drawer-form"
                disabled={inviteAdminMutation.isPending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {inviteAdminMutation.isPending ? 'Sending...' : 'Send invitation'}
              </button>
            </div>
          ) : undefined
        }
        onSubmit={
          createdSchool
            ? inviteForm.handleSubmit((values) => inviteAdminMutation.mutate(values))
            : createForm.handleSubmit((values) => createSchoolMutation.mutate(values))
        }
      >
        {!createdSchool ? (
          <>
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

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-100 bg-white px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-brand-300"
                {...createForm.register('isAcademyCatalog')}
              />
              <span>
                <span className="font-semibold text-slate-900">Public academy catalog school</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Only one school should hold this role. Programs here appear on /academy for the
                  whole platform.
                </span>
              </span>
            </label>

            {createError ? (
              <StateView title="Could not create school" message={createError.message} />
            ) : null}
          </>
        ) : (
          <>
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
          </>
        )}
      </DrawerForm>

      <AppDrawer
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
      </AppDrawer>

      <DrawerForm
        open={Boolean(editSchoolId)}
        title="Edit School"
        onCancel={closeEditModal}
        isLoading={updateSchoolMutation.isPending}
        submitLabel="Save changes"
        onSubmit={editForm.handleSubmit((values) => updateSchoolMutation.mutate(values))}
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
          <>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School code
              <input
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                {...editForm.register('code')}
              />
            </label>
            <FieldError message={editForm.formState.errors.code?.message} />

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Workspace name
              <input
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                {...editForm.register('name')}
              />
            </label>
            <FieldError message={editForm.formState.errors.name?.message} />

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Domain (optional)
              <input
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                {...editForm.register('domain')}
              />
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School display name
              <input
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                {...editForm.register('schoolDisplayName')}
              />
            </label>
            <FieldError message={editForm.formState.errors.schoolDisplayName?.message} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-slate-800">
                School email (optional)
                <input
                  className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  {...editForm.register('schoolEmail')}
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-800">
                School phone (optional)
                <input
                  className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  {...editForm.register('schoolPhone')}
                />
              </label>
            </div>
            <FieldError message={editForm.formState.errors.schoolEmail?.message} />

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-100 bg-white px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-brand-300"
                {...editForm.register('isAcademyCatalog')}
              />
              <span>
                <span className="font-semibold text-slate-900">Public academy catalog school</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Checking this moves the catalog to this school and clears it from any other.
                </span>
              </span>
            </label>

            {updateError ? (
              <StateView title="Could not update school" message={updateError.message} />
            ) : null}
          </>
        )}
      </DrawerForm>

      <ConfirmDrawer
        open={Boolean(statusTargetSchool)}
        onCancel={closeDeleteModal}
        title={statusTargetSchool?.isActive ? 'Deactivate School' : 'Reactivate School'}
        message={
          statusTargetSchool?.isActive
            ? `Deactivating ${statusTargetSchool.name} signs out active sessions and revokes pending invites. The school can be reactivated later.`
            : `Reactivating ${statusTargetSchool?.name ?? 'this school'} allows users in this school to sign in again.`
        }
        confirmLabel={statusTargetSchool?.isActive ? 'Deactivate school' : 'Reactivate school'}
        isDestructive={statusTargetSchool?.isActive}
        isLoading={updateSchoolStatusMutation.isPending}
        onConfirm={() => {
          if (!statusTargetSchool?.id) {
            return;
          }

          updateSchoolStatusMutation.mutate({
            tenantId: statusTargetSchool.id,
            isActive: !statusTargetSchool.isActive,
          });
        }}
      />
    </SectionCard>
  );
}

function SchoolDetailView({ detail }: { detail: SchoolDetail }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailBlock label="School code" value={detail.code} mono />
        <DetailBlock
          label="Academy catalog"
          value={detail.isAcademyCatalog ? 'Yes — programs listed on /academy' : 'No'}
        />
        <DetailBlock label="Workspace name" value={detail.name} />
        <DetailBlock label="Display name" value={detail.school?.displayName ?? '-'} />
        <DetailBlock label="Domain" value={detail.domain ?? '-'} />
        <DetailBlock label="Email" value={detail.school?.email ?? '-'} />
        <DetailBlock label="Phone" value={detail.school?.phone ?? '-'} />
        <DetailBlock
          label="Address"
          value={
            [
              detail.school?.addressLine1,
              detail.school?.addressLine2,
              detail.school?.village,
              detail.school?.cell,
              detail.school?.sector,
              detail.school?.district,
              detail.school?.province,
            ]
              .filter(Boolean)
              .join(', ') || '-'
          }
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
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{invite.email}</p>
                    <p className="text-xs text-slate-500">{invite.roleName}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    Expires {invite.expiresAt.slice(0, 10)}
                  </span>
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
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 px-3 py-2 text-sm"
                >
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
      <p
        className={
          mono
            ? 'mt-1 font-mono text-sm text-slate-900'
            : 'mt-1 text-sm font-semibold text-slate-900'
        }
      >
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
