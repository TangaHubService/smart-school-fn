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
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-brand-300">
        <span>{buttonLabel}</span>
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>

      <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        <div className="grid gap-1">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={`${action.to}-${action.label}`}
                to={action.to}
                className="flex items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-brand-50"
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    {action.label}
                  </span>
                  {action.description ? (
                    <span className="mt-0.5 block text-xs text-slate-500">
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
  );
}
