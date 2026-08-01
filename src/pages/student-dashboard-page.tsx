import {
  Award,
  BadgeCheck,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  ChevronRight,
  CircleDashed,
  FileBarChart2,
  FileText,
  Home,
  Loader2,
  Megaphone,
  MessageCircle,
  PlayCircle,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import {
  ActiveCoursesHierarchy,
  type CourseHierarchyItem,
} from '../components/dashboard/active-courses-hierarchy';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { useAcademicYear } from '../contexts/academic-year-context';
import {
  getStudentDashboardApi,
  type StudentDashboardData,
} from '../features/dashboard/dashboard.api';
import { listMyCoursesApi, type MyCoursesResponse } from '../features/sprint4/lms.api';
import { useQuery } from '@tanstack/react-query';
import { courseEnrollmentState, getCourseProgressMetrics } from '../utils/course-progress';
import {
  Badge,
  Card,
  CardActionLink,
  CardHeader,
  EmptyInline,
  LoadingCard,
  LoadingMetrics,
  MetricCard,
  ProgressBar,
} from '../components/dashboard/dashboard-ui';

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
  const { academicYearId, isLoading: isAcademicYearLoading } = useAcademicYear();

  if (!isAcademicYearLoading && !academicYearId) {
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

  const hierarchyItems = useMemo<CourseHierarchyItem[]>(
    () =>
      (coursesQuery.data?.items ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        grade: c.academicYear?.name ?? '',
        class: `${c.classRoom?.code ?? ''}${c.classRoom?.code && c.classRoom?.name ? ' · ' : ''}${c.classRoom?.name ?? ''}`.trim(),
        subject: c.subject?.name ?? 'Subject not set',
        progress: Math.round(getCourseProgressMetrics(c, c.completedLessonIds ?? []).overallProgress),
      })),
    [coursesQuery.data]
  );

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
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <LoadingMetrics count={4} />
        <div className="grid gap-5 lg:grid-cols-3">
          <LoadingCard rows={4} className="lg:col-span-2" />
          <LoadingCard rows={3} />
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Student portal
          </p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-slate-900">
            Hey, {auth.me?.firstName || 'Student'}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BookOpen}
          label="My courses"
          value={data.metrics.myCourses}
          tone="brand"
          to="/student/courses"
        />
        <MetricCard
          icon={ClipboardCheck}
          label="Assignments submitted"
          value={data.metrics.assignmentsSubmitted}
          tone="purple"
          to="/student/assignments"
        />
        <MetricCard
          icon={BadgeCheck}
          label="Tests taken"
          value={data.metrics.myAssessments}
          tone="warning"
          to="/student/assessments"
        />
        <MetricCard
          icon={FileBarChart2}
          label="Report cards"
          value={data.metrics.reportCards}
          tone="success"
          to="/student/report-cards"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActiveCoursesHierarchy
            items={hierarchyItems}
            isLoading={coursesQuery.isPending}
          />
        </div>
        <div className="flex flex-col gap-5">
          <PerformanceCard data={data} />
          <AnnouncementsCard data={data} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <StudentUpcomingExamsCard data={data} className="lg:col-span-2" />
        <QuickLinksCard />
      </div>
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
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm"
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
      <section className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 shadow-sm">
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
      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-800">No enrolled courses yet</p>
        <p className="mt-1 text-xs text-slate-600">
          When your school assigns classes, your progress will show here.
        </p>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Continue learning</h3>
          <ul className="mt-3 grid gap-3 lg:grid-cols-3">
            {breakdown.inProgressCourses.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/student/courses/${c.id}`}
                  className="flex h-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                    {c.title}
                  </span>
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

function PerformanceCard({ data }: { data: StudentDashboardData }) {
  const stats = data.learningStats;
  const minutes = Math.round((stats?.timeSpentSecondsTotal ?? 0) / 60);
  const avgScore = stats?.avgAssessmentScorePercent ?? null;

  return (
    <Card>
      <CardHeader
        title="My performance"
        subtitle="Quiz scores and study activity"
        icon={Sparkles}
        tone="brand"
        action={<CardActionLink to="/student/my-learning">Details</CardActionLink>}
      />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Average quiz score</p>
          {avgScore !== null ? (
            <Badge tone={avgScore >= 50 ? 'success' : 'warning'}>{avgScore}%</Badge>
          ) : (
            <Badge tone="neutral">No scores yet</Badge>
          )}
        </div>
        {avgScore !== null && <ProgressBar value={avgScore} tone={avgScore >= 50 ? 'success' : 'warning'} className="mt-3" />}
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Timer className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{minutes} min</p>
              <p className="text-xs text-slate-500">Time spent on lessons</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {data.conductOpen != null && data.conductOpen > 0
                  ? `${data.conductOpen} open`
                  : 'No open issues'}
              </p>
              <p className="text-xs text-slate-500">Conduct entries</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AnnouncementsCard({ data }: { data: StudentDashboardData }) {
  const items = data.recentAnnouncements ?? [];

  return (
    <Card>
      <CardHeader
        title="Announcements"
        subtitle="Latest updates from your school"
        icon={Megaphone}
        tone="warning"
        action={<CardActionLink to="/student/announcements">View all</CardActionLink>}
      />
      <div className="p-5">
        {items.length === 0 ? (
          <EmptyInline icon={Megaphone} title="No announcements yet" />
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.excerpt}</p>
                {a.publishedAt && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Date(a.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function StudentUpcomingExamsCard({
  data,
  className,
}: {
  data: StudentDashboardData;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader
        title="Upcoming exams"
        subtitle="Tests and examinations scheduled for you"
        icon={FileBarChart2}
        tone="danger"
        action={<CardActionLink to="/student/assessments">Assessments</CardActionLink>}
      />
      <div className="p-5">
        {data.upcomingExams.length === 0 ? (
          <EmptyInline
            icon={FileBarChart2}
            title="No upcoming exams"
            message="Your school has not scheduled any exams yet. Relax and keep learning."
          />
        ) : (
          <div className="space-y-3">
            {data.upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{exam.title}</p>
                    <p className="text-xs text-slate-500">{exam.relativeDate}</p>
                  </div>
                </div>
                <Badge tone="neutral">{exam.time}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function QuickLinksCard() {
  return (
    <Card>
      <CardHeader title="Quick links" icon={BookMarked} tone="purple" />
      <div className="space-y-3 p-5">
        <Link
          to="/student/courses"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-brand-200 hover:bg-brand-50/40"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Secure PDF Viewer</p>
            <p className="text-xs text-slate-500">View course materials</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
        </Link>
        <Link
          to="/student/chat"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Student Group Chat</p>
            <p className="text-xs text-slate-500">Discuss with classmates</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
        </Link>
      </div>
    </Card>
  );
}
