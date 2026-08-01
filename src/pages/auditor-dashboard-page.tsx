import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileBarChart2,
  MapPin,
  School,
  TrendingUp,
} from 'lucide-react';

import { DemographicsWidget } from '../components/dashboard/demographics-widget';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { getDemographicsApi } from '../features/dashboard/dashboard.api';
import {
  ACADEMIC_AUDIT_MODULE_LABELS,
  AUDITOR_AUDIT_MODULES,
  getAuditorDashboardApi,
  getAuditorReportApi,
  type AcademicAuditModule,
} from '../features/audit/audit.api';
import { Badge, Card, CardHeader, MetricCard } from '../components/dashboard/dashboard-ui';

const MODULE_ICONS: Record<AcademicAuditModule, typeof ClipboardList> = {
  ATTENDANCE: ClipboardList,
  COURSE_MANAGEMENT: BookOpen,
  LEARNING_INSIGHTS: BarChart3,
  CONTINUOUS_ASSESSMENTS: ClipboardCheck,
  MARKS: FileBarChart2,
  TIMETABLE: CalendarDays,
  FINANCE: ClipboardList,
  TEACHERS: ClipboardList,
  STUDENT_RECORDS: ClipboardList,
  INFRASTRUCTURE: ClipboardList,
  ICT: ClipboardList,
  SAFETY: ClipboardList,
  COMPLIANCE: ClipboardCheck,
};

export function AuditorDashboardPage() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'report'>('overview');
  const [showReport, setShowReport] = useState(false);
  const [demogSegment, setDemogSegment] = useState<'sector' | 'grade' | 'academicYear'>('sector');

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditor-dashboard'],
    queryFn: getAuditorDashboardApi,
  });

  const demogQuery = useQuery({
    queryKey: ['dashboard', 'demographics', 'auditor'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => getDemographicsApi(auth.accessToken!),
  });

  const reportQuery = useQuery({
    queryKey: ['auditor-report'],
    queryFn: getAuditorReportApi,
    enabled: showReport,
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
        <div className="mt-2 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">{scope.level}</span>
          </div>
          <span className="text-sm text-slate-500">—</span>
          <span className="text-sm text-slate-700">{scope.country}</span>
          {scope.province && (
            <>
              <ChevronDown className="h-3 w-3 rotate-270 text-slate-400" />
              <span className="text-sm text-slate-700">{scope.province}</span>
            </>
          )}
          {scope.district && (
            <>
              <ChevronDown className="h-3 w-3 rotate-270 text-slate-400" />
              <span className="text-sm text-slate-700">{scope.district}</span>
            </>
          )}
          {scope.sector && (
            <>
              <ChevronDown className="h-3 w-3 rotate-270 text-slate-400" />
              <span className="text-sm text-slate-700">{scope.sector}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-semibold ${
            activeTab === 'overview'
              ? 'border-b-2 border-brand-600 text-brand-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('report');
            setShowReport(true);
          }}
          className={`px-4 py-2 text-sm font-semibold ${
            activeTab === 'report'
              ? 'border-b-2 border-brand-600 text-brand-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Report
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {demogQuery.data && (
            <DemographicsWidget
              data={demogQuery.data}
              isLoading={demogQuery.isPending}
              segment={demogSegment}
              onSegmentChange={setDemogSegment}
            />
          )}

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              icon={School}
              label="Schools in Scope"
              value={stats.totalSchoolsInScope}
              tone="brand"
            />
            <MetricCard
              icon={BadgeCheck}
              label="Submitted Reports"
              value={stats.completedAudits}
              tone="success"
            />
            <MetricCard
              icon={FileBarChart2}
              label="Drafts"
              value={stats.draftAudits}
              tone="neutral"
            />
            <MetricCard
              icon={FileBarChart2}
              label="Pending Schools"
              value={stats.pendingSchools}
              tone="warning"
            />
            <MetricCard
              icon={BadgeCheck}
              label="Compliance Score"
              value={stats.averageComplianceScore !== null ? `${stats.averageComplianceScore}%` : '—'}
              tone="purple"
            />
          </div>

          <Card>
            <CardHeader
              title="Audit Modules"
              subtitle="Open a module to audit schools"
              icon={ClipboardList}
              tone="brand"
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {AUDITOR_AUDIT_MODULES.map((module) => {
                const Icon = MODULE_ICONS[module];
                return (
                  <Link
                    key={module}
                    to={`/auditor/schools?module=${module}`}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:shadow-md"
                  >
                    <div className="rounded-lg bg-brand-50 p-2">
                      <Icon className="h-5 w-5 text-brand-600" />
                    </div>
                    <span className="font-medium text-slate-900">
                      {ACADEMIC_AUDIT_MODULE_LABELS[module]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent Audits"
              subtitle="Most recently submitted audit reports"
              icon={FileBarChart2}
              tone="success"
            />

            {recentAudits.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-slate-500">No audits submitted yet.</p>
            ) : (
              <div className="space-y-3 p-5">
                {recentAudits.map((audit) => {
                  const Icon = MODULE_ICONS[audit.module] || FileBarChart2;
                  return (
                    <div
                      key={audit.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4"
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
                        <Badge tone={audit.score >= 75 ? 'success' : audit.score >= 50 ? 'warning' : 'danger'}>
                          {audit.score}%
                        </Badge>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(audit.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === 'report' && (
        <div className="space-y-6">
          {reportQuery.isLoading && <StateView title="Generating report..." loading />}
          {reportQuery.isError && (
            <StateView title="Could not load report" variant="error" />
          )}
          {reportQuery.data && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Audit Report</h2>
                <button
                  type="button"
                  onClick={() => {
                    const rows = [
                      ['School', 'Province', 'District', 'Sector', 'Audits', 'Latest Score'],
                      ...reportQuery.data.report.schools.map(s => [
                        s.name,
                        s.province || '',
                        s.district || '',
                        s.sector || '',
                        String(s.auditCount),
                        s.latestScore !== null ? `${s.latestScore}%` : '—',
                      ]),
                    ];
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'audit-report.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard
                  icon={School}
                  label="Schools in Scope"
                  value={reportQuery.data.report.totalSchoolsInScope}
                  tone="brand"
                />
                <MetricCard
                  icon={BadgeCheck}
                  label="Schools Audited"
                  value={reportQuery.data.report.schoolsAudited}
                  tone="success"
                />
                <MetricCard
                  icon={FileBarChart2}
                  label="Total Audits"
                  value={reportQuery.data.report.totalAudits}
                  tone="neutral"
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Average Score"
                  value={
                    reportQuery.data.report.averageScore !== null
                      ? `${reportQuery.data.report.averageScore}%`
                      : '—'
                  }
                  tone={reportQuery.data.report.averageScore != null && reportQuery.data.report.averageScore >= 75 ? 'success' : 'warning'}
                />
              </div>

              {Object.keys(reportQuery.data.report.moduleDistribution).length > 0 && (
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Audit Distribution by Module
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(reportQuery.data.report.moduleDistribution).map(
                      ([module, count]) => {
                        const total = reportQuery.data.report.totalAudits;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={module} className="flex items-center gap-3">
                            <span className="w-40 text-sm text-slate-700">
                              {ACADEMIC_AUDIT_MODULE_LABELS[module as AcademicAuditModule] || module}
                            </span>
                            <div className="flex-1 rounded-full bg-slate-100 h-2">
                              <div
                                className="h-2 rounded-full bg-blue-600"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-16 text-right text-sm font-medium text-slate-600">
                              {count} ({pct}%)
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  School Audit Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                        <th className="py-2 pr-4">School</th>
                        <th className="py-2 pr-4">Location</th>
                        <th className="py-2 pr-4">Audits</th>
                        <th className="py-2">Latest Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportQuery.data.report.schools.map(school => (
                        <tr key={school.id} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-medium text-slate-900">{school.name}</td>
                          <td className="py-2 pr-4 text-slate-600">
                            {[school.province, school.district, school.sector]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </td>
                          <td className="py-2 pr-4 text-slate-700">{school.auditCount}</td>
                          <td className="py-2">
                            {school.latestScore !== null ? (
                              <span
                                className={`font-semibold ${
                                  school.latestScore >= 75
                                    ? 'text-green-600'
                                    : school.latestScore >= 50
                                      ? 'text-amber-600'
                                      : 'text-red-600'
                                }`}
                              >
                                {school.latestScore}%
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Recent Audits
                </h3>
                {reportQuery.data.report.recentAudits.length === 0 ? (
                  <p className="text-sm text-slate-500">No audits found.</p>
                ) : (
                  <div className="space-y-2">
                    {reportQuery.data.report.recentAudits.map(audit => {
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
                              <p className="text-xs text-slate-500">
                                {ACADEMIC_AUDIT_MODULE_LABELS[audit.module]} —{' '}
                                {new Date(audit.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`font-semibold ${
                              audit.score >= 75
                                ? 'text-green-600'
                                : audit.score >= 50
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {audit.score}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
