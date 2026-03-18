import { Building2, TriangleAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { getGovDashboardApi } from '../features/gov/gov.api';

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
        subtitle="Cross-school activity and risk signals within your current assignment scope."
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
    </div>
  );
}
