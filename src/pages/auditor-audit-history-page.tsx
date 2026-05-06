import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  Loader2,
  TrendingUp,
} from 'lucide-react';

import { StateView } from '../components/state-view';
import {
  ACADEMIC_AUDIT_MODULE_LABELS,
  listAuditsApi,
  type AcademicAuditModule,
} from '../features/audit/audit.api';

const MODULE_ICONS: Record<AcademicAuditModule, typeof ClipboardList> = {
  ATTENDANCE: ClipboardList,
  COURSE_MANAGEMENT: BookOpen,
  LEARNING_INSIGHTS: TrendingUp,
  CONTINUOUS_ASSESSMENTS: ClipboardCheck,
  MARKS: FileBarChart2,
  TIMETABLE: CalendarDays,
};

export function AuditorAuditHistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditor-audits', page],
    queryFn: () => listAuditsApi({ page, pageSize: 20 }),
  });

  if (isLoading) {
    return <StateView title="Loading..." loading />;
  }

  if (error) {
    return <StateView title="Error loading audits" variant="error" />;
  }

  if (!data) {
    return <StateView title="No data" variant="empty" />;
  }

  const { items, pagination } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit History</h1>
        <p className="text-sm text-slate-500 mt-1">View all submitted audits</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-slate-500">No audits submitted yet.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((audit) => {
              const Icon = MODULE_ICONS[audit.module] || FileBarChart2;
              const scoreColor =
                audit.score >= 80
                  ? 'bg-green-100 text-green-700'
                  : audit.score >= 60
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700';

              return (
                <div
                  key={audit.id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-slate-100 p-2">
                        <Icon className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">
                          {audit.school.displayName}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {ACADEMIC_AUDIT_MODULE_LABELS[audit.module]}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {[
                            audit.school.province,
                            audit.school.district,
                            audit.school.sector,
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${scoreColor}`}
                      >
                        {audit.score}%
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(audit.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {audit.comment && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <p className="text-sm text-slate-600">{audit.comment}</p>
                      {audit.recommendation && (
                        <p className="text-sm text-slate-500 mt-2">
                          <span className="font-medium">Recommendation:</span>{' '}
                          {audit.recommendation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
