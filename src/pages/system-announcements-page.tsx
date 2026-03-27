import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  createSystemAnnouncementApi,
  listSystemAnnouncementsApi,
} from '../features/system-announcements/system-announcements.api';

const TARGETS = [
  { value: 'ALL_SCHOOLS', label: 'All schools' },
  { value: 'SPECIFIC_SCHOOLS', label: 'Specific schools' },
  { value: 'SPECIFIC_ROLES', label: 'Specific roles' },
  { value: 'SCHOOLS_AND_ROLES', label: 'Schools and roles' },
];

export function SystemAnnouncementsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('ALL_SCHOOLS');
  const [targetTenantIds, setTargetTenantIds] = useState('');
  const [targetRoleNames, setTargetRoleNames] = useState('');

  const listQuery = useQuery({
    queryKey: ['system-announcements', page],
    queryFn: () => listSystemAnnouncementsApi(auth.accessToken!, { page, pageSize: 15 }),
    enabled: Boolean(auth.accessToken),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSystemAnnouncementApi(auth.accessToken!, {
        title: title.trim(),
        body: body.trim(),
        targetType,
        targetTenantIds: targetTenantIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        targetRoleNames: targetRoleNames
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        status: 'PUBLISHED',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['system-announcements'] });
      showToast({ type: 'success', title: 'Created', message: 'Announcement published.' });
      setTitle('');
      setBody('');
    },
  });

  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title="System announcements"
        subtitle="Reach all schools, selected schools, or roles. Shown alongside school announcements."
      >
        {listQuery.isPending ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : listQuery.isError ? (
          <StateView title="Could not load" message="Try again." />
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-brand-100 bg-slate-50/50 px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {a.status} · {a.targetType}
                    {a.publishedAt ? ` · ${new Date(a.publishedAt).toLocaleString()}` : ''}
                  </p>
                </li>
              ))}
            </ul>
            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex justify-between text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-brand-200 px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-brand-200 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>

      <SectionCard title="New announcement" subtitle="Published immediately for matching audiences.">
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-slate-600">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Audience</span>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
            >
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-slate-600">School tenant IDs (comma-separated, if applicable)</span>
            <input
              value={targetTenantIds}
              onChange={(e) => setTargetTenantIds(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 font-mono text-xs"
              placeholder="uuid, uuid"
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Roles (comma-separated, if applicable)</span>
            <input
              value={targetRoleNames}
              onChange={(e) => setTargetRoleNames(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              placeholder="TEACHER, SCHOOL_ADMIN"
            />
          </label>
          <button
            type="button"
            disabled={createMutation.isPending || !title.trim() || !body.trim()}
            onClick={() => createMutation.mutate()}
            className="w-full rounded-lg bg-brand-500 py-2 font-semibold text-white disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
