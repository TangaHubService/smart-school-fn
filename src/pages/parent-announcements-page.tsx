import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  listMyAnnouncementsApi,
  markAnnouncementReadApi,
  type AnnouncementPriority,
} from '../features/announcements/announcements.api';

const PRIORITY_STYLES: Record<AnnouncementPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  NORMAL: 'bg-sky-50 text-sky-700',
  HIGH: 'bg-amber-50 text-amber-700',
  URGENT: 'bg-red-50 text-red-700',
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export function ParentAnnouncementsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['parent', 'announcements', page],
    queryFn: () => listMyAnnouncementsApi(auth.accessToken!, { page, pageSize: 20 }),
    enabled: !!auth.accessToken,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markAnnouncementReadApi(auth.accessToken!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['parent', 'announcements'] }),
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
                <th className="p-3 text-left font-semibold">Priority</th>
                <th className="p-3 text-left font-semibold">By</th>
                <th className="p-3 text-left font-semibold">Date</th>
                <th className="p-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-brand-50 hover:bg-brand-50/50 ${
                    item.isRead ? '' : 'bg-brand-50/30'
                  }`}
                >
                  <td className="p-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-slate-500 truncate">{item.body}</p>
                    {item.attachments.length ? (
                      <p className="mt-1 text-xs text-brand-600">
                        📎 {item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLES[item.priority]}`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{item.author.firstName} {item.author.lastName}</td>
                  <td className="p-3 text-slate-600">{formatDate(item.publishedAt)}</td>
                  <td className="p-3">
                    {item.isRead ? (
                      <span className="text-xs text-slate-400">Read</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(item.id)}
                        disabled={markReadMutation.isPending}
                        className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700"
                      >
                        Mark as read
                      </button>
                    )}
                  </td>
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
