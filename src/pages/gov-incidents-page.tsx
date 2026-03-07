import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  ConductIncidentStatus,
  ConductSeverity,
} from '../features/conduct/conduct.api';
import { listGovIncidentsApi } from '../features/gov/gov.api';

const severityOptions: Array<{ label: string; value: ConductSeverity | '' }> = [
  { label: 'All severities', value: '' },
  { label: 'Low', value: 'LOW' },
  { label: 'Moderate', value: 'MODERATE' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

const statusOptions: Array<{ label: string; value: ConductIncidentStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function GovIncidentsPage() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<ConductSeverity | ''>('');
  const [status, setStatus] = useState<ConductIncidentStatus | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const tenantId = searchParams.get('tenantId') ?? '';

  const incidentsQuery = useQuery({
    queryKey: ['gov-incidents', { tenantId, search, severity, status, page, pageSize }],
    queryFn: () =>
      listGovIncidentsApi(auth.accessToken!, {
        tenantId: tenantId || undefined,
        q: search.trim() || undefined,
        severity: severity || undefined,
        status: status || undefined,
        page,
        pageSize,
      }),
  });

  const incidents = incidentsQuery.data?.items ?? [];
  const pagination = incidentsQuery.data?.pagination ?? {
    page,
    pageSize,
    totalItems: 0,
    totalPages: 1,
  };

  return (
    <SectionCard
      title="Government Incident Queue"
      subtitle="Cross-school conduct visibility is enforced server-side using the auditor scope assignments."
      action={
        tenantId ? (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('tenantId');
              setSearchParams(next);
            }}
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Clear school filter
          </button>
        ) : null
      }
    >
      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search student, school, category"
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
        <select
          value={severity}
          onChange={(event) => {
            setSeverity(event.target.value as ConductSeverity | '');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          {severityOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ConductIncidentStatus | '');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          {statusOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {incidentsQuery.isPending ? (
        <div className="grid gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
        </div>
      ) : null}

      {incidentsQuery.isError ? (
        <StateView
          title="Could not load scoped incidents"
          message="Retry the request. Scope enforcement still happens on the backend."
          action={
            <button
              type="button"
              onClick={() => void incidentsQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!incidentsQuery.isPending && !incidentsQuery.isError && !incidents.length ? (
        <EmptyState
          title="No incidents in scope"
          message="There are no conduct incidents matching the current filters and active auditor assignment."
        />
      ) : null}

      {!incidentsQuery.isPending && !incidentsQuery.isError && incidents.length ? (
        <div className="grid gap-3">
          {incidents.map((incident) => (
            <article key={incident.id} className="rounded-2xl border border-brand-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950">{incident.title}</h3>
                  <p className="text-sm text-slate-700">
                    {incident.school?.displayName ?? 'Unknown school'} • {incident.student.firstName}{' '}
                    {incident.student.lastName} • {incident.severity}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{incident.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {incident.status.replace('_', ' ')} • {formatDateTime(incident.occurredAt)}
                  </p>
                </div>
                <Link
                  to={`/gov/incidents/${incident.id}`}
                  className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Review
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-brand-100 pt-4 text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages} • {pagination.totalItems} incidents
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPage((current) => Math.min(pagination.totalPages, current + 1))
              }
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
