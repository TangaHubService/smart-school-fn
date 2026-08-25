import clsx from 'clsx';
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type StatTone = 'brand' | 'success' | 'purple' | 'orange' | 'danger' | 'neutral';

const STAT_ICON_TONES: Record<StatTone, string> = {
  brand: 'from-blue-400 to-blue-600 shadow-blue-200',
  success: 'from-emerald-400 to-emerald-600 shadow-emerald-200',
  purple: 'from-violet-400 to-violet-600 shadow-violet-200',
  orange: 'from-amber-400 to-orange-500 shadow-orange-200',
  danger: 'from-rose-400 to-red-500 shadow-rose-200',
  neutral: 'from-slate-400 to-slate-600 shadow-slate-200',
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
      <div className="flex items-center gap-4">
        <span
          className={clsx(
            'grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg',
            STAT_ICON_TONES[tone]
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-1 h-7 w-16 animate-pulse rounded bg-slate-100" aria-hidden="true" />
          ) : (
            <p className="mt-0.5 truncate text-2xl font-bold tabular-nums tracking-tight text-slate-950">
              {value}
            </p>
          )}
        </div>
      </div>
      {!loading && (description || (change !== undefined && change !== null && change !== 0)) ? (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
          {change !== undefined && change !== null && change !== 0 ? (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
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
            <p className="truncate text-[11px] leading-4 text-slate-500">
              {change !== undefined && change !== null && change !== 0 ? changeLabel : description}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const cardClass = clsx(
    'group flex min-h-[104px] flex-col justify-center rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.055)] transition',
    to && 'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md',
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
