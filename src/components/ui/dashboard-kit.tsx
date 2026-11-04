import clsx from 'clsx';
import { AlertCircle, ArrowRight, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/* Building blocks shared by the admin dashboards. See DESIGN.md. */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export interface KpiItem {
  label: string;
  value: string;
  hint: string;
  /** Marks the hint as good news, such as growth this month. */
  positive?: boolean;
  to?: string;
}

/** One continuous band of headline numbers, easier to scan than a row of separate cards. */
export function KpiStrip({ items }: { items: KpiItem[] }) {
  const cell = 'block h-full px-5 py-4';
  return (
    <dl
      className={clsx(
        'grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card',
        items.length === 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-5'
      )}
    >
      {items.map((item, index) => {
        const body = (
          <>
            <dt className="text-[13px] font-medium text-slate-500">{item.label}</dt>
            <dd className="mt-1 text-[26px] font-semibold leading-8 tracking-tight tabular-nums text-slate-900">
              {item.value}
            </dd>
            <dd
              className={clsx(
                'mt-1 text-xs leading-4',
                item.positive ? 'font-medium text-emerald-700' : 'text-slate-500'
              )}
            >
              {item.hint}
            </dd>
          </>
        );
        return (
          <div
            key={item.label}
            className={clsx(
              'border-slate-100',
              index > 0 && 'lg:border-l',
              index % 2 === 1 && 'border-l',
              index > 1 && 'border-t lg:border-t-0',
              index === items.length - 1 && items.length % 2 === 1 && 'col-span-2 lg:col-span-1'
            )}
          >
            {item.to ? (
              <Link
                to={item.to}
                className={clsx(
                  cell,
                  'transition hover:bg-slate-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-brand-500'
                )}
              >
                {body}
              </Link>
            ) : (
              <div className={cell}>{body}</div>
            )}
          </div>
        );
      })}
    </dl>
  );
}

export function DashboardCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        'min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card',
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
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-700 hover:underline"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export function EmptyPanel({
  icon: Icon,
  message,
  className,
}: {
  icon: LucideIcon;
  message: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center', className)}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 max-w-xs text-[13px] leading-5 text-slate-500">{message}</p>
    </div>
  );
}

/** Label, value and a thin bar. `percent` is the bar fill from 0 to 100. */
export function MeterRow({
  label,
  value,
  percent,
  hint,
}: {
  label: string;
  value: string;
  percent: number;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-slate-600">{label}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      {hint ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{hint}</p> : null}
    </div>
  );
}

export interface AttentionItem {
  key: string;
  title: string;
  detail?: string;
  to: string;
  tone: 'warning' | 'info';
}

/** What needs a person's action right now. Each row names the issue and links to where to fix it. */
export function AttentionCard({ items }: { items: AttentionItem[] }) {
  return (
    <DashboardCard>
      <CardHeader
        title="Needs attention"
        subtitle={items.length ? `${items.length} open ${items.length === 1 ? 'item' : 'items'}` : undefined}
      />
      {items.length ? (
        <ul className="px-2 pb-2 pt-1">
          {items.map((item) => {
            const Icon = item.tone === 'warning' ? AlertCircle : Info;
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-50"
                >
                  <Icon
                    className={clsx(
                      'mt-0.5 h-4 w-4 shrink-0',
                      item.tone === 'warning' ? 'text-amber-600' : 'text-slate-400'
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-slate-900">{item.title}</span>
                    {item.detail ? (
                      <span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span>
                    ) : null}
                  </span>
                  <ArrowRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-500"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="flex items-center gap-2 px-5 pb-5 pt-2 text-[13px] text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Nothing needs your attention.
        </p>
      )}
    </DashboardCard>
  );
}
