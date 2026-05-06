import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { GovAuditStatus, GovAuditType, listGovAuditsApi } from '../features/gov/gov.api';

const auditTypes: GovAuditType[] = ['ACADEMIC', 'FINANCIAL', 'INFRASTRUCTURE', 'COMPLIANCE'];
const auditStatuses: GovAuditStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'];

function formatAuditType(value: GovAuditType) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function GovAuditsPage() {
  const auth = useAuth();
  const [auditType, setAuditType] = useState<GovAuditType | ''>('');
  const [status, setStatus] = useState<GovAuditStatus | ''>('');
  const [page, setPage] = useState(1);

  const auditsQuery = useQuery({
    queryKey: ['gov-audits', auditType, status, page],
    queryFn: () =>
      listGovAuditsApi(auth.accessToken!, {
        auditType: auditType || undefined,
        status: status || undefined,
        page,
        pageSize: 12,
      }),
  });

  const audits = auditsQuery.data?.items ?? [];
  const pagination = auditsQuery.data?.pagination;

  return (
    <SectionCard
      title="Audits"
      subtitle="Plan, track, and complete school audits inside your assigned scope."
      action={
        <Link
          to="/gov/audits/new"
          className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Plan Audit
        </Link>
      }
    >
      <div className="mb-4 grid gap-2 md:grid-cols-2">
        <select
          value={auditType}
          onChange={(event) => {
            setAuditType(event.target.value as GovAuditType | '');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          <option value="">All audit types</option>
          {auditTypes.map((option) => (
            <option key={option} value={option}>
              {formatAuditType(option)}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as GovAuditStatus | '');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          <option value="">All statuses</option>
          {auditStatuses.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {auditsQuery.isPending ? (
        <div className="grid gap-3">
          <div className="h-20 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-20 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-20 animate-pulse rounded-xl bg-brand-100" />
        </div>
      ) : null}

      {auditsQuery.isError ? (
        <StateView
          title="Could not load audits"
          message="Retry the request. Planned audits remain saved."
          action={
            <button
              type="button"
              onClick={() => void auditsQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!auditsQuery.isPending && !auditsQuery.isError && !audits.length ? (
        <EmptyState
          title="No audits found"
          message="Plan the first audit for a school in your scope."
          centered={false}
          className="min-h-0"
        />
      ) : null}

      {!auditsQuery.isPending && !auditsQuery.isError && audits.length ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Auditor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit, index) => (
                <tr key={audit.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{audit.school.name}</p>
                    <p className="text-xs text-slate-500">
                      {audit.school.sector ?? 'N/A'} / {audit.school.district ?? 'N/A'} /{' '}
                      {audit.school.province ?? 'N/A'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatAuditType(audit.auditType)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(audit.plannedDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {audit.auditor.firstName} {audit.auditor.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        audit.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {audit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/gov/audits/${audit.id}/conduct`}
                      className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-50"
                    >
                      {audit.report ? 'View Report' : 'Conduct Audit'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
