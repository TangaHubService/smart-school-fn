import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileBarChart2,
  Home,
  Megaphone,
  UserSquare2,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { StateView } from '../components/state-view';
import { getStoredAcademicYearId } from './student-academic-year-select-page';
import { useAuth } from '../features/auth/auth.context';
import {
  getStudentDashboardApi,
  type StudentDashboardData,
} from '../features/dashboard/dashboard.api';
import { useQuery } from '@tanstack/react-query';

const STUDENT_QUICK_ACTIONS: DashboardQuickActionItem[] = [
  {
    label: 'My Courses',
    description: 'Open your lessons and course materials.',
    icon: BookOpen,
    to: '/student/courses',
  },
  {
    label: 'Assessments',
    description: 'Review available tests and assessments.',
    icon: BadgeCheck,
    to: '/student/assessments',
  },
  {
    label: 'Report Cards',
    description: 'See your latest academic reports.',
    icon: FileBarChart2,
    to: '/student/report-cards',
  },
  {
    label: 'Assignments',
    description: 'Open submitted and pending assignments.',
    icon: ClipboardCheck,
    to: '/student/assignments',
  },
];

export function StudentDashboardPage() {
  const auth = useAuth();
  const academicYearId = getStoredAcademicYearId();

  if (!academicYearId) {
    return <Navigate to="/student/academic-year" replace />;
  }

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'student'],
    enabled: Boolean(auth.accessToken && academicYearId),
    queryFn: () => getStudentDashboardApi(auth.accessToken!),
  });

  if (isError) {
    return (
      <StateView
        title="Could not load dashboard"
        message="Retry to load your dashboard data."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="min-w-0 text-2xl font-bold text-slate-900">
            Student Dashboard
          </h1>
          <DashboardQuickActionsDropdown actions={STUDENT_QUICK_ACTIONS} />
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <Home className="h-5 w-5" />
          <span className="font-medium">
            {data.school.displayName}
            {data.school.city ? `, ${data.school.city}` : ''}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetricCard
          icon={UserSquare2}
          label="My Courses"
          value={data.metrics.myCourses}
          color="green"
          to="/student/courses"
        />
        <StudentMetricCard
          icon={ClipboardCheck}
          label="Submitted assignments"
          value={data.metrics.assignmentsSubmitted}
          color="blue"
          to="/student/assignments"
        />
        <StudentMetricCard
          icon={BadgeCheck}
          label="Assessments"
          value={data.metrics.myAssessments}
          color="orange"
          to="/student/assessments"
        />
        <StudentMetricCard
          icon={FileBarChart2}
          label="Report Cards"
          value={data.metrics.reportCards}
          color="green"
          to="/student/report-cards"
        />
      </div>

      {data.conductOpen != null && data.conductOpen > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Conduct follow-up</p>
            <p className="text-sm text-amber-900/90">
              You have {data.conductOpen} open conduct record
              {data.conductOpen === 1 ? '' : 's'}. View details on your conduct page.
            </p>
            <Link
              to="/student/conduct"
              className="mt-1 inline-block text-sm font-semibold text-amber-900 underline"
            >
              Open conduct
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <StudentUpcomingExamsCard data={data} />
        <StudentLatestReportsCard data={data} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <StudentAnnouncementsCard data={data} />
        <StudentAttendanceCard data={data} />
      </div>
    </section>
  );
}

function StudentMetricCard({
  icon: Icon,
  label,
  value,
  color,
  to,
}: {
  icon: typeof UserSquare2;
  label: string;
  value: number;
  color: string;
  to: string;
}) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <Link
      to={to}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${colorClasses[color] ?? 'bg-slate-100 text-slate-600'}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </Link>
  );
}

function StudentUpcomingExamsCard({ data }: { data: StudentDashboardData }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Scheduled exams</h2>
        <p className="mt-1 text-sm text-slate-500">
          Exam dates for your enrolled classes. Online tests are under Assessments.
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {data.upcomingExams.length ? (
          data.upcomingExams.map((exam) => (
            <div
              key={exam.id}
              className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{exam.title}</p>
                  <p className="text-xs text-slate-500">
                    {exam.subjectName} · {exam.classLabel}
                  </p>
                  <p className="text-sm text-slate-500">{exam.relativeDate}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-medium text-slate-600 sm:text-right">{exam.time}</p>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            No scheduled exams in your classes yet
          </p>
        )}
      </div>
      <div className="mt-4 text-right">
        <Link
          to="/student/exam-schedule"
          className="text-sm font-semibold text-brand-500 hover:underline"
        >
          Full exam schedule
        </Link>
      </div>
    </section>
  );
}

function StudentAnnouncementsCard({ data }: { data: StudentDashboardData }) {
  const items = data.recentAnnouncements ?? [];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900">Announcements</h2>
        </div>
        <Link to="/student/announcements" className="text-sm font-semibold text-brand-500">
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((a) => (
            <Link
              key={a.id}
              to="/student/announcements"
              className="block rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:bg-slate-100"
            >
              <p className="font-semibold text-slate-900">{a.title}</p>
              {a.publishedAt && (
                <p className="text-xs text-slate-500">
                  {new Date(a.publishedAt).toLocaleDateString()}
                </p>
              )}
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.excerpt}</p>
            </Link>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">No recent announcements</p>
        )}
      </div>
    </section>
  );
}

function StudentAttendanceCard({ data }: { data: StudentDashboardData }) {
  const w = data.attendanceWeek;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-slate-500" />
        <h2 className="text-lg font-bold text-slate-900">Attendance (last 7 days)</h2>
      </div>
      {!w ? (
        <p className="mt-4 text-sm text-slate-500">
          No attendance marked for you in the last week.
        </p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
            <dt className="text-xs text-slate-500">Present</dt>
            <dd className="text-lg font-bold text-slate-900">{w.present}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
            <dt className="text-xs text-slate-500">Absent</dt>
            <dd className="text-lg font-bold text-slate-900">{w.absent}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
            <dt className="text-xs text-slate-500">Late</dt>
            <dd className="text-lg font-bold text-slate-900">{w.late}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
            <dt className="text-xs text-slate-500">Excused</dt>
            <dd className="text-lg font-bold text-slate-900">{w.excused}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function StudentLatestReportsCard({ data }: { data: StudentDashboardData }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Latest Reports</h2>
        <Link to="/student/report-cards" className="text-sm font-semibold text-brand-500">
          View All &gt;
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.latestReports.map((report) => (
          <Link
            key={report.id}
            to={
              report.id === 'report-cards'
                ? '/student/report-cards'
                : report.id === 'assignments'
                  ? '/student/courses'
                  : '/student/assessments'
            }
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:bg-slate-100"
          >
            <div className="flex items-center gap-3">
              <FileBarChart2 className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">{report.name}</p>
                <p className="text-lg font-bold text-slate-900">
                  {typeof report.value === 'number'
                    ? report.value.toLocaleString()
                    : report.value}
                </p>
              </div>
            </div>
            <span className="text-slate-400">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
