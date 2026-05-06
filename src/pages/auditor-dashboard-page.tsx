import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  School,
  TrendingUp,
} from 'lucide-react';

import { StateView } from '../components/state-view';
import {
  ACADEMIC_AUDIT_MODULE_LABELS,
  AUDITOR_AUDIT_MODULES,
  getAuditorDashboardApi,
  type AcademicAuditModule,
} from '../features/audit/audit.api';

const MODULE_ICONS: Record<AcademicAuditModule, typeof ClipboardList> = {
  ATTENDANCE: ClipboardList,
  COURSE_MANAGEMENT: BookOpen,
  LEARNING_INSIGHTS: BarChart3,
  CONTINUOUS_ASSESSMENTS: ClipboardCheck,
  MARKS: FileBarChart2,
  TIMETABLE: CalendarDays,
};

export function AuditorDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['auditor-dashboard'],
    queryFn: getAuditorDashboardApi,
  });

  if (isLoading) {
    return <StateView title="Loading..." loading />;
  }

  if (error) {
    return <StateView title="Error loading dashboard" variant="error" />;
  }

  if (!data) {
    return <StateView title="No data available" variant="empty" />;
  }

  const { scope, stats, recentAudits } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Auditor Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Scope: {scope.level} - {scope.country}
          {scope.province && ` / ${scope.province}`}
          {scope.district && ` / ${scope.district}`}
          {scope.sector && ` / ${scope.sector}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <School className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Schools in Scope</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalSchoolsInScope}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Completed Audits</p>
              <p className="text-2xl font-bold text-slate-900">{stats.completedAudits}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-3">
              <FileBarChart2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Schools</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pendingSchools}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Audit Modules</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDITOR_AUDIT_MODULES.map((module) => {
            const Icon = MODULE_ICONS[module];
            return (
              <Link
                key={module}
                to={`/auditor/schools?module=${module}`}
                className="flex items-center gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="rounded-lg bg-blue-50 p-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-slate-900">
                  {ACADEMIC_AUDIT_MODULE_LABELS[module]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Audits</h2>
        </div>

        {recentAudits.length === 0 ? (
          <p className="text-sm text-slate-500">No audits submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {recentAudits.map((audit) => {
              const Icon = MODULE_ICONS[audit.module] || FileBarChart2;
              return (
                <div
                  key={audit.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{audit.school}</p>
                      <p className="text-sm text-slate-500">
                        {ACADEMIC_AUDIT_MODULE_LABELS[audit.module]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{audit.score}%</p>
                    <p className="text-xs text-slate-500">
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
