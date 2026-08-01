import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileBarChart2,
  Megaphone,
  School,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { getTeacherDashboardApi, type TeacherDashboardData } from '../features/dashboard/dashboard.api';
import { listMyAnnouncementsApi } from '../features/announcements/announcements.api';
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
  type DashboardTone,
} from '../components/dashboard/dashboard-ui';

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

const TEACHER_QUICK_ACTIONS: DashboardQuickActionItem[] = [
  {
    label: 'Mark attendance',
    description: 'Open today attendance and mark your classes.',
    icon: ClipboardCheck,
    to: '/admin/attendance',
  },
  {
    label: 'Grade submissions',
    description: 'Open assignments and review pending work.',
    icon: ClipboardCheck,
    to: '/admin/assignments',
  },
  {
    label: 'Enter marks',
    description: 'Go to exams and update marks.',
    icon: FileBarChart2,
    to: '/admin/exams',
  },
  {
    label: 'My courses',
    description: 'Open your course and lesson workspace.',
    icon: BookOpen,
    to: '/admin/courses',
  },
  {
    label: 'Learning insights',
    description: 'See class completion and quiz performance.',
    icon: BarChart3,
    to: '/admin/learning-insights',
  },
];

const CLASS_STATUS_META: Record<
  'COMPLETE' | 'PARTIAL' | 'UNMARKED',
  { label: string; tone: DashboardTone; bar: DashboardTone }
> = {
  COMPLETE: { label: 'Complete', tone: 'success', bar: 'success' },
  PARTIAL: { label: 'Partial', tone: 'warning', bar: 'warning' },
  UNMARKED: { label: 'Unmarked', tone: 'neutral', bar: 'brand' },
};

function buildRecommendations(data: TeacherDashboardData) {
  const items: Array<{
    id: string;
    title: string;
    from: string;
    priority: 'high' | 'medium' | 'low';
    to: string;
  }> = [];

  if (data.todayAttendance.pendingClasses > 0) {
    items.push({
      id: 'attendance',
      title: `Mark attendance for ${data.todayAttendance.pendingClasses} pending class${
        data.todayAttendance.pendingClasses > 1 ? 'es' : ''
      } today`,
      from: 'Today attendance',
      priority: 'high',
      to: '/admin/attendance',
    });
  }
  if (data.metrics.pendingSubmissions > 0) {
    items.push({
      id: 'grading',
      title: `${data.metrics.pendingSubmissions} submission${
        data.metrics.pendingSubmissions > 1 ? 's' : ''
      } awaiting your review`,
      from: 'Assignments',
      priority: 'high',
      to: '/admin/assignments',
    });
  }
  if (data.todayClasses.some((c) => c.status === 'PARTIAL')) {
    items.push({
      id: 'partial',
      title: 'Finish attendance for partially marked classes',
      from: 'Today attendance',
      priority: 'medium',
      to: '/admin/attendance',
    });
  }
  if (data.upcomingExams.length > 0) {
    items.push({
      id: 'exam',
      title: `Prepare for "${data.upcomingExams[0].title}"`,
      from: data.upcomingExams[0].relativeDate,
      priority: 'medium',
      to: '/admin/exams',
    });
  }
  if (data.metrics.pendingSubmissions === 0 && data.todayAttendance.pendingClasses === 0) {
    items.push({
      id: 'next',
      title: 'Plan your next lessons and activities',
      from: 'Course workspace',
      priority: 'low',
      to: '/admin/courses',
    });
  }

  return items.slice(0, 4);
}

export function TeacherDashboardPage() {
  const { t } = useTranslation('teacher');
  const auth = useAuth();
  const todayStr = getTodayKigaliDate();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'teacher'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => getTeacherDashboardApi(auth.accessToken!),
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'me', 'dashboard'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => listMyAnnouncementsApi(auth.accessToken!, { page: 1, pageSize: 3 }),
  });

  if (isError) {
    return (
      <StateView
        title={t('dashboard.errorTitle')}
        message={t('dashboard.errorMessage')}
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            {t('dashboard.retry')}
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
        <div className="grid gap-5 lg:grid-cols-2">
          <LoadingCard rows={4} />
          <LoadingCard rows={4} />
        </div>
      </div>
    );
  }

  const recommendations = buildRecommendations(data);
  const classesStarted =
    data.todayClasses.filter((c) => c.markedStudents > 0).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t('dashboard.portal')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-900">
              {data.school.displayName}
              {data.school.city ? `, ${data.school.city}` : ''}
            </h1>
            <DashboardQuickActionsDropdown actions={TEACHER_QUICK_ACTIONS} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <span className="text-sm text-slate-600">{t('dashboard.today', { date: todayStr })}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BookOpen}
          label={t('dashboard.metrics.myCourses')}
          value={data.metrics.myCourses}
          tone="brand"
          to="/admin/courses"
        />
        <MetricCard
          icon={School}
          label={t('dashboard.metrics.myClasses')}
          value={data.metrics.myClasses}
          tone="purple"
          to="/admin/my-classes"
        />
        <MetricCard
          icon={ClipboardCheck}
          label={t('dashboard.metrics.pendingToGrade')}
          value={data.metrics.pendingSubmissions}
          tone="warning"
          to="/admin/assignments"
          helper={data.metrics.pendingSubmissions > 0 ? 'Needs your review' : 'All caught up'}
        />
        <MetricCard
          icon={Users}
          label={t('dashboard.metrics.markedToday')}
          value={`${data.todayAttendance.markedStudents} / ${data.todayClasses.reduce(
            (sum, c) => sum + c.totalStudents,
            0
          )}`}
          tone="success"
          to="/admin/attendance"
          helper={`${classesStarted} of ${data.todayClasses.length} classes started`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <TodayClassesCard data={data} className="lg:col-span-2" />
        <RecommendationsCard items={recommendations} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AttendanceSummaryCard data={data} />
        <UpcomingExamsCard data={data} />
      </div>

      <AnnouncementsCard
        isLoading={announcementsQuery.isPending}
        items={(announcementsQuery.data?.items ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          excerpt: item.body.length > 140 ? `${item.body.slice(0, 140)}…` : item.body,
          publishedAt: item.publishedAt,
        }))}
      />
    </section>
  );
}

function TodayClassesCard({
  data,
  className,
}: {
  data: TeacherDashboardData;
  className?: string;
}) {
  const started = data.todayClasses.filter((c) => c.markedStudents > 0).length;

  return (
    <Card className={className}>
      <CardHeader
        title="Today's classes"
        subtitle={`${started} of ${data.todayClasses.length} class${
          data.todayClasses.length === 1 ? '' : 'es'
        } have attendance records`}
        icon={CheckCircle2}
        tone="success"
        action={<CardActionLink to="/admin/attendance">Mark attendance</CardActionLink>}
      />
      <div className="p-5">
        {data.todayClasses.length === 0 ? (
          <EmptyInline
            icon={Clock3}
            title="No classes scheduled today"
            message="Once your classes are set up, attendance status will appear here."
          />
        ) : (
          <div className="space-y-3">
            {data.todayClasses.map((c) => {
              const meta = CLASS_STATUS_META[c.status];
              const pct =
                c.totalStudents > 0
                  ? Math.round((c.markedStudents / c.totalStudents) * 100)
                  : 0;
              return (
                <Link
                  key={c.classRoomId}
                  to="/admin/attendance"
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{c.className}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {c.subjectNames.length > 0 ? c.subjectNames.join(' · ') : 'Subjects not set'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={pct} tone={meta.bar} className="max-w-[160px]" />
                      <span className="text-xs font-medium tabular-nums text-slate-600">
                        {c.markedStudents}/{c.totalStudents} students
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

const RECOMMENDATION_META: Record<
  'high' | 'medium' | 'low',
  { label: string; tone: DashboardTone }
> = {
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'brand' },
};

function RecommendationsCard({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    from: string;
    priority: 'high' | 'medium' | 'low';
    to: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader
        title="Recommendations"
        subtitle="Prioritised actions for today"
        icon={Sparkles}
        tone="purple"
      />
      <div className="space-y-3 p-5">
        {items.length === 0 ? (
          <EmptyInline
            icon={Sparkles}
            title="Nothing needs attention"
            message="You are all caught up. New recommendations will appear here."
          />
        ) : (
          items.map((r) => (
            <Link
              key={r.id}
              to={r.to}
              className="block rounded-xl border-l-2 border-slate-200 bg-slate-50/50 p-3 transition hover:border-l-purple-400 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                <Badge tone={RECOMMENDATION_META[r.priority].tone}>
                  {RECOMMENDATION_META[r.priority].label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.from}</p>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

function AttendanceSummaryCard({ data }: { data: TeacherDashboardData }) {
  const totalStudents = data.todayClasses.reduce((sum, c) => sum + c.totalStudents, 0);
  const markedPct =
    totalStudents > 0 ? Math.round((data.todayAttendance.markedStudents / totalStudents) * 100) : 0;
  const sessionsStarted = data.todayAttendance.totalClasses - data.todayAttendance.pendingClasses;

  return (
    <Card>
      <CardHeader
        title="Today attendance"
        subtitle="Coverage across your scheduled classes"
        icon={ClipboardCheck}
        tone="warning"
        action={<CardActionLink to="/admin/attendance">Open</CardActionLink>}
      />
      <div className="p-5">
        <div className="flex items-end justify-between">
          <p className="text-sm font-medium text-slate-600">Students marked</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {data.todayAttendance.markedStudents}
            <span className="text-sm font-medium text-slate-400"> / {totalStudents}</span>
          </p>
        </div>
        <ProgressBar value={markedPct} tone="success" className="mt-3" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-slate-900">
              {sessionsStarted}
              <span className="text-sm font-medium text-slate-400">/{data.todayAttendance.totalClasses}</span>
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Classes started
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-amber-700">
              {data.todayAttendance.pendingClasses}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Pending
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-slate-900">{totalStudents}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Total students
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function UpcomingExamsCard({ data }: { data: TeacherDashboardData }) {
  return (
    <Card>
      <CardHeader
        title="Upcoming exams"
        subtitle="Exams you need to administer or mark"
        icon={FileBarChart2}
        tone="brand"
        action={<CardActionLink to="/admin/exams">View all</CardActionLink>}
      />
      <div className="p-5">
        {data.upcomingExams.length === 0 ? (
          <EmptyInline icon={FileBarChart2} title="No upcoming exams" />
        ) : (
          <div className="space-y-3">
            {data.upcomingExams.map((exam) => (
              <Link
                key={exam.id}
                to="/admin/exams"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/40"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{exam.title}</p>
                  <p className="text-xs text-slate-500">{exam.relativeDate}</p>
                </div>
                <Badge tone="brand">{exam.time}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function AnnouncementsCard({
  items,
  isLoading,
}: {
  items: Array<{ id: string; title: string; excerpt: string; publishedAt: string | null }>;
  isLoading: boolean;
}) {
  if (isLoading) return <LoadingCard rows={2} />;

  return (
    <Card>
      <CardHeader
        title="Announcements"
        subtitle="Latest school updates"
        icon={Megaphone}
        tone="brand"
        action={<CardActionLink to="/admin/announcements">View all</CardActionLink>}
      />
      <div className="p-5">
        {items.length === 0 ? (
          <EmptyInline icon={Megaphone} title="No announcements yet" />
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                  {a.publishedAt && (
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {new Date(a.publishedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
