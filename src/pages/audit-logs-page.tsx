import { Download, Filter, Search } from 'lucide-react';
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { listActivityLogsApi } from '../features/audit/audit.api';
import { SectionCard } from '../components/section-card';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

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
              <option value="STUDENT_CREATED">Student created</option>
              <option value="STUDENT_UPDATED">Student updated</option>
              <option value="COURSE_CREATED">Course created</option>
              <option value="LESSON_CREATED">Lesson created</option>
              <option value="LESSON_PUBLISHED">Lesson published</option>
              <option value="ASSIGNMENT_CREATED">Assignment created</option>
              <option value="ASSESSMENT_CREATED">Assessment created</option>
              <option value="EXAM_CREATED">Exam created</option>
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
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-brand-50">
                    <td className="py-3 font-medium text-slate-900">
                      {log.event.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 text-slate-600">
                      {log.actor?.name || log.actor?.email || 'System'}
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 text-slate-600">{log.ipAddress || '-'}</td>
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
    </section>
  );
}