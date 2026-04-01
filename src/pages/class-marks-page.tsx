import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  getMarksGridApi,
  listAllMarksLedgerApi,
  saveMarksGridApi,
  type AllMarksLedgerWideRow,
  type MarksGridStudentRow,
} from '../features/sprint5/exams.api';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
  listTermsApi,
} from '../features/sprint1/sprint1.api';
import { listStudentsApi } from '../features/sprint2/sprint2.api';

const inputClass =
  'w-14 rounded border border-brand-200 bg-white px-1 py-1 text-center text-sm outline-none focus:border-brand-500';
const inputReadonlyClass =
  'w-14 rounded border border-slate-200 bg-slate-100 px-1 py-1 text-center text-sm text-slate-800 cursor-default';

/** Left border between subject groups (after first subject). */
const subjectGroupBorder = (subjectIndex: number) =>
  subjectIndex > 0 ? 'border-l-2 border-slate-300' : '';

const FULL_YEAR_TERM_ID = '__full_year__';

const LEDGER_PAGE_SIZE = 25;

type MarksTab = 'overview' | 'entry';

export function ClassMarksPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const yearInitRef = useRef(false);

  const [tab, setTab] = useState<MarksTab>('overview');

  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  const [draft, setDraft] = useState<Partial<Record<string, number | null>>>({});

  /** Ledger filters (default: all academic years) */
  const [ledgerAcademicYearId, setLedgerAcademicYearId] = useState('');
  const [ledgerTermId, setLedgerTermId] = useState('');
  const [ledgerClassId, setLedgerClassId] = useState('');
  const [ledgerStudentId, setLedgerStudentId] = useState('');
  const [ledgerSearchInput, setLedgerSearchInput] = useState('');
  const [debouncedLedgerQ, setDebouncedLedgerQ] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerSortBy, setLedgerSortBy] = useState<
    'rank' | 'studentName' | 'classCode' | 'term' | 'subject' | 'total' | 'average'
  >('rank');
  const [ledgerSortDir, setLedgerSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLedgerQ(ledgerSearchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [ledgerSearchInput]);

  useEffect(() => {
    setLedgerPage(1);
  }, [
    ledgerAcademicYearId,
    ledgerTermId,
    ledgerClassId,
    ledgerStudentId,
    debouncedLedgerQ,
    ledgerSortBy,
    ledgerSortDir,
  ]);

  useEffect(() => {
    setLedgerTermId('');
    setLedgerClassId('');
    setLedgerStudentId('');
  }, [ledgerAcademicYearId]);

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const termsQuery = useQuery({
    queryKey: ['terms', academicYearId],
    queryFn: () =>
      listTermsApi(auth.accessToken!, academicYearId ? { academicYearId } : undefined),
  });

  const ledgerTermsQuery = useQuery({
    queryKey: ['terms', 'ledger', ledgerAcademicYearId || 'all'],
    queryFn: () =>
      listTermsApi(
        auth.accessToken!,
        ledgerAcademicYearId ? { academicYearId: ledgerAcademicYearId } : undefined,
      ),
    enabled: Boolean(auth.accessToken),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const studentsForLedgerQuery = useQuery({
    queryKey: ['students-ledger-filter', ledgerAcademicYearId || 'all'],
    queryFn: () =>
      listStudentsApi(auth.accessToken!, {
        ...(ledgerAcademicYearId ? { academicYearId: ledgerAcademicYearId } : {}),
        pageSize: 500,
        page: 1,
      }),
    enabled: Boolean(auth.accessToken),
  });

  const ledgerQuery = useQuery({
    queryKey: [
      'all-marks-ledger',
      ledgerAcademicYearId || 'all',
      ledgerTermId,
      ledgerClassId,
      ledgerStudentId,
      debouncedLedgerQ,
      ledgerPage,
      ledgerSortBy,
      ledgerSortDir,
    ],
    enabled: Boolean(auth.accessToken),
    queryFn: () =>
      listAllMarksLedgerApi(auth.accessToken!, {
        ...(ledgerAcademicYearId ? { academicYearId: ledgerAcademicYearId } : {}),
        termId: ledgerTermId || undefined,
        classRoomId: ledgerClassId || undefined,
        studentId: ledgerStudentId || undefined,
        q: debouncedLedgerQ || undefined,
        page: ledgerPage,
        pageSize: LEDGER_PAGE_SIZE,
        sortBy: ledgerSortBy,
        sortDir: ledgerSortDir,
      }),
  });

  const gridQuery = useQuery({
    queryKey: ['marks-grid', termId, classRoomId],
    enabled: Boolean(termId && classRoomId && termId !== FULL_YEAR_TERM_ID),
    queryFn: () => getMarksGridApi(auth.accessToken!, { termId, classRoomId }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof saveMarksGridApi>[1]) =>
      saveMarksGridApi(auth.accessToken!, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marks-grid', variables.termId, variables.classRoomId] });
      queryClient.invalidateQueries({ queryKey: ['all-marks-ledger'] });
      setDraft({});
      showToast({ type: 'success', title: 'Marks saved' });
    },
    onError: (e: Error) => {
      showToast({ type: 'error', title: 'Save failed', message: e.message });
    },
  });

  const years = Array.isArray(yearsQuery.data) ? yearsQuery.data : [];
  const terms = Array.isArray(termsQuery.data) ? termsQuery.data : [];
  const ledgerTerms = Array.isArray(ledgerTermsQuery.data) ? ledgerTermsQuery.data : [];
  const classRooms = Array.isArray(classesQuery.data) ? classesQuery.data : [];
  const grid = gridQuery.data;
  const hasGrid = Boolean(grid && (grid.subjects.length > 0 || grid.students.length > 0));
  const isFullYearSelected = termId === FULL_YEAR_TERM_ID;
  const marksReadOnly = Boolean(grid && grid.marksEditable === false);

  const ledgerItems: AllMarksLedgerWideRow[] = ledgerQuery.data?.items ?? [];
  const ledgerSubjects = ledgerQuery.data?.subjects ?? [];
  const ledgerPagination = ledgerQuery.data?.pagination;
  const ledgerStudents = studentsForLedgerQuery.data?.items ?? [];

  useEffect(() => {
    if (yearInitRef.current || years.length === 0) {
      return;
    }
    yearInitRef.current = true;
    const current = years.find((y: { isCurrent?: boolean }) => y.isCurrent);
    setAcademicYearId(current?.id ?? years[0]?.id ?? '');
  }, [years]);

  useEffect(() => {
    setDraft({});
  }, [academicYearId, termId, classRoomId]);

  const getCellKey = (studentId: string, subjectId: string, type: 'test' | 'exam') =>
    `${studentId}:${subjectId}:${type}`;

  const getDisplayValue = (
    row: MarksGridStudentRow,
    subjectIndex: number,
    type: 'test' | 'exam',
  ): string => {
    const key = getCellKey(row.studentId, row.subjectMarks[subjectIndex]?.subjectId ?? '', type);
    if (draft[key] !== undefined) {
      return draft[key] === null ? '' : String(draft[key]);
    }
    const sm = row.subjectMarks[subjectIndex];
    if (!sm) return '';
    const val = type === 'test' ? sm.testMarks : sm.examMarks;
    return val === null ? '' : String(val);
  };

  const setCell = (studentId: string, subjectId: string, type: 'test' | 'exam', value: number | null) => {
    const key = getCellKey(studentId, subjectId, type);
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const buildSavePayload = (): Parameters<typeof saveMarksGridApi>[1] | null => {
    if (!grid) return null;
    const entries: Array<{
      studentId: string;
      subjectId: string;
      testMarks: number | null;
      examMarks: number | null;
    }> = [];
    for (const row of grid.students) {
      for (const sm of row.subjectMarks) {
        const testKey = getCellKey(row.studentId, sm.subjectId, 'test');
        const examKey = getCellKey(row.studentId, sm.subjectId, 'exam');
        const testVal = draft[testKey] !== undefined ? draft[testKey] : sm.testMarks;
        const examVal = draft[examKey] !== undefined ? draft[examKey] : sm.examMarks;
        entries.push({
          studentId: row.studentId,
          subjectId: sm.subjectId,
          testMarks: testVal ?? null,
          examMarks: examVal ?? null,
        });
      }
    }
    if (entries.length === 0) return null;
    return {
      termId: grid.term.id,
      classRoomId: grid.classRoom.id,
      entries,
    };
  };

  const handleSave = () => {
    if (marksReadOnly) {
      showToast({ type: 'info', title: 'Marks are read-only' });
      return;
    }
    const payload = buildSavePayload();
    if (!payload || payload.entries.length === 0) {
      showToast({ type: 'info', title: 'No changes to save' });
      return;
    }
    saveMutation.mutate(payload);
  };

  const hasDraft = useMemo(() => Object.keys(draft).length > 0, [draft]);

  const ledgerEmpty =
    !ledgerQuery.isPending &&
    !ledgerQuery.isError &&
    ledgerItems.length === 0 &&
    (ledgerPagination?.totalItems ?? 0) === 0;

  return (
    <div className="grid gap-6">
    <SectionCard
        title="Marks"
        subtitle="All student marks loads every academic year by default (paginated). Narrow with Academic year, or use Class entry grid to enter CAT / EXAM marks."
        action={null}
      >
        <div className="mb-4 flex flex-wrap gap-2 border-b border-brand-100 pb-4">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'overview'
                ? 'bg-brand-500 text-white'
                : 'bg-brand-50 text-slate-800 hover:bg-brand-100'
            }`}
          >
            All student marks
          </button>
          <button
            type="button"
            onClick={() => setTab('entry')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'entry'
                ? 'bg-brand-500 text-white'
                : 'bg-brand-50 text-slate-800 hover:bg-brand-100'
            }`}
          >
            Class entry grid
          </button>
        </div>

        {tab === 'overview' ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
              <div className="flex flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                <label className="flex shrink-0 flex-col gap-1 text-sm font-medium text-slate-800">
                  Academic year
                  <select
                    value={ledgerAcademicYearId}
                    onChange={(e) => {
                      setLedgerAcademicYearId(e.target.value);
                      setLedgerTermId('');
                    }}
                    className="h-10 min-w-[10rem] rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">All years</option>
                    {years.map((y: { id: string; name: string }) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex shrink-0 flex-col gap-1 text-sm font-medium text-slate-800">
                  Term
                  <select
                    value={ledgerTermId}
                    onChange={(e) => setLedgerTermId(e.target.value)}
                    className="h-10 min-w-[9rem] rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">All terms</option>
                    {ledgerTerms.map((t: { id: string; name: string }) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex shrink-0 flex-col gap-1 text-sm font-medium text-slate-800">
                  Class
                  <select
                    value={ledgerClassId}
                    onChange={(e) => setLedgerClassId(e.target.value)}
                    className="h-10 min-w-[11rem] rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">All classes</option>
                    {classRooms.map((c: { id: string; code: string; name: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.code} – {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex shrink-0 flex-col gap-1 text-sm font-medium text-slate-800">
                  Student
                  <select
                    value={ledgerStudentId}
                    onChange={(e) => setLedgerStudentId(e.target.value)}
                    className="h-10 min-w-[12rem] rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
                    disabled={studentsForLedgerQuery.isPending}
                  >
                    <option value="">All students</option>
                    {ledgerStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.lastName}, {s.firstName} ({s.studentCode})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-[12rem] shrink-0 flex-col gap-1 text-sm font-medium text-slate-800 sm:min-w-[14rem]">
                  Search name
                  <input
                    type="search"
                    value={ledgerSearchInput}
                    onChange={(e) => setLedgerSearchInput(e.target.value)}
                    placeholder="First or last name"
                    className="h-10 w-full min-w-[12rem] rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 sm:min-w-[14rem]"
                  />
                </label>
                <label className="flex shrink-0 flex-col gap-1 text-sm font-medium text-slate-800">
                  Sort by
                  <select
                    value={ledgerSortBy}
                    onChange={(e) => setLedgerSortBy(e.target.value as typeof ledgerSortBy)}
                    className="h-10 min-w-[9.5rem] rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="rank">Rank</option>
                    <option value="studentName">Student name</option>
                    <option value="classCode">Class</option>
                    <option value="term">Term</option>
                    <option value="subject">Subject</option>
                    <option value="total">Term total</option>
                    <option value="average">Term average</option>
                  </select>
                </label>
                <label className="flex shrink-0 flex-col gap-1 text-sm font-medium text-slate-800">
                  Direction
                  <select
                    value={ledgerSortDir}
                    onChange={(e) => setLedgerSortDir(e.target.value as 'asc' | 'desc')}
                    className="h-10 min-w-[8.5rem] rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </label>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              By default, marks from <strong>all academic years</strong> are included (with pagination). Each row is
              one student in a class and term; the <strong>Year</strong> column shows which academic year. Subjects are
              columns (CAT, EXAM, total). Rank uses the sum of subject scores (same rules as the class grid).
            </p>

            {ledgerQuery.isPending ? (
              <div className="flex items-center gap-2 text-slate-600">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                Loading marks…
              </div>
            ) : null}

            {ledgerQuery.isError ? (
              <StateView
                title="Could not load marks"
                message={ledgerQuery.error instanceof Error ? ledgerQuery.error.message : 'Please try again.'}
                action={
                  <button
                    type="button"
                    onClick={() => void ledgerQuery.refetch()}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                }
              />
            ) : null}

            {!ledgerQuery.isPending && !ledgerQuery.isError && ledgerEmpty ? (
              <EmptyState message="No marks found for these filters. Create exams and enter marks, or widen filters (e.g. all terms / all classes)." />
            ) : null}

            {!ledgerQuery.isPending && !ledgerQuery.isError && ledgerItems.length > 0 ? (
              <>
                <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                  <table className="w-full min-w-full table-auto border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-200 bg-brand-50">
                        <th
                          rowSpan={2}
                          className="sticky left-0 z-20 min-w-[2.5rem] border-r border-brand-200 bg-brand-50 px-2 py-2 align-middle font-semibold text-slate-800"
                        >
                          #
                        </th>
                        <th
                          rowSpan={2}
                          className="sticky left-10 z-20 min-w-[9rem] border-r border-brand-200 bg-brand-50 px-2 py-2 align-middle font-semibold text-slate-800"
                        >
                          Student
                        </th>
                        <th
                          rowSpan={2}
                          className="sticky left-[148px] z-20 min-w-[4.5rem] border-r border-brand-200 bg-brand-50 px-2 py-2 align-middle text-center text-xs font-semibold text-slate-800"
                        >
                          Class
                        </th>
                        <th
                          rowSpan={2}
                          className="sticky left-[214px] z-20 min-w-[5rem] border-r border-brand-200 bg-brand-50 px-2 py-2 align-middle text-center text-xs font-semibold text-slate-800"
                        >
                          Term
                        </th>
                        <th
                          rowSpan={2}
                          className="sticky left-[294px] z-20 min-w-[5.5rem] border-r border-brand-200 bg-brand-50 px-1 py-2 align-middle text-center text-xs font-semibold text-slate-800"
                        >
                          Year
                        </th>
                        {ledgerSubjects.map((sub, si) => (
                          <th
                            key={sub.id}
                            colSpan={3}
                            className={`border-b border-brand-200 px-1 py-2 text-center text-xs font-semibold text-slate-800 ${subjectGroupBorder(si)}`}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <span>{sub.name}</span>
                              <span className="font-normal uppercase tracking-wide text-[0.65rem] text-slate-500">
                                {sub.code}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th
                          rowSpan={2}
                          className="min-w-[3.25rem] border-l-2 border-brand-200 bg-brand-50/90 px-2 py-2 align-middle text-center text-xs font-semibold text-slate-800"
                        >
                          Σ Total
                        </th>
                        <th
                          rowSpan={2}
                          className="min-w-[3rem] border-l border-brand-200 px-2 py-2 align-middle text-center text-xs font-semibold text-slate-800"
                        >
                          Avg
                        </th>
                        <th
                          rowSpan={2}
                          className="min-w-[3rem] border-l border-brand-200 px-2 py-2 align-middle text-center text-xs font-semibold text-slate-800"
                        >
                          Gr.
                        </th>
                        <th
                          rowSpan={2}
                          className="sticky right-0 z-20 min-w-[5.5rem] border-l-2 border-brand-200 bg-brand-50 px-2 py-2 align-middle text-center text-xs font-semibold text-slate-800"
                        >
                          Conduct
                        </th>
                      </tr>
                      <tr className="border-b border-brand-200 bg-brand-50/80">
                        {ledgerSubjects.map((sub, si) => (
                          <React.Fragment key={`${sub.id}-sub`}>
                            <th
                              className={`px-1 py-1 text-center text-[0.6rem] font-semibold uppercase tracking-wide text-slate-600 ${subjectGroupBorder(si)}`}
                            >
                              CAT
                            </th>
                            <th className="px-1 py-1 text-center text-[0.6rem] font-semibold uppercase tracking-wide text-slate-600">
                              EXAM
                            </th>
                            <th className="px-1 py-1 text-center text-[0.6rem] font-semibold uppercase tracking-wide text-slate-600">
                              Tot
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerItems.map((row) => (
                        <tr
                          key={`${row.student.id}-${row.academicYear.id}-${row.term.id}-${row.classRoom.id}`}
                          className="border-b border-brand-50"
                        >
                          <td className="sticky left-0 z-10 border-r border-brand-100 bg-white px-2 py-1.5 align-middle tabular-nums text-slate-700">
                            {row.rank}
                          </td>
                          <td className="sticky left-10 z-10 min-w-[9rem] border-r border-brand-100 bg-white px-2 py-1.5 align-middle font-medium text-slate-900">
                            {row.student.firstName} {row.student.lastName}
                            <span className="mt-0.5 block text-xs font-normal text-slate-500">
                              {row.student.studentCode}
                            </span>
                          </td>
                          <td className="sticky left-[148px] z-10 border-r border-brand-100 bg-white px-1 py-1.5 align-middle text-center text-xs text-slate-700">
                            {row.classRoom.code}
                          </td>
                          <td className="sticky left-[214px] z-10 border-r border-brand-100 bg-white px-1 py-1.5 align-middle text-center text-xs text-slate-700">
                            {row.term.name}
                          </td>
                          <td className="sticky left-[294px] z-10 min-w-[5.5rem] border-r border-brand-100 bg-white px-1 py-1.5 align-middle text-center text-xs text-slate-700">
                            {row.academicYear.name}
                          </td>
                          {ledgerSubjects.map((sub, si) => {
                            const score = row.scores[sub.id];
                            const has =
                              score &&
                              (score.testPercent != null || score.examPercent != null);
                            const sep = subjectGroupBorder(si);
                            return (
                              <React.Fragment key={sub.id}>
                                <td
                                  className={`border-r border-brand-50 px-1 py-1.5 text-center text-xs tabular-nums text-slate-800 ${sep}`}
                                >
                                  {has && score ? (score.testPercent?.toFixed(1) ?? '—') : '—'}
                                </td>
                                <td className="border-r border-brand-50 px-1 py-1.5 text-center text-xs tabular-nums text-slate-800">
                                  {has && score ? (score.examPercent?.toFixed(1) ?? '—') : '—'}
                                </td>
                                <td className="border-r border-brand-50 bg-slate-50/70 px-1 py-1.5 text-center text-xs font-medium tabular-nums text-slate-800">
                                  {has && score ? score.subjectScore.toFixed(1) : '—'}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="border-l-2 border-brand-100 px-2 py-1.5 text-center text-xs font-semibold tabular-nums text-slate-900">
                            {row.studentTermTotal.toFixed(1)}
                          </td>
                          <td className="border-l border-brand-100 px-2 py-1.5 text-center text-xs tabular-nums text-slate-800">
                            {row.studentTermAverage.toFixed(1)}
                          </td>
                          <td className="border-l border-brand-100 px-2 py-1.5 text-center text-xs text-slate-800">
                            <span className="font-semibold">{row.termGrade}</span>
                            {row.termRemark ? (
                              <span className="mt-0.5 block text-[0.65rem] text-slate-500">{row.termRemark}</span>
                            ) : null}
                          </td>
                          <td className="sticky right-0 z-10 min-w-[5.5rem] border-l-2 border-brand-100 bg-white px-2 py-1.5 text-left text-xs text-slate-800">
                            {row.conduct ? (
                              <span>
                                <span className="font-semibold">{row.conduct.grade}</span>
                                {row.conduct.remark ? (
                                  <span className="mt-0.5 block font-normal text-slate-600">{row.conduct.remark}</span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {ledgerPagination && ledgerPagination.totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
                    <span>
                      Page {ledgerPagination.page} of {ledgerPagination.totalPages} ({ledgerPagination.totalItems}{' '}
                      students)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={ledgerPage <= 1}
                        onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={ledgerPage >= ledgerPagination.totalPages}
                        onClick={() => setLedgerPage((p) => p + 1)}
                        className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {tab === 'entry' ? (
          <div className="grid gap-4 rounded-xl border border-brand-100 bg-white/80 p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-950">Class marks (CAT / EXAM / Total)</h3>
                <p className="mt-1 text-sm text-slate-700">
                  {marksReadOnly
                    ? 'Results are locked for this term and class. This table is read-only. Unlock results in Exams to edit marks.'
                    : 'Enter or edit CAT and EXAM marks per subject. Total follows your assessment weights. Save to update. Conduct shows the term conduct grade when recorded.'}
                </p>
              </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasGrid || !hasDraft || saveMutation.isPending || marksReadOnly}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save marks'}
          </button>
        </div>
            <div className="mt-2 grid gap-4">
              <div className="mb-4 flex flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                <div className="shrink-0">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Academic year</label>
                  <select
                    value={academicYearId}
                    onChange={(e) => {
                      setAcademicYearId(e.target.value);
                      setTermId('');
                    }}
                    className="h-10 min-w-[10rem] rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
                    aria-label="Select academic year"
                  >
                    <option value="">Select year</option>
                    {years.map((y: { id: string; name: string }) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="shrink-0">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Term</label>
                  <select
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                    className="h-10 min-w-[9rem] rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
                    aria-label="Select term"
                  >
                    <option value="">Select term</option>
                    {academicYearId ? (
                      <option value={FULL_YEAR_TERM_ID}>Full academic year</option>
                    ) : null}
                    {terms.map((t: { id: string; name: string }) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="shrink-0">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Class</label>
                  <select
                    value={classRoomId}
                    onChange={(e) => setClassRoomId(e.target.value)}
                    className="h-10 min-w-[11rem] rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
                    aria-label="Select class"
                  >
                    <option value="">Select class</option>
                    {classRooms.map((c: { id: string; code: string; name: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.code} – {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex shrink-0 items-end">
                  <button
                    type="button"
                    onClick={() => gridQuery.refetch()}
                    disabled={!termId || !classRoomId || isFullYearSelected}
                    className="h-10 shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>

      {isFullYearSelected ? (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3 text-sm text-slate-700">
                  <strong>Full academic year:</strong> To view or enter marks for a specific term, select a term
                  above. For a student’s full-year report card, go to <strong>Report cards</strong>, choose the
                  student, and open the report for each term or use the published annual summary where available.
        </div>
      ) : null}

      {gridQuery.isPending && termId && classRoomId ? (
        <div className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          Loading marks grid…
        </div>
      ) : null}

      {gridQuery.isError ? (
        <StateView
          title="Could not load marks"
          message={gridQuery.error instanceof Error ? gridQuery.error.message : 'Please try again.'}
          action={
            <button
              type="button"
              onClick={() => gridQuery.refetch()}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!gridQuery.isPending && !gridQuery.isError && !isFullYearSelected && (!termId || !classRoomId) ? (
        <EmptyState message="Select an academic year, then a term and class to load the marks table. Use ‘Full academic year’ in the Term dropdown for info on yearly reports." />
      ) : null}

      {marksReadOnly ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                  <strong>Read-only:</strong> Report results are locked for this term and class. Marks cannot be
                  edited until an administrator unlocks results.
        </div>
      ) : null}

      {!gridQuery.isPending && !gridQuery.isError && hasGrid && grid && !isFullYearSelected ? (
                <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                  <table className="w-full min-w-full table-auto border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 bg-brand-50">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 w-10 min-w-10 border-r border-brand-200 bg-brand-50 px-1 py-2 align-middle font-semibold text-slate-800"
                >
                  N°
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-10 z-20 min-w-[100px] border-r border-brand-200 bg-brand-50 px-2 py-2 align-middle font-semibold text-slate-800"
                >
                  First name
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[140px] z-20 min-w-[100px] border-r border-brand-200 bg-brand-50 px-2 py-2 align-middle font-semibold text-slate-800"
                >
                  Last name
                </th>
                {grid.subjects.map((sub, si) => (
                  <th
                    key={sub.id}
                    colSpan={3}
                    className={`border-b border-brand-200 px-1 py-2 text-center font-semibold text-slate-800 ${subjectGroupBorder(si)}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{sub.name}</span>
                      <span className="text-[0.65rem] font-normal uppercase tracking-wide text-slate-500">
                        {sub.code}
                      </span>
                    </div>
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="min-w-[4rem] border-b border-l-2 border-brand-200 bg-brand-50/90 px-2 py-2 align-middle text-center font-semibold text-slate-800"
                >
                  Total
                </th>
                <th
                  rowSpan={2}
                  className="min-w-[3rem] border-b border-l border-brand-200 px-2 py-2 align-middle text-center font-semibold text-slate-800"
                >
                  Rank
                </th>
                <th
                  rowSpan={2}
                  className="sticky right-0 z-20 min-w-[6.5rem] border-b border-l-2 border-brand-200 bg-brand-50 px-2 py-2 align-middle text-center font-semibold text-slate-800"
                >
                  Conduct
                </th>
              </tr>
              <tr className="border-b border-brand-200 bg-brand-50/80">
                {grid.subjects.map((sub, si) => (
                  <React.Fragment key={sub.id}>
                    <th
                      className={`px-1 py-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600 ${subjectGroupBorder(si)}`}
                    >
                      CAT
                    </th>
                    <th className="px-1 py-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600">
                      EXAM
                    </th>
                    <th className="px-1 py-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600">
                      Total
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.students.map((row) => (
                <tr key={row.studentId} className="border-b border-brand-50">
                  <td className="sticky left-0 z-10 w-10 min-w-10 border-r border-brand-100 bg-white px-1 py-1 text-slate-600">
                    {row.index}
                  </td>
                  <td className="sticky left-10 z-10 min-w-[100px] border-r border-brand-100 bg-white px-2 py-1 font-medium text-slate-800">
                    {row.firstName}
                  </td>
                  <td className="sticky left-[140px] z-10 min-w-[100px] border-r border-brand-100 bg-white px-2 py-1 font-medium text-slate-800">
                    {row.lastName}
                  </td>
                  {row.subjectMarks.map((sm, i) => {
                    const testStr = getDisplayValue(row, i, 'test');
                    const examStr = getDisplayValue(row, i, 'exam');
                    const total = (() => {
                      const t = draft[getCellKey(row.studentId, sm.subjectId, 'test')];
                      const e = draft[getCellKey(row.studentId, sm.subjectId, 'exam')];
                      if (t !== undefined || e !== undefined) {
                        return (t ?? sm.testMarks ?? 0) + (e ?? sm.examMarks ?? 0);
                      }
                      return sm.total;
                    })();
                    const hasSubjectMarks =
                      sm.testMarks != null ||
                      sm.examMarks != null ||
                      draft[getCellKey(row.studentId, sm.subjectId, 'test')] !== undefined ||
                      draft[getCellKey(row.studentId, sm.subjectId, 'exam')] !== undefined;
                    const sep = subjectGroupBorder(i);
                    return (
                      <React.Fragment key={sm.subjectId}>
                        <td className={`border-r border-brand-100 px-1 py-1 ${sep}`}>
                          <input
                            type="number"
                            min={0}
                            max={500}
                            readOnly={marksReadOnly}
                            tabIndex={marksReadOnly ? -1 : 0}
                            className={marksReadOnly ? inputReadonlyClass : inputClass}
                            value={testStr}
                            onChange={(e) => {
                              if (marksReadOnly) return;
                              const v = e.target.value.trim();
                              setCell(row.studentId, sm.subjectId, 'test', v === '' ? null : parseInt(v, 10));
                            }}
                            aria-label={`${row.firstName} ${row.lastName} ${grid.subjects[i]?.name} CAT`}
                          />
                        </td>
                        <td className="border-r border-brand-100 px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            max={500}
                            readOnly={marksReadOnly}
                            tabIndex={marksReadOnly ? -1 : 0}
                            className={marksReadOnly ? inputReadonlyClass : inputClass}
                            value={examStr}
                            onChange={(e) => {
                              if (marksReadOnly) return;
                              const v = e.target.value.trim();
                              setCell(row.studentId, sm.subjectId, 'exam', v === '' ? null : parseInt(v, 10));
                            }}
                            aria-label={`${row.firstName} ${row.lastName} ${grid.subjects[i]?.name} Exam`}
                          />
                        </td>
                        <td className="border-r border-brand-100 bg-slate-50/80 px-1 py-1 text-center text-sm font-medium tabular-nums text-slate-700">
                          {hasSubjectMarks ? total.toFixed(1) : '—'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="border-l border-brand-100 px-2 py-1 text-center font-semibold tabular-nums text-slate-800">
                    {row.total.toFixed(1)}
                  </td>
                  <td className="border-l border-brand-100 px-2 py-1 text-center font-medium text-slate-700">
                    {row.rank}
                  </td>
                  <td className="sticky right-0 z-10 min-w-[6.5rem] border-l-2 border-brand-100 bg-white px-2 py-1 text-left text-xs text-slate-800">
                    {row.conduct ? (
                      <span>
                        <span className="font-semibold">{row.conduct.grade}</span>
                        {row.conduct.remark ? (
                          <span className="mt-0.5 block font-normal text-slate-600">{row.conduct.remark}</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!gridQuery.isPending && !gridQuery.isError && termId && classRoomId && grid && !hasGrid ? (
        <EmptyState message="No subjects or students in this class for this term. Create exams (Test/CAT and Exam) for the class to see the grid." />
              ) : null}
            </div>
          </div>
      ) : null}
    </SectionCard>
    </div>
  );
}
