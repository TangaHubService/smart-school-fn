import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Filter, Search } from 'lucide-react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listAuditLogsApi } from '../features/audit/audit.api';
import { listTenantsApi, type TenantListItem } from '../features/sprint1/sprint1.api';

export function AuditLogsPage() {
  const auth = useAuth();
  const [search, setSearch] = useState('');
  const [event, setEvent] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const tenantsQuery = useQuery({
    queryKey: ['tenants-audit-filter'],
    queryFn: () => listTenantsApi(auth.accessToken!, { page: 1, pageSize: 200 }),
    enabled: Boolean(auth.accessToken),
  });

  const schools = (tenantsQuery.data as TenantListItem[] | undefined) ?? [];

  const logsQuery = useQuery({
    queryKey: ['audit-logs', search, event, tenantId, from, to, page],
    queryFn: () =>
      listAuditLogsApi(auth.accessToken!, {
        page,
        pageSize: 25,
        search: search.trim() || undefined,
        event: event || undefined,
        tenantId: tenantId || undefined,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
      }),
  });

  const items = logsQuery.data?.items ?? [];
  const pagination = logsQuery.data?.pagination;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Activity Logs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Important platform actions: schools, users, subscriptions, announcements, and auditors.
        </p>
      </div>

      <SectionCard title="Activity Log" subtitle="Filtered audit trail">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search event or entity..."
              className="h-10 w-full rounded-lg border border-brand-200 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <input
              value={event}
              onChange={(e) => {
                setEvent(e.target.value);
                setPage(1);
              }}
              placeholder="Event code"
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
            />
          </div>
          <select
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setPage(1);
            }}
            className="h-10 max-w-[200px] rounded-lg border border-brand-200 px-3 text-sm"
          >
            <option value="">All schools</option>
            {schools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.school?.displayName ?? t.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
          />
        </div>

        {logsQuery.isPending ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : logsQuery.isError ? (
          <StateView title="Could not load logs" message="Try again shortly." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-100">
                    <th className="pb-3 text-left font-semibold text-slate-700">When</th>
                    <th className="pb-3 text-left font-semibold text-slate-700">Event</th>
                    <th className="pb-3 text-left font-semibold text-slate-700">Actor</th>
                    <th className="pb-3 text-left font-semibold text-slate-700">School</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => (
                    <tr key={log.id} className="border-b border-brand-50">
                      <td className="py-3 text-slate-600">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 font-medium text-slate-900">{log.event}</td>
                      <td className="py-3 text-slate-600">{log.actor?.email ?? '—'}</td>
                      <td className="py-3 text-slate-600">{log.tenant.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-slate-600">
                  Page {pagination.page} / {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-brand-200 px-3 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border border-brand-200 px-3 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </section>
  );
}
