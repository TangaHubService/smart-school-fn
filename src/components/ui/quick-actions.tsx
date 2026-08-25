import clsx from 'clsx';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface QuickActionItem {
  label: string;
  description?: string;
  icon: LucideIcon;
  to: string;
}

/**
 * Permission-aware quick action grid. Filter the items by the current
 * user's permissions before passing them in — this component stays generic.
 */
export function QuickActions({
  actions,
  columnsClassName = 'sm:grid-cols-2 xl:grid-cols-5',
  className,
}: {
  actions: QuickActionItem[];
  columnsClassName?: string;
  className?: string;
}) {
  if (!actions.length) return null;

  return (
    <div className={clsx('grid gap-3', columnsClassName, className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={`${action.to}-${action.label}`}
            to={action.to}
            className="group flex min-h-20 flex-col justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                <span className="truncate">{action.label}</span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                  aria-hidden="true"
                />
              </span>
              {action.description ? (
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {action.description}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
