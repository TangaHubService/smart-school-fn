import clsx from 'clsx';
import { ArrowRight, Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type DashboardTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple';

export const TONE_TILE: Record<DashboardTone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
  neutral: 'bg-slate-100 text-slate-600',
  purple: 'bg-violet-50 text-violet-600',
};

export const TONE_SOFT_BADGE: Record<DashboardTone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
  purple: 'bg-violet-50 text-violet-700',
};

export const TONE_BAR: Record<DashboardTone, string> = {
  brand: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-slate-400',
  purple: 'bg-violet-500',
};

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        className
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon: Icon,
  tone = 'brand',
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: DashboardTone;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            className={clsx(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              TONE_TILE[tone]
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action ?? null}
    </div>
  );
}

export function CardActionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  change,
  tone = 'brand',
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  helper?: string;
  change?: number;
  tone?: DashboardTone;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={clsx(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            TONE_TILE[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        {change !== undefined && change !== 0 ? (
          <span
            className={clsx(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold',
              change > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}
          >
            {change > 0 ? '+' : ''}
            {change}
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
        {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
      >
        {body}
      </Link>
    );
  }

  return <Card className="p-4">{body}</Card>;
}

export function ProgressBar({
  value,
  tone = 'brand',
  className,
}: {
  value: number;
  tone?: DashboardTone;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className={clsx('h-full rounded-full transition-all', TONE_BAR[tone])}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: DashboardTone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        TONE_SOFT_BADGE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function LoadingCard({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Card className={className}>
      <div className="space-y-3 p-5">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    </Card>
  );
}

export function LoadingMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </div>
  );
}

export function EmptyInline({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-1 text-sm font-semibold text-slate-700">{title}</p>
      {message ? <p className="max-w-xs text-xs text-slate-500">{message}</p> : null}
      {action ?? null}
    </div>
  );
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
      {label ?? 'Loading…'}
    </div>
  );
}

export function StatPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  tone?: DashboardTone;
}) {
  return (
    <div className={clsx('rounded-xl px-4 py-3', TONE_TILE[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
