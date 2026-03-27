import { LucideIcon } from 'lucide-react';

export interface SummaryCardItem {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}

interface SummaryCardsProps {
  items: SummaryCardItem[];
  isLoading?: boolean;
}

export function SummaryCards({ items, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-brand-100 bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft transition hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{item.label}</p>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
