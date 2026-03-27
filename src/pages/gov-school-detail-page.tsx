import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  getGovSchoolConductSummaryApi,
  getGovSchoolDetailApi,
  listGovSchoolCoursesApi,
} from '../features/gov/gov.api';

function conductRangeLastDays(days: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function GovSchoolDetailPage() {
  const { tenantId } = useParams();
  const auth = useAuth();

  const conductRange = conductRangeLastDays(90);

  const schoolDetailQuery = useQuery({
    queryKey: ['gov-school-detail', tenantId],
    queryFn: () => getGovSchoolDetailApi(auth.accessToken!, tenantId!),
    enabled: Boolean(tenantId),
  });

  const coursesQuery = useQuery({
    queryKey: ['gov-school-courses', tenantId],
    queryFn: () => listGovSchoolCoursesApi(auth.accessToken!, tenantId!),
    enabled: Boolean(tenantId && auth.accessToken),
  });

  const conductQuery = useQuery({
    queryKey: ['gov-school-conduct-summary', tenantId, conductRange.from, conductRange.to],
    queryFn: () =>
      getGovSchoolConductSummaryApi(auth.accessToken!, tenantId!, conductRange),
    enabled: Boolean(tenantId && auth.accessToken),
  });

  if (!tenantId) {
    return <EmptyState title="School not found" message="A tenant identifier is required." />;
  }

  if (schoolDetailQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-32 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-40 animate-pulse rounded-xl bg-brand-100" />
      </div>
    );
  }

  if (schoolDetailQuery.isError || !schoolDetailQuery.data) {
    return (
      <StateView
        title="Could not load school detail"
        message="The school may be outside the current scope or no longer exists."
        action={
          <button
            type="button"
            onClick={() => void schoolDetailQuery.refetch()}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const detail = schoolDetailQuery.data;

  return (
    <div className="grid gap-4">
      <SectionCard
        title={detail.school.displayName}
        subtitle={`${detail.school.code} • ${detail.school.sector ?? 'N/A'} / ${detail.school.district ?? 'N/A'} / ${detail.school.province ?? 'N/A'}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/gov/incidents?tenantId=${detail.school.tenantId}`}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              View incidents
            </Link>
            <Link
              to="/gov/schools"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Back to schools
            </Link>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total incidents</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{detail.summary.totalIncidents}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{detail.summary.openIncidents}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resolved</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{detail.summary.resolvedIncidents}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Conduct summary (90 days)"
        subtitle="Read-only aggregate from school conduct records. Date range is fixed for a quick audit snapshot."
      >
        {conductQuery.isPending ? (
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
        ) : conductQuery.isError ? (
          <p className="text-sm text-slate-600">Could not load conduct summary.</p>
        ) : conductQuery.data ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Total incidents</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{conductQuery.data.totalIncidents}</p>
              <p className="mt-1 text-xs text-slate-500">
                {conductQuery.data.range.from} → {conductQuery.data.range.to}
              </p>
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">By status</p>
              <ul className="mt-2 space-y-1 text-slate-700">
                {conductQuery.data.byStatus.map((r) => (
                  <li key={r.status}>
                    {r.status.replace('_', ' ')}: {r.count}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Top categories</p>
              <ul className="mt-2 space-y-1 text-slate-700">
                {conductQuery.data.topCategories.slice(0, 6).map((r) => (
                  <li key={r.category}>
                    {r.category}: {r.count}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Courses (read-only)"
        subtitle="Learning content overview for audit — no edits from this view."
      >
        {coursesQuery.isPending ? (
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
        ) : coursesQuery.isError ? (
          <p className="text-sm text-slate-600">Could not load courses.</p>
        ) : coursesQuery.data?.items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-3 font-medium">Course</th>
                  <th className="py-2 pr-3 font-medium">Class</th>
                  <th className="py-2 pr-3 font-medium">Subject</th>
                  <th className="py-2 pr-3 font-medium">Teacher</th>
                  <th className="py-2 font-medium">Year</th>
                </tr>
              </thead>
              <tbody>
                {coursesQuery.data.items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">{c.title}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      {c.classRoom.code} {c.classRoom.name}
                    </td>
                    <td className="py-2 pr-3 text-slate-700">{c.subject?.name ?? '—'}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      {c.teacher.firstName} {c.teacher.lastName}
                    </td>
                    <td className="py-2 text-slate-600">{c.academicYear.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No active courses are listed for this school." />
        )}
      </SectionCard>

      <SectionCard title="Recent Incidents" subtitle="The latest conduct records visible for this school only.">
        {detail.recentIncidents.length ? (
          <div className="grid gap-3">
            {detail.recentIncidents.map((incident) => (
              <article key={incident.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">{incident.title}</h3>
                    <p className="text-sm text-slate-700">
                      {incident.student.firstName} {incident.student.lastName} • {incident.severity} •{' '}
                      {incident.status.replace('_', ' ')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(incident.occurredAt)}</p>
                  </div>
                  <Link
                    to={`/gov/incidents/${incident.id}`}
                    className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Review incident
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState message="No conduct incidents are currently recorded for this school." />
        )}
      </SectionCard>
    </div>
  );
}
