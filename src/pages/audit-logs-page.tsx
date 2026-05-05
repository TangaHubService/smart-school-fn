import { Download, Filter, Search, Eye, X } from 'lucide-react';
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { listActivityLogsApi } from '../features/audit/audit.api';
import { SectionCard } from '../components/section-card';
import { Modal } from '../components/modal';

interface ActivityLog {
  id: string;
  event: string;
  actionType: string | null;
  module: string | null;
  description: string | null;
  entity: string | null;
  entityId: string | null;
  recordId: string | null;
  createdAt: string;
  timestamp: string;
  ipAddress: string | null;
  device: string | null;
  status: string | null;
  sessionId: string | null;
  actor: {
    id: string | null;
    email: string | null;
    name: string | null;
    role: string | null;
  } | null;
  schoolName: string | null;
  oldValue: unknown;
  newValue: unknown;
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
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page, search, actionFilter, moduleFilter, statusFilter],
    queryFn: () =>
      listActivityLogsApi({
        page,
        pageSize: 100,
        search: search || undefined,
        actionType: actionFilter || undefined,
        module: moduleFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const logs = data?.items ?? [];
  const pagination = data?.pagination;

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
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
            >
              <option value="">All modules</option>
              <option value="Authentication">Authentication</option>
              <option value="Students">Students</option>
              <option value="Attendance">Attendance</option>
              <option value="Assessments">Assessments</option>
              <option value="Exams">Exams</option>
              <option value="Learning">Learning</option>
              <option value="Timetable">Timetable</option>
              <option value="Announcements">Announcements</option>
              <option value="Finance">Finance</option>
              <option value="Government">Government</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100">
                <th className="pb-3 text-left font-semibold text-slate-700">Action</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Module</th>
                <th className="pb-3 text-left font-semibold text-slate-700">User</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Status</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Date</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                logs.map((log: ActivityLog) => (
                  <tr key={log.id} className="border-b border-brand-50">
                    <td className="py-3 font-medium text-slate-900">
                      {formatAction(log.actionType || log.event)}
                    </td>
                    <td className="py-3 text-slate-600">
                      {log.module || '-'}
                    </td>
                    <td className="py-3 text-slate-600">
                      {log.actor?.name || log.actor?.email || 'System'}
                      {log.actor?.role && (
                        <p className="text-xs text-slate-500">{log.actor.role}</p>
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          log.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {log.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Date(log.timestamp || log.createdAt).toLocaleString()}
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
                  {formatAction(selectedLog.actionType || selectedLog.event)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Date & Time</p>
                <p className="font-medium text-slate-900">
                  {new Date(selectedLog.timestamp || selectedLog.createdAt).toLocaleString()}
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
                <p className="text-slate-500">Role</p>
                <p className="font-medium text-slate-900">
                  {selectedLog.actor?.role || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Module</p>
                <p className="font-medium text-slate-900">
                  {selectedLog.module || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <p className="font-medium text-slate-900">
                  {selectedLog.status || 'SUCCESS'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">IP Address</p>
                <p className="font-medium text-slate-900 font-mono text-xs">
                  {formatIpAddress(selectedLog.ipAddress)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Device</p>
                <p className="font-medium text-slate-900">
                  {selectedLog.device || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">School</p>
                <p className="font-medium text-slate-900">
                  {selectedLog.schoolName || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Session ID</p>
                <p className="font-medium text-slate-900 font-mono text-xs break-all">
                  {selectedLog.sessionId || '-'}
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
              {selectedLog.recordId && (
                <div>
                  <p className="text-slate-500">Record ID</p>
                  <p className="font-medium text-slate-900 font-mono text-xs break-all">
                    {selectedLog.recordId}
                  </p>
                </div>
              )}
            </div>

            {selectedLog.description && (
              <div>
                <p className="text-slate-500 text-sm">Description</p>
                <p className="mt-1 rounded bg-slate-100 p-3 text-sm text-slate-800">
                  {selectedLog.description}
                </p>
              </div>
            )}

            {selectedLog.oldValue !== null && selectedLog.oldValue !== undefined && (
              <div>
                <p className="text-slate-500 text-sm">Old Value</p>
                <pre className="mt-1 max-h-60 overflow-auto rounded bg-slate-100 p-3 text-xs font-mono">
                  {JSON.stringify(selectedLog.oldValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValue !== null && selectedLog.newValue !== undefined && (
              <div>
                <p className="text-slate-500 text-sm">New Value</p>
                <pre className="mt-1 max-h-60 overflow-auto rounded bg-slate-100 p-3 text-xs font-mono">
                  {JSON.stringify(selectedLog.newValue, null, 2)}
                </pre>
              </div>
            )}

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
