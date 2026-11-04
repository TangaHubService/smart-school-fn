import { useQuery } from '@tanstack/react-query';
import { BarChart3, BookOpen, ClipboardCheck, FileBarChart2 } from 'lucide-react';
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
import { LoadingCard, LoadingMetrics } from '../components/dashboard/dashboard-ui';
import { Badge, type BadgeTone } from '../components/ui/badge';
import {
  AttentionCard,
  CardHeader,
  DashboardCard,
  KpiStrip,
  MeterRow,
  PageHeader,
  TextLink,
  type AttentionItem,
} from '../components/ui/dashboard-kit';

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
  { label: string; tone: BadgeTone }
> = {
  COMPLETE: { label: 'Complete', tone: 'success' },
  PARTIAL: { label: 'Partial', tone: 'warning' },
  UNMARKED: { label: 'Unmarked', tone: 'neutral' },
};

function plural(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

function buildAttention(data: TeacherDashboardData): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (data.todayAttendance.pendingClasses > 0) {
    items.push({
      key: 'attendance',
      title: `Mark attendance for ${plural(data.todayAttendance.pendingClasses, 'class', 'classes')}`,
      detail: 'Pending today',
      to: '/admin/attendance',
      tone: 'warning',
    });
  }
  if (data.metrics.pendingSubmissions > 0) {
    items.push({
      key: 'grading',
      title: `${plural(data.metrics.pendingSubmissions, 'submission')} to review`,
      to: '/admin/assignments',
      tone: 'warning',
    });
  }
  if (data.todayClasses.some((c) => c.status === 'PARTIAL')) {
    items.push({
      key: 'partial',
      title: 'Finish partially marked attendance',
      to: '/admin/attendance',
      tone: 'warning',
    });
  }
  const nextExam = data.upcomingExams[0];
  if (nextExam) {
    items.push({
      key: 'exam',
      title: `Prepare for "${nextExam.title}"`,
      detail: nextExam.relativeDate,
      to: '/admin/exams',
      tone: 'info',
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
      <div className="mx-auto max-w-[1480px] space-y-5">
        <div className="h-14 w-96 max-w-full animate-pulse rounded-lg bg-slate-200" />
        <LoadingMetrics count={4} />
        <div className="grid gap-5 lg:grid-cols-2">
          <LoadingCard rows={4} />
          <LoadingCard rows={4} />
        </div>
      </div>
    );
  }

  const classesStarted = data.todayClasses.filter((c) => c.markedStudents > 0).length;
  const totalStudents = data.todayClasses.reduce((sum, c) => sum + c.totalStudents, 0);

  return (
    <section className="mx-auto max-w-[1480px] space-y-5 text-slate-900">
      <PageHeader
        title={`${data.school.displayName}${data.school.city ? `, ${data.school.city}` : ''}`}
        subtitle={`${t('dashboard.subtitle')} ${t('dashboard.today', { date: todayStr })}`}
        actions={<DashboardQuickActionsDropdown actions={TEACHER_QUICK_ACTIONS} />}
      />

      <KpiStrip
        items={[
          {
            label: t('dashboard.metrics.myCourses'),
            value: data.metrics.myCourses.toLocaleString(),
            hint: 'Courses you teach',
            to: '/admin/courses',
          },
          {
            label: t('dashboard.metrics.myClasses'),
            value: data.metrics.myClasses.toLocaleString(),
            hint: 'Classes assigned to you',
            to: '/admin/my-classes',
          },
          {
            label: t('dashboard.metrics.pendingToGrade'),
            value: data.metrics.pendingSubmissions.toLocaleString(),
            hint: data.metrics.pendingSubmissions > 0 ? 'Needs your review' : 'All caught up',
            positive: data.metrics.pendingSubmissions === 0,
            to: '/admin/assignments',
          },
          {
            label: t('dashboard.metrics.markedToday'),
            value: `${data.todayAttendance.markedStudents.toLocaleString()} / ${totalStudents.toLocaleString()}`,
            hint: `${classesStarted} of ${plural(data.todayClasses.length, 'class', 'classes')} started`,
            to: '/admin/attendance',
          },
        ]}
      />

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <TodayClassesCard data={data} />
          <AnnouncementsCard
            isLoading={announcementsQuery.isPending}
            items={(announcementsQuery.data?.items ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              excerpt: item.body.length > 140 ? `${item.body.slice(0, 140)}…` : item.body,
              publishedAt: item.publishedAt,
            }))}
          />
        </div>
        <div className="min-w-0 space-y-5 xl:col-span-4">
          <AttentionCard items={buildAttention(data)} />
          <AttendanceSummaryCard data={data} totalStudents={totalStudents} />
          <UpcomingExamsCard data={data} />
        </div>
      </div>
    </section>
  );
}

function TodayClassesCard({ data }: { data: TeacherDashboardData }) {
  const started = data.todayClasses.filter((c) => c.markedStudents > 0).length;

  return (
    <DashboardCard>
      <CardHeader
        title="Today's classes"
        subtitle={`${started} of ${plural(data.todayClasses.length, 'class', 'classes')} have attendance records`}
        action={<TextLink to="/admin/attendance">Mark attendance</TextLink>}
      />
      {data.todayClasses.length === 0 ? (
        <p className="px-5 pb-5 pt-2 text-[13px] text-slate-500">
          No classes are scheduled today. Attendance status appears here once classes are set up.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
          {data.todayClasses.map((c) => {
            const meta = CLASS_STATUS_META[c.status];
            const pct = c.totalStudents > 0 ? (c.markedStudents / c.totalStudents) * 100 : 0;
            return (
              <li key={c.classRoomId}>
                <Link
                  to="/admin/attendance"
                  className="grid gap-3 px-5 py-3 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{c.className}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {c.subjectNames.length > 0 ? c.subjectNames.join(' · ') : 'Subjects not set'}
                    </p>
                  </div>
                  <MeterRow
                    label="Marked"
                    value={`${c.markedStudents}/${c.totalStudents}`}
                    percent={pct}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}

function AttendanceSummaryCard({
  data,
  totalStudents,
}: {
  data: TeacherDashboardData;
  totalStudents: number;
}) {
  const markedPct = totalStudents > 0 ? (data.todayAttendance.markedStudents / totalStudents) * 100 : 0;
  const sessionsStarted = data.todayAttendance.totalClasses - data.todayAttendance.pendingClasses;
  const rows = [
    { label: 'Classes started', value: `${sessionsStarted} of ${data.todayAttendance.totalClasses}` },
    { label: 'Classes pending', value: data.todayAttendance.pendingClasses.toLocaleString() },
  ];

  return (
    <DashboardCard>
      <CardHeader title="Today's attendance" action={<TextLink to="/admin/attendance">Open</TextLink>} />
      <div className="px-5 pb-3 pt-2">
        <MeterRow
          label="Students marked"
          value={`${data.todayAttendance.markedStudents.toLocaleString()} / ${totalStudents.toLocaleString()}`}
          percent={markedPct}
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

function UpcomingExamsCard({ data }: { data: TeacherDashboardData }) {
  const exams = data.upcomingExams;

  return (
    <DashboardCard>
      <CardHeader title="Upcoming exams" action={<TextLink to="/admin/exams">View all</TextLink>} />
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

function AnnouncementsCard({
  items,
  isLoading,
}: {
  items: Array<{ id: string; title: string; excerpt: string; publishedAt: string | null }>;
  isLoading: boolean;
}) {
  if (isLoading) return <LoadingCard rows={2} />;

  return (
    <DashboardCard>
      <CardHeader
        title="Announcements"
        action={<TextLink to="/admin/announcements">View all</TextLink>}
      />
      {items.length === 0 ? (
        <p className="px-5 pb-5 pt-1 text-[13px] text-slate-500">No announcements yet.</p>
      ) : (
        <ul className="px-5 pb-3 pt-1">
          {items.map((a) => (
            <li key={a.id} className="border-t border-slate-100 py-3 first:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-slate-900">{a.title}</p>
                {a.publishedAt ? (
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(a.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
