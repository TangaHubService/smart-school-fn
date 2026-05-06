import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { getGovDashboardApi } from '../features/gov/gov.api';

function formatAuditType(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function GovDashboardPage() {
  const auth = useAuth();

  const dashboardQuery = useQuery({
    queryKey: ['gov-dashboard'],
    queryFn: () => getGovDashboardApi(auth.accessToken!),
  });

  if (dashboardQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="h-28 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-28 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-28 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-28 animate-pulse rounded-xl bg-brand-100" />
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-brand-100" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <StateView
        title="Could not load the auditor dashboard"
        message="Retry the request. Your school scope is still enforced on the backend."
        action={
          <button
            type="button"
            onClick={() => void dashboardQuery.refetch()}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const dashboard = dashboardQuery.data;
  const stats = [
    { label: 'Total Schools', value: dashboard.audits.totalSchools },
    { label: 'Planned Audits', value: dashboard.audits.plannedAudits },
    { label: 'Completed Audits', value: dashboard.audits.completedAudits },
    { label: 'Average Score', value: dashboard.audits.averageScore || 0 },
  ];

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-slate-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">Auditor Dashboard</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Plan audits, conduct school visits, and track report quality across your assigned
              Rwanda scope.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/gov/audits/new"
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Plan Audit
            </Link>
            <Link
              to="/gov/reports"
              className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50"
            >
              View Reports
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-brand-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Recent Audits"
          subtitle="Most recently completed audits and their scores."
        >
          <div className="rounded-2xl border border-brand-100 bg-white">
            {!dashboard.audits.recentAudits.length ? (
              <div className="p-5 text-sm text-slate-600">No completed audits yet.</div>
            ) : (
              <div className="divide-y divide-brand-100">
                {dashboard.audits.recentAudits.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{audit.schoolName}</p>
                      <p className="text-sm text-slate-600">
                        {formatAuditType(audit.auditType)} audit
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{audit.score ?? 0}/100</p>
                      <Link
                        to={`/gov/audits/${audit.id}/conduct`}
                        className="text-xs font-medium text-brand-700"
                      >
                        View report
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Upcoming Audits"
          subtitle="Planned visits that still need to be conducted."
        >
          <div className="rounded-2xl border border-brand-100 bg-white">
            {!dashboard.audits.upcomingAudits.length ? (
              <div className="p-5 text-sm text-slate-600">No upcoming audits planned yet.</div>
            ) : (
              <div className="divide-y divide-brand-100">
                {dashboard.audits.upcomingAudits.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{audit.schoolName}</p>
                      <p className="text-sm text-slate-600">
                        {formatAuditType(audit.auditType)} audit
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-700">
                        {new Date(audit.plannedDate).toLocaleDateString()}
                      </p>
                      <Link
                        to={`/gov/audits/${audit.id}/conduct`}
                        className="text-xs font-medium text-brand-700"
                      >
                        Conduct audit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Audit Planning Process"
          subtitle="A simple path for auditors from scope to report."
        >
          <div className="grid gap-3 text-sm leading-6 text-slate-700">
            <article className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="font-semibold text-slate-900">1. Confirm the school is in scope</p>
              <p className="mt-1">
                Use the schools page or your active scope page to confirm the location matches your
                current assignment.
              </p>
            </article>
            <article className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="font-semibold text-slate-900">2. Plan the audit before visiting</p>
              <p className="mt-1">
                Choose the audit type, date, and notes first so the visit has a tracked purpose and
                an official audit record.
              </p>
            </article>
            <article className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="font-semibold text-slate-900">
                3. Conduct the visit and submit the report
              </p>
              <p className="mt-1">
                After planning, open the audit, complete the scoring form, and submit findings and
                recommendations.
              </p>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          title="Why Planning Matters"
          subtitle="Planning is required before an audit can be conducted properly."
        >
          <div className="grid gap-3 text-sm leading-6 text-slate-700">
            <p className="rounded-2xl border border-brand-100 bg-white p-4">
              Planning creates the audit record that later holds scores, findings, and the final
              report.
            </p>
            <p className="rounded-2xl border border-brand-100 bg-white p-4">
              It keeps the oversight schedule visible for supervisors and prevents reports from
              being submitted against the wrong school or date.
            </p>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              If actions feel blocked, it is usually because the school is outside the active
              assignment, the assignment date window is inactive, or the action belongs to the
              school team rather than the auditor workflow.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
