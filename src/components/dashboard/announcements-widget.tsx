import { Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Announcement {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
}

interface AnnouncementsWidgetProps {
  items: Announcement[];
  isLoading?: boolean;
}

export function AnnouncementsWidget({ items, isLoading }: AnnouncementsWidgetProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-200" />
        {[1, 2].map((i) => (
          <div key={i} className="mb-3 h-20 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Announcements</h2>
        </div>
        <Link to="/admin/announcements" className="text-sm font-semibold text-brand-500">
          View All
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-sm font-semibold text-slate-900">{a.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.excerpt}</p>
              {a.publishedAt && (
                <p className="mt-1 text-[11px] text-slate-400">
                  {new Date(a.publishedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
