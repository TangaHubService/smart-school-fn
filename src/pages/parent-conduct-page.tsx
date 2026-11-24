import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { StateView } from '../components/state-view';
import { Badge, type BadgeTone } from '../components/ui/badge';
import {
  CardHeader,
  DashboardCard,
  EmptyPanel,
  KpiStrip,
  PageHeader,
} from '../components/ui/dashboard-kit';
import { useAuth } from '../features/auth/auth.context';
import type {
  ConductIncident,
  ConductIncidentStatus,
  ConductSeverity,
} from '../features/conduct/conduct.api';
import { getMyChildConductApi, listMyChildrenApi } from '../features/sprint2/sprint2.api';

const SEVERITY_TONE: Record<ConductSeverity, BadgeTone> = {
  LOW: 'info',
  MODERATE: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

const STATUS_META: Record<ConductIncidentStatus, { tone: BadgeTone; label: string }> = {
  OPEN: { tone: 'warning', label: 'Open' },
  UNDER_REVIEW: { tone: 'purple', label: 'Under review' },
  RESOLVED: { tone: 'success', label: 'Resolved' },
};

const PAGE_SIZE = 20;

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

function IncidentCard({ incident }: { incident: ConductIncident }) {
  const status = STATUS_META[incident.status];
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{incident.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {new Date(incident.occurredAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {' · '}
            {incident.category}
            {incident.location ? ` · ${incident.location}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={SEVERITY_TONE[incident.severity]}>{titleCase(incident.severity)}</Badge>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{incident.description}</p>

      {incident.actions.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Actions taken
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {incident.actions.map((action) => (
              <li key={action.id} className="text-sm text-slate-700">
                <span className="font-medium">{action.title}</span>
                <span className="text-slate-500">
                  {' · '}
                  {new Date(action.actionDate).toLocaleDateString()}
                  {action.completedAt ? ' · Completed' : ''}
                </span>
                {action.description ? (
                  <span className="block text-slate-600">{action.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {incident.resolutionSummary ? (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span className="font-semibold">Resolution: </span>
          {incident.resolutionSummary}
        </div>
      ) : null}
    </article>
  );
}

export function ParentConductPage() {
  const auth = useAuth();
  const [studentId, setStudentId] = useState('');
  const [page, setPage] = useState(1);

  const childrenQuery = useQuery({
    queryKey: ['parent', 'my-children'],
    queryFn: () => listMyChildrenApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });
  const children = useMemo(() => childrenQuery.data?.students ?? [], [childrenQuery.data]);

  useEffect(() => {
    if (!studentId && children.length > 0) setStudentId(children[0].id);
  }, [children, studentId]);

  const conductQuery = useQuery({
    queryKey: ['parent', 'conduct', studentId, page],
    queryFn: () => getMyChildConductApi(auth.accessToken!, studentId, { page, pageSize: PAGE_SIZE }),
    enabled: Boolean(auth.accessToken && studentId),
  });

  if (childrenQuery.isError) {
    return (
      <StateView
        title="Could not load your children"
        message="Retry in a moment."
        action={
          <button
            type="button"
            onClick={() => void childrenQuery.refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const summary = conductQuery.data?.summary;
  const incidents = conductQuery.data?.incidents ?? [];
  const totalPages = conductQuery.data?.pagination.totalPages ?? 1;
  const loading = childrenQuery.isPending || (Boolean(studentId) && conductQuery.isPending);

  return (
    <section className="mx-auto max-w-[1480px] space-y-5 text-slate-900">
      <PageHeader title="Conduct" subtitle="Discipline records the school has shared for your children." />

      {!childrenQuery.isPending && children.length === 0 ? (
        <DashboardCard>
          <EmptyPanel
            icon={Users}
            message="No children are linked yet. Ask your school administrator to link your children's accounts."
          />
        </DashboardCard>
      ) : (
        <>
          <DashboardCard>
            <div className="p-4 sm:max-w-sm">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Child</span>
                <select
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                      {child.currentEnrollment ? ` — ${child.currentEnrollment.classRoom.name}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </DashboardCard>

          <KpiStrip
            items={[
              { label: 'Incidents', value: String(summary?.totalIncidents ?? 0), hint: 'All time' },
              { label: 'Open', value: String(summary?.openIncidents ?? 0), hint: 'Still being handled' },
              {
                label: 'Resolved',
                value: String(summary?.resolvedIncidents ?? 0),
                hint: 'Closed by the school',
                positive: true,
              },
              { label: 'Actions', value: String(summary?.actionItems ?? 0), hint: 'Follow-ups recorded' },
            ]}
          />

          <DashboardCard>
            <CardHeader title="Conduct history" />
            <div className="space-y-3 px-4 pb-4 pt-1">
              {loading ? (
                <div className="grid gap-2" role="status" aria-live="polite">
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : conductQuery.isError ? (
                <StateView
                  title="Could not load conduct records"
                  message="Retry in a moment."
                  action={
                    <button
                      type="button"
                      onClick={() => void conductQuery.refetch()}
                      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Retry
                    </button>
                  }
                />
              ) : incidents.length === 0 ? (
                <EmptyPanel icon={ShieldCheck} message="No conduct incidents recorded. Good behaviour!" />
              ) : (
                incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
              )}

              {totalPages > 1 ? (
                <div className="flex items-center justify-end gap-2 pt-1 text-sm">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </DashboardCard>
        </>
      )}
    </section>
  );
}
