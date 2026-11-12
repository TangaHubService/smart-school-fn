import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MessageSquareReply, Paperclip, SendHorizontal } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  listMyAnnouncementsApi,
  markAnnouncementReadApi,
  respondToAnnouncementApi,
  type AnnouncementItem,
  type AnnouncementPriority,
} from '../features/announcements/announcements.api';
import { ApiClientError } from '../types/api';

const PRIORITY_STYLES: Record<AnnouncementPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  NORMAL: 'bg-sky-50 text-sky-700',
  HIGH: 'bg-amber-50 text-amber-700',
  URGENT: 'bg-red-50 text-red-700',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Parent portal: school announcements, with Acknowledge and Reply. */
export function ParentAnnouncementsPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['parent', 'announcements', page, filter],
    queryFn: () =>
      listMyAnnouncementsApi(auth.accessToken!, { page, pageSize: 10, unreadOnly: filter === 'unread' }),
    enabled: !!auth.accessToken,
  });

  const items = data?.items ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <SectionCard title="Announcements" subtitle="News from your children's school. Acknowledge or reply to let the school know.">
      <div className="mb-4 flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : isError ? (
        <StateView
          title="Could not load announcements"
          message="Check your connection and try again."
          action={
            <button onClick={() => refetch()} className="btn-primary">
              Retry
            </button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState message={filter === 'unread' ? 'You are all caught up.' : 'No announcements yet.'} />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">
            Prev
          </button>
          <span className="p-2 text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary">
            Next
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}

function AnnouncementCard({ item }: { item: AnnouncementItem }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(!item.isRead);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['parent', 'announcements'] });

  const readMutation = useMutation({
    mutationFn: () => markAnnouncementReadApi(auth.accessToken!, item.id),
    onSuccess: refresh,
  });
  const respondMutation = useMutation({
    mutationFn: (payload: { type: 'ACKNOWLEDGE' } | { type: 'REPLY'; message: string }) =>
      respondToAnnouncementApi(auth.accessToken!, item.id, payload),
    onSuccess: (_r, payload) => {
      if (payload.type === 'REPLY') {
        setReply('');
        setReplying(false);
        showToast({ type: 'success', title: 'Reply sent to the school' });
      }
      refresh();
    },
    onError: (e) => showToast({ type: 'error', title: 'Could not send', message: (e as ApiClientError).message }),
  });

  const replies = item.myReplies ?? [];

  return (
    <li className={`rounded-xl border p-4 ${item.isRead ? 'border-slate-200 bg-white' : 'border-brand-200 bg-brand-50/40'}`}>
      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          if (!item.isRead && !readMutation.isPending) readMutation.mutate();
        }}
        className="w-full text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          {!item.isRead ? <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" /> : null}
          <h3 className="text-[15px] font-semibold text-slate-900">{item.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLES[item.priority]}`}>
            {item.priority}
          </span>
          {item.acknowledged ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Acknowledged
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {item.author.firstName} {item.author.lastName} · {formatDate(item.publishedAt)}
        </p>
        <p className={`mt-2 whitespace-pre-wrap text-sm text-slate-700 ${expanded ? '' : 'line-clamp-2'}`}>{item.body}</p>
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3">
          {item.attachments.length ? (
            <div className="flex flex-wrap gap-2">
              {item.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.secureUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-brand-700"
                >
                  <Paperclip className="h-3.5 w-3.5" /> {a.originalName}
                </a>
              ))}
            </div>
          ) : null}

          {replies.length ? (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Your replies</p>
              {replies.map((r) => (
                <div key={r.id} className="text-sm text-slate-700">
                  <p className="whitespace-pre-wrap">{r.message}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(r.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : null}

          {replying ? (
            <div className="flex items-end gap-2">
              <textarea
                autoFocus
                rows={2}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                maxLength={2000}
                placeholder="Write your reply or question to the school…"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <button
                type="button"
                disabled={!reply.trim() || respondMutation.isPending}
                onClick={() => respondMutation.mutate({ type: 'REPLY', message: reply.trim() })}
                className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white disabled:bg-slate-300"
                aria-label="Send reply"
              >
                {respondMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!item.acknowledged ? (
              <button
                type="button"
                disabled={respondMutation.isPending}
                onClick={() => respondMutation.mutate({ type: 'ACKNOWLEDGE' })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Acknowledge
              </button>
            ) : null}
            {!replying ? (
              <button
                type="button"
                onClick={() => setReplying(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <MessageSquareReply className="h-4 w-4" /> Reply
              </button>
            ) : (
              <button type="button" onClick={() => setReplying(false)} className="px-2 text-xs text-slate-500">
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}
