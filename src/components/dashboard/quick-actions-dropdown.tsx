import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface DashboardQuickActionItem {
  label: string;
  to: string;
  icon: LucideIcon;
  description?: string;
}

export function DashboardQuickActionsDropdown({
  actions,
  buttonLabel = 'Quick actions',
}: {
  actions: DashboardQuickActionItem[];
  buttonLabel?: string;
}) {
  if (!actions.length) {
    return null;
  }

  return (
    <div className="relative">
      <details className="group relative">
        <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg bg-brand-500 px-4 text-[13px] font-medium text-white outline-none transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300">
          <span>{buttonLabel}</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
        </summary>

        <div className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-black/5">
          <div className="grid gap-1">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={`${action.to}-${action.label}`}
                  to={action.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-all duration-150 ease-in-out hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors duration-150">
                    <Icon className="h-4 w-4 transition-transform duration-150 hover:scale-105" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-800">{action.label}</span>
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
        </div>
      </details>
    </div>
  );
}
