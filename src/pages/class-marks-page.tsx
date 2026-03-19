import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  getMarksGridApi,
  saveMarksGridApi,
  type MarksGridResponse,
  type MarksGridStudentRow,
} from '../features/sprint5/exams.api';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
  listTermsApi,
} from '../features/sprint1/sprint1.api';

const inputClass =
  'w-14 rounded border border-brand-200 bg-white px-1 py-1 text-center text-sm outline-none focus:border-brand-500';

const FULL_YEAR_TERM_ID = '__full_year__';

export function ClassMarksPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  // Stores per-cell drafts by key: `${studentId}:${subjectId}:${type}` -> marks (or null when cleared)
  const [draft, setDraft] = useState<Partial<Record<string, number | null>>>({});

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const termsQuery = useQuery({
    queryKey: ['terms', academicYearId],
    queryFn: () =>
      listTermsApi(auth.accessToken!, academicYearId ? { academicYearId } : undefined),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
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
      setDraft({});
      showToast({ type: 'success', title: 'Marks saved' });
    },
    onError: (e: Error) => {
      showToast({ type: 'error', title: 'Save failed', message: e.message });
    },
  });

  const years = Array.isArray(yearsQuery.data) ? yearsQuery.data : [];
  const terms = Array.isArray(termsQuery.data) ? termsQuery.data : [];
  const classRooms = Array.isArray(classesQuery.data) ? classesQuery.data : [];
  const grid = gridQuery.data;
  const hasGrid = Boolean(grid && (grid.subjects.length > 0 || grid.students.length > 0));
  const isFullYearSelected = termId === FULL_YEAR_TERM_ID;

  // Prevent old edits from being saved accidentally when switching filters.
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
    const payload = buildSavePayload();
    if (!payload || payload.entries.length === 0) {
      showToast({ type: 'info', title: 'No changes to save' });
      return;
    }
    saveMutation.mutate(payload);
  };

  const hasDraft = useMemo(() => Object.keys(draft).length > 0, [draft]);

  return (
    <SectionCard
      title="Class marks (Test / Exam / Total)"
      subtitle="Enter or edit Test and Exam marks per subject. Total is computed automatically. Save to update."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasGrid || !hasDraft || saveMutation.isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save marks'}
          </button>
        </div>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Academic year</label>
          <select
            value={academicYearId}
            onChange={(e) => {
              setAcademicYearId(e.target.value);
              setTermId('');
            }}
            className="h-10 w-full rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
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
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Term</label>
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="h-10 w-full rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
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
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Class</label>
          <select
            value={classRoomId}
            onChange={(e) => setClassRoomId(e.target.value)}
            className="h-10 w-full rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
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
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => gridQuery.refetch()}
            disabled={!termId || !classRoomId || isFullYearSelected}
            className="h-10 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {isFullYearSelected ? (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3 text-sm text-slate-700">
          <strong>Full academic year:</strong> To view or enter marks for a specific term, select a term above. For a student’s full-year report card, go to <strong>Report cards</strong>, choose the student, and open the report for each term or use the published annual summary where available.
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

      {!gridQuery.isPending && !gridQuery.isError && hasGrid && grid && !isFullYearSelected ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full table-auto border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 bg-brand-50">
                <th className="sticky left-0 z-10 min-w-[2rem] border-r border-brand-200 bg-brand-50 px-2 py-2 font-semibold text-slate-800">
                  N°
                </th>
                <th className="sticky left-0 z-10 min-w-[100px] border-r border-brand-200 bg-brand-50 px-2 py-2 font-semibold text-slate-800">
                  First name
                </th>
                <th className="sticky left-0 z-10 min-w-[100px] border-r border-brand-200 bg-brand-50 px-2 py-2 font-semibold text-slate-800">
                  Last name
                </th>
                {grid.subjects.map((sub) => (
                  <th
                    key={sub.id}
                    colSpan={3}
                    className="border-b border-brand-200 px-1 py-2 text-center font-semibold text-slate-800"
                  >
                    {sub.name}
                  </th>
                ))}
                <th className="min-w-[4rem] border-b border-l border-brand-200 px-2 py-2 text-center font-semibold text-slate-800">
                  Total
                </th>
                <th className="min-w-[3rem] border-b border-l border-brand-200 px-2 py-2 text-center font-semibold text-slate-800">
                  Rank
                </th>
              </tr>
              <tr className="border-b border-brand-200 bg-brand-50/80">
                <th className="sticky left-0 z-10 border-r border-brand-200 bg-brand-50/80 px-2 py-1" />
                <th className="sticky left-0 z-10 border-r border-brand-200 bg-brand-50/80 px-2 py-1" />
                <th className="sticky left-0 z-10 border-r border-brand-200 bg-brand-50/80 px-2 py-1" />
                {grid.subjects.map((sub) => (
                  <React.Fragment key={sub.id}>
                    <th className="px-1 py-1 text-center text-xs font-medium text-slate-600">Test</th>
                    <th className="px-1 py-1 text-center text-xs font-medium text-slate-600">Exam</th>
                    <th className="px-1 py-1 text-center text-xs font-medium text-slate-600">Total</th>
                  </React.Fragment>
                ))}
                <th className="border-l border-brand-200 px-2 py-1" />
                <th className="border-l border-brand-200 px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {grid.students.map((row) => (
                <tr key={row.studentId} className="border-b border-brand-50">
                  <td className="sticky left-0 z-10 border-r border-brand-100 bg-white px-2 py-1 text-slate-600">
                    {row.index}
                  </td>
                  <td className="sticky left-0 z-10 border-r border-brand-100 bg-white px-2 py-1 font-medium text-slate-800">
                    {row.firstName}
                  </td>
                  <td className="sticky left-0 z-10 border-r border-brand-100 bg-white px-2 py-1 font-medium text-slate-800">
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
                    return (
                      <React.Fragment key={sm.subjectId}>
                        <td className="border-r border-brand-100 px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            max={500}
                            className={inputClass}
                            value={testStr}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              setCell(row.studentId, sm.subjectId, 'test', v === '' ? null : parseInt(v, 10));
                            }}
                            aria-label={`${row.firstName} ${row.lastName} ${grid.subjects[i]?.name} Test`}
                          />
                        </td>
                        <td className="border-r border-brand-100 px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            max={500}
                            className={inputClass}
                            value={examStr}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              setCell(row.studentId, sm.subjectId, 'exam', v === '' ? null : parseInt(v, 10));
                            }}
                            aria-label={`${row.firstName} ${row.lastName} ${grid.subjects[i]?.name} Exam`}
                          />
                        </td>
                        <td className="border-r border-brand-100 px-1 py-1 text-center font-medium text-slate-700">
                          {total}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="border-l border-brand-100 px-2 py-1 text-center font-semibold text-slate-800">
                    {row.total}
                  </td>
                  <td className="border-l border-brand-100 px-2 py-1 text-center font-medium text-slate-700">
                    {row.rank}
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
    </SectionCard>
  );
}
