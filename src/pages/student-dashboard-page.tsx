import clsx from 'clsx';
import {
  Award,
  BadgeCheck,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  ChevronRight,
  CircleDashed,
  Clock,
  FileBarChart2,
  Home,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { StateView } from '../components/state-view';
import { getStoredAcademicYearId } from './student-academic-year-select-page';
import { useAuth } from '../features/auth/auth.context';
import { getStudentDashboardApi, type StudentDashboardData } from '../features/dashboard/dashboard.api';
import { listMyCoursesApi, type MyCoursesResponse } from '../features/sprint4/lms.api';
import { useQuery } from '@tanstack/react-query';
import { courseEnrollmentState, getCourseProgressMetrics } from '../utils/course-progress';

const STUDENT_QUICK_ACTIONS: DashboardQuickActionItem[] = [
  {
    label: 'My Courses',
    description: 'Open your lessons and course materials.',
    icon: BookOpen,
    to: '/student/courses',
  },
  {
    label: 'My Learning',
    description: 'See progress and resume across all courses.',
    icon: BookMarked,
    to: '/student/my-learning',
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

  const coursesQuery = useQuery({
    queryKey: ['lms', 'student-courses', 'dashboard'],
    enabled: Boolean(auth.accessToken && academicYearId),
    queryFn: () => listMyCoursesApi(auth.accessToken!, { page: 1, pageSize: 50 }),
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
      <div className="space-y-4">
        <div className="h-14 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Hey, {auth.me?.firstName || 'Student'}
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            See how your courses are moving below, then open any area of your portal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm lg:inline-flex">
            <Home className="h-4 w-4 text-brand-500" />
            <span>{data.school.displayName}</span>
          </div>
          <DashboardQuickActionsDropdown actions={STUDENT_QUICK_ACTIONS} />
        </div>
      </div>

      <StudentCourseProgressStrip
        isPending={coursesQuery.isPending}
        isError={coursesQuery.isError}
        onRetry={() => void coursesQuery.refetch()}
        items={coursesQuery.data?.items}
      />

      {data.learningStats ? (
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" aria-hidden />
            <span className="font-medium text-slate-900">
              {Math.round((data.learningStats.timeSpentSecondsTotal ?? 0) / 60)} min
            </span>
            <span className="text-slate-500">time on lessons</span>
          </div>
          {data.learningStats.lastLessonActivityAt ? (
            <span className="text-slate-500">
              Last activity{' '}
              {new Date(data.learningStats.lastLessonActivityAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          ) : (
            <span className="text-slate-500">Open a lesson to start tracking time</span>
          )}
          {data.learningStats.avgAssessmentScorePercent != null ? (
            <span className="text-slate-500">
              Avg quiz score:{' '}
              <span className="font-semibold text-slate-800">
                {data.learningStats.avgAssessmentScorePercent}%
              </span>
            </span>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StudentStatCard
          icon={BookOpen}
          label="My courses"
          value={data.metrics.myCourses}
          to="/student/courses"
          emphasize
        />
        <StudentStatCard
          icon={ClipboardCheck}
          label="Assignments submitted"
          value={data.metrics.assignmentsSubmitted}
          to="/student/assignments"
        />
        <StudentStatCard
          icon={BadgeCheck}
          label="Tests taken"
          value={data.metrics.myAssessments}
          to="/student/assessments"
        />
        <StudentStatCard
          icon={FileBarChart2}
          label="Report cards"
          value={data.metrics.reportCards}
          to="/student/report-cards"
        />
      </div>

      <StudentUpcomingExamsCard data={data} />
    </section>
  );
}

function StudentCourseProgressStrip({
  isPending,
  isError,
  onRetry,
  items,
}: {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  items: MyCoursesResponse['items'] | undefined;
}) {
  const breakdown = useMemo(() => {
    const list = items ?? [];
    let notStarted = 0;
    let inProgress = 0;
    let completed = 0;
    const inProgressCourses: { id: string; title: string; pct: number }[] = [];
    for (const c of list) {
      const m = getCourseProgressMetrics(c, c.completedLessonIds ?? []);
      const s = courseEnrollmentState(m);
      if (s === 'not_started') {
        notStarted += 1;
      } else if (s === 'in_progress') {
        inProgress += 1;
        if (inProgressCourses.length < 3) {
          inProgressCourses.push({ id: c.id, title: c.title, pct: m.overallProgress });
        }
      } else {
        completed += 1;
      }
    }
    return { notStarted, inProgress, completed, total: list.length, inProgressCourses };
  }, [items]);

  if (isPending) {
    return (
      <section
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm"
        aria-busy="true"
        aria-label="Loading course progress"
      >
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-500" aria-hidden />
        Loading your course progress…
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 shadow-sm">
        <p className="font-medium">Could not load course progress.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
        >
          Retry
        </button>
      </section>
    );
  }

  if (breakdown.total === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-800">No enrolled courses yet</p>
        <p className="mt-1 text-xs text-slate-600">When your school assigns classes, your progress will show here.</p>
        <Link
          to="/student/courses"
          className="mt-3 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Open courses
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Course progress overview">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">Your course progress</h2>
        <Link
          to="/student/my-learning"
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View all in My Learning
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/student/courses"
          className="group flex flex-col gap-1 rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm ring-2 ring-transparent transition hover:border-slate-300 hover:ring-slate-100"
        >
          <div className="flex items-center gap-2 text-slate-600">
            <CircleDashed className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Not started</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-slate-900">{breakdown.notStarted}</p>
          <p className="text-xs text-slate-500">Courses you have not begun</p>
        </Link>
        <Link
          to="/student/my-learning"
          className="group flex flex-col gap-1 rounded-xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50 to-amber-50/30 p-4 shadow-sm ring-2 ring-amber-200/60 transition hover:border-amber-400 hover:ring-amber-100"
        >
          <div className="flex items-center gap-2 text-amber-900">
            <PlayCircle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">In progress</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-amber-950">{breakdown.inProgress}</p>
          <p className="text-xs text-amber-800/90">Active learning right now</p>
        </Link>
        <Link
          to="/student/my-learning"
          className="group flex flex-col gap-1 rounded-xl border-2 border-emerald-300/90 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm ring-2 ring-emerald-200/60 transition hover:border-emerald-400 hover:ring-emerald-100"
        >
          <div className="flex items-center gap-2 text-emerald-900">
            <Award className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Completed</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-emerald-950">{breakdown.completed}</p>
          <p className="text-xs text-emerald-800/90">All lessons and tasks done</p>
        </Link>
      </div>
      {breakdown.inProgressCourses.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Continue learning</h3>
          <ul className="mt-3 grid gap-3 lg:grid-cols-3">
            {breakdown.inProgressCourses.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/student/courses/${c.id}`}
                  className="flex h-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{c.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-brand-700">{c.pct}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function StudentStatCard({
  icon: Icon,
  label,
  value,
  to,
  emphasize,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  to: string;
  emphasize?: boolean;
}) {
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md',
        emphasize
          ? 'border-2 border-brand-300 ring-1 ring-brand-100 hover:border-brand-400'
          : 'border border-slate-200 hover:border-brand-200',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
    </Link>
  );
}

function StudentUpcomingExamsCard({ data }: { data: StudentDashboardData }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Upcoming exams</h2>
      <div className="mt-3 space-y-2">
        {data.upcomingExams.length ? (
          data.upcomingExams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{exam.title}</p>
                  <p className="text-xs text-slate-500">{exam.relativeDate}</p>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-600">{exam.time}</p>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">No upcoming exams</p>
        )}
      </div>
    </section>
  );
}
