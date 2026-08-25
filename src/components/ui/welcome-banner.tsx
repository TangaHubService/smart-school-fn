import clsx from 'clsx';
import type { ReactNode } from 'react';

/**
 * Page-level welcome banner matching the dashboard reference:
 * eyebrow label, bold title, muted subtitle and an action slot on the right.
 */
export function WelcomeBanner({
  eyebrow,
  title,
  subtitle,
  actions,
  aside,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        'rounded-xl border border-slate-200/90 bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.055)]',
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              {title}
            </h1>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          {subtitle ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}
