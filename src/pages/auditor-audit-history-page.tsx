import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileBarChart2,
  Pencil,
  Search,
  TrendingUp,
} from 'lucide-react';

import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { useToast } from '../components/toast';
import {
  ACADEMIC_AUDIT_MODULE_LABELS,
  ACADEMIC_AUDIT_STATUS_LABELS,
  downloadAuditReportPdfApi,
  listAuditsApi,
  type AcademicAuditModule,
  type AcademicAuditStatus,
} from '../features/audit/audit.api';

const EDITABLE_STATUSES: AcademicAuditStatus[] = ['DRAFT', 'NEEDS_REVISION'];

const MODULE_ICONS: Record<AcademicAuditModule, typeof ClipboardList> = {
  ATTENDANCE: ClipboardList,
  COURSE_MANAGEMENT: BookOpen,
  LEARNING_INSIGHTS: TrendingUp,
  CONTINUOUS_ASSESSMENTS: ClipboardCheck,
  MARKS: FileBarChart2,
  TIMETABLE: CalendarDays,
  FINANCE: ClipboardList,
  TEACHERS: ClipboardList,
  STUDENT_RECORDS: ClipboardList,
  INFRASTRUCTURE: ClipboardList,
  ICT: ClipboardList,
  SAFETY: ClipboardList,
  COMPLIANCE: ClipboardCheck,
};

export function AuditorAuditHistoryPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<AcademicAuditModule | ''>('');
  const [statusFilter, setStatusFilter] = useState<AcademicAuditStatus | ''>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownloadPdf(auditId: string) {
    setDownloadingId(auditId);
    try {
      const blob = await downloadAuditReportPdfApi(auth.accessToken!, auditId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not download report',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setDownloadingId(null);
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditor-audits', page, moduleFilter, statusFilter, search],
    queryFn: () =>
      listAuditsApi({
        page,
        pageSize: 20,
        module: moduleFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  if (isLoading) {
    return <StateView title="Loading..." loading />;
  }

  if (error) {
    return <StateView title="Error loading audits" variant="error" />;
  }

  if (!data) {
    return <StateView title="No data" variant="empty" />;
  }

  const { items, pagination } = data;
  const filteredItems = items.filter((audit) =>
    audit.school.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit History</h1>
        <p className="text-sm text-slate-500 mt-1">View all submitted audits</p>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AcademicAuditStatus | '');
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All statuses</option>
              {Object.entries(ACADEMIC_AUDIT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Module</label>
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value as AcademicAuditModule | '');
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All modules</option>
              {Object.entries(ACADEMIC_AUDIT_MODULE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search school</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search school..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-slate-500">No audits match your current filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {filteredItems.map((audit) => {
              const Icon = MODULE_ICONS[audit.module] || FileBarChart2;
              const scoreColor =
                audit.score >= 80
                  ? 'bg-green-100 text-green-700'
                  : audit.score >= 60
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700';

              return (
                <div key={audit.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-slate-100 p-2">
                        <Icon className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{audit.school.displayName}</h3>
                        <p className="text-sm text-slate-500">
                          {ACADEMIC_AUDIT_MODULE_LABELS[audit.module]}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {[audit.school.province, audit.school.district, audit.school.sector]
                            .filter(Boolean)
                            .join(' / ')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {ACADEMIC_AUDIT_STATUS_LABELS[audit.status]}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${scoreColor}`}
                        >
                          {audit.score}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(audit.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {audit.comment && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <p className="text-sm text-slate-600">{audit.comment}</p>
                      {audit.recommendation && (
                        <p className="text-sm text-slate-500 mt-2">
                          <span className="font-medium">Recommendation:</span>{' '}
                          {audit.recommendation}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    {EDITABLE_STATUSES.includes(audit.status) ? (
                      <Link
                        to={`/auditor/audit/${audit.school.id}/${audit.module}?auditId=${audit.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Continue editing
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleDownloadPdf(audit.id)}
                        disabled={downloadingId === audit.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === audit.id ? 'Preparing…' : 'Download report'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
