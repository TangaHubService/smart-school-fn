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
  BILLING_CURRENCIES,
  BILLING_PAYMENT_METHODS,
  createManualInvoiceApi,
  grantAcademyAccessApi,
  listAcademyCatalogProgramsAdminApi,
  listAcademyEnrollmentsAdminApi,
  listSchoolInvoicesApi,
  listSchoolSubscriptionsApi,
  listSubscriptionPlansApi,
  recordManualPaymentApi,
  updateSchoolSubscriptionApi,
  type SchoolInvoiceRow,
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

const INVOICE_STATUS_TONES: Record<string, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  PAID: 'success',
  VOID: 'neutral',
};

const invoiceColumns: DataTableColumn<SchoolInvoiceRow>[] = [
  {
    key: 'invoiceNumber',
    header: 'Invoice',
    mobile: 'primary',
    render: (row) => (
      <span className="min-w-0">
        <span className="block font-mono text-xs font-semibold text-slate-900">{row.invoiceNumber}</span>
        <span className="block text-xs text-slate-500">{row.tenant.name}</span>
      </span>
    ),
  },
  {
    key: 'amountDue',
    header: 'Amount',
    render: (row) => (
      <span className="font-mono text-xs tabular-nums text-slate-900">
        {Number(row.amountDue).toLocaleString()} {row.currency}
      </span>
    ),
  },
  {
    key: 'paymentMethod',
    header: 'Method',
    mobile: 'secondary',
    render: (row) => <span className="text-xs text-slate-600">{row.paymentMethod?.replace('_', ' ') ?? '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge tone={INVOICE_STATUS_TONES[row.status] ?? 'neutral'}>{row.status}</Badge>,
  },
  {
    key: 'periodEnd',
    header: 'Expiring',
    render: (row) => (
      <span className="text-xs text-slate-600">{new Date(row.periodEnd).toLocaleDateString()}</span>
    ),
  },
  {
    key: 'paymentDate',
    header: 'Paid',
    render: (row) => (
      <span className="text-xs text-slate-600">
        {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : row.paidAt ? new Date(row.paidAt).toLocaleDateString() : '—'}
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
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const [payInvoice, setPayInvoice] = useState<SchoolInvoiceRow | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    currency: 'RWF',
    paymentMethod: 'CASH',
    reference: '',
    paymentDate: '',
  });
  const [invoiceForm, setInvoiceForm] = useState({
    tenantId: '',
    title: '',
    description: '',
    amountDue: '',
    currency: 'RWF',
    paymentMethod: 'CASH',
    paymentDate: '',
    periodStart: '',
    periodEnd: '',
    dueDate: '',
    status: 'PENDING' as 'PENDING' | 'PAID' | 'VOID',
    reference: '',
    notes: '',
  });

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

  const invoicesQuery = useQuery({
    queryKey: ['billing', 'invoices', invoiceStatusFilter, invoicePage],
    enabled: Boolean(token),
    queryFn: () =>
      listSchoolInvoicesApi(token, {
        status: invoiceStatusFilter || undefined,
        page: invoicePage,
        pageSize: 20,
      }),
  });

  // Stable retry callback (avoids narrowing the query union inside JSX branches).
  const retryInvoices = () => void invoicesQuery.refetch();

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

  const invoiceMutation = useMutation({
    mutationFn: () =>
      createManualInvoiceApi(token, {
        tenantId: invoiceForm.tenantId,
        title: invoiceForm.title.trim(),
        description: invoiceForm.description.trim(),
        amountDue: Number(invoiceForm.amountDue),
        currency: invoiceForm.currency,
        paymentMethod: invoiceForm.paymentMethod,
        paymentDate: invoiceForm.paymentDate || undefined,
        periodStart: new Date(invoiceForm.periodStart).toISOString(),
        periodEnd: new Date(invoiceForm.periodEnd).toISOString(),
        dueDate: invoiceForm.dueDate ? new Date(invoiceForm.dueDate).toISOString() : undefined,
        status: invoiceForm.status,
        reference: invoiceForm.reference.trim() || undefined,
        notes: invoiceForm.notes.trim() || undefined,
      }),
    onSuccess: () => {
      showToast({ type: 'success', title: 'Manual invoice created' });
      void queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
      setInvoiceOpen(false);      setInvoiceForm({
        tenantId: '',
        title: '',
        description: '',
        amountDue: '',
        currency: 'RWF',
        paymentMethod: 'CASH',
        paymentDate: '',
        periodStart: '',
        periodEnd: '',
        dueDate: '',
        status: 'PENDING',
        reference: '',
        notes: '',
      });
    },
    onError: (e: unknown) => {
      const err = e as ApiClientError;
      showToast({ type: 'error', title: 'Invoice failed', message: err.message });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: () =>
      recordManualPaymentApi(token, payInvoice!.id, {
        amount: Number(payForm.amount),
        currency: payForm.currency,
        paymentMethod: payForm.paymentMethod,
        reference: payForm.reference.trim() || undefined,
        paymentDate: payForm.paymentDate
          ? new Date(payForm.paymentDate).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      showToast({ type: 'success', title: 'Payment recorded', message: 'Invoice marked PAID.' });
      setPayInvoice(null);
      setPayForm({ amount: '', currency: 'RWF', paymentMethod: 'CASH', reference: '', paymentDate: '' });
      void queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['subscriptions', 'schools'] });
    },
    onError: (e: unknown) => {
      const err = e as ApiClientError;
      showToast({ type: 'error', title: 'Payment failed', message: err.message });
    },
  });

  const openPayDrawer = (row: SchoolInvoiceRow) => {
    setPayInvoice(row);
    setPayForm({
      amount: String(row.amountDue),
      currency: row.currency,
      paymentMethod: row.paymentMethod ?? 'CASH',
      reference: row.reference ?? '',
      paymentDate: row.paymentDate ? row.paymentDate.slice(0, 10) : '',
    });
  };

  const programOptions = useMemo(
    () => catalogProgramsQuery.data?.items ?? [],
    [catalogProgramsQuery.data?.items]
  );

  const isError =
    schoolSubsQuery.isError ||
    plansQuery.isError ||
    enrollmentsQuery.isError ||
    invoicesQuery.isError;

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
          <button
            type="button"
            onClick={() => setInvoiceOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            New manual invoice
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

            <section className="mb-8 overflow-hidden rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <CreditCard className="h-4 w-4 text-brand-600" aria-hidden />
                <h3 className="text-sm font-semibold text-slate-900">
                  School invoices (manual + online billing)
                </h3>
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => {
                    setInvoiceStatusFilter(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="ml-auto rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  aria-label="Filter invoices by status"
                >
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="VOID">Void</option>
                </select>
              </div>
              <div className="p-4">
                {invoicesQuery.isPending ? (
                  <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                ) : invoicesQuery.isError ? (
                  <p className="py-4 text-center text-sm text-red-600">
                    Could not load invoices.{' '}
                    <button className="underline" onClick={retryInvoices}>
                      Retry
                    </button>
                  </p>
                ) : (
                  <>
                    <DataTable<SchoolInvoiceRow>
                      ariaLabel="School invoices"
                      columns={invoiceColumns}
                      data={invoicesQuery.data?.items ?? []}
                      rowKey={(row) => row.id}
                      emptyTitle="No invoices yet"
                      emptyDescription="Create a manual invoice for schools not on online payment."
                      minWidth={760}
                      className="border-0 shadow-none"
                      rowActions={(row) => (
                        <div className="flex justify-end gap-2">
                          {row.reference && (
                            <span className="self-center font-mono text-[11px] text-slate-500">
                              {row.reference}
                            </span>
                          )}
                          {row.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => openPayDrawer(row)}
                              className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Record payment
                            </button>
                          )}
                        </div>
                      )}
                    />
                    {(invoicesQuery.data?.pagination.totalPages ?? 1) > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-3">
                        <button
                          type="button"
                          disabled={invoicePage <= 1}
                          onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-slate-600">
                          Page {invoicePage} of {invoicesQuery.data?.pagination.totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={invoicePage >= (invoicesQuery.data?.pagination.totalPages ?? 1)}
                          onClick={() => setInvoicePage((p) => p + 1)}
                          className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
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

      <AppDrawer
        open={Boolean(payInvoice)}
        onClose={() => !recordPaymentMutation.isPending && setPayInvoice(null)}
        title="Record payment"
        description={
          payInvoice
            ? `${payInvoice.invoiceNumber} · ${payInvoice.tenant.name} · ${Number(payInvoice.amountDue).toLocaleString()} ${payInvoice.currency} due`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPayInvoice(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              disabled={recordPaymentMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={recordPaymentMutation.isPending || !Number(payForm.amount)}
              onClick={() => recordPaymentMutation.mutate()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {recordPaymentMutation.isPending ? 'Saving…' : 'Confirm payment'}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Amount</span>
              <input
                type="number"
                min={1}
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Currency</span>
              <select
                value={payForm.currency}
                onChange={(e) => setPayForm((f) => ({ ...f, currency: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                {BILLING_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Payment method</span>
            <select
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              {BILLING_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Payment date</span>
            <input
              type="date"
              value={payForm.paymentDate}
              onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Reference / receipt no.</span>
            <input
              value={payForm.reference}
              onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Optional"
            />
          </label>
        </div>
      </AppDrawer>

      <AppDrawer
        open={invoiceOpen}
        onClose={() => !invoiceMutation.isPending && setInvoiceOpen(false)}
        title="New manual invoice"
        description="For schools not on online payment. Amount, currency, method and dates are stored."
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setInvoiceOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              disabled={invoiceMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                invoiceMutation.isPending ||
                !invoiceForm.tenantId ||
                !invoiceForm.title.trim() ||
                !invoiceForm.description.trim() ||
                !Number(invoiceForm.amountDue) ||
                !invoiceForm.periodStart ||
                !invoiceForm.periodEnd
              }
              onClick={() => invoiceMutation.mutate()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {invoiceMutation.isPending ? 'Saving…' : 'Create invoice'}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 text-sm">
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">School</span>
            <select
              value={invoiceForm.tenantId}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, tenantId: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="">Choose school…</option>
              {(schoolSubsQuery.data?.items ?? []).map((s) => (
                <option key={s.tenantId} value={s.tenantId}>
                  {s.schoolName} ({s.tenantCode})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Title</span>
            <input
              value={invoiceForm.title}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="2026 annual subscription"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Description</span>
            <textarea
              value={invoiceForm.description}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2"
              rows={2}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Amount</span>
              <input
                type="number"
                min={1}
                value={invoiceForm.amountDue}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, amountDue: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Currency</span>
              <select
                value={invoiceForm.currency}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, currency: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                {BILLING_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Payment method</span>
              <select
                value={invoiceForm.paymentMethod}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                {BILLING_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Status</span>
              <select
                value={invoiceForm.status}
                onChange={(e) =>
                  setInvoiceForm((f) => ({
                    ...f,
                    status: e.target.value as typeof f.status,
                  }))
                }
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="VOID">VOID</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Payment date</span>
              <input
                type="date"
                value={invoiceForm.paymentDate}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, paymentDate: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Due date</span>
              <input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Period start</span>
              <input
                type="date"
                value={invoiceForm.periodStart}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-medium text-slate-700">Expiring date</span>
              <input
                type="date"
                value={invoiceForm.periodEnd}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Reference / receipt no.</span>
            <input
              value={invoiceForm.reference}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, reference: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Optional"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2"
              rows={2}
            />
          </label>
        </div>
      </AppDrawer>
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
