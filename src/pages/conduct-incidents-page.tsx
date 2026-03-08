import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  ConductIncidentStatus,
  ConductSeverity,
  listConductIncidentsApi,
} from '../features/conduct/conduct.api';

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

function badgeClass(value: ConductIncidentStatus | ConductSeverity) {
  if (value === 'RESOLVED' || value === 'LOW') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }

  if (value === 'UNDER_REVIEW' || value === 'MODERATE') {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }

  if (value === 'HIGH') {
    return 'bg-orange-50 text-orange-700 border-orange-100';
  }

  return 'bg-rose-50 text-rose-700 border-rose-100';
}

export function ConductIncidentsPage() {
  const auth = useAuth();
  const canManage = auth.me?.permissions.includes('conduct.manage') ?? false;
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<ConductSeverity | ''>('');
  const [status, setStatus] = useState<ConductIncidentStatus | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const incidentsQuery = useQuery({
    queryKey: ['conduct-incidents', { search, severity, status, page, pageSize }],
    queryFn: () =>
      listConductIncidentsApi(auth.accessToken!, {
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
      title="Discipline / Conduct"
      subtitle="Track incidents, follow-up actions, and school responses without affecting existing student workflows."
      action={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/conduct/marks"
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Term conduct sheet
          </Link>
          {canManage ? (
            <Link
              to="/admin/conduct/new"
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Record incident
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="mb-4 grid gap-2 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by student, title, category"
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
        <select
          value={severity}
          onChange={(event) => {
            setSeverity(event.target.value as ConductSeverity | '');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
          aria-label="Filter by severity"
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
          aria-label="Filter by status"
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
          title="Could not load conduct incidents"
          message="Retry the request. Existing student, classes, and exams flows are unaffected."
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
          title="No incidents yet"
          message="Start with the first discipline or conduct record for this school."
          action={
            canManage ? (
              <Link
                to="/admin/conduct/new"
                className="inline-flex rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Create first incident
              </Link>
            ) : null
          }
        />
      ) : null}

      {!incidentsQuery.isPending && !incidentsQuery.isError && incidents.length ? (
        <div className="grid gap-3">
          {incidents.map((incident) => (
            <article
              key={incident.id}
              className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(
                        incident.severity,
                      )}`}
                    >
                      {incident.severity}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(
                        incident.status,
                      )}`}
                    >
                      {incident.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-950">{incident.title}</h3>
                    <p className="text-sm text-slate-700">
                      {incident.student.firstName} {incident.student.lastName} •{' '}
                      {incident.student.studentCode}
                    </p>
                  </div>
                  <p className="text-sm text-slate-700">{incident.description}</p>
                  <p className="text-xs text-slate-500">
                    {incident.category} • {formatDateTime(incident.occurredAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/admin/conduct/students/${incident.student.id}`}
                    className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Student profile
                  </Link>
                  <Link
                    to={`/admin/conduct/${incident.id}`}
                    className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Open incident
                  </Link>
                </div>
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
