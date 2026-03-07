import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { getGovDashboardApi } from '../features/gov/gov.api';

export function GovDashboardPage() {
  const auth = useAuth();

  const dashboardQuery = useQuery({
    queryKey: ['gov-dashboard'],
    queryFn: () => getGovDashboardApi(auth.accessToken!),
  });

  if (dashboardQuery.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-28 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-28 animate-pulse rounded-xl bg-brand-100" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <StateView
        title="Could not load the government dashboard"
        message="Retry the request. Your school-scoped and auditor-scoped permissions remain unchanged."
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

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Government Oversight"
        subtitle="Cross-school audit visibility stays read-only, scoped by the auditor assignments configured by platform admins."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Schools in scope</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{dashboard.scope.schoolsInScope}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open incidents</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{dashboard.incidents.open}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Feedback posted</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{dashboard.feedback.authoredByMe}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Quick Access" subtitle="Jump directly to the schools and incident queues inside your current assignment scope.">
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            to="/gov/schools"
            className="rounded-2xl border border-brand-100 bg-white p-4 transition hover:border-brand-300"
          >
            <p className="text-base font-bold text-slate-950">Schools in scope</p>
            <p className="mt-1 text-sm text-slate-700">Browse every school visible to this auditor assignment.</p>
          </Link>
          <Link
            to="/gov/incidents"
            className="rounded-2xl border border-brand-100 bg-white p-4 transition hover:border-brand-300"
          >
            <p className="text-base font-bold text-slate-950">Incident queue</p>
            <p className="mt-1 text-sm text-slate-700">Review conduct records and leave contextual feedback where needed.</p>
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
