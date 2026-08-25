import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type InsightTone = 'brand' | 'success' | 'purple' | 'orange' | 'pink' | 'danger';

const INSIGHT_TONES: Record<InsightTone, string> = {
  brand: 'bg-blue-50 text-blue-600',
  success: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-violet-50 text-violet-600',
  orange: 'bg-orange-50 text-orange-600',
  pink: 'bg-pink-50 text-pink-600',
  danger: 'bg-red-50 text-red-600',
};

export function InsightCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: InsightTone;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span
        className={clsx(
          'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
          INSIGHT_TONES[tone]
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-slate-950">
          {value}
        </p>
        {hint ? <p className="truncate text-[9px] text-slate-400">{hint}</p> : null}
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
