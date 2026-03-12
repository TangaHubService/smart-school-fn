import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  AnnouncementItem,
  listAnnouncementsApi,
} from '../features/announcements/announcements.api';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AnnouncementsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [publishedOnly, setPublishedOnly] = useState(true);

  const announcementsQuery = useQuery({
    queryKey: ['announcements', page, publishedOnly],
    queryFn: () =>
      listAnnouncementsApi(auth.accessToken!, {
        page,
        pageSize: 12,
        publishedOnly,
      }),
  });

  const items = announcementsQuery.data?.items ?? [];
  const pagination = announcementsQuery.data?.pagination ?? {
    page: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 1,
  };

  const canManage = auth.me?.permissions.includes('announcements.manage') ?? false;

  return (
    <SectionCard
      title="Announcements"
      subtitle="School-wide and targeted announcements for students and staff."
      action={
        canManage ? (
          <Link
            to="/admin/announcements/new"
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            New announcement
          </Link>
        ) : null
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publishedOnly}
            onChange={(e) => {
              setPublishedOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-brand-200"
          />
          Published only
        </label>
      </div>

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
        <EmptyState
          message={
            publishedOnly
              ? 'No published announcements.'
              : 'No announcements yet.'
          }
        />
      ) : null}

      {!announcementsQuery.isPending &&
      !announcementsQuery.isError &&
      items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <AnnouncementCard key={item.id} item={item} canManage={canManage} />
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

function AnnouncementCard({
  item,
  canManage,
}: {
  item: AnnouncementItem;
  canManage: boolean;
}) {
  return (
    <article className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{item.title}</h3>
        {canManage ? (
          <Link
            to={`/admin/announcements/${item.id}`}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            Edit
          </Link>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-sm text-slate-600">{item.body}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>By {item.author.firstName} {item.author.lastName}</span>
        <span>Audience: {item.audience}</span>
        {item.publishedAt ? (
          <span>Published {formatDate(item.publishedAt)}</span>
        ) : (
          <span className="text-amber-600">Draft</span>
        )}
        {item.expiresAt ? (
          <span>Expires {formatDate(item.expiresAt)}</span>
        ) : null}
      </div>
    </article>
  );
}
