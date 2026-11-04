import { ArrowRight, BadgeCheck, BookMarked, BookOpen, ClipboardCheck, FileBarChart2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { LoadingCard, LoadingMetrics } from '../components/dashboard/dashboard-ui';
import { StateView } from '../components/state-view';
import { Badge, type BadgeTone } from '../components/ui/badge';
import {
  CardHeader,
  DashboardCard,
  EmptyPanel,
  KpiStrip,
  MeterRow,
  PageHeader,
  TextLink,
} from '../components/ui/dashboard-kit';
import { useAcademicYear } from '../contexts/academic-year-context';
import { useAuth } from '../features/auth/auth.context';
import {
  getStudentDashboardApi,
  type StudentDashboardData,
} from '../features/dashboard/dashboard.api';
import { listMyCoursesApi } from '../features/sprint4/lms.api';
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

type CourseState = 'in_progress' | 'not_started' | 'completed';

interface CourseRow {
  id: string;
  title: string;
  subject: string;
  progress: number;
  state: CourseState;
}

const COURSE_STATE: Record<CourseState, { label: string; tone: BadgeTone; order: number }> = {
  in_progress: { label: 'In progress', tone: 'brand', order: 0 },
  not_started: { label: 'Not started', tone: 'neutral', order: 1 },
  completed: { label: 'Completed', tone: 'success', order: 2 },
};

function formatStudyTime(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function StudentDashboardPage() {
  const auth = useAuth();
  const { academicYearId, isLoading: isAcademicYearLoading } = useAcademicYear();

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

  const courses = useMemo<CourseRow[]>(
    () =>
      (coursesQuery.data?.items ?? [])
        .map((course) => {
          const metrics = getCourseProgressMetrics(course, course.completedLessonIds ?? []);
          return {
            id: course.id,
            title: course.title,
            subject: course.subject?.name ?? 'Subject not set',
            progress: Math.round(metrics.overallProgress),
            state: courseEnrollmentState(metrics) as CourseState,
          };
        })
        .sort((a, b) => COURSE_STATE[a.state].order - COURSE_STATE[b.state].order),
    [coursesQuery.data]
  );

  if (!isAcademicYearLoading && !academicYearId) {
    return <Navigate to="/student/academic-year" replace />;
  }

  if (isError) {
    return (
      <StateView
        title="Could not load dashboard"
        message="Retry to load your dashboard data."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (isPending || !data) {
    return (
      <div className="mx-auto max-w-[1480px] space-y-5">
        <div className="h-14 w-96 max-w-full animate-pulse rounded-lg bg-slate-200" />
        <LoadingMetrics count={4} />
        <div className="grid gap-5 lg:grid-cols-3">
          <LoadingCard rows={4} className="lg:col-span-2" />
          <LoadingCard rows={3} />
        </div>
      </div>
    );
  }

  const inProgress = courses.filter((course) => course.state === 'in_progress').length;
  const completed = courses.filter((course) => course.state === 'completed').length;

  return (
    <section className="mx-auto max-w-[1480px] space-y-5 text-slate-900">
      <PageHeader
        title={`Hi, ${auth.me?.firstName || 'Student'}`}
        subtitle={data.school.displayName}
        actions={<DashboardQuickActionsDropdown actions={STUDENT_QUICK_ACTIONS} />}
      />

      <KpiStrip
        items={[
          {
            label: 'My courses',
            value: data.metrics.myCourses.toLocaleString(),
            hint: `${inProgress} in progress · ${completed} completed`,
            to: '/student/courses',
          },
          {
            label: 'Assignments submitted',
            value: data.metrics.assignmentsSubmitted.toLocaleString(),
            hint: 'Your submitted work',
            to: '/student/assignments',
          },
          {
            label: 'Tests taken',
            value: data.metrics.myAssessments.toLocaleString(),
            hint: 'Quizzes and assessments',
            to: '/student/assessments',
          },
          {
            label: 'Report cards',
            value: data.metrics.reportCards.toLocaleString(),
            hint: 'Published results',
            to: '/student/report-cards',
          },
        ]}
      />

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <ContinueLearningCard
            courses={courses}
            isLoading={coursesQuery.isPending}
            isError={coursesQuery.isError}
            onRetry={() => void coursesQuery.refetch()}
          />
          <CoursesCard courses={courses} />
        </div>
        <div className="min-w-0 space-y-5 xl:col-span-4">
          <ProgressCard data={data} />
          <UpcomingExamsCard data={data} />
          <AnnouncementsCard data={data} />
        </div>
      </div>
    </section>
  );
}

/** The one thing to do next: resume the furthest-along course, or start the next one. */
function ContinueLearningCard({
  courses,
  isLoading,
  isError,
  onRetry,
}: {
  courses: CourseRow[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) return <LoadingCard rows={2} />;

  if (isError) {
    return (
      <DashboardCard>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-slate-700">Your courses could not load.</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Retry
          </button>
        </div>
      </DashboardCard>
    );
  }

  if (courses.length === 0) {
    return (
      <DashboardCard>
        <EmptyPanel
          icon={BookOpen}
          message="You have no courses yet. They appear here once your classes are assigned."
        />
      </DashboardCard>
    );
  }

  const next =
    [...courses]
      .filter((course) => course.state === 'in_progress')
      .sort((a, b) => b.progress - a.progress)[0] ??
    courses.find((course) => course.state === 'not_started');

  if (!next) {
    return (
      <DashboardCard>
        <CardHeader title="All courses completed" subtitle="You have finished every lesson and task." />
        <div className="pb-4" />
      </DashboardCard>
    );
  }

  const isStarted = next.state === 'in_progress';

  return (
    <section className="rounded-xl bg-brand-900 p-5 text-white shadow-card sm:p-6">
      <p className="text-[13px] font-medium text-white/70">
        {isStarted ? 'Continue learning' : 'Start learning'}
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{next.title}</h2>
      <p className="mt-0.5 text-[13px] text-white/70">{next.subject}</p>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-white/70">Progress</span>
            <span className="font-semibold tabular-nums">{next.progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white" style={{ width: `${next.progress}%` }} />
          </div>
        </div>
        <Link
          to={`/student/courses/${next.id}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-brand-800 transition hover:bg-brand-50"
        >
          {isStarted ? 'Continue' : 'Start course'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function CoursesCard({ courses }: { courses: CourseRow[] }) {
  if (courses.length === 0) return null;

  return (
    <DashboardCard>
      <CardHeader
        title="My courses"
        subtitle={`${courses.length.toLocaleString()} ${courses.length === 1 ? 'course' : 'courses'}`}
        action={<TextLink to="/student/my-learning">My learning</TextLink>}
      />
      <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
        {courses.slice(0, 8).map((course) => (
          <li key={course.id}>
            <Link
              to={`/student/courses/${course.id}`}
              className="grid gap-3 px-5 py-3 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-slate-900">{course.title}</p>
                  <Badge tone={COURSE_STATE[course.state].tone}>{COURSE_STATE[course.state].label}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">{course.subject}</p>
              </div>
              <MeterRow label="Progress" value={`${course.progress}%`} percent={course.progress} />
            </Link>
          </li>
        ))}
      </ul>
      {courses.length > 8 ? (
        <div className="border-t border-slate-100 px-5 py-3">
          <TextLink to="/student/courses">View all courses</TextLink>
        </div>
      ) : null}
    </DashboardCard>
  );
}

function ProgressCard({ data }: { data: StudentDashboardData }) {
  const stats = data.learningStats;
  const avgScore = stats?.avgAssessmentScorePercent ?? null;
  const week = data.attendanceWeek;
  const rows = [
    { label: 'Time on lessons', value: formatStudyTime(stats?.timeSpentSecondsTotal ?? 0) },
    ...(week && week.daysWithRecords > 0
      ? [{ label: 'Attendance this week', value: `${week.present} of ${week.daysWithRecords} days` }]
      : []),
    ...(data.conductOpen
      ? [{ label: 'Open conduct entries', value: data.conductOpen.toLocaleString() }]
      : []),
  ];

  return (
    <DashboardCard>
      <CardHeader title="My progress" action={<TextLink to="/student/my-learning">Details</TextLink>} />
      <div className="px-5 pb-3 pt-2">
        <MeterRow
          label="Average quiz score"
          value={avgScore === null ? '—' : `${avgScore}%`}
          percent={avgScore ?? 0}
          hint={avgScore === null ? 'No scores yet' : undefined}
        />
        <dl className="mt-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0"
            >
              <dt className="text-[13px] text-slate-600">{row.label}</dt>
              <dd className="text-sm font-semibold tabular-nums text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </DashboardCard>
  );
}

function UpcomingExamsCard({ data }: { data: StudentDashboardData }) {
  const exams = data.upcomingExams;

  return (
    <DashboardCard>
      <CardHeader
        title="Upcoming exams"
        action={<TextLink to="/student/assessments">Assessments</TextLink>}
      />
      {exams.length === 0 ? (
        <p className="px-5 pb-5 pt-1 text-[13px] text-slate-500">No exams are scheduled.</p>
      ) : (
        <ul className="px-5 pb-3 pt-1">
          {exams.map((exam) => (
            <li
              key={exam.id}
              className="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-slate-900">{exam.title}</p>
                <p className="text-xs text-slate-500">{exam.relativeDate}</p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-slate-600">{exam.time}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

function AnnouncementsCard({ data }: { data: StudentDashboardData }) {
  const items = data.recentAnnouncements ?? [];

  return (
    <DashboardCard>
      <CardHeader
        title="Announcements"
        action={<TextLink to="/student/announcements">View all</TextLink>}
      />
      {items.length === 0 ? (
        <p className="px-5 pb-5 pt-1 text-[13px] text-slate-500">No announcements yet.</p>
      ) : (
        <ul className="px-5 pb-3 pt-1">
          {items.map((item) => (
            <li key={item.id} className="border-t border-slate-100 py-3 first:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[13px] font-medium text-slate-900">{item.title}</p>
                {item.publishedAt ? (
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(item.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
