import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SecurePdfViewer } from '../components/secure-pdf-viewer';
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
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function StudentAnnouncementsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'me', page],
    queryFn: () => listMyAnnouncementsApi(auth.accessToken!, { page, pageSize: 12 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markAnnouncementReadApi(auth.accessToken!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['announcements', 'me'] }),
  });

  const items = announcementsQuery.data?.items ?? [];
  const pagination = announcementsQuery.data?.pagination ?? {
    page: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 1,
  };

  return (
    <SectionCard title="Announcements" subtitle="School announcements relevant to you.">
      {announcementsQuery.isPending ? (
        <div className="grid gap-2">
          <div className="h-20 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-20 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-20 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {announcementsQuery.isError ? (
        <StateView
          title="Could not load announcements"
          message="Retry after checking your connection."
          action={
            <button
              type="button"
              onClick={() => void announcementsQuery.refetch()}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!announcementsQuery.isPending && !announcementsQuery.isError && items.length === 0 ? (
        <EmptyState message="No announcements for you at the moment." />
      ) : null}

      {!announcementsQuery.isPending && !announcementsQuery.isError && items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                item.isRead ? 'border-brand-100' : 'border-brand-400'
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-800">{item.title}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLES[item.priority]}`}
                >
                  {item.priority}
                </span>
                {!item.isRead ? (
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    New
                  </span>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{item.body}</p>

              {item.attachments.length ? (
                <div className="mt-3 space-y-2">
                  {item.attachments.map((att) =>
                    att.secureUrl ? (
                      <a
                        key={att.id}
                        href={att.secureUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs font-semibold text-brand-600 hover:underline"
                      >
                        📎 {att.originalName}
                      </a>
                    ) : (
                      <div key={att.id}>
                        <p className="mb-1 text-xs text-slate-500">📎 {att.originalName}</p>
                        <SecurePdfViewer
                          assetId={att.id}
                          accessToken={auth.accessToken ?? ''}
                          title={att.originalName}
                          className="max-h-72"
                        />
                      </div>
                    )
                  )}
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  By {item.author.firstName} {item.author.lastName} • {formatDate(item.publishedAt)}
                </span>
                {!item.isRead ? (
                  <button
                    type="button"
                    onClick={() => markReadMutation.mutate(item.id)}
                    disabled={markReadMutation.isPending}
                    className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 font-semibold text-brand-700"
                  >
                    Mark as read
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}
