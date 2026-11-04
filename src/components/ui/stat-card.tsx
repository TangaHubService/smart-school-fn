import clsx from 'clsx';
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type StatTone = 'brand' | 'success' | 'purple' | 'orange' | 'danger' | 'neutral';

// One calm icon color; only `danger` signals a state.
const STAT_ICON_COLORS: Record<StatTone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-brand-50 text-brand-600',
  purple: 'bg-brand-50 text-brand-600',
  orange: 'bg-brand-50 text-brand-600',
  danger: 'bg-rose-50 text-rose-600',
  neutral: 'bg-slate-100 text-slate-600',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  change,
  changeLabel = 'this month',
  tone = 'brand',
  to,
  loading = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  description?: string;
  /** Positive/negative delta; renders a trend chip when provided. */
  change?: number | null;
  changeLabel?: string;
  tone?: StatTone;
  to?: string;
  loading?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-5 text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200" aria-hidden="true" />
          ) : (
            <p className="mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              {value}
            </p>
          )}
        </div>
        <span
          className={clsx(
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
            STAT_ICON_COLORS[tone]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      {!loading && (description || (change !== undefined && change !== null && change !== 0)) ? (
        <div className="mt-2 flex items-center gap-2">
          {change !== undefined && change !== null && change !== 0 ? (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                change > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              )}
            >
              {change > 0 ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
              )}
              {change > 0 ? '+' : ''}
              {change}
            </span>
          ) : null}
          {description ? (
            <p className="text-xs leading-4 text-slate-500">
              {change !== undefined && change !== null && change !== 0 ? changeLabel : description}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const cardClass = clsx(
    'group flex min-h-[104px] flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-card transition',
    to && 'hover:border-brand-300 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500',
    className
  );

  if (to) {
    return (
      <Link to={to} className={cardClass}>
        {body}
      </Link>
    );
  }

  return <article className={cardClass}>{body}</article>;
}

export function StatCardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>;
}

export function StatCardLinkHint() {
  return <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />;
}
