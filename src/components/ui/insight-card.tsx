import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type InsightTone = 'brand' | 'success' | 'purple' | 'orange' | 'pink' | 'danger';

export function InsightCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  /** Kept for callers; insight icons share one color. */
  tone?: InsightTone;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
        {hint ? <p className="text-[11px] leading-4 text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

/** Horizontal strip of insight cards separated by dividers. */
export function InsightGrid({
  items,
  className,
}: {
  items: Array<{ key: string } & Parameters<typeof InsightCard>[0]>;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5',
        className
      )}
    >
      {items.map(({ key, ...item }) => (
        <InsightCard key={key} {...item} />
      ))}
    </div>
  );
}
