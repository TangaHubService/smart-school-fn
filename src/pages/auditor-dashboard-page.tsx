import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileBarChart2,
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
import { Badge } from '../components/ui/badge';
import {
  AttentionCard,
  CardHeader,
  DashboardCard,
  KpiStrip,
  MeterRow,
  PageHeader,
  type AttentionItem,
} from '../components/ui/dashboard-kit';
import { percentOf } from '../utils/format-number';

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

function scoreTone(score: number) {
  return score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger';
}

function formatScore(score: number | null) {
  return score === null ? '—' : `${score}%`;
}

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
    return <StateView title="Loading..." loading skeletonVariant="dashboard" />;
  }

  if (error) {
    return <StateView title="Error loading dashboard" variant="error" />;
  }

  if (!data) {
    return <StateView title="No data available" variant="empty" />;
  }

  const { scope, stats, recentAudits } = data;

  const scopePath = [scope.country, scope.province, scope.district, scope.sector]
    .filter(Boolean)
    .join(' / ');
  const attention: AttentionItem[] = [
    ...(stats.pendingSchools > 0
      ? [
          {
            key: 'pending',
            title: `${stats.pendingSchools.toLocaleString()} ${stats.pendingSchools === 1 ? 'school' : 'schools'} not audited yet`,
            to: '/auditor/schools',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(stats.draftAudits > 0
      ? [
          {
            key: 'drafts',
            title: `${stats.draftAudits.toLocaleString()} draft ${stats.draftAudits === 1 ? 'report' : 'reports'} to finish`,
            to: '/auditor/audits',
            tone: 'warning' as const,
          },
        ]
      : []),
  ];
  const tabClass = (active: boolean) =>
    `-mb-px border-b-2 px-1 py-2 text-sm font-medium transition ${
      active
        ? 'border-brand-500 text-brand-600'
        : 'border-transparent text-slate-500 hover:text-slate-900'
    }`;

  return (
    <section className="mx-auto max-w-[1480px] space-y-5 text-slate-900">
      <PageHeader title="Audit overview" subtitle={`${scope.level}: ${scopePath}`} />

      <div className="flex gap-5 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={tabClass(activeTab === 'overview')}
          aria-pressed={activeTab === 'overview'}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('report');
            setShowReport(true);
          }}
          className={tabClass(activeTab === 'report')}
          aria-pressed={activeTab === 'report'}
        >
          Report
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <KpiStrip
            items={[
              {
                label: 'Schools in scope',
                value: stats.totalSchoolsInScope.toLocaleString(),
                hint: 'Under your jurisdiction',
              },
              {
                label: 'Submitted reports',
                value: stats.completedAudits.toLocaleString(),
                hint: 'Audits completed',
              },
              { label: 'Drafts', value: stats.draftAudits.toLocaleString(), hint: 'Not submitted yet' },
              {
                label: 'Pending schools',
                value: stats.pendingSchools.toLocaleString(),
                hint: 'Awaiting audit',
              },
              {
                label: 'Compliance score',
                value: formatScore(stats.averageComplianceScore),
                hint: stats.averageComplianceScore === null ? 'No audits yet' : 'Average across audits',
              },
            ]}
          />

          <div className="grid items-start gap-5 xl:grid-cols-12">
            <div className="min-w-0 space-y-5 xl:col-span-8">
              {demogQuery.data ? (
                <DemographicsWidget
                  data={demogQuery.data}
                  isLoading={demogQuery.isPending}
                  segment={demogSegment}
                  onSegmentChange={setDemogSegment}
                />
              ) : null}

              <DashboardCard>
                <CardHeader title="Recent audits" subtitle="Latest submitted reports" />
                {recentAudits.length === 0 ? (
                  <p className="px-5 pb-5 pt-1 text-[13px] text-slate-500">
                    No audits have been submitted yet.
                  </p>
                ) : (
                  <ul className="px-5 pb-3 pt-1">
                    {recentAudits.map((audit) => (
                      <li
                        key={audit.id}
                        className="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">
                            {audit.school}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ACADEMIC_AUDIT_MODULE_LABELS[audit.module]} ·{' '}
                            {new Date(audit.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge tone={scoreTone(audit.score)}>{audit.score}%</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>
            </div>

            <div className="min-w-0 space-y-5 xl:col-span-4">
              <AttentionCard items={attention} />
              <DashboardCard>
                <CardHeader title="Audit modules" subtitle="Open a module to audit schools" />
                <ul className="px-2 pb-2 pt-1">
                  {AUDITOR_AUDIT_MODULES.map((module) => {
                    const Icon = MODULE_ICONS[module];
                    return (
                      <li key={module}>
                        <Link
                          to={`/auditor/schools?module=${module}`}
                          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-50"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">
                            {ACADEMIC_AUDIT_MODULE_LABELS[module]}
                          </span>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-500"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </DashboardCard>
            </div>
          </div>
        </>
      )}

      {activeTab === 'report' && (
        <div className="space-y-6">
          {reportQuery.isLoading && <StateView title="Generating report..." loading />}
          {reportQuery.isError && <StateView title="Could not load report" variant="error" />}
          {reportQuery.data && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Audit report</h2>
                <button
                  type="button"
                  onClick={() => {
                    const rows = [
                      ['School', 'Province', 'District', 'Sector', 'Audits', 'Latest Score'],
                      ...reportQuery.data.report.schools.map((s) => [
                        s.name,
                        s.province || '',
                        s.district || '',
                        s.sector || '',
                        String(s.auditCount),
                        s.latestScore !== null ? `${s.latestScore}%` : '—',
                      ]),
                    ];
                    const csv = rows.map((r) => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'audit-report.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-brand-600"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>

              <KpiStrip
                items={[
                  {
                    label: 'Schools in scope',
                    value: reportQuery.data.report.totalSchoolsInScope.toLocaleString(),
                    hint: 'Under your jurisdiction',
                  },
                  {
                    label: 'Schools audited',
                    value: reportQuery.data.report.schoolsAudited.toLocaleString(),
                    hint: 'With at least one audit',
                  },
                  {
                    label: 'Total audits',
                    value: reportQuery.data.report.totalAudits.toLocaleString(),
                    hint: 'All modules',
                  },
                  {
                    label: 'Average score',
                    value: formatScore(reportQuery.data.report.averageScore),
                    hint: 'Across audits',
                  },
                ]}
              />

              {Object.keys(reportQuery.data.report.moduleDistribution).length > 0 && (
                <DashboardCard>
                  <CardHeader title="Audits by module" />
                  <div className="space-y-3.5 px-5 pb-5 pt-2">
                    {Object.entries(reportQuery.data.report.moduleDistribution).map(
                      ([module, count]) => {
                        const total = reportQuery.data.report.totalAudits;
                        const pct = total > 0 ? percentOf(count, total) : 0;
                        return (
                          <MeterRow
                            key={module}
                            label={
                              ACADEMIC_AUDIT_MODULE_LABELS[module as AcademicAuditModule] || module
                            }
                            value={`${count} · ${pct}%`}
                            percent={pct}
                          />
                        );
                      }
                    )}
                  </div>
                </DashboardCard>
              )}

              <DashboardCard>
                <CardHeader title="Schools" />
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-y border-slate-100 bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th scope="col" className="px-5 py-2.5 font-medium">School</th>
                        <th scope="col" className="px-5 py-2.5 font-medium">Location</th>
                        <th scope="col" className="px-5 py-2.5 font-medium">Audits</th>
                        <th scope="col" className="px-5 py-2.5 font-medium">Latest score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportQuery.data.report.schools.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-6 text-center text-[13px] text-slate-500">
                            No schools are in your audit scope yet.
                          </td>
                        </tr>
                      ) : null}
                      {reportQuery.data.report.schools.map((school) => (
                        <tr key={school.id}>
                          <td className="px-5 py-3 font-medium text-slate-900">{school.name}</td>
                          <td className="px-5 py-3 text-slate-600">
                            {[school.province, school.district, school.sector]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </td>
                          <td className="px-5 py-3 tabular-nums text-slate-700">{school.auditCount}</td>
                          <td className="px-5 py-3">
                            {school.latestScore !== null ? (
                              <Badge tone={scoreTone(school.latestScore)}>{school.latestScore}%</Badge>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DashboardCard>

              <DashboardCard>
                <CardHeader title="Recent audits" />
                {reportQuery.data.report.recentAudits.length === 0 ? (
                  <p className="px-5 pb-5 pt-1 text-[13px] text-slate-500">No audits found.</p>
                ) : (
                  <ul className="px-5 pb-3 pt-1">
                    {reportQuery.data.report.recentAudits.map((audit) => (
                      <li
                        key={audit.id}
                        className="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">
                            {audit.school}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ACADEMIC_AUDIT_MODULE_LABELS[audit.module]} ·{' '}
                            {new Date(audit.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge tone={scoreTone(audit.score)}>{audit.score}%</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>
            </>
          )}
        </div>
      )}
    </section>
  );
}
