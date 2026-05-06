import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { GovAuditorScope, listGovMyScopesApi } from '../features/gov/gov.api';

function formatDateLabel(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString();
}

function ScopeCard({ scope }: { scope: GovAuditorScope }) {
  return (
    <article className="grid gap-3 rounded-2xl border border-brand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {scope.scopeLevel}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">{scope.label}</h3>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            scope.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {scope.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {scope.assignedBy ? (
        <p className="text-sm text-slate-700">
          Assigned by {scope.assignedBy.firstName} {scope.assignedBy.lastName} (
          {scope.assignedBy.email})
        </p>
      ) : null}

      {scope.startsAt || scope.endsAt ? (
        <p className="text-sm text-slate-700">
          Assignment window: {formatDateLabel(scope.startsAt) ?? 'Immediate'} to{' '}
          {formatDateLabel(scope.endsAt) ?? 'Open-ended'}
        </p>
      ) : null}

      {scope.notes ? <p className="text-sm leading-6 text-slate-700">{scope.notes}</p> : null}
    </article>
  );
}

export function GovMyScopePage() {
  const auth = useAuth();

  const scopesQuery = useQuery({
    queryKey: ['gov-my-scopes'],
    queryFn: () => listGovMyScopesApi(auth.accessToken!),
  });

  if (scopesQuery.isPending) {
    return (
      <SectionCard
        title="My Scope"
        subtitle="Loading your current government oversight assignments."
      >
        <div className="grid gap-3">
          <div className="h-24 animate-pulse rounded-2xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-brand-100" />
        </div>
      </SectionCard>
    );
  }

  if (scopesQuery.isError) {
    return (
      <SectionCard title="My Scope">
        <StateView
          title="Could not load your scope"
          message="Retry the request. Your assignments are still saved."
          action={
            <button
              type="button"
              onClick={() => void scopesQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      </SectionCard>
    );
  }

  const scopes = scopesQuery.data?.items ?? [];

  if (!scopes.length) {
    return (
      <SectionCard title="My Scope">
        <EmptyState
          title="No scope assigned"
          message="Your account does not have an active oversight region yet."
          centered={false}
          className="min-h-0"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="My Scope"
      subtitle="These assignments control the schools and incidents visible in your workspace."
    >
      <div className="grid gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          You can only act inside schools that match these active assignments. In the auditor
          workflow, allowed actions are planning audits, submitting audit reports, and posting
          oversight feedback. School-owned disciplinary follow-up actions remain read-only.
        </div>
        {scopes.map((scope) => (
          <ScopeCard key={scope.id} scope={scope} />
        ))}
      </div>
    </SectionCard>
  );
}
