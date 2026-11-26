import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import {
  DataTable,
  type DataTableColumn,
} from '../components/ui/data-table';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/toast';
import { hasRole } from '../features/auth/auth-helpers';
import { useAuth } from '../features/auth/auth.context';
import {
  downloadMidTermReportCardsPdfApi,
  downloadStudentReportCardPdfApi,
  generateYearlyReportCardsApi,
  listReportCardsCatalogApi,
  type ReportCardCatalogRow,
} from '../features/sprint5/exams.api';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
  listTermsApi,
} from '../features/sprint1/sprint1.api';
import { termLabel, type TermOption } from '../utils/terms';
import { listStudentsApi } from '../features/sprint2/sprint2.api';

const PAGE_SIZE = 25;

function reportCardFileName(row: ReportCardCatalogRow): string {
  const termSlug = row.term.name.replace(/\s+/g, '-');
  return `${row.student.studentCode}-${termSlug}-report-card.pdf`;
}

const ICON_CIRCLE =
  'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-500 sm:h-16 sm:w-16';

function MidTermIcon() {
  return (
    <div className={ICON_CIRCLE}>
      <svg viewBox="0 0 48 48" className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true">
        <path fill="currentColor" d="M11 4h18v9a3 3 0 0 0 3 3h9v25a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" />
        <path fill="currentColor" d="m32 4 9 9h-9Z" />
        <path
          d="M14 12h9M14 17h9"
          fill="none"
          className="stroke-white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M17 37v-5M24.5 37V27M32 37v-7" fill="none" className="stroke-white" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function YearlyIcon() {
  return (
    <div className={ICON_CIRCLE}>
      <svg viewBox="0 0 48 48" className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true">
        <path
          d="M8 18V11a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v7M8 18v19a3 3 0 0 0 3 3h26a3 3 0 0 0 3-3V18"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path d="M8 8h32v10H8Z" fill="currentColor" />
        <path d="M15 4v7M33 4v7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M14 22h5v5h-5ZM22 22h5v5h-5ZM30 22h5v5h-5ZM14 30h5v5h-5ZM22 30h5v5h-5Z" fill="currentColor" />
        <circle cx="36" cy="35" r="10" fill="currentColor" className="stroke-brand-100" strokeWidth="2" />
        <path
          d="m31.5 35 3.2 3.2 6-6"
          fill="none"
          className="stroke-white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
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
  const [midTermUpTo, setMidTermUpTo] = useState('');
  const [loadingMidTerm, setLoadingMidTerm] = useState<'view' | 'download' | null>(null);
  const queryClient = useQueryClient();
  const [yearlyPublish, setYearlyPublish] = useState(true);
  const [yearlyRegenerate, setYearlyRegenerate] = useState(false);
  const [generatingYearly, setGeneratingYearly] = useState(false);
  const canGenerateYearly =
    hasRole(auth.me, 'SCHOOL_ADMIN') || hasRole(auth.me, 'SUPER_ADMIN');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [catalogAcademicYearId, termId, classRoomId, studentFilterId, debouncedSearch]);

  // Terms and the student list depend on the year; classes do not, so keep the class.
  useEffect(() => {
    setTermId('');
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
        catalogAcademicYearId ? { academicYearId: catalogAcademicYearId } : undefined
      ),
    enabled: Boolean(auth.accessToken),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const studentsFilterQuery = useQuery({
    queryKey: ['students-report-filter', catalogAcademicYearId || 'all', classRoomId || 'all'],
    queryFn: () =>
      listStudentsApi(auth.accessToken!, {
        ...(catalogAcademicYearId ? { academicYearId: catalogAcademicYearId } : {}),
        ...(classRoomId ? { classId: classRoomId } : {}),
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
      const blob = await downloadStudentReportCardPdfApi(
        auth.accessToken!,
        row.student.id,
        row.term.id
      );
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

  const runMidTermPdf = async (mode: 'view' | 'download') => {
    setLoadingMidTerm(mode);
    try {
      const blob = await downloadMidTermReportCardsPdfApi(auth.accessToken!, {
        termId,
        classRoomId,
        studentId: studentFilterId || undefined,
        upTo: midTermUpTo || undefined,
      });
      const term = catalogTerms.find((t: { id: string; name: string }) => t.id === termId);
      const cls = classRooms.find((c: { id: string; code: string }) => c.id === classRoomId);
      const fileName = `${cls?.code ?? 'class'}-${(term?.name ?? 'term').replace(/\s+/g, '-')}-mid-term-report${studentFilterId ? '' : 's'}.pdf`;
      openPdfBlob(blob, mode, fileName);
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Could not create mid-term report cards',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setLoadingMidTerm(null);
    }
  };
  const midTermReady = Boolean(termId && classRoomId);
  const yearlyReady = Boolean(catalogAcademicYearId && classRoomId);

  const runGenerateYearly = async () => {
    setGeneratingYearly(true);
    try {
      const result = await generateYearlyReportCardsApi(auth.accessToken!, {
        academicYearId: catalogAcademicYearId,
        classRoomId,
        publish: yearlyPublish,
        regenerate: yearlyRegenerate,
      });
      showToast({
        type: 'success',
        title: result.regenerated ? 'Yearly report cards rebuilt' : 'Yearly report cards created',
        message: `${result.snapshotsCreated} report card${result.snapshotsCreated === 1 ? '' : 's'} ${
          result.status === 'PUBLISHED' ? 'published' : 'locked (not yet published)'
        } under "${result.term.name}".`,
      });
      setYearlyRegenerate(false);
      await queryClient.invalidateQueries({ queryKey: ['terms'] });
      await queryClient.invalidateQueries({ queryKey: ['report-cards-catalog'] });
      setTermId(result.term.id);
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Could not generate yearly report cards',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setGeneratingYearly(false);
    }
  };

  const noResults =
    !catalogQuery.isPending && !catalogQuery.isError && (pagination?.totalItems ?? 0) === 0;

  const catalogColumns: DataTableColumn<ReportCardCatalogRow>[] = [
    {
      key: 'studentCode',
      header: 'Student ID',
      mobile: 'secondary',
      render: (row) => (
        <span className="font-mono text-xs text-slate-800">{row.student.studentCode}</span>
      ),
    },
    {
      key: 'studentName',
      header: 'Student name',
      mobile: 'primary',
      render: (row) => (
        <span className="font-medium text-slate-900">
          {row.student.firstName} {row.student.lastName}
        </span>
      ),
    },
    {
      key: 'classRoom',
      header: 'Class',
      render: (row) => (
        <span className="text-slate-700">
          {row.classRoom.code}
          <span className="text-slate-500"> · {row.classRoom.name}</span>
        </span>
      ),
    },
    {
      key: 'academicYear',
      header: 'Academic year',
      render: (row) => <span className="text-slate-700">{row.academicYear.name}</span>,
    },
    {
      key: 'term',
      header: 'Term',
      mobile: 'secondary',
      render: (row) => <span className="text-slate-700">{row.term.name}</span>,
    },
    {
      key: 'status',
      header: 'Report status',
      render: (row) => (
        <Badge tone={row.status === 'PUBLISHED' ? 'success' : 'neutral'}>
          {row.status === 'PUBLISHED' ? 'Published' : 'Locked'}
        </Badge>
      ),
    },
  ];

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
            {catalogTerms.map((t: TermOption) => (
              <option key={t.id} value={t.id}>
                {termLabel(t, catalogTerms)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Class
          <select
            value={classRoomId}
            onChange={(e) => {
              setClassRoomId(e.target.value);
              setStudentFilterId('');
            }}
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

      <div className={`mb-6 grid gap-4 ${canGenerateYearly ? 'lg:grid-cols-2' : ''}`}>
        <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-4 sm:gap-6">
            <MidTermIcon />
            <div className="min-w-0 pt-1">
              <h3 className="text-sm font-semibold text-slate-950">Mid-term report cards</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {midTermReady
                  ? `Progress so far this term from the marks already entered, one page per ${studentFilterId ? 'student' : 'student in the class'}. Subjects without marks show "-".`
                  : 'Pick a term and a class above (and a student for a single report).'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid max-w-sm gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-0 flex-1 basis-44 gap-2 text-xs font-medium text-slate-900">
                Marks up to (optional)
                <input
                  type="date"
                  value={midTermUpTo}
                  onChange={(e) => setMidTermUpTo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-brand-400"
                />
              </label>
              <button
                type="button"
                disabled={!midTermReady || loadingMidTerm !== null}
                onClick={() => void runMidTermPdf('view')}
                className="h-10 min-w-24 rounded-xl border border-brand-200 bg-brand-50 px-6 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMidTerm === 'view' ? 'Preparing…' : 'View'}
              </button>
            </div>
            <button
              type="button"
              disabled={!midTermReady || loadingMidTerm !== null}
              onClick={() => void runMidTermPdf('download')}
              className="ml-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {loadingMidTerm === 'download' ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
        </section>

        {canGenerateYearly ? (
          <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-start gap-4 sm:gap-6">
              <YearlyIcon />
              <div className="min-w-0 pt-1">
                <h3 className="text-sm font-semibold text-slate-950">Yearly report cards</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {yearlyReady
                    ? 'Combine Term 1, Term 2 and Term 3 marks into one annual report card per student, with yearly average, position and pass/fail decision. All three terms need complete marks.'
                    : 'Pick an academic year and a class above to generate annual report cards.'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:pl-2">
              <label className="flex items-center gap-3 text-xs font-medium text-slate-900">
                <input
                  type="checkbox"
                  checked={yearlyPublish}
                  onChange={(e) => setYearlyPublish(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-500"
                />
                Publish to students &amp; parents
              </label>
              <label className="flex items-center gap-3 text-xs font-medium text-slate-900">
                <input
                  type="checkbox"
                  checked={yearlyRegenerate}
                  onChange={(e) => setYearlyRegenerate(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-500"
                />
                Regenerate if already created
              </label>
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                disabled={!yearlyReady || generatingYearly}
                onClick={() => void runGenerateYearly()}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
                {generatingYearly ? 'Generating…' : 'Generate yearly report cards'}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {catalogQuery.isError ? (
        <StateView
          title="Could not load report cards"
          message={
            catalogQuery.error instanceof Error ? catalogQuery.error.message : 'Please try again.'
          }
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
      ) : (
        <DataTable<ReportCardCatalogRow>
          ariaLabel="Report card catalog"
          columns={catalogColumns}
          data={rows}
          rowKey={(row) => row.id}
          loading={catalogQuery.isPending}
          skeletonRows={7}
          emptyTitle="No report cards match these filters"
          emptyDescription="Publish results from the Examination Portal after locking a class term to create report cards here."
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  pageSize: PAGE_SIZE,
                  totalItems: pagination.totalItems,
                  totalPages: pagination.totalPages,
                  onPageChange: setPage,
                  onPageSizeChange: () => undefined,
                }
              : undefined
          }
          rowActions={(row) => {
            const busyView = loadingPdf === `${row.id}-view`;
            const busyDl = loadingPdf === `${row.id}-download`;
            return (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void runPdf(row, 'view')}
                  disabled={busyView || busyDl}
                  aria-label={`View report card for ${row.student.firstName} ${row.student.lastName}`}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {busyView ? 'Opening…' : 'View'}
                </button>
                <button
                  type="button"
                  onClick={() => void runPdf(row, 'download')}
                  disabled={busyView || busyDl}
                  aria-label={`Download report card for ${row.student.firstName} ${row.student.lastName}`}
                  className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-brand-50 disabled:opacity-50"
                >
                  {busyDl ? 'Preparing…' : 'Download'}
                </button>
              </div>
            );
          }}
          minWidth={880}
        />
      )}
    </SectionCard>
  );
}
