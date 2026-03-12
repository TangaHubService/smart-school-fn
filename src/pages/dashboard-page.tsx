import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Dot,
  School,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { StateView } from '../components/state-view';
import { SchoolAdminDashboardPage } from './school-admin-dashboard-page';
import { SuperAdminDashboardPage } from './super-admin-dashboard-page';
import { useAuth } from '../features/auth/auth.context';
import {
  hasPermission,
  hasRole,
  isSchoolSetupComplete,
} from '../features/auth/auth-helpers';
import {
  listAssessmentsApi,
  type AssessmentSummary,
} from '../features/assessments/assessments.api';
import { assessmentsFeatureEnabled } from '../features/assessments/feature';
import { getAttendanceDashboardSummaryApi } from '../features/sprint3/attendance.api';
import { listCoursesApi } from '../features/sprint4/lms.api';

function getTodayKigaliDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const value = formatter.format(new Date());
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

function formatDashboardDate(value: string | null | undefined): string {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Africa/Kigali',
  }).format(date);
}

function formatAssessmentDate(value: string | null): string {
  if (!value) {
    return 'No due date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Kigali',
  }).format(date);
}

type MetricTone = 'primary' | 'success' | 'accent' | 'danger';

type ActionTone = 'primary' | 'secondary' | 'accent';

interface QuickAction {
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
  tone: ActionTone;
}

interface AlertItem {
  id: string;
  title: string;
  message: string;
  to?: string;
  severity: 'success' | 'warning' | 'danger' | 'info';
}

interface MetricCardItem {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: MetricTone;
}

interface BreakdownItem {
  label: string;
  value: number;
  percent: number;
  color: string;
  toneClassName: string;
}

interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  meta: string;
  to?: string;
  icon: LucideIcon;
  tone: MetricTone;
}

export function DashboardPage() {
  const auth = useAuth();
  const [summaryDate, setSummaryDate] = useState(getTodayKigaliDate());

  const superAdmin = hasRole(auth.me, 'SUPER_ADMIN');
  const canSchoolDashboard =
    hasPermission(auth.me, 'school.setup.manage') ||
    hasPermission(auth.me, 'students.read') ||
    hasPermission(auth.me, 'attendance.read');

  if (superAdmin) {
    return <SuperAdminDashboardPage />;
  }
  if (canSchoolDashboard && !superAdmin) {
    return <SchoolAdminDashboardPage />;
  }
  const canSetup = hasPermission(auth.me, 'school.setup.manage');
  const canAttendance = hasPermission(auth.me, 'attendance.read');
  const canCourses = hasPermission(auth.me, 'courses.read');
  const canAssessments = assessmentsFeatureEnabled && hasPermission(auth.me, 'assessments.read');
  const setupComplete = isSchoolSetupComplete(auth.me);

  const attendanceSummaryQuery = useQuery({
    queryKey: ['attendance', 'dashboard-summary', summaryDate],
    enabled: Boolean(auth.accessToken && canAttendance && !superAdmin),
    queryFn: () => getAttendanceDashboardSummaryApi(auth.accessToken!, summaryDate),
  });

  const coursesCountQuery = useQuery({
    queryKey: ['dashboard', 'courses-count'],
    enabled: Boolean(auth.accessToken && canCourses && !superAdmin),
    queryFn: () => listCoursesApi(auth.accessToken!, { page: 1, pageSize: 1 }),
  });

  const assessmentsQuery = useQuery({
    queryKey: ['dashboard', 'assessments-preview'],
    enabled: Boolean(auth.accessToken && canAssessments && !superAdmin),
    queryFn: () => listAssessmentsApi(auth.accessToken!, { page: 1, pageSize: 4 }),
  });

  const quickActions = useMemo<QuickAction[]>(() => {
    if (superAdmin) {
      return [
        {
          label: 'Open tenants',
          description: 'Manage schools and platform access.',
          to: '/super-admin/tenants',
          icon: School,
          tone: 'primary',
        },
      ];
    }

    if (canSetup && !setupComplete) {
      return [
        {
          label: 'Continue setup wizard',
          description: 'Finish school setup to unlock classes, subjects, and staff.',
          to: '/admin/setup',
          icon: ClipboardList,
          tone: 'primary',
        },
      ];
    }

    const items: QuickAction[] = [];

    if (canCourses) {
      items.push({
        label: 'Open courses',
        description: 'Review teaching content and active course structure.',
        to: '/admin/courses',
        icon: BookOpen,
        tone: 'secondary',
      });
    }

    if (canAssessments) {
      items.push({
        label: 'Review assessments',
        description: 'Check published tests and upcoming due dates.',
        to: '/admin/assessments',
        icon: CalendarDays,
        tone: 'accent',
      });
    }

    if (canAttendance) {
      items.push({
        label: 'Open attendance',
        description: 'Track today attendance and resolve pending classes.',
        to: '/admin/attendance',
        icon: ClipboardList,
        tone: 'primary',
      });
    }

    if (canSetup) {
      items.push({
        label: 'Manage classes',
        description: 'Update academic structure, class rooms, and subjects.',
        to: '/admin/classes',
        icon: School,
        tone: 'secondary',
      });
    }

    return items;
  }, [canAssessments, canAttendance, canCourses, canSetup, setupComplete, superAdmin]);

  const upcomingAssessments = useMemo(() => {
    const items = assessmentsQuery.data?.items ?? [];
    return [...items].sort((left, right) => {
      if (!left.dueAt && !right.dueAt) return 0;
      if (!left.dueAt) return 1;
      if (!right.dueAt) return -1;
      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    });
  }, [assessmentsQuery.data?.items]);

  const attendanceBreakdown = useMemo<BreakdownItem[]>(() => {
    const summary = attendanceSummaryQuery.data?.summary;
    if (!summary) {
      return [];
    }

    const total = summary.present + summary.absent + summary.late + summary.excused;
    const safePercent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

    return [
      {
        label: 'Present',
        value: summary.present,
        percent: safePercent(summary.present),
        color: '#1F8A4C',
        toneClassName: 'bg-success-50 text-success-700',
      },
      {
        label: 'Late',
        value: summary.late,
        percent: safePercent(summary.late),
        color: '#F2C94C',
        toneClassName: 'bg-accent-50 text-accent-600',
      },
      {
        label: 'Absent',
        value: summary.absent,
        percent: safePercent(summary.absent),
        color: '#D92D20',
        toneClassName: 'bg-danger-50 text-danger-700',
      },
      {
        label: 'Excused',
        value: summary.excused,
        percent: safePercent(summary.excused),
        color: '#6CB9CC',
        toneClassName: 'bg-brand-50 text-brand-600',
      },
    ];
  }, [attendanceSummaryQuery.data?.summary]);

  const attendanceTotal = attendanceBreakdown.reduce((total, item) => total + item.value, 0);

  const alertItems = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];

    if (!superAdmin && canSetup && !setupComplete) {
      items.push({
        id: 'setup',
        title: 'School setup still incomplete',
        message: 'Finish the setup wizard to unlock the full academic workspace.',
        to: '/admin/setup',
        severity: 'warning',
      });
    }

    if (attendanceSummaryQuery.data) {
      if (attendanceSummaryQuery.data.pendingClasses > 0) {
        items.push({
          id: 'pending-attendance',
          title: `${attendanceSummaryQuery.data.pendingClasses} classes still need attendance`,
          message: `Attendance is not complete for ${formatDashboardDate(attendanceSummaryQuery.data.date)}.`,
          to: '/admin/attendance',
          severity: 'warning',
        });
      }

      if (attendanceSummaryQuery.data.summary.absent > 0) {
        items.push({
          id: 'absent-students',
          title: `${attendanceSummaryQuery.data.summary.absent} students marked absent`,
          message: 'Review follow-up actions and contact families where needed.',
          to: '/admin/attendance',
          severity: 'danger',
        });
      }

      if (attendanceSummaryQuery.data.summary.late > 0) {
        items.push({
          id: 'late-students',
          title: `${attendanceSummaryQuery.data.summary.late} late arrivals recorded`,
          message: 'Monitor recurring lateness and check class entry trends.',
          to: '/admin/attendance',
          severity: 'info',
        });
      }
    }

    if (!items.length) {
      items.push({
        id: 'clear',
        title: 'No urgent issues right now',
        message: 'The dashboard does not show any critical academic or attendance alerts.',
        severity: 'success',
      });
    }

    return items;
  }, [attendanceSummaryQuery.data, canSetup, setupComplete, superAdmin]);

  const metricCards = useMemo<MetricCardItem[]>(() => {
    if (superAdmin) {
      return [
        {
          label: 'Tenant Context',
          value: auth.me?.tenant.name ?? '-',
          helper: auth.me?.tenant.code ?? 'Platform tenant',
          icon: School,
          tone: 'primary',
        },
        {
          label: 'Account Role',
          value: auth.me?.roles[0] ?? 'SUPER_ADMIN',
          helper: 'Platform administration',
          icon: Users,
          tone: 'success',
        },
        {
          label: 'School Setup',
          value: setupComplete ? 'Ready' : 'Pending',
          helper: setupComplete ? 'School is configured' : 'Configuration still needed',
          icon: ClipboardList,
          tone: 'accent',
        },
        {
          label: 'Quick Actions',
          value: String(quickActions.length),
          helper: 'Available platform shortcuts',
          icon: AlertCircle,
          tone: 'danger',
        },
      ];
    }

    const pendingTasks = (attendanceSummaryQuery.data?.pendingClasses ?? 0) + (setupComplete ? 0 : 1);
    const alertCount = (attendanceSummaryQuery.data?.summary.absent ?? 0) + (attendanceSummaryQuery.data?.summary.late ?? 0);

    return [
      {
        label: 'Marked Students',
        value: String(attendanceSummaryQuery.data?.markedStudents ?? 0),
        helper: attendanceSummaryQuery.data ? 'Attendance captured today' : 'Waiting for attendance data',
        icon: Users,
        tone: 'primary',
      },
      {
        label: 'Active Courses',
        value: String(coursesCountQuery.data?.pagination.totalItems ?? 0),
        helper: canCourses ? 'Courses available this term' : 'Course access not enabled',
        icon: BookOpen,
        tone: 'success',
      },
      {
        label: 'Pending Tasks',
        value: String(pendingTasks),
        helper: pendingTasks > 0 ? 'Needs follow-up today' : 'No pending workflow items',
        icon: Clock3,
        tone: 'accent',
      },
      {
        label: 'Alerts',
        value: String(alertCount),
        helper: alertCount > 0 ? 'Absent or late students' : 'No attendance alerts today',
        icon: TriangleAlert,
        tone: 'danger',
      },
    ];
  }, [
    auth.me?.roles,
    auth.me?.tenant.code,
    auth.me?.tenant.name,
    attendanceSummaryQuery.data,
    canCourses,
    coursesCountQuery.data?.pagination.totalItems,
    quickActions.length,
    setupComplete,
    superAdmin,
  ]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    if (attendanceSummaryQuery.data) {
      items.push({
        id: 'attendance-refresh',
        title: 'Attendance snapshot updated',
        detail: `${attendanceSummaryQuery.data.markedStudents} students marked across ${attendanceSummaryQuery.data.activeClasses} active classes.`,
        meta: formatDashboardDate(attendanceSummaryQuery.data.date),
        to: '/admin/attendance',
        icon: ClipboardList,
        tone: 'primary',
      });
    }

    upcomingAssessments.slice(0, 2).forEach((assessment) => {
      items.push({
        id: `assessment-${assessment.id}`,
        title: assessment.title,
        detail: `${assessment.course.classRoom.name} · ${assessment.counts.questions} questions`,
        meta: formatAssessmentDate(assessment.dueAt),
        to: `/admin/assessments/${assessment.id}`,
        icon: CalendarDays,
        tone: assessment.isPublished ? 'success' : 'accent',
      });
    });

    if (coursesCountQuery.data) {
      items.push({
        id: 'courses-total',
        title: 'Course list ready',
        detail: `${coursesCountQuery.data.pagination.totalItems} active courses available in the workspace.`,
        meta: 'Course overview',
        to: '/admin/courses',
        icon: BookOpen,
        tone: 'success',
      });
    }

    return items.slice(0, 4);
  }, [attendanceSummaryQuery.data, coursesCountQuery.data, upcomingAssessments]);

  const attendanceDonutStyle = useMemo<CSSProperties>(() => {
    if (!attendanceBreakdown.length || attendanceTotal === 0) {
      return {
        background: 'conic-gradient(#E5E7EB 0deg 360deg)',
      };
    }

    let currentPercent = 0;
    const stops = attendanceBreakdown.map((item) => {
      const start = currentPercent;
      currentPercent += item.percent;
      return `${item.color} ${start}% ${Math.min(currentPercent, 100)}%`;
    });

    if (currentPercent < 100) {
      stops.push(`#E5E7EB ${currentPercent}% 100%`);
    }

    return {
      background: `conic-gradient(${stops.join(', ')})`,
    };
  }, [attendanceBreakdown, attendanceTotal]);

  const hasLiveAttendance = Boolean(!superAdmin && canAttendance && attendanceSummaryQuery.data);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            School Dashboard
          </p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-slate-900">
            {auth.me?.school?.displayName ?? auth.me?.tenant.name ?? 'Smart School Rwanda'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Track attendance, assessments, and the next academic actions from one landing page.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 lg:justify-end">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Snapshot date</span>
            <input
              type="date"
              value={summaryDate}
              onChange={(event) => setSummaryDate(event.target.value)}
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            />
          </label>
          {canAttendance && !superAdmin ? (
            <DashboardLinkButton to="/admin/attendance" tone="primary">
              Open attendance
            </DashboardLinkButton>
          ) : quickActions[0] ? (
            <DashboardLinkButton to={quickActions[0].to} tone={quickActions[0].tone}>
              {quickActions[0].label}
            </DashboardLinkButton>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
        <DashboardPanel
          title={canAssessments && !superAdmin ? 'Upcoming Assessments' : 'Action Center'}
          action={
            canAssessments && !superAdmin ? (
              <Link
                to="/admin/assessments"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null
          }
        >
          {canAssessments && !superAdmin ? (
            assessmentsQuery.isPending ? (
              <div className="grid gap-3" role="status" aria-live="polite">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-xl bg-brand-50" />
                ))}
              </div>
            ) : assessmentsQuery.isError ? (
              <StateView
                title="Could not load assessments"
                message="Retry to load the assessment queue for this dashboard."
                action={
                  <button
                    type="button"
                    onClick={() => void assessmentsQuery.refetch()}
                    className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                }
              />
            ) : upcomingAssessments.length ? (
              <div className="space-y-3">
                {upcomingAssessments.map((assessment) => (
                  <AssessmentDashboardRow key={assessment.id} assessment={assessment} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No assessments yet"
                message="Published and draft assessments will appear here once teachers create them."
              />
            )
          ) : quickActions.length ? (
            <div className="space-y-3">
              {quickActions.map((item) => (
                <QuickActionRow key={item.to} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No quick actions"
              message="This account does not have operational shortcuts configured for the dashboard."
            />
          )}
        </DashboardPanel>

        <DashboardPanel title="Attendance Snapshot">
          {attendanceSummaryQuery.isPending && !superAdmin && canAttendance ? (
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
              <div className="mx-auto h-60 w-60 animate-pulse rounded-full bg-brand-50" />
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-xl bg-brand-50" />
                ))}
              </div>
            </div>
          ) : attendanceSummaryQuery.isError && !superAdmin && canAttendance ? (
            <StateView
              title="Could not load attendance snapshot"
              message="Retry to refresh the daily dashboard data."
              action={
                <button
                  type="button"
                  onClick={() => void attendanceSummaryQuery.refetch()}
                  className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : hasLiveAttendance ? (
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="grid gap-4 justify-items-center text-center">
                <div className="grid h-64 w-64 place-items-center rounded-full p-5" style={attendanceDonutStyle}>
                  <div className="grid h-36 w-36 place-items-center rounded-full border border-slate-200 bg-white text-center shadow-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Coverage
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {attendanceSummaryQuery.data?.coveragePercent ?? 0}%
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{attendanceTotal} marked today</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-slate-700">
                  {attendanceBreakdown.map((item) => (
                    <div key={item.label} className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 content-start">
                {attendanceBreakdown.map((item) => (
                  <CompactBreakdownCard key={item.label} item={item} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No attendance data yet"
              message={
                superAdmin
                  ? 'Platform accounts do not load school attendance metrics in this dashboard.'
                  : 'Attendance data will appear here after classes are marked for the selected date.'
              }
            />
          )}
        </DashboardPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardPanel
          title="Attendance Overview"
          action={
            hasLiveAttendance ? (
              <p className="text-sm font-medium text-slate-500">
                Updated for {formatDashboardDate(attendanceSummaryQuery.data?.date)}
              </p>
            ) : null
          }
        >
          {hasLiveAttendance ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="Classes active" value={attendanceSummaryQuery.data!.activeClasses} tone="primary" />
                <MiniStat label="Sessions opened" value={attendanceSummaryQuery.data!.sessionsOpened} tone="success" />
                <MiniStat label="Pending classes" value={attendanceSummaryQuery.data!.pendingClasses} tone="accent" />
                <MiniStat label="Coverage" value={`${attendanceSummaryQuery.data!.coveragePercent}%`} tone="danger" />
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                {attendanceBreakdown.map((item) => (
                  <ProgressRow key={item.label} item={item} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Attendance overview unavailable"
              message="The overview panel becomes active after attendance data is available for the selected date."
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Recent Activity"
          action={
            canAssessments && !superAdmin ? (
              <Link
                to="/admin/assessments"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null
          }
        >
          {recentActivity.length ? (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <RecentActivityRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent activity"
              message="Dashboard activity will appear here once attendance and assessments start moving."
            />
          )}
        </DashboardPanel>
      </div>
    </section>
  );
}

function DashboardPanel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        {action ?? null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone }: MetricCardItem) {
  const toneClassName =
    tone === 'primary'
      ? 'bg-brand-50 text-brand-600'
      : tone === 'success'
        ? 'bg-success-50 text-success-700'
        : tone === 'accent'
          ? 'bg-accent-50 text-accent-600'
          : 'bg-danger-50 text-danger-700';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
      <div className="flex items-center gap-4">
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${toneClassName}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{helper}</p>
        </div>
      </div>
    </article>
  );
}

function AssessmentDashboardRow({ assessment }: { assessment: AssessmentSummary }) {
  return (
    <Link
      to={`/admin/assessments/${assessment.id}`}
      className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-brand-200 hover:bg-brand-50/30"
    >
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{assessment.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {assessment.course.title} · {assessment.course.classRoom.name}
          </p>
          <p className="mt-2 text-sm text-slate-500">{formatAssessmentDate(assessment.dueAt)}</p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span
          className={
            assessment.isPublished
              ? 'inline-flex rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success-700'
              : 'inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-600'
          }
        >
          {assessment.isPublished ? 'Published' : 'Draft'}
        </span>
        <p className="mt-3 text-sm text-slate-500">{assessment.counts.questions} questions</p>
      </div>
    </Link>
  );
}

function QuickActionRow({ item }: { item: QuickAction }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-brand-200 hover:bg-brand-50/30"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-900">{item.label}</p>
          <p className="mt-1 text-sm text-slate-600">{item.description}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
    </Link>
  );
}

function ProgressRow({ item }: { item: BreakdownItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="font-semibold text-slate-900">{item.label}</span>
        </div>
        <span className="text-slate-600">
          {item.value} students · {item.percent}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full"
          style={{
            width: `${item.percent}%`,
            backgroundColor: item.color,
          }}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: MetricTone;
}) {
  const toneClassName =
    tone === 'primary'
      ? 'bg-brand-50 text-brand-600'
      : tone === 'success'
        ? 'bg-success-50 text-success-700'
        : tone === 'accent'
          ? 'bg-accent-50 text-accent-600'
          : 'bg-danger-50 text-danger-700';

  return (
    <div className={`rounded-xl px-4 py-4 ${toneClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function CompactBreakdownCard({ item }: { item: BreakdownItem }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${item.toneClassName}`}>
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
            <p className="text-sm text-slate-500">{item.value} students</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{item.percent}%</p>
      </div>
    </div>
  );
}

function RecentActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.icon;
  const toneClassName =
    item.tone === 'primary'
      ? 'bg-brand-50 text-brand-600'
      : item.tone === 'success'
        ? 'bg-success-50 text-success-700'
        : item.tone === 'accent'
          ? 'bg-accent-50 text-accent-600'
          : 'bg-danger-50 text-danger-700';

  const content = (
    <>
      <div className="flex min-w-0 items-start gap-3">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClassName}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
          <div className="mt-2 inline-flex items-center text-xs font-medium text-slate-500">
            <Dot className="h-4 w-4" aria-hidden="true" />
            {item.meta}
          </div>
        </div>
      </div>
      {item.to ? <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> : null}
    </>
  );

  if (item.to) {
    return (
      <Link
        to={item.to}
        className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-brand-200 hover:bg-brand-50/30"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4">{content}</div>;
}

function DashboardLinkButton({
  children,
  to,
  tone,
}: {
  children: ReactNode;
  to: string;
  tone: ActionTone;
}) {
  const className =
    tone === 'primary'
      ? 'rounded-lg border border-brand-500 bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white'
      : tone === 'accent'
        ? 'rounded-lg border border-accent-500 bg-accent-500 px-4 py-2.5 text-sm font-semibold text-slate-900'
        : 'rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700';

  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
