import { Building2, TriangleAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { hasRole } from '../features/auth/auth-helpers';
import { getGovDashboardApi } from '../features/gov/gov.api';
import { Link } from 'react-router-dom';

const GOV_QUICK_ACTIONS: DashboardQuickActionItem[] = [
  {
    label: 'Schools in scope',
    description: 'Browse the schools visible to this assignment.',
    icon: Building2,
    to: '/gov/schools',
  },
  {
    label: 'Incident queue',
    description: 'Review conduct incidents and follow-up items.',
    icon: TriangleAlert,
    to: '/gov/incidents',
  },
];

export function GovDashboardPage() {
  const auth = useAuth();
  const isSuperAdmin = hasRole(auth.me, 'SUPER_ADMIN');

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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Government Oversight</h1>
          <DashboardQuickActionsDropdown actions={GOV_QUICK_ACTIONS} />
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Cross-school audit visibility stays read-only, scoped by the auditor assignments
          configured by platform admins.
        </p>
      </div>

      <SectionCard
        title="Overview"
        subtitle="Read-only oversight. Scope is enforced on every API call; auditors only see assigned geography."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Schools in scope</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{dashboard.scope.schoolsInScope}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open incidents</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{dashboard.incidents.open}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Incidents (30 days)</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {dashboard.incidents.last30Days ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your feedback notes</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{dashboard.feedback.authoredByMe}</p>
          </div>
        </div>
      </SectionCard>

      {!isSuperAdmin && (dashboard.myScopes?.length ?? 0) > 0 ? (
        <SectionCard
          title="Your assignment"
          subtitle="Active scope rows configured by platform administration."
        >
          <ul className="grid gap-2 text-sm text-slate-800">
            {(dashboard.myScopes ?? []).map((s) => (
              <li key={s.id} className="rounded-xl border border-brand-100 bg-white px-3 py-2">
                <p className="font-semibold text-slate-950">{s.label}</p>
                {s.assignedBy ? (
                  <p className="text-xs text-slate-600">
                    Assigned by {s.assignedBy.firstName} {s.assignedBy.lastName} ({s.assignedBy.email})
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {(dashboard.feedback.recentDiscussion?.length ?? 0) > 0 ? (
        <SectionCard
          title="Recent auditor comments"
          subtitle="Latest government feedback on incidents in your scope (all auditors)."
        >
          <ul className="grid gap-3">
            {(dashboard.feedback.recentDiscussion ?? []).map((row) => (
              <li key={row.id} className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-sm text-slate-800">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-slate-950">{row.authorName}</p>
                  <time className="text-xs text-slate-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {row.schoolName ?? 'School'} ·{' '}
                  <Link className="font-medium text-brand-600 hover:underline" to={`/gov/incidents/${row.incidentId}`}>
                    {row.incidentTitle}
                  </Link>
                </p>
                <p className="mt-2 text-slate-700">{row.body}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
