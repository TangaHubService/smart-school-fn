import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, CreditCard, Printer, ReceiptText, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AppDrawer } from '../components/drawer';
import { StateView } from '../components/state-view';
import { PageSkeleton } from '../components/skeleton-loader';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  getMySubscriptionInvoiceApi,
  paySubscriptionInvoiceApi,
  type SubscriptionInvoice,
  type SubscriptionInvoicePaymentRow,
} from '../features/billing/billing.api';
import { ApiClientError } from '../types/api';

const PHONE_PATTERN = /^(?:\+?250|0)7\d{8}$/;

function formatRwf(amount: number): string {
  return `${amount.toLocaleString('en-US')} RWF`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function InvoiceSummaryGrid({
  invoice,
  schoolName,
}: {
  invoice: SubscriptionInvoice;
  schoolName: string;
}) {
  const cards: Array<{ label: string; value: string }> = [
    { label: 'School', value: schoolName },
    { label: 'Invoice Number', value: invoice.invoiceNumber },
    { label: 'Academic Year', value: invoice.yearLabel },
    {
      label: invoice.status === 'PAID' ? 'Paid On' : 'Due Date',
      value: formatDate(
        invoice.status === 'PAID' && invoice.paidAt ? invoice.paidAt : invoice.dueDate
      ),
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {card.label}
          </span>
          <p className="mt-2 truncate text-sm font-semibold text-slate-900" title={card.value}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function PaymentsTable({ payments }: { payments: SubscriptionInvoicePaymentRow[] }) {
  if (!payments.length) return null;
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2 font-medium">Reference</th>
            <th className="px-4 py-2 font-medium">Provider</th>
            <th className="px-4 py-2 font-medium">Amount</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-slate-50">
              <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{p.providerRef}</td>
              <td className="px-4 py-2.5 capitalize text-slate-700">{p.provider}</td>
              <td className="px-4 py-2.5 text-slate-700">{formatRwf(p.amount)}</td>
              <td className="px-4 py-2.5 text-slate-700">{p.status}</td>
              <td className="px-4 py-2.5 text-slate-700">{formatDate(p.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SubscriptionInvoicePage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const token = auth.accessToken ?? '';

  const [payOpen, setPayOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const invoiceQuery = useQuery({
    queryKey: ['billing', 'invoice'],
    enabled: Boolean(token),
    queryFn: () => getMySubscriptionInvoiceApi(token),
  });

  const payMutation = useMutation({
    mutationFn: () => paySubscriptionInvoiceApi(token, phoneNumber.trim()),
    onSuccess: (data) => {
      setPayOpen(false);
      setPhoneNumber('');
      setPhoneError(null);
      if (data.status === 'PAID') {
        showToast({
          type: 'success',
          title: 'Payment confirmed',
          message: 'Your annual subscription is active and the dashboard is unlocked.',
        });
      } else {
        showToast({
          type: 'info',
          title: 'Payment initiated',
          message: data.message,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['billing', 'invoice'] });
    },
    onError: (e: unknown) => {
      const err = e as ApiClientError;
      showToast({ type: 'error', title: 'Payment failed', message: err.message });
    },
  });

  if (invoiceQuery.isError) {
    const err = invoiceQuery.error as ApiClientError;
    return (
      <StateView
        title="Could not load your subscription invoice"
        message={
          err.code === 'SCHEMA_NOT_READY'
            ? 'Billing tables are missing on the server. Run database migrations.'
            : 'Check your connection and permissions, then retry.'
        }
        action={
          <button
            type="button"
            onClick={() => void invoiceQuery.refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (invoiceQuery.isPending || !invoiceQuery.data) {
    return <PageSkeleton variant="detail" />;
  }

  const { invoice, schoolName, tenantCode, payments } = invoiceQuery.data;
  const isPaid = invoice.status === 'PAID';

  function submitPayment() {
    if (!PHONE_PATTERN.test(phoneNumber.trim())) {
      setPhoneError('Enter a valid MTN/Airtel Mobile Money number (e.g. 0788123456)');
      return;
    }
    setPhoneError(null);
    payMutation.mutate();
  }

  return (
    <div className="space-y-6">
      {!isPaid ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden />
            <div>
              <strong className="block text-sm font-semibold">
                Annual subscription payment required
              </strong>
              <span className="text-xs text-slate-600">
                The school dashboard stays locked until this one-time annual invoice is paid.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-success-100 bg-success-50 p-4 text-success-700">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <strong className="block text-sm font-semibold">
              Payment confirmed — your annual subscription is active
            </strong>
            <span className="text-xs">
              The full school dashboard is unlocked for {invoice.yearLabel}.
            </span>
          </div>
        </div>
      )}

      <section aria-label="Subscription invoice">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 bg-gradient-to-br from-brand-700 to-indigo-600 p-6 text-white sm:flex-row sm:items-start sm:justify-between sm:p-7">
            <div className="flex gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15">
                <ReceiptText className="h-7 w-7" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-100">
                  Smart School Rwanda
                </p>
                <h1 className="mt-1 text-2xl font-bold">Annual Subscription Invoice</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-50">
                  This invoice gives {schoolName} access to Smart School Rwanda for a full year.
                  Payment is made once per year ({formatDate(invoice.periodStart)} –{' '}
                  {formatDate(invoice.periodEnd)}).
                </p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit shrink-0 items-center rounded-full px-3.5 py-1.5 text-xs font-extrabold tracking-wide ${
                isPaid ? 'bg-success-500/90 text-white' : 'bg-white/15 text-white'
              }`}
            >
              ● {isPaid ? 'PAID' : 'UNPAID'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-7 p-6 lg:grid-cols-[minmax(0,1fr)_330px] sm:p-7">
            <div className="min-w-0">
              <InvoiceSummaryGrid invoice={invoice} schoolName={schoolName} />

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-slate-900">{invoice.title}</h3>
                    <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-500">
                      {invoice.description}
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-bold text-slate-900">
                    {formatRwf(invoice.amountDue)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 px-4 py-4">
                  <span className="font-bold text-slate-900">Total Payable</span>
                  <span className="text-xl font-extrabold text-brand-700">
                    {formatRwf(invoice.amountDue)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  'One invoice per academic year',
                  'Automatic account activation after payment',
                  'All modules included — no hidden fees',
                  'Taxes included in the annual price',
                ].map((feature) => (
                  <div
                    key={feature}
                    className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-700"
                  >
                    ✓ {feature}
                  </div>
                ))}
              </div>

              <PaymentsTable payments={payments} />
            </div>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-base font-bold text-slate-900">Payment Summary</h2>
              <p className="mt-1 text-xs text-slate-500">One-time annual payment</p>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Subscription fee</dt>
                  <dd className="font-semibold text-slate-900">{formatRwf(invoice.amountDue)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Taxes</dt>
                  <dd className="font-semibold text-slate-900">Included</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-200 pt-3">
                  <dt className="font-bold text-slate-900">Amount due</dt>
                  <dd className="font-bold text-brand-700">{formatRwf(invoice.amountDue)}</dd>
                </div>
              </dl>

              {!isPaid ? (
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  disabled={payMutation.isPending}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                >
                  <CreditCard className="h-4 w-4" aria-hidden />
                  Pay Annual Subscription
                </button>
              ) : (
                <Link
                  to="/admin"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
                >
                  Go to dashboard
                </Link>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <Printer className="h-4 w-4" aria-hidden />
                Download / Print Invoice
              </button>

              <p className="mt-3.5 text-center text-[11px] leading-relaxed text-slate-500">
                Paid via MTN / Airtel Mobile Money. The invoice number is{' '}
                <span className="font-mono">{invoice.invoiceNumber}</span> (school{' '}
                <span className="font-mono">{tenantCode}</span>).
              </p>
            </aside>
          </div>
        </div>
      </section>

      <AppDrawer
        open={payOpen}
        title="Pay annual subscription"
        description={`You will receive a Mobile Money prompt on your phone for ${formatRwf(
          invoice.amountDue
        )}.`}
        onClose={() => {
          if (payMutation.isPending) return;
          setPayOpen(false);
          setPhoneError(null);
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitPayment();
          }}
        >
          <div>
            <label htmlFor="momo-phone" className="block text-sm font-medium text-slate-700">
              Mobile Money number
            </label>
            <input
              id="momo-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0788123456"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
            {phoneError ? <p className="mt-1.5 text-xs text-danger-600">{phoneError}</p> : null}
          </div>
          <button
            type="submit"
            disabled={payMutation.isPending}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {payMutation.isPending
              ? 'Processing payment...'
              : `Pay ${formatRwf(invoice.amountDue)}`}
          </button>
        </form>
      </AppDrawer>
    </div>
  );
}
