import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, RefreshCw, School } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AppDrawer } from '../components/drawer';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { Skeleton } from '../components/skeleton-loader';
import { useToast } from '../components/toast';
import {
  DataTable,
  type DataTableColumn,
} from '../components/ui/data-table';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../features/auth/auth.context';
import {
  grantAcademyAccessApi,
  listAcademyCatalogProgramsAdminApi,
  listAcademyEnrollmentsAdminApi,
  listSchoolSubscriptionsApi,
  listSubscriptionPlansApi,
  updateSchoolSubscriptionApi,
  type SchoolSubscriptionRow,
  type AcademyEnrollmentAdminRow,
} from '../features/subscriptions/subscriptions.api';
import { ApiClientError } from '../types/api';

type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

const SUBSCRIPTION_STATUS_TONES: Record<SubscriptionStatus, 'brand' | 'success' | 'warning' | 'danger'> = {
  TRIALING: 'brand',
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELLED: 'danger',
};

const schoolSubColumns: DataTableColumn<SchoolSubscriptionRow>[] = [
  {
    key: 'schoolName',
    header: 'School',
    mobile: 'primary',
    render: (row) => (
      <span className="min-w-0">
        <span className="block font-medium text-slate-900">{row.schoolName}</span>
        <span className="block text-xs text-slate-500">{row.tenantCode}</span>
      </span>
    ),
  },
  {
    key: 'plan',
    header: 'Plan',
    mobile: 'secondary',
    render: (row) => <span className="text-slate-700">{row.plan.name}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={SUBSCRIPTION_STATUS_TONES[row.status as SubscriptionStatus] ?? 'neutral'}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: 'currentPeriodEnd',
    header: 'Period end',
    render: (row) => (
      <span className="text-slate-600">
        {row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString() : '—'}
      </span>
    ),
  },
];

const enrollmentColumns: DataTableColumn<AcademyEnrollmentAdminRow>[] = [
  {
    key: 'learner',
    header: 'Learner',
    mobile: 'primary',
    render: (row) => (
      <span className="min-w-0">
        <span className="block font-medium text-slate-900">{row.userName || row.userEmail}</span>
        <span className="block text-xs text-slate-500">{row.userEmail}</span>
      </span>
    ),
  },
  {
    key: 'programTitle',
    header: 'Program',
    mobile: 'secondary',
    render: (row) => <span className="text-slate-700">{row.programTitle}</span>,
  },
  {
    key: 'access',
    header: 'Access',
    render: (row) => (
      <Badge tone={row.isActive ? 'success' : 'neutral'}>
        {row.isActive ? 'Active' : 'Inactive'}
        {row.isTrial ? ' · Trial' : ''}
      </Badge>
    ),
  },
  {
    key: 'lastPayment',
    header: 'Payment',
    render: (row) => (
      <span className="text-xs text-slate-600">
        {row.lastPayment
          ? `${row.lastPayment.status}${
              row.lastPayment.status === 'COMPLETED'
                ? ''
                : ` · ${row.lastPayment.amount} ${row.lastPayment.currency}`
            }`
          : '—'}
      </span>
    ),
  },
  {
    key: 'expiresAt',
    header: 'Expires',
    render: (row) => (
      <span className="text-slate-600">
        {row.expiresAt ? new Date(row.expiresAt).toLocaleString() : 'Open-ended'}
      </span>
    ),
  },
];

export function SubscriptionManagementPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const token = auth.accessToken ?? '';

  const [grantOpen, setGrantOpen] = useState(false);
  const [editSub, setEditSub] = useState<SchoolSubscriptionRow | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantProgramId, setGrantProgramId] = useState('');
  const [grantDays, setGrantDays] = useState('');

  const schoolSubsQuery = useQuery({
    queryKey: ['subscriptions', 'schools'],
    enabled: Boolean(token),
    queryFn: () => listSchoolSubscriptionsApi(token),
  });

  const plansQuery = useQuery({
    queryKey: ['subscription-plans'],
    enabled: Boolean(token),
    queryFn: () => listSubscriptionPlansApi(token),
  });

  const catalogProgramsQuery = useQuery({
    queryKey: ['subscriptions', 'academy-catalog-programs'],
    enabled: Boolean(token) && grantOpen,
    queryFn: () => listAcademyCatalogProgramsAdminApi(token),
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['subscriptions', 'academy-enrollments'],
    enabled: Boolean(token),
    queryFn: () => listAcademyEnrollmentsAdminApi(token, { page: 1, pageSize: 100 }),
  });

  const grantMutation = useMutation({
    mutationFn: () =>
      grantAcademyAccessApi(token, {
        email: grantEmail.trim() || undefined,
        programId: grantProgramId,
        durationDays: grantDays.trim() ? parseInt(grantDays, 10) : undefined,
      }),
    onSuccess: (data) => {
      showToast({
        type: 'success',
        title: 'Access granted',
        message: `${data.email} · ${data.programTitle}`,
      });
      setGrantOpen(false);
      setGrantEmail('');
      setGrantProgramId('');
      setGrantDays('');
      void queryClient.invalidateQueries({ queryKey: ['subscriptions', 'academy-enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'super-admin'] });
    },
    onError: (e: unknown) => {
      const err = e as ApiClientError;
      showToast({ type: 'error', title: 'Could not grant access', message: err.message });
    },
  });

  const updateSubMutation = useMutation({
    mutationFn: async (payload: {
      tenantId: string;
      planId: string;
      status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
    }) => {
      await updateSchoolSubscriptionApi(token, payload.tenantId, {
        planId: payload.planId,
        status: payload.status,
      });
    },
    onSuccess: () => {
      showToast({ type: 'success', title: 'Subscription updated' });
      setEditSub(null);
      void queryClient.invalidateQueries({ queryKey: ['subscriptions', 'schools'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'super-admin'] });
    },
    onError: (e: unknown) => {
      const err = e as ApiClientError;
      showToast({ type: 'error', title: 'Update failed', message: err.message });
    },
  });

  const programOptions = useMemo(
    () => catalogProgramsQuery.data?.items ?? [],
    [catalogProgramsQuery.data?.items]
  );

  const isError = schoolSubsQuery.isError || plansQuery.isError || enrollmentsQuery.isError;

  if (isError) {
    return (
      <StateView
        title="Could not load billing data"
        message="Check your connection and permissions, then retry."
        action={
          <button
            type="button"
            onClick={() => {
              void schoolSubsQuery.refetch();
              void plansQuery.refetch();
              void enrollmentsQuery.refetch();
            }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const loading = schoolSubsQuery.isPending || plansQuery.isPending || enrollmentsQuery.isPending;

  return (
    <div className="space-y-6">
      <SectionCard title="Billing & subscriptions">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGrantOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Grant access
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : (
          <>
            <section className="mb-8 overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <School className="h-4 w-4 text-brand-600" aria-hidden />
                <h3 className="text-sm font-semibold text-slate-900">
                  School subscriptions (SaaS)
                </h3>
              </div>
              <div className="p-4">
                <DataTable<SchoolSubscriptionRow>
                  ariaLabel="School subscriptions"
                  columns={schoolSubColumns}
                  data={schoolSubsQuery.data?.items ?? []}
                  rowKey={(row) => row.tenantId}
                  emptyTitle="No school subscription rows yet"
                  emptyDescription="Assign plans to schools from here after creating tenants."
                  minWidth={620}
                  className="border-0 shadow-none"
                  rowActions={(row) => (
                    <button
                      type="button"
                      onClick={() => setEditSub(row)}
                      aria-label={`Adjust subscription for ${row.schoolName}`}
                      className="text-xs font-semibold text-brand-600 transition hover:text-brand-700"
                    >
                      Adjust
                    </button>
                  )}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <CreditCard className="h-4 w-4 text-brand-600" aria-hidden />
                <h3 className="text-sm font-semibold text-slate-900">
                  Academy learners (catalog enrollments)
                </h3>
                <button
                  type="button"
                  onClick={() => void enrollmentsQuery.refetch()}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Refresh
                </button>
              </div>
              <div className="p-4">
                <DataTable<AcademyEnrollmentAdminRow>
                  ariaLabel="Academy learner enrollments"
                  columns={enrollmentColumns}
                  data={enrollmentsQuery.data?.items ?? []}
                  rowKey={(row) => row.id}
                  emptyTitle="No enrollments yet"
                  minWidth={640}
                  className="border-0 shadow-none"
                />
              </div>
            </section>
          </>
        )}
      </SectionCard>

      <AppDrawer
        open={grantOpen}
        onClose={() => !grantMutation.isPending && setGrantOpen(false)}
        title="Grant access"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setGrantOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              disabled={grantMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={grantMutation.isPending || !grantEmail.trim() || !grantProgramId}
              onClick={() => grantMutation.mutate()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {grantMutation.isPending ? 'Saving…' : 'Grant access'}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 text-sm">
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Learner email</span>
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="name@example.com"
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-400"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Program</span>
            {catalogProgramsQuery.isPending ? (
              <Skeleton className="h-10 rounded-lg" label="Loading programs" />
            ) : catalogProgramsQuery.isError ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Could not load programs.
              </p>
            ) : !catalogProgramsQuery.data?.catalogConfigured || programOptions.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                No programs available.
              </p>
            ) : (
              <select
                value={grantProgramId}
                onChange={(e) => setGrantProgramId(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-400"
              >
                <option value="">Choose…</option>
                {programOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.price} RWF
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Duration (days)</span>
            <input
              type="number"
              min={1}
              max={3650}
              value={grantDays}
              onChange={(e) => setGrantDays(e.target.value)}
              placeholder="Optional"
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-400"
            />
          </label>
        </div>
      </AppDrawer>

      {editSub ? (
        <EditSchoolSubscriptionModal
          row={editSub}
          plans={plansQuery.data?.items ?? []}
          onClose={() => setEditSub(null)}
          onSave={(planId, status) =>
            updateSubMutation.mutate({ tenantId: editSub.tenantId, planId, status })
          }
          saving={updateSubMutation.isPending}
        />
      ) : null}
    </div>
  );
}

function EditSchoolSubscriptionModal({
  row,
  plans,
  onClose,
  onSave,
  saving,
}: {
  row: SchoolSubscriptionRow;
  plans: { id: string; name: string; code: string }[];
  onClose: () => void;
  onSave: (planId: string, status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED') => void;
  saving: boolean;
}) {
  const [planId, setPlanId] = useState(row.plan.id);
  const [status, setStatus] = useState<'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'>(
    row.status as 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'
  );

  return (
    <AppDrawer
      open
      onClose={() => !saving && onClose()}
      title="Adjust school subscription"
      description={row.schoolName}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(planId, status)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="grid gap-3 text-sm">
        <label className="grid gap-1">
          <span className="font-medium text-slate-700">Plan</span>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-medium text-slate-700">Status</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED')
            }
            className="rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="TRIALING">TRIALING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAST_DUE">PAST_DUE</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>
      </div>
    </AppDrawer>
  );
}
