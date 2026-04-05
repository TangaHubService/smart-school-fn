import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useToast } from './toast';
import { createConductDeductionApi } from '../features/conduct-marks/conduct-marks.api';
import { listAcademicYearsApi, listClassRoomsApi, listTermsApi } from '../features/sprint1/sprint1.api';
import { listStudentsApi } from '../features/sprint2/sprint2.api';

export type ConductDeductionStudentOption = {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
};

export type ConductDeductionLockedContext = {
  academicYearId: string;
  termId: string;
  classRoomId: string;
};

export type ConductDeductionFormProps = {
  accessToken: string;
  /**
   * **Class marks (teacher):** year / term / class are fixed; only student list + deduction fields.
   * **Conduct marks (admin):** omit — user picks year, term, class, and student from dropdowns.
   */
  lockedContext?: ConductDeductionLockedContext;
  /** Required when `lockedContext` is set (e.g. students in the marks grid). */
  students?: ConductDeductionStudentOption[];
  /** Pre-select student when opening from the grid (optional). */
  defaultStudentId?: string;
  /** Optional heading (e.g. modal title). */
  title?: string;
  /** Short help under the title. */
  description?: string;
  /** When false, omit the title and description block (e.g. inside a SectionCard). */
  showHeading?: boolean;
  /** For `aria-labelledby` on a parent dialog. */
  titleId?: string;
  /** Called after a successful save (e.g. close modal). */
  onSuccess?: () => void;
  showCancel?: boolean;
  onCancel?: () => void;
  /** Extra classes on the outer wrapper (modal body uses p-5 inside parent). */
  className?: string;
};

function defaultDatetimeLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/**
 * Shared conduct deduction UI for **admins** (full scope pickers) and **teachers** (locked class + term from marks grid).
 * Same validation, API, and cache invalidation for both.
 */
export function ConductDeductionForm({
  accessToken,
  lockedContext,
  students: lockedStudents,
  defaultStudentId,
  title = 'Record conduct deduction',
  description = '',
  showHeading = true,
  titleId,
  onSuccess,
  showCancel,
  onCancel,
  className = '',
}: ConductDeductionFormProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const scopeInitRef = useRef(false);

  const isLocked = Boolean(lockedContext);

  const [yearId, setYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [points, setPoints] = useState('1');
  const [reason, setReason] = useState('');
  const [occurredAt, setOccurredAt] = useState('');

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(accessToken),
    enabled: Boolean(accessToken && !isLocked),
  });

  const years = Array.isArray(yearsQuery.data) ? yearsQuery.data : [];

  useEffect(() => {
    if (isLocked || scopeInitRef.current || years.length === 0) {
      return;
    }
    scopeInitRef.current = true;
    const current = years.find((y: { isCurrent?: boolean }) => y.isCurrent);
    setYearId(current?.id ?? years[0]?.id ?? '');
  }, [isLocked, years]);

  const termsQuery = useQuery({
    queryKey: ['terms', 'conduct-deduction-form', yearId],
    queryFn: () => listTermsApi(accessToken, { academicYearId: yearId }),
    enabled: Boolean(accessToken && !isLocked && yearId),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms', 'conduct-deduction-form'],
    queryFn: () => listClassRoomsApi(accessToken),
    enabled: Boolean(accessToken && !isLocked),
  });

  const scopeStudentsQuery = useQuery({
    queryKey: ['students', 'conduct-deduction-form', yearId, classId],
    queryFn: async () => {
      const result = await listStudentsApi(accessToken, {
        academicYearId: yearId,
        classId,
        pageSize: 100,
        page: 1,
      });
      if (result?.items?.length === 0) {
        console.warn(`[ConductForm] No students found for class ${classId}, year ${yearId}`);
      }
      return result;
    },
    enabled: Boolean(accessToken && !isLocked && yearId && classId),
  });

  const terms = Array.isArray(termsQuery.data) ? termsQuery.data : [];
  const classes = Array.isArray(classesQuery.data) ? classesQuery.data : [];
  const scopeStudents = scopeStudentsQuery.data?.items ?? [];
  const studentOptions: ConductDeductionStudentOption[] = isLocked
    ? (lockedStudents ?? [])
    : scopeStudents.map((s) => ({
        id: s.id,
        studentCode: s.studentCode,
        firstName: s.firstName,
        lastName: s.lastName,
      }));

  useEffect(() => {
    if (!isLocked) {
      setTermId('');
      setClassId('');
      setStudentId('');
    }
  }, [yearId, isLocked]);

  useEffect(() => {
    if (!isLocked) {
      setStudentId('');
    }
  }, [classId, isLocked]);

  useEffect(() => {
    if (!occurredAt) {
      setOccurredAt(defaultDatetimeLocal());
    }
  }, [occurredAt]);

  useEffect(() => {
    if (!studentOptions.length) {
      setStudentId('');
      return;
    }
    setStudentId((prev) => {
      if (defaultStudentId && studentOptions.some((s) => s.id === defaultStudentId)) {
        return defaultStudentId;
      }
      if (prev && studentOptions.some((s) => s.id === prev)) {
        return prev;
      }
      return studentOptions[0]!.id;
    });
  }, [studentOptions, defaultStudentId]);

  const mutation = useMutation({
    mutationFn: (body: {
      academicYearId: string;
      termId: string;
      classRoomId: string;
      studentId: string;
      pointsDeducted: number;
      reason: string;
      occurredAt: string;
    }) => createConductDeductionApi(accessToken, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['marks-grid', variables.termId, variables.classRoomId] });
      void queryClient.invalidateQueries({ queryKey: ['marks-grid'] });
      void queryClient.invalidateQueries({ queryKey: ['all-marks-ledger'] });
      void queryClient.invalidateQueries({ queryKey: ['student-conduct-deductions'] });
      void queryClient.invalidateQueries({ queryKey: ['student-conduct-marks-summary'] });
      setReason('');
      setPoints('1');
      setOccurredAt(defaultDatetimeLocal());
      showToast({ type: 'success', title: 'Conduct deduction recorded' });
      onSuccess?.();
    },
    onError: (e: Error) => {
      showToast({ type: 'error', title: 'Could not record deduction', message: e.message });
    },
  });

  const submit = () => {
    const academicYearId = isLocked ? lockedContext!.academicYearId : yearId;
    const termIdVal = isLocked ? lockedContext!.termId : termId;
    const classRoomId = isLocked ? lockedContext!.classRoomId : classId;

    const pts = parseInt(points, 10);
    if (!academicYearId || !termIdVal || !classRoomId || !studentId || !occurredAt) {
      showToast({
        type: 'error',
        title: isLocked ? 'Select student and date' : 'Fill in year, term, class, student, and date',
      });
      return;
    }
    if (Number.isNaN(pts) || pts < 1) {
      showToast({ type: 'error', title: 'Enter a valid number of points' });
      return;
    }
    const reasonTrim = reason.trim();
    if (!reasonTrim) {
      showToast({ type: 'error', title: 'Reason is required' });
      return;
    }
    mutation.mutate({
      academicYearId,
      termId: termIdVal,
      classRoomId,
      studentId,
      pointsDeducted: pts,
      reason: reasonTrim,
      occurredAt: new Date(occurredAt).toISOString(),
    });
  };

  return (
    <div className={className}>
      {showHeading ? (
        <h2 id={titleId} className="text-lg font-bold text-slate-950">
          {title}
        </h2>
      ) : null}

      <div className={showHeading ? 'mt-4 grid gap-4 md:grid-cols-2' : 'grid gap-4 md:grid-cols-2'}>
        {!isLocked ? (
          <>
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Academic year
              <select
                value={yearId}
                onChange={(e) => setYearId(e.target.value)}
                disabled={yearsQuery.isPending}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
              >
                <option value="">
                  {yearsQuery.isPending ? 'Loading...' : 'Select year'}
                </option>
                {years.map((y: { id: string; name: string }) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Term
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                disabled={!yearId || termsQuery.isPending}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
              >
                <option value="">Select term</option>
                {terms.map((t: { id: string; name: string }) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Class
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={classesQuery.isPending}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
              >
                <option value="">
                  {classesQuery.isPending ? 'Loading...' : 'Select class'}
                </option>
                {classes.map((c: { id: string; code: string; name: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        <label className={`grid gap-1 text-sm font-medium text-slate-800 ${isLocked ? 'md:col-span-2' : ''}`}>
          Student
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={
              !studentOptions.length || (!isLocked && (!classId || scopeStudentsQuery.isPending))
            }
            className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
          >
            <option value="">
              {scopeStudentsQuery.isPending && !isLocked
                ? 'Loading students...'
                : !studentOptions.length && !isLocked && classId
                  ? 'No students in this class'
                  : 'Select student'}
            </option>
            {studentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.studentCode})
              </option>
            ))}
          </select>
        </label>
        {scopeStudentsQuery.isError && !isLocked ? (
          <div className="col-span-full text-xs text-red-600">
            Error loading students: {(scopeStudentsQuery.error as Error)?.message || 'Unknown error'}
          </div>
        ) : null}

        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Points to deduct
          <input
            type="number"
            min={1}
            max={1000}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm tabular-nums outline-none focus:border-brand-400"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Date / time
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      <label className="mt-4 grid gap-1 text-sm font-medium text-slate-800">
        Reason
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          placeholder="Required for the audit trail"
        />
      </label>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {showCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={submit}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save deduction'}
        </button>
      </div>
    </div>
  );
}
