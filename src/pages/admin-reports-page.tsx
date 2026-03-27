import { useQuery } from '@tanstack/react-query';
import { FileBarChart2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { hasPermission } from '../features/auth/auth-helpers';
import { conductFeatureEnabled } from '../features/conduct/feature';
import {
  getReportsAcademicByClassApi,
  getReportsAcademicClassApi,
  getReportsAcademicStudentApi,
  getReportsAcademicSubjectApi,
  getReportsAttendanceAbsenteeismApi,
  getReportsAttendanceByClassApi,
  getReportsAttendanceSchoolApi,
  getReportsAttendanceSummaryCardsApi,
  getReportsConductByClassApi,
  getReportsConductSchoolSummaryApi,
  getReportsConductStudentApi,
  getReportsTeachersActivityApi,
  getReportsTeachersAllocationApi,
  getReportsTeachersWorkloadApi,
  getReportsTimetableApi,
} from '../features/reports/reports.api';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
  listStaffMembersApi,
  listSubjectsApi,
  listTermsApi,
} from '../features/sprint1/sprint1.api';

function getTodayKigaliDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const value = formatter.format(new Date());
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

type MainTab = 'academic' | 'attendance' | 'teachers' | 'timetable' | 'conduct';

export function AdminReportsPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const canExams = hasPermission(auth.me, 'exams.read');
  const canAttendance = hasPermission(auth.me, 'attendance.read');
  const canCourses = hasPermission(auth.me, 'courses.read');
  const canTimetable = hasPermission(auth.me, 'timetable.read');
  const canConduct = hasPermission(auth.me, 'conduct.read') && conductFeatureEnabled;

  const canAccessReports =
    canExams ||
    canAttendance ||
    canCourses ||
    canTimetable ||
    canConduct;

  const [mainTab, setMainTab] = useState<MainTab>(() => {
    if (canExams) return 'academic';
    if (canAttendance) return 'attendance';
    if (canCourses) return 'teachers';
    if (canTimetable) return 'timetable';
    if (canConduct) return 'conduct';
    return 'academic';
  });

  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const [studentIdInput, setStudentIdInput] = useState('');
  const [classReportId, setClassReportId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjectClassFilter, setSubjectClassFilter] = useState('');

  const [attFrom, setAttFrom] = useState(() => {
    const t = new Date(`${getTodayKigaliDate()}T00:00:00.000Z`);
    t.setUTCDate(t.getUTCDate() - 30);
    return t.toISOString().slice(0, 10);
  });
  const [attTo, setAttTo] = useState(() => getTodayKigaliDate());
  const [minAbsent, setMinAbsent] = useState(3);

  const [ttClassFilter, setTtClassFilter] = useState('');
  const [ttTeacherFilter, setTtTeacherFilter] = useState('');
  const [ttDayFilter, setTtDayFilter] = useState<string>('');

  const [conductClassFilter, setConductClassFilter] = useState('');
  const [conductStatus, setConductStatus] = useState('');
  const [conductSeverity, setConductSeverity] = useState('');
  const [conductStudentId, setConductStudentId] = useState('');

  const yearsQuery = useQuery({
    queryKey: ['reports', 'years'],
    enabled: Boolean(token),
    queryFn: () => listAcademicYearsApi(token!),
  });

  const yearOptions = useMemo(() => {
    const rows = (Array.isArray(yearsQuery.data) ? yearsQuery.data : []) as Array<{ id: string; name: string }>;
    return rows.map((y) => ({ id: y.id, name: y.name }));
  }, [yearsQuery.data]);

  const termsQuery = useQuery({
    queryKey: ['reports', 'terms', academicYearId],
    enabled: Boolean(token && academicYearId),
    queryFn: () => listTermsApi(token!, { academicYearId }),
  });

  const termOptions = useMemo(() => {
    const rows = (Array.isArray(termsQuery.data) ? termsQuery.data : []) as Array<{
      id: string;
      name: string;
      sequence: number;
    }>;
    return [...rows].sort((a, b) => a.sequence - b.sequence);
  }, [termsQuery.data]);

  const classesQuery = useQuery({
    queryKey: ['reports', 'classes'],
    enabled: Boolean(token),
    queryFn: () => listClassRoomsApi(token!),
  });

  const staffQuery = useQuery({
    queryKey: ['reports', 'staff-teachers'],
    enabled: Boolean(token && canTimetable),
    queryFn: () => listStaffMembersApi(token!, { status: 'ACTIVE' }),
  });

  const teacherUserOptions = useMemo(() => {
    const rows = (Array.isArray(staffQuery.data) ? staffQuery.data : []) as Array<{
      id: string;
      firstName: string;
      lastName: string;
      roles: string[];
    }>;
    return rows.filter((r) => r.roles?.includes('TEACHER'));
  }, [staffQuery.data]);

  const classOptions = useMemo(() => {
    const rows = (Array.isArray(classesQuery.data) ? classesQuery.data : []) as Array<{
      id: string;
      code: string;
      name: string;
    }>;
    return rows.map((r) => ({
      id: r.id,
      label: `${r.code ?? ''}${r.code && r.name ? ' — ' : ''}${r.name ?? ''}`.trim(),
    }));
  }, [classesQuery.data]);

  const subjectsQuery = useQuery({
    queryKey: ['reports', 'subjects'],
    enabled: Boolean(token && canExams),
    queryFn: () => listSubjectsApi(token!),
  });

  const subjectOptions = useMemo(() => {
    const rows = (Array.isArray(subjectsQuery.data) ? subjectsQuery.data : []) as Array<{
      id: string;
      name: string;
      code: string;
    }>;
    return rows.map((s) => ({ id: s.id, label: `${s.code} — ${s.name}` }));
  }, [subjectsQuery.data]);

  useEffect(() => {
    if (!academicYearId && yearOptions.length > 0) {
      setAcademicYearId(yearOptions[0].id);
    }
  }, [academicYearId, yearOptions]);

  const byClassQuery = useQuery({
    queryKey: ['reports', 'academic', 'by-class', termId, classFilter, studentSearch],
    enabled: Boolean(token && canExams && termId),
    queryFn: () =>
      getReportsAcademicByClassApi(token!, {
        termId,
        classRoomId: classFilter || undefined,
        q: studentSearch.trim() || undefined,
      }),
  });

  const studentReportQuery = useQuery({
    queryKey: ['reports', 'academic', 'student', studentIdInput, termId],
    enabled: Boolean(
      token && canExams && termId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        studentIdInput.trim(),
      ),
    ),
    queryFn: () =>
      getReportsAcademicStudentApi(token!, studentIdInput.trim(), { termId }),
  });

  const classReportQuery = useQuery({
    queryKey: ['reports', 'academic', 'class', classReportId, termId],
    enabled: Boolean(token && canExams && termId && classReportId),
    queryFn: () => getReportsAcademicClassApi(token!, classReportId, { termId }),
  });

  const subjectReportQuery = useQuery({
    queryKey: ['reports', 'academic', 'subject', termId, subjectId, subjectClassFilter],
    enabled: Boolean(token && canExams && termId && subjectId),
    queryFn: () =>
      getReportsAcademicSubjectApi(token!, {
        termId,
        subjectId,
        classRoomId: subjectClassFilter || undefined,
      }),
  });

  const summaryCardsQuery = useQuery({
    queryKey: ['reports', 'attendance', 'summary-cards'],
    enabled: Boolean(token && canAttendance && mainTab === 'attendance'),
    queryFn: () => getReportsAttendanceSummaryCardsApi(token!),
  });

  const schoolAttQuery = useQuery({
    queryKey: ['reports', 'attendance', 'school', attFrom, attTo],
    enabled: Boolean(token && canAttendance && mainTab === 'attendance'),
    queryFn: () => getReportsAttendanceSchoolApi(token!, { from: attFrom, to: attTo }),
  });

  const byClassAttQuery = useQuery({
    queryKey: ['reports', 'attendance', 'by-class', attFrom, attTo],
    enabled: Boolean(token && canAttendance && mainTab === 'attendance'),
    queryFn: () => getReportsAttendanceByClassApi(token!, { from: attFrom, to: attTo }),
  });

  const absenteeismQuery = useQuery({
    queryKey: ['reports', 'attendance', 'absenteeism', attFrom, attTo, minAbsent],
    enabled: Boolean(token && canAttendance && mainTab === 'attendance'),
    queryFn: () =>
      getReportsAttendanceAbsenteeismApi(token!, {
        from: attFrom,
        to: attTo,
        minAbsent,
      }),
  });

  const teachersWorkloadQuery = useQuery({
    queryKey: ['reports', 'teachers', 'workload', academicYearId, termId],
    enabled: Boolean(token && canCourses && mainTab === 'teachers' && academicYearId),
    queryFn: () =>
      getReportsTeachersWorkloadApi(token!, {
        academicYearId,
        termId: termId || undefined,
      }),
  });

  const teachersAllocationQuery = useQuery({
    queryKey: ['reports', 'teachers', 'allocation', academicYearId],
    enabled: Boolean(token && canCourses && mainTab === 'teachers' && academicYearId),
    queryFn: () =>
      getReportsTeachersAllocationApi(token!, {
        academicYearId,
      }),
  });

  const teachersActivityQuery = useQuery({
    queryKey: ['reports', 'teachers', 'activity', attFrom, attTo],
    enabled: Boolean(
      token &&
        canCourses &&
        mainTab === 'teachers' &&
        (canExams || canAttendance),
    ),
    queryFn: () =>
      getReportsTeachersActivityApi(token!, {
        from: attFrom,
        to: attTo,
      }),
  });

  const timetableReportQuery = useQuery({
    queryKey: [
      'reports',
      'timetable',
      academicYearId,
      termId,
      ttClassFilter,
      ttTeacherFilter,
      ttDayFilter,
    ],
    enabled: Boolean(token && canTimetable && mainTab === 'timetable' && academicYearId),
    queryFn: () =>
      getReportsTimetableApi(token!, {
        academicYearId,
        termId: termId || undefined,
        classRoomId: ttClassFilter || undefined,
        teacherUserId: ttTeacherFilter || undefined,
        dayOfWeek: ttDayFilter ? Number(ttDayFilter) : undefined,
      }),
  });

  const conductSchoolQuery = useQuery({
    queryKey: [
      'reports',
      'conduct',
      'school',
      attFrom,
      attTo,
      conductClassFilter,
      conductStatus,
      conductSeverity,
    ],
    enabled: Boolean(token && canConduct && mainTab === 'conduct'),
    queryFn: () =>
      getReportsConductSchoolSummaryApi(token!, {
        from: attFrom,
        to: attTo,
        classRoomId: conductClassFilter || undefined,
        status: conductStatus || undefined,
        severity: conductSeverity || undefined,
      }),
  });

  const conductByClassQuery = useQuery({
    queryKey: [
      'reports',
      'conduct',
      'by-class',
      attFrom,
      attTo,
      conductClassFilter,
      conductStatus,
      conductSeverity,
    ],
    enabled: Boolean(token && canConduct && mainTab === 'conduct'),
    queryFn: () =>
      getReportsConductByClassApi(token!, {
        from: attFrom,
        to: attTo,
        classRoomId: conductClassFilter || undefined,
        status: conductStatus || undefined,
        severity: conductSeverity || undefined,
      }),
  });

  const conductStudentQuery = useQuery({
    queryKey: ['reports', 'conduct', 'student', conductStudentId, attFrom, attTo],
    enabled: Boolean(
      token &&
        canConduct &&
        mainTab === 'conduct' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conductStudentId.trim()),
    ),
    queryFn: () =>
      getReportsConductStudentApi(token!, conductStudentId.trim(), {
        from: attFrom,
        to: attTo,
      }),
  });

  if (!canAccessReports) {
    return (
      <EmptyState
        title="No report access"
        message="You need at least one of: exams, attendance, courses, timetable, or conduct permissions."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#173C7F]">
          <FileBarChart2 className="h-8 w-8" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">School reports</h1>
        </div>
        <p className="text-sm text-slate-600">
          Operational reports for your school: academics, attendance, teacher workload and allocation, timetable
          slots, and conduct — using the same data as the rest of the app.
        </p>
      </header>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {canExams ? (
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mainTab === 'academic' ? 'bg-[#173C7F] text-white' : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => setMainTab('academic')}
          >
            Academic
          </button>
        ) : null}
        {canAttendance ? (
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mainTab === 'attendance' ? 'bg-[#173C7F] text-white' : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => setMainTab('attendance')}
          >
            Attendance
          </button>
        ) : null}
        {canCourses ? (
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mainTab === 'teachers' ? 'bg-[#173C7F] text-white' : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => setMainTab('teachers')}
          >
            Teachers
          </button>
        ) : null}
        {canTimetable ? (
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mainTab === 'timetable' ? 'bg-[#173C7F] text-white' : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => setMainTab('timetable')}
          >
            Timetable
          </button>
        ) : null}
        {canConduct ? (
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mainTab === 'conduct' ? 'bg-[#173C7F] text-white' : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => setMainTab('conduct')}
          >
            Conduct
          </button>
        ) : null}
      </div>

      {mainTab === 'academic' && canExams ? (
        <div className="flex flex-col gap-6">
          <SectionCard title="Filters" subtitle="Pick a term, then load each report section you need.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Academic year</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={academicYearId}
                  onChange={(e) => {
                    setAcademicYearId(e.target.value);
                    setTermId('');
                  }}
                >
                  <option value="">Select year</option>
                  {yearOptions.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Term</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  disabled={!academicYearId}
                >
                  <option value="">Select term</option>
                  {termOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Class (optional)</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="">All classes</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Student search (optional)</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Name or student code"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Results by class"
            subtitle="Students ranked by total marks (CAT + exam per subject), with overall percentage and grade."
          >
            {!termId ? (
              <p className="text-sm text-slate-600">Select a term to load results.</p>
            ) : byClassQuery.isPending ? (
              <div className="grid gap-2" aria-busy>
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
              </div>
            ) : byClassQuery.isError ? (
              <StateView
                title="Could not load report"
                message={(byClassQuery.error as Error)?.message ?? 'Request failed'}
                action={
                  <button
                    type="button"
                    className="rounded-lg border border-[#173C7F] bg-[#173C7F] px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => void byClassQuery.refetch()}
                  >
                    Retry
                  </button>
                }
              />
            ) : !(byClassQuery.data as { classes?: unknown[] })?.classes?.length ? (
              <EmptyState title="No data" message="No classes or marks for this term." />
            ) : (
              <div className="overflow-x-auto">
                {(byClassQuery.data as { classes: Array<Record<string, unknown>> }).classes.map((block) => {
                  const cls = block.classRoom as { id: string; code?: string; name?: string };
                  const students = block.students as Array<{
                    student: {
                      id: string;
                      studentCode: string;
                      firstName: string;
                      lastName: string;
                    };
                    rank: number;
                    overall: { averagePercentage: number; grade: string };
                    gridTotal: number;
                  }>;
                  return (
                    <div key={cls.id} className="mb-8">
                      <h3 className="mb-2 text-lg font-semibold text-slate-800">
                        {cls.code} {cls.name}
                      </h3>
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left">
                            <th className="p-2">Rank</th>
                            <th className="p-2">Code</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Total marks</th>
                            <th className="p-2">Avg %</th>
                            <th className="p-2">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students?.map((row) => (
                            <tr key={row.student.id} className="border-b border-slate-100">
                              <td className="p-2">{row.rank}</td>
                              <td className="p-2 font-mono text-xs">{row.student.studentCode}</td>
                              <td className="p-2">
                                {row.student.firstName} {row.student.lastName}
                              </td>
                              <td className="p-2">{row.gridTotal}</td>
                              <td className="p-2">{row.overall.averagePercentage}</td>
                              <td className="p-2">{row.overall.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Student performance" subtitle="Enter the student UUID (from Students or URL).">
            <div className="flex flex-wrap gap-3">
              <input
                className="min-w-[280px] flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                placeholder="Student ID"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
              />
            </div>
            {studentReportQuery.isPending ? (
              <div className="mt-4 h-32 animate-pulse rounded-md bg-slate-100" />
            ) : studentReportQuery.isError ? (
              <StateView
                title="Could not load student report"
                message={(studentReportQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : studentReportQuery.data ? (
              <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-slate-50 p-4 text-xs">
                {JSON.stringify(studentReportQuery.data, null, 2)}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Enter a valid student ID and ensure a term is selected.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Class performance" subtitle="Summary statistics for one class.">
            <div className="flex flex-wrap gap-3">
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={classReportId}
                onChange={(e) => setClassReportId(e.target.value)}
              >
                <option value="">Select class</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {classReportQuery.isPending ? (
              <div className="mt-4 h-32 animate-pulse rounded-md bg-slate-100" />
            ) : classReportQuery.isError ? (
              <StateView
                title="Could not load class report"
                message={(classReportQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : classReportQuery.data ? (
              <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-slate-50 p-4 text-xs">
                {JSON.stringify(classReportQuery.data, null, 2)}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Select a class and term.</p>
            )}
          </SectionCard>

          <SectionCard title="Subject performance" subtitle="Per-student results in one subject across classes.">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Select subject</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={subjectClassFilter}
                onChange={(e) => setSubjectClassFilter(e.target.value)}
              >
                <option value="">All classes</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {subjectReportQuery.isPending ? (
              <div className="mt-4 h-32 animate-pulse rounded-md bg-slate-100" />
            ) : subjectReportQuery.isError ? (
              <StateView
                title="Could not load subject report"
                message={(subjectReportQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : subjectReportQuery.data ? (
              <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-slate-50 p-4 text-xs">
                {JSON.stringify(subjectReportQuery.data, null, 2)}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Select subject and term.</p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {mainTab === 'attendance' && canAttendance ? (
        <div className="flex flex-col gap-6">
          <SectionCard title="Summary" subtitle="Today and week-to-date from your attendance records.">
            {summaryCardsQuery.isPending ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : summaryCardsQuery.isError ? (
              <StateView
                title="Could not load attendance summary"
                message={(summaryCardsQuery.error as Error)?.message ?? 'Request failed'}
                action={
                  <button
                    type="button"
                    className="rounded-lg border border-[#173C7F] bg-[#173C7F] px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => void summaryCardsQuery.refetch()}
                  >
                    Retry
                  </button>
                }
              />
            ) : summaryCardsQuery.data ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ['Today — present', (summaryCardsQuery.data as { today: { present: number } }).today.present],
                    ['Today — absent', (summaryCardsQuery.data as { today: { absent: number } }).today.absent],
                    ['Today — late', (summaryCardsQuery.data as { today: { late: number } }).today.late],
                    ['Today — rate %', (summaryCardsQuery.data as { today: { ratePercent: number } }).today.ratePercent],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">{val}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Date range"
            subtitle="Used for school-wide, by-class, and absenteeism reports."
          >
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm">
                From
                <input
                  type="date"
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={attFrom}
                  onChange={(e) => setAttFrom(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                To
                <input
                  type="date"
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={attTo}
                  onChange={(e) => setAttTo(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Min absent days (absenteeism)
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="w-28 rounded-md border border-slate-300 px-3 py-2"
                  value={minAbsent}
                  onChange={(e) => setMinAbsent(Number(e.target.value) || 3)}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard title="School attendance (range)">
            {schoolAttQuery.isPending ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : schoolAttQuery.isError ? (
              <StateView
                title="Could not load school attendance"
                message={(schoolAttQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : schoolAttQuery.data ? (
              <pre className="max-h-48 overflow-auto rounded-md bg-slate-50 p-4 text-xs">
                {JSON.stringify(schoolAttQuery.data, null, 2)}
              </pre>
            ) : null}
          </SectionCard>

          <SectionCard title="Attendance by class">
            {byClassAttQuery.isPending ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : byClassAttQuery.isError ? (
              <StateView
                title="Could not load class attendance"
                message={(byClassAttQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : byClassAttQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="p-2">Class</th>
                      <th className="p-2">Records</th>
                      <th className="p-2">Present</th>
                      <th className="p-2">Absent</th>
                      <th className="p-2">Late</th>
                      <th className="p-2">Rate %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (byClassAttQuery.data as { classes: Array<Record<string, unknown>> }).classes ?? []
                    ).map((row) => {
                      const cr = row.classRoom as { id: string; code: string; name: string };
                      return (
                        <tr key={cr.id} className="border-b border-slate-100">
                          <td className="p-2">
                            {cr.code} {cr.name}
                          </td>
                          <td className="p-2">{row.records as number}</td>
                          <td className="p-2">{row.present as number}</td>
                          <td className="p-2">{row.absent as number}</td>
                          <td className="p-2">{row.late as number}</td>
                          <td className="p-2">{row.ratePercent as number}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Absenteeism (repeat absences)">
            {absenteeismQuery.isPending ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : absenteeismQuery.isError ? (
              <StateView
                title="Could not load absenteeism"
                message={(absenteeismQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : absenteeismQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="p-2">Student</th>
                      <th className="p-2">Class</th>
                      <th className="p-2">Absent days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (absenteeismQuery.data as { students: Array<Record<string, unknown>> }).students ?? []
                    ).map((row) => {
                      const st = row.student as {
                        id: string;
                        studentCode: string;
                        firstName: string;
                        lastName: string;
                      };
                      const cr = row.classRoom as { code: string; name: string };
                      return (
                        <tr key={st.id} className="border-b border-slate-100">
                          <td className="p-2">
                            {st.firstName} {st.lastName}{' '}
                            <span className="font-mono text-xs text-slate-500">({st.studentCode})</span>
                          </td>
                          <td className="p-2">
                            {cr.code} {cr.name}
                          </td>
                          <td className="p-2">{row.absentDays as number}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Student history">
            <p className="text-sm text-slate-600">
              Use the{' '}
              <a className="text-[#173C7F] underline" href="/admin/attendance">
                Attendance
              </a>{' '}
              page to open a student and view their full history for a date range.
            </p>
          </SectionCard>
        </div>
      ) : null}

      {mainTab === 'teachers' && canCourses ? (
        <div className="flex flex-col gap-6">
          <SectionCard
            title="Filters"
            subtitle="Academic year and term control timetable hours in workload. Activity uses the attendance date range above when you switch to the Attendance tab, or the same range below if aligned."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Academic year</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={academicYearId}
                  onChange={(e) => {
                    setAcademicYearId(e.target.value);
                    setTermId('');
                  }}
                >
                  <option value="">Select year</option>
                  {yearOptions.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Term (for timetable hours)</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  disabled={!academicYearId}
                >
                  <option value="">All terms (timetable totals)</option>
                  {termOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Teacher workload"
            subtitle="Courses, classes, subjects, and weekly teaching time from saved timetable slots."
          >
            {teachersWorkloadQuery.isPending ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : teachersWorkloadQuery.isError ? (
              <StateView
                title="Could not load workload"
                message={(teachersWorkloadQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : teachersWorkloadQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="p-2">Teacher</th>
                      <th className="p-2">Courses</th>
                      <th className="p-2">Classes</th>
                      <th className="p-2">Subjects</th>
                      <th className="p-2">Slots</th>
                      <th className="p-2">Hours (wk)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (teachersWorkloadQuery.data as { teachers: Array<Record<string, unknown>> }).teachers ??
                      []
                    ).map((row) => {
                      const t = row.teacher as {
                        id: string;
                        firstName: string;
                        lastName: string;
                      };
                      return (
                        <tr key={t.id} className="border-b border-slate-100">
                          <td className="p-2">
                            {t.firstName} {t.lastName}
                          </td>
                          <td className="p-2">{row.coursesCount as number}</td>
                          <td className="p-2">{row.distinctClasses as number}</td>
                          <td className="p-2">{row.distinctSubjects as number}</td>
                          <td className="p-2">{row.timetableSlotsCount as number}</td>
                          <td className="p-2">{row.weeklyTeachingHours as number}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Select an academic year.</p>
            )}
          </SectionCard>

          <SectionCard title="Class allocation" subtitle="Teacher → class → subject from active courses.">
            {teachersAllocationQuery.isPending ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : teachersAllocationQuery.isError ? (
              <StateView
                title="Could not load allocation"
                message={(teachersAllocationQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : teachersAllocationQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="p-2">Teacher</th>
                      <th className="p-2">Class</th>
                      <th className="p-2">Subject</th>
                      <th className="p-2">Course</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (teachersAllocationQuery.data as { rows: Array<Record<string, unknown>> }).rows ?? []
                    ).map((row) => {
                      const t = row.teacher as { firstName: string; lastName: string };
                      const cr = row.classRoom as { code: string; name: string };
                      const sub = row.subject as { code: string; name: string } | null;
                      return (
                        <tr key={String(row.courseId)} className="border-b border-slate-100">
                          <td className="p-2">
                            {t.firstName} {t.lastName}
                          </td>
                          <td className="p-2">
                            {cr.code} {cr.name}
                          </td>
                          <td className="p-2">{sub ? `${sub.code} ${sub.name}` : '—'}</td>
                          <td className="p-2">{String(row.courseTitle)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Select an academic year.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Operational activity"
            subtitle="Counts from attendance rows marked and exam marks updated in the date range (same as Attendance tab range)."
          >
            {!canExams && !canAttendance ? (
              <p className="text-sm text-slate-600">
                You need exams or attendance permission to load activity metrics.
              </p>
            ) : teachersActivityQuery.isPending ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : teachersActivityQuery.isError ? (
              <StateView
                title="Could not load activity"
                message={(teachersActivityQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : teachersActivityQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="p-2">Staff</th>
                      <th className="p-2">Attendance rows</th>
                      <th className="p-2">Exam marks updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (teachersActivityQuery.data as { teachers: Array<Record<string, unknown>> })
                        .teachers ?? []
                    ).map((row) => (
                      <tr key={String(row.userId)} className="border-b border-slate-100">
                        <td className="p-2">
                          {String(row.firstName)} {String(row.lastName)}
                        </td>
                        <td className="p-2">{row.attendanceRecordsSaved as number}</td>
                        <td className="p-2">{row.examMarksUpdated as number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">
                  {(teachersActivityQuery.data as { metricsNote?: string }).metricsNote}
                </p>
              </div>
            ) : null}
          </SectionCard>
        </div>
      ) : null}

      {mainTab === 'timetable' && canTimetable ? (
        <div className="flex flex-col gap-6">
          <SectionCard
            title="Timetable report"
            subtitle="Read-only view of saved slots (same source as Timetable). Filter by class, teacher, or weekday."
          >
            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                Academic year
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={academicYearId}
                  onChange={(e) => {
                    setAcademicYearId(e.target.value);
                    setTermId('');
                  }}
                >
                  <option value="">Select year</option>
                  {yearOptions.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Term
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  disabled={!academicYearId}
                >
                  <option value="">Any / all</option>
                  {termOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Class
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={ttClassFilter}
                  onChange={(e) => setTtClassFilter(e.target.value)}
                >
                  <option value="">All classes</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Teacher
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={ttTeacherFilter}
                  onChange={(e) => setTtTeacherFilter(e.target.value)}
                >
                  <option value="">All teachers</option>
                  {teacherUserOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Weekday
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={ttDayFilter}
                  onChange={(e) => setTtDayFilter(e.target.value)}
                >
                  <option value="">All days</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                </select>
              </label>
            </div>
            {timetableReportQuery.isPending ? (
              <div className="h-32 animate-pulse rounded-md bg-slate-100" />
            ) : timetableReportQuery.isError ? (
              <StateView
                title="Could not load timetable"
                message={(timetableReportQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : timetableReportQuery.data ? (
              <div className="overflow-x-auto">
                <p className="mb-2 text-xs text-slate-500">
                  {(timetableReportQuery.data as { note?: string }).note} ·{' '}
                  {(timetableReportQuery.data as { slotCount?: number }).slotCount} slot(s)
                </p>
                <table className="w-full min-w-[800px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="p-2">Day</th>
                      <th className="p-2">Period</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Class</th>
                      <th className="p-2">Subject</th>
                      <th className="p-2">Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (timetableReportQuery.data as { slots: Array<Record<string, unknown>> }).slots ?? []
                    ).map((slot) => {
                      const cr = slot.classRoom as { code: string; name: string };
                      const course = slot.course as {
                        title: string;
                        subject: { code: string; name: string } | null;
                        teacherUser: { firstName: string; lastName: string };
                      };
                      const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                      return (
                        <tr key={String(slot.id)} className="border-b border-slate-100">
                          <td className="p-2">{days[slot.dayOfWeek as number]}</td>
                          <td className="p-2">{slot.periodNumber as number}</td>
                          <td className="p-2">
                            {String(slot.startTime)}–{String(slot.endTime)}
                          </td>
                          <td className="p-2">
                            {cr.code} {cr.name}
                          </td>
                          <td className="p-2">
                            {course.subject ? `${course.subject.code} ${course.subject.name}` : course.title}
                          </td>
                          <td className="p-2">
                            {course.teacherUser.firstName} {course.teacherUser.lastName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Select an academic year.</p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {mainTab === 'conduct' && canConduct ? (
        <div className="flex flex-col gap-6">
          <SectionCard title="Filters" subtitle="Incident date is based on occurred-at time.">
            <div className="mb-4 flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm">
                From
                <input
                  type="date"
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={attFrom}
                  onChange={(e) => setAttFrom(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                To
                <input
                  type="date"
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={attTo}
                  onChange={(e) => setAttTo(e.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Class
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={conductClassFilter}
                  onChange={(e) => setConductClassFilter(e.target.value)}
                >
                  <option value="">All classes</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Status
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={conductStatus}
                  onChange={(e) => setConductStatus(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="OPEN">Open</option>
                  <option value="UNDER_REVIEW">Under review</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Severity
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={conductSeverity}
                  onChange={(e) => setConductSeverity(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="LOW">Low</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
            </div>
          </SectionCard>

          <SectionCard title="School summary">
            {conductSchoolQuery.isPending ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : conductSchoolQuery.isError ? (
              <StateView
                title="Could not load conduct summary"
                message={(conductSchoolQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : conductSchoolQuery.data ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">Total incidents</p>
                  <p className="text-2xl font-semibold">
                    {(conductSchoolQuery.data as { totalIncidents: number }).totalIncidents}
                  </p>
                </div>
                <pre className="max-h-48 overflow-auto rounded-md bg-slate-50 p-3 text-xs">
                  {JSON.stringify(conductSchoolQuery.data, null, 2)}
                </pre>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="By class">
            {conductByClassQuery.isPending ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : conductByClassQuery.isError ? (
              <StateView
                title="Could not load report"
                message={(conductByClassQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : conductByClassQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="p-2">Class</th>
                      <th className="p-2">Incidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (conductByClassQuery.data as { classes: Array<Record<string, unknown>> }).classes ??
                      []
                    ).map((row) => {
                      const cr = row.classRoom as { code: string; name: string };
                      return (
                        <tr
                          key={(row.classRoom as { id?: string }).id ?? cr.code}
                          className="border-b border-slate-100"
                        >
                          <td className="p-2">
                            {cr.code} {cr.name}
                          </td>
                          <td className="p-2">{row.incidentCount as number}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Student conduct history" subtitle="Enter a student UUID.">
            <input
              className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
              placeholder="Student ID"
              value={conductStudentId}
              onChange={(e) => setConductStudentId(e.target.value)}
            />
            {conductStudentQuery.isPending ? (
              <div className="mt-4 h-32 animate-pulse rounded-md bg-slate-100" />
            ) : conductStudentQuery.isError ? (
              <StateView
                title="Could not load student conduct"
                message={(conductStudentQuery.error as Error)?.message ?? 'Request failed'}
              />
            ) : conductStudentQuery.data ? (
              <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-slate-50 p-4 text-xs">
                {JSON.stringify(conductStudentQuery.data, null, 2)}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Enter a valid student ID.</p>
            )}
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
