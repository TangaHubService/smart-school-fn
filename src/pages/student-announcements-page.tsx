import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyAnnouncementsApi } from '../features/announcements/announcements.api';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function StudentAnnouncementsPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'me', page],
    queryFn: () =>
      listMyAnnouncementsApi(auth.accessToken!, { page, pageSize: 12 }),
  });

  const items = announcementsQuery.data?.items ?? [];
  const pagination = announcementsQuery.data?.pagination ?? {
    page: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 1,
  };

  return (
    <SectionCard
      title="Announcements"
      subtitle="School announcements relevant to you."
    >
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

      {!announcementsQuery.isPending &&
      !announcementsQuery.isError &&
      items.length === 0 ? (
        <EmptyState message="No announcements for you at the moment." />
      ) : null}

      {!announcementsQuery.isPending &&
      !announcementsQuery.isError &&
      items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm"
            >
              <h3 className="mb-2 font-semibold text-slate-800">{item.title}</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {item.body}
              </p>
              <div className="mt-2 text-xs text-slate-500">
                By {item.author.firstName} {item.author.lastName} •{' '}
                {formatDate(item.publishedAt)}
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
