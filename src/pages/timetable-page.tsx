import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Pencil, Save, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { listCoursesApi } from '../features/sprint4/lms.api';
import {
  bulkUpsertTimetableSlotsApi,
  listTimetableSlotsApi,
  TimetableSlot,
} from '../features/timetable/timetable.api';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
  listTermsApi,
} from '../features/sprint1/sprint1.api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DEFAULT_PERIODS = [
  { num: 1, start: '8:00', end: '8:45' },
  { num: 2, start: '8:45', end: '9:30' },
  { num: 3, start: '9:30', end: '10:15' },
  { num: 4, start: '10:15', end: '11:00' },
  { num: 5, start: '11:00', end: '11:45' },
  { num: 6, start: '11:45', end: '12:30' },
  { num: 7, start: '12:30', end: '13:15' },
  { num: 8, start: '13:15', end: '14:00' },
];

export function TimetablePage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  const [teacherUserId, setTeacherUserId] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editGrid, setEditGrid] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'class' | 'teacher' | 'school'>('class');

  const isTeacher = auth.me?.roles.includes('TEACHER') ?? false;
  const isAdmin =
    (auth.me?.roles.includes('SCHOOL_ADMIN') ||
      auth.me?.roles.includes('SUPER_ADMIN')) ??
    false;

  useEffect(() => {
    if (isTeacher && !isAdmin) {
      setViewMode('teacher');
    }
  }, [isTeacher, isAdmin]);

  const canManage = (auth.me?.permissions.includes('timetable.manage') && isAdmin) ?? false;

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const termsQuery = useQuery({
    queryKey: ['terms', academicYearId],
    queryFn: () =>
      listTermsApi(auth.accessToken!, {
        academicYearId: academicYearId || undefined,
      }),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const slotsQuery = useQuery({
    queryKey: ['timetable', academicYearId, termId, classRoomId, teacherUserId, viewMode],
    enabled: Boolean(academicYearId && (viewMode !== 'class' || classRoomId)),
    queryFn: () =>
      listTimetableSlotsApi(auth.accessToken!, {
        academicYearId,
        termId: termId || undefined,
        classRoomId:
          viewMode === 'class'
            ? classRoomId
            : viewMode === 'school'
              ? classRoomId || undefined
              : undefined,
        teacherUserId:
          viewMode === 'teacher'
            ? auth.me?.id
            : viewMode === 'school'
              ? teacherUserId || undefined
              : undefined,
      }),
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', academicYearId, classRoomId],
    enabled: Boolean(academicYearId && classRoomId && isEditMode),
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        academicYearId,
        classId: classRoomId,
        pageSize: 100,
      }),
  });

  const teacherOptionsQuery = useQuery({
    queryKey: ['timetable-teachers', academicYearId],
    enabled: Boolean(academicYearId),
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        academicYearId,
        pageSize: 200,
      }),
  });

  const years = (yearsQuery.data ?? []) as Array<{ id: string; name: string }>;
  const terms = (termsQuery.data ?? []) as Array<{ id: string; name: string; academicYearId?: string }>;
  const classes = (classesQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;
  const slots = slotsQuery.data?.slots ?? [];
  const courses = (coursesQuery.data?.items ?? []) as Array<{
    id: string;
    title: string;
    subject?: { name: string } | null;
  }>;
  const teacherOptions = Array.from(
    new Map(
      (((teacherOptionsQuery.data?.items as Array<{ teacher: { id: string; firstName: string; lastName: string } }> | undefined) ?? []).map((c) => [
        c.teacher.id,
        c.teacher,
      ])),
    ).values(),
  );

  const effectiveTermId = termId || terms[0]?.id;

  const saveMutation = useMutation({
    mutationFn: () => {
      const slots = Object.entries(editGrid)
        .filter(([, courseId]) => courseId)
        .map(([key, courseId]) => {
          const [day, period] = key.split('-').map(Number);
          const p = DEFAULT_PERIODS.find((x) => x.num === period)!;
          return {
            courseId,
            dayOfWeek: day,
            periodNumber: period,
            startTime: p.start,
            endTime: p.end,
          };
        });
      return bulkUpsertTimetableSlotsApi(auth.accessToken!, {
        academicYearId,
        termId: effectiveTermId!,
        classRoomId,
        slots,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timetable'] });
      setIsEditMode(false);
      showToast({ type: 'success', title: 'Timetable saved' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not save timetable',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const grid = buildTimetableGrid(slots);

  const initEditGrid = useCallback(() => {
    const next: Record<string, string> = {};
    for (const s of slots) {
      next[`${s.dayOfWeek}-${s.periodNumber}`] = s.courseId;
    }
    setEditGrid(next);
  }, [slots]);

  useEffect(() => {
    if (academicYearId && terms.length === 1 && !termId) {
      setTermId(terms[0].id);
    }
  }, [academicYearId, terms, termId]);

  const canEdit =
    canManage &&
    Boolean(academicYearId && classRoomId) &&
    terms.length > 0 &&
    (termId || terms.length === 1);

  const handleStartEdit = () => {
    initEditGrid();
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSave = () => {
    if (!effectiveTermId) {
      showToast({
        type: 'error',
        title: 'Term required',
        message: 'Select a term to save the timetable.',
      });
      return;
    }
    saveMutation.mutate();
  };

  const setEditCell = (day: number, period: number, courseId: string) => {
    const key = `${day}-${period}`;
    setEditGrid((prev) =>
      courseId ? { ...prev, [key]: courseId } : (() => {
        const { [key]: _, ...rest } = prev;
        return rest;
      })(),
    );
  };

  return (
    <SectionCard
      title="Timetable"
      subtitle="View and manage class timetable by academic year, term, and class."
      action={
        <div className="flex gap-2">
          {isAdmin && (
            <div className="flex rounded-lg border border-brand-200 p-1">
              <button
                type="button"
                onClick={() => setViewMode('class')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'class'
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 hover:bg-brand-50'
                }`}
              >
                Class View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('teacher')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'teacher'
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 hover:bg-brand-50'
                }`}
              >
                My Schedule
              </button>
              <button
                type="button"
                onClick={() => setViewMode('school')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'school'
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 hover:bg-brand-50'
                }`}
              >
                School View
              </button>
            </div>
          )}
          {canEdit && !isEditMode && viewMode === 'class' ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              <Pencil className="h-4 w-4" />
              Edit timetable
            </button>
          ) : isEditMode ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr]">
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Academic Year
          <select
            value={academicYearId}
            onChange={(e) => {
              setAcademicYearId(e.target.value);
              setTermId('');
            }}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">Select year</option>
            {years.map((y: { id: string; name: string }) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Term
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">All terms</option>
            {terms.map((t: { id: string; name: string }) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {(viewMode === 'class' || viewMode === 'school') && (
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            {viewMode === 'class' ? 'Class' : 'Class (optional)'}
            <select
              value={classRoomId}
              onChange={(e) => setClassRoomId(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            >
              <option value="">{viewMode === 'class' ? 'Select class' : 'All classes'}</option>
              {classes.map((c: { id: string; code: string; name: string }) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {viewMode === 'school' && (
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Teacher (optional)
            <select
              value={teacherUserId}
              onChange={(e) => setTeacherUserId(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            >
              <option value="">All teachers</option>
              {teacherOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {slotsQuery.isPending &&
      academicYearId &&
      (viewMode === 'teacher' || classRoomId) ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Calendar className="h-6 w-6 animate-pulse" />
          <span>Loading timetable...</span>
        </div>
      ) : null}

      {slotsQuery.isError ? (
        <StateView
          title="Could not load timetable"
          message="Retry after checking your connection."
          action={
            <button
              type="button"
              onClick={() => void slotsQuery.refetch()}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!slotsQuery.isPending &&
      !slotsQuery.isError &&
      (!academicYearId || (viewMode === 'class' && !classRoomId)) ? (
        <EmptyState
          message={
            viewMode === 'class'
              ? 'Select academic year and class to view timetable.'
              : 'Select academic year to view your timetable.'
          }
        />
      ) : null}

      {!slotsQuery.isPending &&
      !slotsQuery.isError &&
      academicYearId &&
      (classRoomId || viewMode !== 'class') &&
      !isEditMode &&
      grid.length === 0 ? (
        <EmptyState
          message={
            viewMode === 'class'
              ? canEdit
                ? 'No timetable slots yet. Click "Edit timetable" to create one.'
                : 'No timetable slots configured for this class.'
              : 'You have no timetable entries for the selected period.'
          }
        />
      ) : null}

      {isEditMode && academicYearId && classRoomId ? (
        <div className="mb-4 space-y-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Select a course for each slot. Leave empty to clear. Courses must
            exist for this class and academic year.
          </div>
          {!coursesQuery.isPending && courses.length === 0 ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              No courses found for this class and academic year. Create courses
              first in <strong>Courses & Subjects</strong>.
            </div>
          ) : null}
          {terms.length > 1 && !termId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Select a term above to save the timetable.
            </div>
          ) : null}
        </div>
      ) : null}

      {((!slotsQuery.isPending && !slotsQuery.isError && grid.length > 0) ||
        (isEditMode && academicYearId && classRoomId)) ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-brand-50/50">
                <th className="px-2 py-2 font-semibold text-slate-700">
                  Period
                </th>
                {DAYS.map((d) => (
                  <th key={d} className="px-2 py-2 font-semibold text-slate-700">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isEditMode
                ? DEFAULT_PERIODS.map((p) => (
                    <tr key={p.num} className="border-b border-brand-50">
                      <td className="px-2 py-2 font-medium text-slate-600">
                        P{p.num}
                      </td>
                      {[1, 2, 3, 4, 5].map((day) => (
                        <td
                          key={day}
                          className="min-w-[140px] border-l border-brand-50 px-2 py-2 align-top"
                        >
                          <select
                            value={editGrid[`${day}-${p.num}`] ?? ''}
                            onChange={(e) =>
                              setEditCell(day, p.num, e.target.value)
                            }
                            className="h-9 w-full rounded-lg border border-brand-200 px-2 text-sm outline-none focus:border-brand-400"
                          >
                            <option value="">—</option>
                            {courses.map(
                              (c: {
                                id: string;
                                title: string;
                                subject?: { name: string } | null;
                              }) => (
                                <option key={c.id} value={c.id}>
                                  {c.title}
                                  {c.subject?.name
                                    ? ` (${c.subject.name})`
                                    : ''}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))
                : grid.map((row) => (
                    <tr key={row.period} className="border-b border-brand-50">
                      <td className="px-2 py-2 font-medium text-slate-600">
                        P{row.period}
                      </td>
                      {DAYS.map((_, dayIdx) => {
                        const slot = row.days[dayIdx];
                        return (
                          <td
                            key={dayIdx}
                            className="min-w-[120px] max-w-[180px] border-l border-brand-50 px-2 py-2 align-top"
                          >
                            {slot ? (
                              <div className="rounded-lg border border-brand-100 bg-brand-50/30 p-2">
                                <p className="font-semibold text-slate-800">
                                  {slot.course.title}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {slot.course.subject?.name ?? '—'}
                                </p>
                                {viewMode === 'teacher' && (
                                  <p className="mt-1 text-xs font-medium text-brand-600">
                                    {slot.classRoom.name}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-slate-500">
                                  {slot.startTime}–{slot.endTime}
                                </p>
                                {viewMode === 'class' && (
                                  <p className="text-xs text-slate-500">
                                    {slot.course.teacherUser.firstName}{' '}
                                    {slot.course.teacherUser.lastName}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!slotsQuery.isPending && !slotsQuery.isError && viewMode === 'school' && slots.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-brand-50/50">
                <th className="px-3 py-2 font-semibold text-slate-700">Day</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Period</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Time</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Class</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Course / Subject</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id} className="border-b border-brand-50">
                  <td className="px-3 py-2 text-slate-700">{DAYS[slot.dayOfWeek - 1] ?? slot.dayOfWeek}</td>
                  <td className="px-3 py-2 text-slate-700">P{slot.periodNumber}</td>
                  <td className="px-3 py-2 text-slate-700">{slot.startTime}-{slot.endTime}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {slot.classRoom.code} - {slot.classRoom.name}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {slot.course.title}
                    {slot.course.subject?.name ? ` (${slot.course.subject.name})` : ''}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {slot.course.teacherUser.firstName} {slot.course.teacherUser.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}

function buildTimetableGrid(slots: TimetableSlot[]) {
  const periodSet = new Set(slots.map((s) => s.periodNumber));
  const periods = [...periodSet].sort((a, b) => a - b);
  if (periods.length === 0) return [];

  const slotMap = new Map<string, TimetableSlot>();
  for (const s of slots) {
    slotMap.set(`${s.dayOfWeek}-${s.periodNumber}`, s);
  }

  return periods.map((period) => ({
    period,
    days: [1, 2, 3, 4, 5].map((day) => slotMap.get(`${day}-${period}`) ?? null),
  }));
}
