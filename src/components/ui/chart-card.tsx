import clsx from 'clsx';
import type { ReactNode } from 'react';

/**
 * Generic chart container. The chart itself (recharts or custom) is passed
 * as children so this component stays chart-library agnostic.
 */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={clsx(
        'min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.055)]',
        className
      )}
    >
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight text-slate-950">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      <div className={clsx('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export interface PeriodTab<T extends string = string> {
  value: T;
  label: string;
}

/** Small segmented period selector used inside ChartCard headers. */
export function PeriodTabs<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel = 'Select period',
}: {
  value: T;
  options: Array<PeriodTab<T>>;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            value === option.value
              ? 'bg-brand-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
