import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, RefreshCw, School } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  grantAcademyAccessApi,
  listAcademyCatalogProgramsAdminApi,
  listAcademyEnrollmentsAdminApi,
  listSchoolSubscriptionsApi,
  listSubscriptionPlansApi,
  updateSchoolSubscriptionApi,
  type SchoolSubscriptionRow,
} from '../features/subscriptions/subscriptions.api';
import { ApiClientError } from '../types/api';

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
    [catalogProgramsQuery.data?.items],
  );

  const isError =
    schoolSubsQuery.isError || plansQuery.isError || enrollmentsQuery.isError;

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

  const loading =
    schoolSubsQuery.isPending || plansQuery.isPending || enrollmentsQuery.isPending;

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
            <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <School className="h-4 w-4 text-brand-600" aria-hidden />
                <h3 className="text-sm font-semibold text-slate-900">School subscriptions (SaaS)</h3>
              </div>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 font-medium">School</th>
                    <th className="px-4 py-2 font-medium">Plan</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Period end</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {schoolSubsQuery.data?.items.length ? (
                    schoolSubsQuery.data.items.map((row) => (
                      <tr key={row.tenantId} className="border-b border-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{row.schoolName}</p>
                          <p className="text-xs text-slate-500">{row.tenantCode}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.plan.name}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.currentPeriodEnd
                            ? new Date(row.currentPeriodEnd).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setEditSub(row)}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                        No school subscription rows yet. Run migrations / seed or assign plans from here
                        after creating tenants.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
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
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 font-medium">Learner</th>
                    <th className="px-4 py-2 font-medium">Program</th>
                    <th className="px-4 py-2 font-medium">Access</th>
                    <th className="px-4 py-2 font-medium">Payment</th>
                    <th className="px-4 py-2 font-medium">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentsQuery.data?.items.length ? (
                    enrollmentsQuery.data.items.map((row) => (
                      <tr key={row.id} className="border-b border-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{row.userName || row.userEmail}</p>
                          <p className="text-xs text-slate-500">{row.userEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.programTitle}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              row.isActive
                                ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                                : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
                            }
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                            {row.isTrial ? ' · Trial' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {row.lastPayment ? (
                            <>
                              {row.lastPayment.status}
                              {row.lastPayment.status === 'COMPLETED' ? '' : ` · ${row.lastPayment.amount} ${row.lastPayment.currency}`}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.expiresAt ? new Date(row.expiresAt).toLocaleString() : 'Open-ended'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                        No enrollments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      <Modal
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
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                Loading…
              </p>
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
      </Modal>

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
  const [status, setStatus] = useState<
    'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'
  >(row.status as 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED');

  return (
    <Modal
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
    </Modal>
  );
}
