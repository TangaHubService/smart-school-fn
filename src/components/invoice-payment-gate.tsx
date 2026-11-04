import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, LogOut, Lock, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../features/auth/auth.context';
import { hasRole, isSuperAdmin } from '../features/auth/auth-helpers';
import {
  formatInvoiceAmount,
  getBillingAccessApi,
  MOBILE_MONEY_PHONE_PATTERN,
  paySubscriptionInvoiceApi,
  type SubscriptionInvoice,
} from '../features/billing/billing.api';
import { ApiClientError } from '../types/api';
import { useToast } from './toast';

const CHECK_WHILE_OPEN_MS = 60_000;
const CHECK_WHILE_LOCKED_MS = 10_000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Locks the signed-in app while the school has an unpaid invoice. There is no
 * close button: it only goes away when the server reports the school is paid.
 * Signing out stays available so nobody is trapped on a shared computer.
 */
export function InvoicePaymentGate() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const token = auth.accessToken ?? '';
  const isPlatformUser = isSuperAdmin(auth.me) || hasRole(auth.me, 'GOV_AUDITOR');

  const accessQuery = useQuery({
    queryKey: ['billing', 'access'],
    enabled: Boolean(token) && !isPlatformUser,
    queryFn: () => getBillingAccessApi(token),
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.blocked ? CHECK_WHILE_LOCKED_MS : CHECK_WHILE_OPEN_MS,
  });

  const access = accessQuery.data;
  const blocked = access?.blocked === true;

  // Everything behind the dialog is out of reach for mouse, keyboard and screen readers.
  useEffect(() => {
    const root = document.getElementById('root');
    if (!blocked || !root) return;
    root.inert = true;
    return () => {
      root.inert = false;
    };
  }, [blocked]);

  // When the lock lifts, reload what failed while the school was locked.
  const wasBlocked = useRef(false);
  useEffect(() => {
    if (wasBlocked.current && access?.blocked === false) {
      showToast({
        type: 'success',
        title: 'Payment confirmed',
        message: 'Your school has full access again.',
      });
      void queryClient.invalidateQueries();
    }
    wasBlocked.current = blocked;
  }, [access?.blocked, blocked, queryClient, showToast]);

  if (!access?.blocked) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="invoice-gate-title"
        aria-describedby="invoice-gate-summary"
        className="my-auto w-full max-w-md rounded-xl bg-white shadow-2xl"
      >
        <div className="px-6 pt-6">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose-50 text-rose-600">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2
            id="invoice-gate-title"
            className="mt-4 text-xl font-semibold tracking-tight text-slate-900"
          >
            {access.canPay ? 'Pay this invoice to continue' : 'School account on hold'}
          </h2>
          <p id="invoice-gate-summary" className="mt-1 text-sm leading-6 text-slate-500">
            {access.invoice
              ? `${access.schoolName} has an unpaid invoice. Smart School stays locked for everyone at the school until it is paid.`
              : `${access.schoolName} has an unpaid Smart School invoice. Please ask your school administrator to pay it. You will get access again as soon as it is paid.`}
          </p>
        </div>

        {access.invoice ? <InvoiceSummary invoice={access.invoice} /> : null}

        {access.invoice && access.canPay ? (
          <PaymentForm invoice={access.invoice} token={token} />
        ) : access.invoice ? (
          <p className="mx-6 mt-4 rounded-lg bg-slate-50 px-4 py-3 text-[13px] leading-5 text-slate-600">
            {access.invoice.currency === 'RWF'
              ? 'Your account cannot make payments. Ask a school administrator to pay this invoice.'
              : `Invoices in ${access.invoice.currency} cannot be paid by Mobile Money. Contact Smart School to settle it.`}
          </p>
        ) : null}

        <div className="mt-4 border-t border-slate-100 px-6 py-3 text-center">
          <button
            type="button"
            onClick={() => void auth.logout()}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function InvoiceSummary({ invoice }: { invoice: SubscriptionInvoice }) {
  const overdue = new Date(invoice.dueDate) < new Date();
  return (
    <div className="mx-6 mt-4 rounded-lg border border-slate-200">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-medium text-slate-900">{invoice.title}</p>
        <p className="mt-0.5 line-clamp-3 text-xs leading-5 text-slate-500">
          {invoice.description}
        </p>
        <p className="mt-2 text-[26px] font-semibold leading-8 tracking-tight tabular-nums text-slate-900">
          {formatInvoiceAmount(invoice.amountDue, invoice.currency)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
        <div className="min-w-0">
          <dt className="text-slate-500">Invoice number</dt>
          <dd className="mt-0.5 truncate font-medium text-slate-900" title={invoice.invoiceNumber}>
            {invoice.invoiceNumber}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Due date</dt>
          <dd className={overdue ? 'mt-0.5 font-medium text-rose-700' : 'mt-0.5 font-medium text-slate-900'}>
            {formatDate(invoice.dueDate)}
            {overdue ? ' (overdue)' : ''}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function PaymentForm({ invoice, token }: { invoice: SubscriptionInvoice; token: string }) {
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingPhone, setAwaitingPhone] = useState(false);

  const payMutation = useMutation({
    mutationFn: () => paySubscriptionInvoiceApi(token, phoneNumber.trim()),
    onSuccess: (data) => {
      setFormError(null);
      setAwaitingPhone(data.status === 'PENDING');
      void queryClient.invalidateQueries({ queryKey: ['billing', 'access'] });
    },
    onError: (error: unknown) => {
      setFormError((error as ApiClientError).message);
    },
  });

  if (awaitingPhone) {
    return (
      <div className="mx-6 mt-4 rounded-lg bg-brand-50 px-4 py-3" role="status">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <Smartphone className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          Confirm the payment on your phone
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-slate-600">
          <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
          This window closes by itself once the payment goes through.
        </p>
        <button
          type="button"
          onClick={() => setAwaitingPhone(false)}
          className="mt-2 text-xs font-medium text-brand-600 hover:underline"
        >
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <form
      className="mx-6 mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!MOBILE_MONEY_PHONE_PATTERN.test(phoneNumber.trim())) {
          setPhoneError('Enter a valid MTN or Airtel number, such as 0788123456.');
          return;
        }
        setPhoneError(null);
        payMutation.mutate();
      }}
    >
      <label htmlFor="invoice-gate-phone" className="block text-[13px] font-medium text-slate-700">
        Mobile Money number
      </label>
      <input
        id="invoice-gate-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        autoFocus
        placeholder="0788123456"
        value={phoneNumber}
        onChange={(event) => setPhoneNumber(event.target.value)}
        aria-invalid={Boolean(phoneError)}
        aria-describedby={phoneError ? 'invoice-gate-phone-error' : undefined}
        className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {phoneError ? (
        <p id="invoice-gate-phone-error" className="mt-1.5 text-xs text-rose-700">
          {phoneError}
        </p>
      ) : null}
      {formError ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
          {formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={payMutation.isPending}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {payMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        )}
        {payMutation.isPending
          ? 'Processing payment'
          : `Pay ${formatInvoiceAmount(invoice.amountDue, invoice.currency)}`}
      </button>
    </form>
  );
}
