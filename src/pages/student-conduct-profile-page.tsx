import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { getStudentConductProfileApi } from '../features/conduct/conduct.api';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function StudentConductProfilePage() {
  const { studentId } = useParams();
  const auth = useAuth();

  const profileQuery = useQuery({
    queryKey: ['student-conduct-profile', studentId],
    queryFn: () => getStudentConductProfileApi(auth.accessToken!, studentId!),
    enabled: Boolean(studentId),
  });

  if (!studentId) {
    return <EmptyState title="Student not found" message="A student identifier is required." />;
  }

  if (profileQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-36 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-48 animate-pulse rounded-xl bg-brand-100" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <StateView
        title="Could not load the student conduct profile"
        message="Retry the request or verify that the student still exists in this school."
        action={
          <button
            type="button"
            onClick={() => void profileQuery.refetch()}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="grid gap-4">
      <SectionCard
        title={`${profile.student.firstName} ${profile.student.lastName}`}
        subtitle={`${profile.student.studentCode} • ${profile.student.currentEnrollment?.classRoom.name ?? 'No active class'}`}
        action={
          <Link
            to="/admin/conduct"
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Back to incidents
          </Link>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{profile.summary.totalIncidents}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{profile.summary.openIncidents}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resolved</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{profile.summary.resolvedIncidents}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{profile.summary.actionItems}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Incident Timeline" subtitle="Recent conduct history and linked interventions.">
        {profile.incidents.length ? (
          <div className="grid gap-3">
            {profile.incidents.map((incident) => (
              <article key={incident.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">{incident.title}</h3>
                    <p className="text-sm text-slate-700">
                      {incident.category} • {incident.severity} • {incident.status.replace('_', ' ')}
                    </p>
                  </div>
                  <Link
                    to={`/admin/conduct/${incident.id}`}
                    className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Open incident
                  </Link>
                </div>
                <p className="mt-2 text-sm text-slate-700">{incident.description}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(incident.occurredAt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState message="No conduct incidents have been recorded for this student." />
        )}
      </SectionCard>
    </div>
  );
}
