import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  downloadStudentReportCardPdfApi,
  listReportCardsCatalogApi,
  type ReportCardCatalogRow,
} from '../features/sprint5/exams.api';
import { listAcademicYearsApi, listClassRoomsApi, listTermsApi } from '../features/sprint1/sprint1.api';
import { listStudentsApi } from '../features/sprint2/sprint2.api';

const PAGE_SIZE = 25;

function reportCardFileName(row: ReportCardCatalogRow): string {
  const termSlug = row.term.name.replace(/\s+/g, '-');
  return `${row.student.studentCode}-${termSlug}-report-card.pdf`;
}

export function ReportCardsPage() {
  const auth = useAuth();
  const { showToast } = useToast();

  /** Default empty = all academic years (same pattern as All student marks). */
  const [catalogAcademicYearId, setCatalogAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  const [studentFilterId, setStudentFilterId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [catalogAcademicYearId, termId, classRoomId, studentFilterId, debouncedSearch]);

  useEffect(() => {
    setTermId('');
    setClassRoomId('');
    setStudentFilterId('');
  }, [catalogAcademicYearId]);

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const catalogTermsQuery = useQuery({
    queryKey: ['terms', 'report-catalog', catalogAcademicYearId || 'all'],
    queryFn: () =>
      listTermsApi(
        auth.accessToken!,
        catalogAcademicYearId ? { academicYearId: catalogAcademicYearId } : undefined,
      ),
    enabled: Boolean(auth.accessToken),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const studentsFilterQuery = useQuery({
    queryKey: ['students-report-filter', catalogAcademicYearId || 'all'],
    queryFn: () =>
      listStudentsApi(auth.accessToken!, {
        ...(catalogAcademicYearId ? { academicYearId: catalogAcademicYearId } : {}),
        page: 1,
        pageSize: 500,
      }),
    enabled: Boolean(auth.accessToken),
  });

  const catalogQuery = useQuery({
    queryKey: [
      'report-cards-catalog',
      catalogAcademicYearId || 'all',
      termId,
      classRoomId,
      studentFilterId,
      debouncedSearch,
      page,
    ],
    enabled: Boolean(auth.accessToken),
    queryFn: () =>
      listReportCardsCatalogApi(auth.accessToken!, {
        ...(catalogAcademicYearId ? { academicYearId: catalogAcademicYearId } : {}),
        termId: termId || undefined,
        classRoomId: classRoomId || undefined,
        studentId: studentFilterId || undefined,
        q: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const years = Array.isArray(yearsQuery.data) ? yearsQuery.data : [];
  const catalogTerms = Array.isArray(catalogTermsQuery.data) ? catalogTermsQuery.data : [];
  const classRooms = Array.isArray(classesQuery.data) ? classesQuery.data : [];
  const filterStudents = studentsFilterQuery.data?.items ?? [];
  const rows: ReportCardCatalogRow[] = catalogQuery.data?.items ?? [];
  const pagination = catalogQuery.data?.pagination;

  const openPdfBlob = (blob: Blob, mode: 'view' | 'download', fileName: string) => {
    const url = URL.createObjectURL(blob);
    if (mode === 'view') {
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  const runPdf = async (row: ReportCardCatalogRow, mode: 'view' | 'download') => {
    const key = `${row.id}-${mode}`;
    setLoadingPdf(key);
    try {
      const blob = await downloadStudentReportCardPdfApi(auth.accessToken!, row.student.id, row.term.id);
      openPdfBlob(blob, mode, reportCardFileName(row));
    } catch (e) {
      showToast({
        type: 'error',
        title: mode === 'view' ? 'Could not open report card' : 'Could not download report card',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setLoadingPdf(null);
    }
  };

  const noResults =
    !catalogQuery.isPending &&
    !catalogQuery.isError &&
    (pagination?.totalItems ?? 0) === 0;

  return (
    <SectionCard
      title="Report cards"
      subtitle="By default, report cards from all academic years are listed (paginated). Narrow with Academic year, term, class, or student; search matches student code, name, or class."
    >
      <div className="mb-6 grid gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Academic year
          <select
            value={catalogAcademicYearId}
            onChange={(e) => {
              setCatalogAcademicYearId(e.target.value);
              setTermId('');
            }}
            className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">All years</option>
            {years.map((y: { id: string; name: string; isCurrent?: boolean }) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Term
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
          >
            <option value="">All terms</option>
            {catalogTerms.map((t: { id: string; name: string }) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Class
          <select
            value={classRoomId}
            onChange={(e) => setClassRoomId(e.target.value)}
            className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">All classes</option>
            {classRooms.map((c: { id: string; code: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.code} – {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Student
          <select
            value={studentFilterId}
            onChange={(e) => setStudentFilterId(e.target.value)}
            disabled={studentsFilterQuery.isPending}
            className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
          >
            <option value="">All students</option>
            {filterStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.studentCode} – {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2 xl:col-span-2">
          Search (student ID, name, class)
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Partial match…"
            className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      {catalogQuery.isPending ? (
        <div className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          Loading report cards…
        </div>
      ) : catalogQuery.isError ? (
        <StateView
          title="Could not load report cards"
          message={catalogQuery.error instanceof Error ? catalogQuery.error.message : 'Please try again.'}
          action={
            <button
              type="button"
              onClick={() => void catalogQuery.refetch()}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : noResults ? (
        <EmptyState message="No report cards match these filters. Publish results from the Examination Portal after locking a class term to create report cards here." />
      ) : (
        <>
          <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
            <table className="w-full min-w-full table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-brand-200 bg-brand-50">
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">Student ID</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">Student name</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">Class</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">Academic year</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">Term</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">Report status</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const busyView = loadingPdf === `${row.id}-view`;
                  const busyDl = loadingPdf === `${row.id}-download`;
                  return (
                    <tr key={row.id} className="border-b border-brand-50">
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-800">{row.student.studentCode}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        {row.student.firstName} {row.student.lastName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {row.classRoom.code}
                        <span className="text-slate-500"> · {row.classRoom.name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{row.academicYear.name}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.term.name}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                            row.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {row.status === 'PUBLISHED' ? 'Published' : 'Locked'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void runPdf(row, 'view')}
                            disabled={busyView || busyDl}
                            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                          >
                            {busyView ? 'Opening…' : 'View'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void runPdf(row, 'download')}
                            disabled={busyView || busyDl}
                            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-brand-50 disabled:opacity-50"
                          >
                            {busyDl ? 'Preparing…' : 'Download'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} report cards)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
