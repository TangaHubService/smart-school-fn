import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { GovAuditActionType, listGovActivityLogsApi } from '../features/gov/gov.api';

const actionTypes: GovAuditActionType[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const moduleOptions = ['Audit', 'School', 'User'];

function formatAction(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function GovActivityLogsPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState<GovAuditActionType | ''>('');
  const [moduleName, setModuleName] = useState('');

  const logsQuery = useQuery({
    queryKey: ['gov-activity-logs', page, search, actionType, moduleName],
    queryFn: () =>
      listGovActivityLogsApi(auth.accessToken!, {
        page,
        pageSize: 20,
        search: search || undefined,
        actionType: actionType || undefined,
        module: moduleName || undefined,
      }),
  });

  const logs = logsQuery.data?.items ?? [];
  const pagination = logsQuery.data?.pagination;

  if (logsQuery.isError) {
    return (
      <StateView
        title="Could not load activity logs"
        message="Retry the request. Existing audit history is still stored."
        action={
          <button
            type="button"
            onClick={() => void logsQuery.refetch()}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <SectionCard
      title="Activity Logs"
      subtitle="Simple trace of who changed what and when in the auditor workflow."
    >
      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search activity logs"
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
        <select
          value={actionType}
          onChange={(event) => {
            setActionType(event.target.value as GovAuditActionType | '');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          <option value="">All actions</option>
          {actionTypes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={moduleName}
          onChange={(event) => {
            setModuleName(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          <option value="">All modules</option>
          {moduleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logsQuery.isPending ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No activity logs found.
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr key={log.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {log.actor?.name || log.actor?.email || 'System'}
                    </p>
                    <p className="text-xs text-slate-500">{log.actor?.role || 'N/A'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatAction(log.actionType || log.event)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.module || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{log.schoolName || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(log.timestamp || log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
