import { MessageSquare } from 'lucide-react';

export interface Recommendation {
  id: string;
  title: string;
  from: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

interface RecommendationsWidgetProps {
  items: Recommendation[];
  isLoading?: boolean;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-2 border-l-red-500 bg-red-50/50',
  medium: 'border-l-2 border-l-amber-500 bg-amber-50/50',
  low: 'border-l-2 border-l-blue-500 bg-blue-50/50',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function RecommendationsWidget({ items, isLoading }: RecommendationsWidgetProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
        {[1, 2].map((i) => (
          <div key={i} className="mb-3 h-16 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Recommendations</h2>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No pending recommendations.</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className={`rounded-lg p-3 ${PRIORITY_STYLES[r.priority]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-600">From {r.from}</p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold uppercase text-slate-500">
                  {PRIORITY_LABELS[r.priority]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.date}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
