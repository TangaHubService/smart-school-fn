import { Download, Eye } from 'lucide-react';
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { listActivityLogsApi } from '../features/audit/audit.api';
import { SectionCard } from '../components/section-card';
import { AppDrawer } from '../components/drawer';
import {
  DataTable,
  DataTableToolbar,
  type DataTableColumn,
} from '../components/ui/data-table';
import { Badge } from '../components/ui/badge';

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
  return event
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const logColumns: DataTableColumn<ActivityLog>[] = [
  {
    key: 'action',
    header: 'Action',
    mobile: 'primary',
    render: (log) => (
      <span className="font-medium text-slate-900">
        {formatAction(log.actionType || log.event)}
      </span>
    ),
  },
  {
    key: 'module',
    header: 'Module',
    mobile: 'secondary',
    render: (log) => <span className="text-slate-600">{log.module || '-'}</span>,
  },
  {
    key: 'actor',
    header: 'User',
    render: (log) => (
      <span className="text-slate-600">
        {log.actor?.name || log.actor?.email || 'System'}
        {log.actor?.role ? (
          <span className="block text-xs text-slate-500">{log.actor.role}</span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (log) => (
      <Badge tone={log.status === 'FAILED' ? 'danger' : 'success'}>
        {log.status || 'SUCCESS'}
      </Badge>
    ),
  },
  {
    key: 'timestamp',
    header: 'Date',
    render: (log) => (
      <span className="text-xs text-slate-600">
        {new Date(log.timestamp || log.createdAt).toLocaleString()}
      </span>
    ),
  },
];

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
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
        <p className="mt-1 text-sm text-slate-600">Track all system actions in your school</p>
      </div>

      <SectionCard
        title="Activity Log"
        subtitle="Track all system actions"
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </button>
        }
      >
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.055)]">
          <DataTableToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search logs..."
            searchAriaLabel="Search activity logs"
            filters={[
              {
                id: 'action',
                label: 'Filter by action',
                value: actionFilter,
                options: [
                  { label: 'All actions', value: '' },
                  { label: 'Login', value: 'LOGIN' },
                  { label: 'Logout', value: 'LOGOUT' },
                  { label: 'Create', value: 'CREATE' },
                  { label: 'Update', value: 'UPDATE' },
                  { label: 'Delete', value: 'DELETE' },
                ],
                onChange: (value) => {
                  setActionFilter(value);
                  setPage(1);
                },
              },
              {
                id: 'module',
                label: 'Filter by module',
                value: moduleFilter,
                options: [
                  { label: 'All modules', value: '' },
                  { label: 'Authentication', value: 'Authentication' },
                  { label: 'Students', value: 'Students' },
                  { label: 'Attendance', value: 'Attendance' },
                  { label: 'Assessments', value: 'Assessments' },
                  { label: 'Exams', value: 'Exams' },
                  { label: 'Learning', value: 'Learning' },
                  { label: 'Timetable', value: 'Timetable' },
                  { label: 'Announcements', value: 'Announcements' },
                  { label: 'Finance', value: 'Finance' },
                  { label: 'Government', value: 'Government' },
                ],
                onChange: (value) => {
                  setModuleFilter(value);
                  setPage(1);
                },
              },
              {
                id: 'status',
                label: 'Filter by status',
                value: statusFilter,
                options: [
                  { label: 'All statuses', value: '' },
                  { label: 'Success', value: 'SUCCESS' },
                  { label: 'Failed', value: 'FAILED' },
                ],
                onChange: (value) => {
                  setStatusFilter(value);
                  setPage(1);
                },
              },
            ]}
            onReset={() => {
              setSearch('');
              setActionFilter('');
              setModuleFilter('');
              setStatusFilter('');
              setPage(1);
            }}
          />

          <div className="p-4">
            <DataTable<ActivityLog>
              ariaLabel="Activity log"
              columns={logColumns}
              data={logs}
              rowKey={(log) => log.id}
              loading={isLoading}
              skeletonRows={6}
              error={isError ? { title: 'Could not load activity logs', message: 'Please try again later.' } : null}
              onRetry={() => void refetch()}
              emptyTitle="No activity logs found"
              emptyDescription="System actions will appear here as they happen."
              pagination={
                pagination
                  ? {
                      page: pagination.page,
                      pageSize: pagination.pageSize,
                      totalItems: pagination.totalItems,
                      totalPages: pagination.totalPages,
                      onPageChange: setPage,
                      onPageSizeChange: () => undefined,
                    }
                  : undefined
              }
              rowActions={(log) => (
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  aria-label={`View details for ${formatAction(log.actionType || log.event)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  View
                </button>
              )}
              minWidth={820}
              className="border-0 shadow-none"
            />
          </div>
        </div>
      </SectionCard>

      <AppDrawer open={!!selectedLog} onClose={() => setSelectedLog(null)} title="Activity Details">
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
                <p className="font-medium text-slate-900">{selectedLog.actor?.name || 'System'}</p>
                {selectedLog.actor?.email && (
                  <p className="text-xs text-slate-500">{selectedLog.actor.email}</p>
                )}
              </div>
              <div>
                <p className="text-slate-500">Role</p>
                <p className="font-medium text-slate-900">{selectedLog.actor?.role || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500">Module</p>
                <p className="font-medium text-slate-900">{selectedLog.module || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <p className="font-medium text-slate-900">{selectedLog.status || 'SUCCESS'}</p>
              </div>
              <div>
                <p className="text-slate-500">IP Address</p>
                <p className="font-medium text-slate-900 font-mono text-xs">
                  {formatIpAddress(selectedLog.ipAddress)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Device</p>
                <p className="font-medium text-slate-900">{selectedLog.device || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500">School</p>
                <p className="font-medium text-slate-900">{selectedLog.schoolName || '-'}</p>
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
                  <p className="font-medium text-slate-900">{selectedLog.entity}</p>
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
      </AppDrawer>
    </section>
  );
}
