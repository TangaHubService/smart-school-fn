import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { GovAuditType, listGovReportsApi } from '../features/gov/gov.api';

const auditTypes: GovAuditType[] = ['ACADEMIC', 'FINANCIAL', 'INFRASTRUCTURE', 'COMPLIANCE'];

function formatAuditType(value: GovAuditType) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function GovReportsPage() {
  const auth = useAuth();
  const [auditType, setAuditType] = useState<GovAuditType | ''>('');
  const [page, setPage] = useState(1);

  const reportsQuery = useQuery({
    queryKey: ['gov-reports', auditType, page],
    queryFn: () =>
      listGovReportsApi(auth.accessToken!, {
        auditType: auditType || undefined,
        page,
        pageSize: 12,
      }),
  });

  const reports = reportsQuery.data?.items ?? [];
  const pagination = reportsQuery.data?.pagination;

  return (
    <SectionCard title="Reports" subtitle="Completed audits with findings, recommendations, and final score.">
      <div className="mb-4 md:max-w-sm">
        <select
          value={auditType}
          onChange={(event) => {
            setAuditType(event.target.value as GovAuditType | '');
            setPage(1);
          }}
          className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          <option value="">All audit types</option>
          {auditTypes.map((option) => (
            <option key={option} value={option}>
              {formatAuditType(option)}
            </option>
          ))}
        </select>
      </div>

      {reportsQuery.isPending ? (
        <div className="grid gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
        </div>
      ) : null}

      {reportsQuery.isError ? (
        <StateView
          title="Could not load reports"
          message="Retry the request. Submitted reports remain saved."
          action={
            <button
              type="button"
              onClick={() => void reportsQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!reportsQuery.isPending && !reportsQuery.isError && !reports.length ? (
        <EmptyState
          title="No reports yet"
          message="Completed audits will appear here after a report is submitted."
          centered={false}
          className="min-h-0"
        />
      ) : null}

      {!reportsQuery.isPending && !reportsQuery.isError && reports.length ? (
        <div className="grid gap-4">
          {reports.map((audit) => (
            <article key={audit.id} className="rounded-2xl border border-brand-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {formatAuditType(audit.auditType)} audit
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-slate-950">{audit.school.name}</h3>
                  <p className="text-sm text-slate-600">
                    Completed {audit.report ? new Date(audit.report.submittedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{audit.report?.score ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                  <h4 className="font-semibold text-slate-900">Comment</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{audit.report?.comment}</p>
                </div>
                <div className="rounded-xl border border-brand-100 bg-white p-4">
                  <h4 className="font-semibold text-slate-900">Findings</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{audit.report?.findings}</p>
                </div>
                <div className="rounded-xl border border-brand-100 bg-white p-4">
                  <h4 className="font-semibold text-slate-900">Recommendations</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{audit.report?.recommendations}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Link
                  to={`/gov/audits/${audit.id}/conduct`}
                  className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50"
                >
                  Open Report
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
