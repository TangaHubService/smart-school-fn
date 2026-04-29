import { Download, Filter, Search, Eye, X } from 'lucide-react';
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { listActivityLogsApi } from '../features/audit/audit.api';
import { SectionCard } from '../components/section-card';
import { Modal } from '../components/modal';

interface ActivityLog {
  id: string;
  event: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  ipAddress: string | null;
  actor: {
    id: string;
    email: string;
    name: string;
  } | null;
  payload: unknown;
}

function formatIpAddress(ip: string | null): string {
  if (!ip) return '-';
  if (ip === '::1') return '127.0.0.1 (localhost)';
  return ip;
}

function formatAction(event: string): string {
  return event.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page, search, actionFilter],
    queryFn: () =>
      listActivityLogsApi({
        page,
        pageSize: 30,
        search: search || undefined,
        event: actionFilter || undefined,
      }),
  });

  const logs = data?.data?.items ?? [];
  const pagination = data?.data?.pagination;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Activity Logs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track all system actions in your school
        </p>
      </div>

      <SectionCard
        title="Activity Log"
        subtitle="Track all system actions"
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="h-10 w-full rounded-lg border border-brand-200 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
            >
              <option value="">All actions</option>
              <option value="AUTH_LOGIN_SUCCESS">Login</option>
              <option value="AUTH_LOGOUT">Logout</option>
              <option value="STUDENT_CREATED">Student created</option>
              <option value="STUDENT_UPDATED">Student updated</option>
              <option value="STUDENT_DELETED">Student deleted</option>
              <option value="COURSE_CREATED">Course created</option>
              <option value="COURSE_UPDATED">Course updated</option>
              <option value="LESSON_CREATED">Lesson created</option>
              <option value="LESSON_PUBLISHED">Lesson published</option>
              <option value="LESSON_UPDATED">Lesson updated</option>
              <option value="ASSIGNMENT_CREATED">Assignment created</option>
              <option value="ASSESSMENT_CREATED">Assessment created</option>
              <option value="EXAM_CREATED">Exam created</option>
              <option value="EXAM_MARKS_SAVED">Exam marks saved</option>
            </select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100">
                <th className="pb-3 text-left font-semibold text-slate-700">Action</th>
                <th className="pb-3 text-left font-semibold text-slate-700">User</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Date</th>
                <th className="pb-3 text-left font-semibold text-slate-700">IP Address</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                logs.map((log: ActivityLog) => (
                  <tr key={log.id} className="border-b border-brand-50">
                    <td className="py-3 font-medium text-slate-900">
                      {formatAction(log.event)}
                    </td>
                    <td className="py-3 text-slate-600">
                      {log.actor?.name || log.actor?.email || 'System'}
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 text-slate-600 font-mono text-xs">
                      {formatIpAddress(log.ipAddress)}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 rounded border border-brand-200 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-brand-200 px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              className="rounded border border-brand-200 px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </SectionCard>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Activity Details"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Action</p>
                <p className="font-medium text-slate-900">
                  {formatAction(selectedLog.event)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Date & Time</p>
                <p className="font-medium text-slate-900">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500">User</p>
                <p className="font-medium text-slate-900">
                  {selectedLog.actor?.name || 'System'}
                </p>
                {selectedLog.actor?.email && (
                  <p className="text-xs text-slate-500">
                    {selectedLog.actor.email}
                  </p>
                )}
              </div>
              <div>
                <p className="text-slate-500">IP Address</p>
                <p className="font-medium text-slate-900 font-mono text-xs">
                  {formatIpAddress(selectedLog.ipAddress)}
                </p>
              </div>
              {selectedLog.entity && (
                <div>
                  <p className="text-slate-500">Entity</p>
                  <p className="font-medium text-slate-900">
                    {selectedLog.entity}
                  </p>
                </div>
              )}
              {selectedLog.entityId && (
                <div>
                  <p className="text-slate-500">Entity ID</p>
                  <p className="font-medium text-slate-900 font-mono text-xs break-all">
                    {selectedLog.entityId}
                  </p>
                </div>
              )}
            </div>

            {selectedLog.payload !== null && (
              <div>
                <p className="text-slate-500 text-sm">Additional Data</p>
                <pre className="mt-1 max-h-60 overflow-auto rounded bg-slate-100 p-3 text-xs font-mono">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </section>
  );
}