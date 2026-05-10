import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyAnnouncementsApi } from '../features/announcements/announcements.api';

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export function ParentAnnouncementsPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['parent', 'announcements', page],
    queryFn: () => listMyAnnouncementsApi(auth.accessToken!, { page, pageSize: 20 }),
    enabled: !!auth.accessToken,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1 };

  return (
    <SectionCard title="Announcements" subtitle="School announcements for parents">
      {isPending && (
        <div className="space-y-2">
          <div className="h-16 bg-brand-100 animate-pulse rounded" />
          <div className="h-16 bg-brand-100 animate-pulse rounded" />
        </div>
      )}

      {isError && (
        <StateView
          title="Could not load"
          message="Check connection"
          action={<button onClick={() => refetch()} className="btn-primary">Retry</button>}
        />
      )}

      {!isPending && !isError && items.length === 0 && (
        <EmptyState message="No announcements yet" />
      )}

      {!isPending && !isError && items.length > 0 && (
        <div className="overflow-x-auto rounded border border-brand-100">
          <table className="w-full text-sm">
            <thead className="bg-brand-50">
              <tr className="border-b border-brand-100">
                <th className="p-3 text-left font-semibold">Title</th>
                <th className="p-3 text-left font-semibold">By</th>
                <th className="p-3 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/50">
                  <td className="p-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-slate-500 truncate">{item.body}</p>
                  </td>
                  <td className="p-3 text-slate-600">{item.author.firstName} {item.author.lastName}</td>
                  <td className="p-3 text-slate-600">{formatDate(item.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary">Prev</button>
          <span className="p-2">{page} / {pagination.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page>=pagination.totalPages} className="btn-secondary">Next</button>
        </div>
      )}
    </SectionCard>
  );
}