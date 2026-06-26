import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PaymentStatusWidgetProps {
  totalFees: number;
  paidFees: number;
  dueDate?: string;
  isLoading?: boolean;
}

export function PaymentStatusWidget({
  totalFees,
  paidFees,
  dueDate,
  isLoading,
}: PaymentStatusWidgetProps) {
  const remaining = Math.max(totalFees - paidFees, 0);
  const paidPct = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0;

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900">Payment Status</h2>
      </div>

      {totalFees === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No fees recorded.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Total Fees</span>
            <span className="font-bold text-slate-900">
              {totalFees.toLocaleString(undefined, {
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Paid</span>
            <span className="font-bold text-emerald-700">
              {paidFees.toLocaleString(undefined, {
                minimumFractionDigits: 0,
              })}
            </span>
          </div>

          <div className="overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${paidPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Remaining</span>
            <span className="font-bold text-amber-700">
              {remaining.toLocaleString(undefined, {
                minimumFractionDigits: 0,
              })}
            </span>
          </div>

          {dueDate && remaining > 0 && (
            <p className="text-xs text-slate-500">Due by {dueDate}</p>
          )}

          {remaining > 0 && (
            <Link
              to="/student/payments"
              className="mt-2 block rounded-lg bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Pay Now
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
