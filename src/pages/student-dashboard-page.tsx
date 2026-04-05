import {
  BadgeCheck,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  ChevronRight,
  FileBarChart2,
  Home,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { StateView } from '../components/state-view';
import { getStoredAcademicYearId } from './student-academic-year-select-page';
import { useAuth } from '../features/auth/auth.context';
import { getStudentDashboardApi, type StudentDashboardData } from '../features/dashboard/dashboard.api';
import { useQuery } from '@tanstack/react-query';

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
          <p className="mt-0.5 text-sm text-slate-600">Tap a card below to open that area of your portal.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm lg:inline-flex">
            <Home className="h-4 w-4 text-brand-500" />
            <span>{data.school.displayName}</span>
          </div>
          <DashboardQuickActionsDropdown actions={STUDENT_QUICK_ACTIONS} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StudentStatCard
          icon={BookOpen}
          label="My courses"
          value={data.metrics.myCourses}
          to="/student/courses"
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

function StudentStatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"
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
