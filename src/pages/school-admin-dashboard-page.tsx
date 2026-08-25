import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  BarChart3,
  Bell,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileBarChart2,
  FileText,
  GraduationCap,
  HeartPulse,
  ReceiptText,
  School,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { StateView } from '../components/state-view';
import { useAcademicYear } from '../contexts/academic-year-context';
import {
  listAnnouncementsApi,
  type AnnouncementItem,
} from '../features/announcements/announcements.api';
import { useAuth } from '../features/auth/auth.context';
import { hasPermission } from '../features/auth/auth-helpers';
import {
  getMySubscriptionInvoiceApi,
  type MySubscriptionInvoiceResponse,
} from '../features/billing/billing.api';
import {
  getDemographicsApi,
  getSchoolAdminDashboardApi,
  type DemographicsData,
  type SchoolAdminDashboardData,
  type SchoolAdminDashboardFilters,
} from '../features/dashboard/dashboard.api';
import { listClassRoomsApi } from '../features/sprint1/sprint1.api';
import { listCoursesApi } from '../features/sprint4/lms.api';
import { listLessonPlansApi, type LessonPlan } from '../features/sprint4/lesson-plans.api';
import { AnnouncementList } from '../components/ui/announcement-list';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { DataTable, type DataTableColumn } from '../components/ui/data-table';
import { InsightGrid } from '../components/ui/insight-card';
import { StatCard } from '../components/ui/stat-card';

const CARD_CLASS =
  'rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.055)]';
const GRADE_COLORS = ['#2563EB', '#22C55E', '#8B5CF6', '#F97316', '#EC4899'];

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function plainText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function SchoolAdminDashboardPage() {
  const auth = useAuth();
  const academicYear = useAcademicYear();
  const [classFilter, setClassFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  const selectedAcademicYearId =
    academicYear.academicYearId ??
    academicYear.availableYears.find((year) => year.isCurrent)?.id ??
    academicYear.availableYears[0]?.id ??
    '';
  const selectedTermId = academicYear.termId ?? '';

  const classRoomsQuery = useQuery({
    queryKey: ['class-rooms', 'school-dashboard'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const classOptions = useMemo(() => {
    const rooms = (Array.isArray(classRoomsQuery.data) ? classRoomsQuery.data : []) as Array<{
      id: string;
      code?: string;
      name?: string;
    }>;
    return rooms.map((room) => ({
      id: String(room.id),
      name: `${room.code ?? ''}${room.code && room.name ? ' · ' : ''}${room.name ?? ''}`.trim(),
    }));
  }, [classRoomsQuery.data]);

  const coursesQuery = useQuery({
    queryKey: ['courses', 'school-dashboard', selectedAcademicYearId, classFilter],
    enabled: Boolean(auth.accessToken && selectedAcademicYearId),
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        academicYearId: selectedAcademicYearId,
        classId: classFilter !== 'all' ? classFilter : undefined,
        page: 1,
        pageSize: 100,
      }),
  });

  const courseOptions = useMemo(() => {
    const response = coursesQuery.data as
      | { items?: Array<{ id: string | number; title: string }> }
      | undefined;
    const items = Array.isArray(response?.items) ? response.items : [];
    return items.map((course) => ({ id: String(course.id), title: String(course.title) }));
  }, [coursesQuery.data]);

  useEffect(() => {
    setCourseFilter('all');
  }, [classFilter, selectedAcademicYearId]);

  useEffect(() => {
    if (classFilter !== 'all' && !classOptions.some((option) => option.id === classFilter)) {
      setClassFilter('all');
    }
  }, [classFilter, classOptions]);

  const dashboardFilters = useMemo<SchoolAdminDashboardFilters>(
    () => ({
      academicYear: selectedAcademicYearId || undefined,
      term: selectedTermId || undefined,
      classFilter,
      findFilter: courseFilter,
    }),
    [classFilter, courseFilter, selectedAcademicYearId, selectedTermId]
  );

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'school-admin', dashboardFilters],
    enabled: Boolean(auth.accessToken),
    queryFn: () => getSchoolAdminDashboardApi(auth.accessToken!, dashboardFilters),
  });

  const demographicsQuery = useQuery({
    queryKey: ['dashboard', 'demographics', selectedAcademicYearId, selectedTermId],
    enabled: Boolean(auth.accessToken),
    queryFn: () =>
      getDemographicsApi(auth.accessToken!, {
        academicYear: selectedAcademicYearId || undefined,
        term: selectedTermId || undefined,
      }),
  });

  const canReadCourses = hasPermission(auth.me, 'courses.read');
  const canReadAnnouncements =
    hasPermission(auth.me, 'announcements.read') || hasPermission(auth.me, 'announcements.manage');
  const canReadBilling = hasPermission(auth.me, 'billing.read');

  const lessonPlansQuery = useQuery({
    queryKey: ['lesson-plans', 'school-dashboard', selectedAcademicYearId, classFilter],
    enabled: Boolean(auth.accessToken && selectedAcademicYearId && canReadCourses),
    queryFn: () =>
      listLessonPlansApi(auth.accessToken!, {
        academicYearId: selectedAcademicYearId,
        classRoomId: classFilter !== 'all' ? classFilter : undefined,
        page: 1,
        pageSize: 5,
      }),
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'school-dashboard'],
    enabled: Boolean(auth.accessToken && canReadAnnouncements),
    queryFn: () =>
      listAnnouncementsApi(auth.accessToken!, {
        publishedOnly: true,
        page: 1,
        pageSize: 4,
      }),
  });

  const billingQuery = useQuery({
    queryKey: ['billing', 'invoice', 'school-dashboard'],
    enabled: Boolean(auth.accessToken && canReadBilling),
    queryFn: () => getMySubscriptionInvoiceApi(auth.accessToken!),
  });

  if (dashboardQuery.isError) {
    return (
      <StateView
        title="Could not load dashboard"
        message="The live school data could not be loaded. Please retry."
        action={
          <button
            type="button"
            onClick={() => void dashboardQuery.refetch()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (dashboardQuery.isPending || !dashboardQuery.data) {
    return <DashboardSkeleton />;
  }

  const data = dashboardQuery.data;
  const userName = auth.me?.firstName || auth.me?.email || 'Administrator';
  const announcements = announcementsQuery.data?.items ?? [];
  const lessonPlans = lessonPlansQuery.data?.items ?? [];

  return (
    <section className="mx-auto max-w-[1680px] space-y-4 text-slate-900">
      <WelcomePanel
        data={data}
        userName={userName}
        classFilter={classFilter}
        courseFilter={courseFilter}
        classOptions={classOptions}
        courseOptions={courseOptions}
        onClassChange={setClassFilter}
        onCourseChange={setCourseFilter}
        me={auth.me}
      />

      <MetricGrid data={data} />

      <div className="grid gap-4 xl:grid-cols-12">
        <OverviewAnalyticsCard data={data.overviewAnalytics} className="xl:col-span-6" />
        <SystemSummaryCard data={demographicsQuery.data} className="xl:col-span-3" />
        <AnnouncementsCard
          items={announcements}
          isLoading={announcementsQuery.isPending}
          canRead={canReadAnnouncements}
          className="xl:col-span-3"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <LessonPlanAuditCard
          items={lessonPlans}
          isLoading={lessonPlansQuery.isPending}
          canRead={canReadCourses}
          className="xl:col-span-5"
        />
        <TopClassesCard items={data.topClasses} className="xl:col-span-3" />
        <SubscriptionCard
          data={billingQuery.data}
          isLoading={billingQuery.isPending}
          canRead={canReadBilling}
          className="xl:col-span-4"
        />
      </div>

      <QuickInsightsCard data={data.quickInsights} />
    </section>
  );
}

function WelcomePanel({
  data,
  userName,
  classFilter,
  courseFilter,
  classOptions,
  courseOptions,
  onClassChange,
  onCourseChange,
  me,
}: {
  data: SchoolAdminDashboardData;
  userName: string;
  classFilter: string;
  courseFilter: string;
  classOptions: Array<{ id: string; name: string }>;
  courseOptions: Array<{ id: string; title: string }>;
  onClassChange: (value: string) => void;
  onCourseChange: (value: string) => void;
  me: ReturnType<typeof useAuth>['me'];
}) {
  const quickActions = [
    {
      label: 'Add Student',
      icon: UserPlus,
      to: '/admin/students',
      permission: 'students.read',
      tone: 'text-blue-600',
    },
    {
      label: 'Add Teacher',
      icon: Users,
      to: '/admin/staff',
      permission: 'users.read',
      tone: 'text-emerald-600',
    },
    {
      label: 'Add Class',
      icon: School,
      to: '/admin/classes',
      permission: 'students.read',
      tone: 'text-violet-600',
    },
    {
      label: 'Record Attendance',
      icon: CalendarCheck2,
      to: '/admin/attendance',
      permission: 'attendance.read',
      tone: 'text-orange-600',
    },
    {
      label: 'View Reports',
      icon: FileBarChart2,
      to: '/admin/report-cards',
      permission: 'report_cards.read',
      tone: 'text-blue-600',
    },
  ].filter((action) => hasPermission(me, action.permission));

  return (
    <div className={clsx(CARD_CLASS, 'overflow-hidden')}>
      <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {data.school.logoUrl ? (
            <img
              src={data.school.logoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-600">
              <School className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-950">
              Welcome back, {userName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Here&apos;s what&apos;s happening at {data.school.displayName} today.
            </p>
          </div>
        </div>

        {quickActions.length ? (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 hover:text-slate-950"
              >
                <action.icon className={clsx('h-4 w-4', action.tone)} />
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center">
        <span className="mr-auto text-xs font-medium text-slate-500">Dashboard scope</span>
        <label className="sr-only" htmlFor="dashboard-class-filter">
          Filter by class
        </label>
        <select
          id="dashboard-class-filter"
          value={classFilter}
          onChange={(event) => onClassChange(event.target.value)}
          className="h-9 min-w-44 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All classes</option>
          {classOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="dashboard-course-filter">
          Filter by course
        </label>
        <select
          id="dashboard-course-filter"
          value={courseFilter}
          onChange={(event) => onCourseChange(event.target.value)}
          className="h-9 min-w-44 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All courses</option>
          {courseOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function MetricGrid({ data }: { data: SchoolAdminDashboardData }) {
  const metrics = [
    {
      label: 'Total Students',
      value: data.metrics.totalStudents.toLocaleString(),
      description: data.metrics.studentsChange
        ? `+${data.metrics.studentsChange.toLocaleString()} this month`
        : 'No new students this month',
      icon: Users,
      tone: 'brand' as const,
      to: '/admin/students',
    },
    {
      label: 'Total Teachers',
      value: data.metrics.teachers.toLocaleString(),
      description: data.metrics.teachersChange
        ? `+${data.metrics.teachersChange.toLocaleString()} this month`
        : 'No new teachers this month',
      icon: GraduationCap,
      tone: 'success' as const,
      to: '/admin/staff',
    },
    {
      label: 'Total Classes',
      value: data.metrics.classes.toLocaleString(),
      description: data.metrics.classesChange
        ? `+${data.metrics.classesChange.toLocaleString()} this month`
        : 'No new classes this month',
      icon: School,
      tone: 'purple' as const,
      to: '/admin/classes',
    },
    {
      label: 'Attendance Today',
      value: formatPercent(data.metrics.attendanceToday),
      description:
        data.metrics.attendanceToday === null ? 'No attendance recorded yet' : 'Recorded today',
      icon: CalendarCheck2,
      tone: 'orange' as const,
      to: '/admin/attendance',
    },
    {
      label: 'Exams Conducted',
      value: data.metrics.examsConducted.toLocaleString(),
      description: 'With marks in the selected term',
      icon: FileBarChart2,
      tone: 'brand' as const,
      to: '/admin/exams',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <StatCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}

function OverviewAnalyticsCard({
  data,
  className,
}: {
  data: SchoolAdminDashboardData['overviewAnalytics'];
  className?: string;
}) {
  return (
    <DashboardCard className={clsx('min-h-[330px]', className)}>
      <CardHeader
        title="Overview Analytics"
        action={<span className="text-[11px] font-medium text-slate-500">Last 8 months</span>}
      />
      <div className="h-[275px] px-2 pb-4 pt-2 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 14, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                boxShadow: '0 10px 30px rgba(15,23,42,.08)',
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
            />
            <Line
              type="monotone"
              dataKey="enrollments"
              name="Enrollments"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#2563EB' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="attendance"
              name="Attendance %"
              stroke="#16A34A"
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 3, fill: '#16A34A' }}
            />
            <Line
              type="monotone"
              dataKey="assessments"
              name="Assessment score %"
              stroke="#7C3AED"
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 3, fill: '#7C3AED' }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
}

function SystemSummaryCard({ data, className }: { data?: DemographicsData; className?: string }) {
  const summary = useMemo(() => {
    const rows = (data?.byGrade ?? [])
      .map((row) => ({ name: row.grade, value: row.boys + row.girls }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
    if (rows.length <= 5) return rows;
    return [
      ...rows.slice(0, 4),
      { name: 'Other', value: rows.slice(4).reduce((sum, row) => sum + row.value, 0) },
    ];
  }, [data]);

  return (
    <DashboardCard className={clsx('min-h-[330px]', className)}>
      <CardHeader title="System Summary" />
      {!data ? (
        <EmptyPanel icon={School} message="Student distribution is not available yet." />
      ) : summary.length === 0 ? (
        <EmptyPanel icon={School} message="No enrolled students in this scope." />
      ) : (
        <div className="grid gap-1 px-4 pb-4 pt-2 sm:grid-cols-[minmax(140px,1fr)_1fr] xl:grid-cols-1 2xl:grid-cols-[minmax(140px,1fr)_1fr]">
          <div className="relative h-44 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={summary}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={1}
                  stroke="none"
                >
                  {summary.map((row, index) => (
                    <Cell key={row.name} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, borderColor: '#E2E8F0', fontSize: 11 }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <p className="text-lg font-bold tabular-nums text-slate-950">
                {data.totalStudents.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">Students</p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-2.5">
            {summary.map((row, index) => {
              const percentage = data.totalStudents ? (row.value / data.totalStudents) * 100 : 0;
              return (
                <div key={row.name} className="flex min-w-0 items-start gap-2">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: GRADE_COLORS[index % GRADE_COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-slate-700">{row.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {row.value.toLocaleString()} ({percentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

function AnnouncementsCard({
  items,
  isLoading,
  canRead,
  className,
}: {
  items: AnnouncementItem[];
  isLoading: boolean;
  canRead: boolean;
  className?: string;
}) {
  return (
    <DashboardCard className={clsx('min-h-[330px]', className)}>
      <CardHeader
        title="Recent Announcements"
        action={canRead ? <TextLink to="/admin/announcements">View all</TextLink> : undefined}
      />
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !canRead ? (
        <EmptyPanel icon={Bell} message="Announcement access is not enabled for this account." />
      ) : (
        <AnnouncementList
          className="px-4 pb-2"
          emptyMessage="No published announcements yet."
          excerptMaxLength={90}
          items={items.slice(0, 4).map((item) => ({
            id: item.id,
            title: item.title,
            excerpt: plainText(item.body),
            publishedAt: item.publishedAt ?? item.createdAt,
            priority: item.priority,
            to: `/admin/announcements/${item.id}`,
          }))}
        />
      )}
    </DashboardCard>
  );
}

const LESSON_PLAN_STATUS_TONES: Record<string, 'neutral' | 'brand' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  SUBMITTED: 'brand',
  APPROVED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'neutral',
};

const lessonPlanColumns: DataTableColumn<LessonPlan>[] = [
  {
    key: 'teacher',
    header: 'Teacher',
    mobile: 'primary',
    render: (plan) => (
      <span className="flex items-center gap-2">
        <Avatar
          size="sm"
          name={`${plan.teacher.firstName} ${plan.teacher.lastName}`}
        />
        <span className="max-w-36 truncate text-xs font-semibold text-slate-800">
          {plan.teacher.firstName} {plan.teacher.lastName}
        </span>
      </span>
    ),
  },
  {
    key: 'classRoom',
    header: 'Class',
    mobile: 'secondary',
    render: (plan) => <span className="text-xs text-slate-600">{plan.classRoom.code}</span>,
  },
  {
    key: 'subject',
    header: 'Subject',
    render: (plan) => (
      <span className="block max-w-32 truncate text-xs text-slate-600">{plan.subject.name}</span>
    ),
  },
  {
    key: 'updatedAt',
    header: 'Updated',
    render: (plan) => (
      <span className="text-xs text-slate-500">{formatDate(plan.updatedAt)}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (plan) => (
      <Badge tone={LESSON_PLAN_STATUS_TONES[plan.status] ?? 'neutral'}>
        {plan.status.charAt(0) + plan.status.slice(1).toLowerCase()}
      </Badge>
    ),
  },
];

function LessonPlanAuditCard({
  items,
  isLoading,
  canRead,
  className,
}: {
  items: LessonPlan[];
  isLoading: boolean;
  canRead: boolean;
  className?: string;
}) {
  return (
    <DashboardCard className={className}>
      <CardHeader
        title="Lesson Plan Audit"
        action={canRead ? <TextLink to="/teacher/lesson-plans">View all</TextLink> : undefined}
      />
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !canRead ? (
        <EmptyPanel icon={FileText} message="Course access is required to view lesson plans." />
      ) : (
        <div className="p-2 pb-3">
          <DataTable
            ariaLabel="Lesson plan audit"
            columns={lessonPlanColumns}
            data={items.slice(0, 5)}
            rowKey={(plan) => plan.id}
            emptyTitle="No lesson plans"
            emptyDescription="No lesson plans in this academic year yet."
            minWidth={560}
            skeletonRows={4}
            className="border-0 shadow-none"
          />
        </div>
      )}
    </DashboardCard>
  );
}

function TopClassesCard({
  items,
  className,
}: {
  items: SchoolAdminDashboardData['topClasses'];
  className?: string;
}) {
  return (
    <DashboardCard className={className}>
      <CardHeader
        title="Top Performing Classes"
        action={<TextLink to="/admin/class-marks">View all</TextLink>}
      />
      {items.length === 0 ? (
        <EmptyPanel
          icon={TrendingUp}
          message="Class performance appears after exam marks are entered."
        />
      ) : (
        <div className="space-y-3 px-4 pb-5 pt-3">
          <div className="grid grid-cols-[1fr_2fr_auto] gap-3 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Class</span>
            <span>Average score</span>
            <span>Students</span>
          </div>
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_2fr_auto] items-center gap-3">
              <span className="truncate text-[11px] font-semibold text-slate-800">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="w-10 text-right text-[10px] font-medium tabular-nums text-slate-700">
                  {item.averageScore.toFixed(1)}%
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, item.averageScore))}%`,
                    }}
                  />
                </span>
              </div>
              <span className="text-[10px] tabular-nums text-slate-600">
                {item.students.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

function SubscriptionCard({
  data,
  isLoading,
  canRead,
  className,
}: {
  data?: MySubscriptionInvoiceResponse;
  isLoading: boolean;
  canRead: boolean;
  className?: string;
}) {
  if (isLoading) {
    return (
      <DashboardCard className={className}>
        <CardHeader title="Subscription & Billing" />
        <ListSkeleton rows={3} />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className={className}>
      <CardHeader
        title="Subscription & Billing"
        action={canRead ? <TextLink to="/admin/subscription">View invoice</TextLink> : undefined}
      />
      {!canRead ? (
        <EmptyPanel icon={ReceiptText} message="Billing access is not enabled for this account." />
      ) : !data ? (
        <EmptyPanel
          icon={ReceiptText}
          message="Subscription information is currently unavailable."
        />
      ) : (
        <div className="m-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-blue-700">{data.invoice.title}</p>
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-[9px] font-bold',
                    data.invoice.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {data.invoice.status}
                </span>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-600">
                {data.invoice.amountDue.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                {data.invoice.currency}
              </p>
              <p className="mt-3 text-[9px] font-medium uppercase tracking-wide text-slate-400">
                {data.invoice.status === 'PAID' ? 'Valid until' : 'Payment due'}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                {formatDate(
                  data.invoice.status === 'PAID' ? data.invoice.periodEnd : data.invoice.dueDate
                )}
              </p>
            </div>
            <span
              className={clsx(
                'grid h-20 w-20 shrink-0 place-content-center rounded-full border-8 border-white text-center shadow-sm',
                data.invoice.status === 'PAID'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              )}
            >
              {data.invoice.status === 'PAID' ? (
                <CheckCircle2 className="mx-auto h-6 w-6" />
              ) : (
                <ReceiptText className="mx-auto h-6 w-6" />
              )}
              <span className="mt-1 text-[10px] font-bold">{data.invoice.status}</span>
            </span>
          </div>
          <Link
            to="/admin/subscription"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <ReceiptText className="h-4 w-4" />
            Open invoice
          </Link>
        </div>
      )}
    </DashboardCard>
  );
}

function QuickInsightsCard({ data }: { data: SchoolAdminDashboardData['quickInsights'] }) {
  const insights = [
    {
      key: 'average-score',
      label: 'Average Score',
      value: formatPercent(data.averageScore),
      hint: 'Recorded exam marks',
      icon: BarChart3,
      tone: 'brand' as const,
    },
    {
      key: 'pass-rate',
      label: 'Pass Rate',
      value: formatPercent(data.passRate),
      hint: 'Based on configured pass marks',
      icon: ClipboardCheck,
      tone: 'success' as const,
    },
    {
      key: 'attendance-rate',
      label: 'Attendance Rate',
      value: formatPercent(data.attendanceRate),
      hint: 'Present and late records',
      icon: CalendarDays,
      tone: 'purple' as const,
    },
    {
      key: 'behavior-index',
      label: 'Behavior Index',
      value: formatPercent(data.behaviorIndex),
      hint: 'Conduct marks for the term',
      icon: Sparkles,
      tone: 'orange' as const,
    },
    {
      key: 'engagement',
      label: 'Engagement Score',
      value: formatPercent(data.engagementScore),
      hint: 'Completed learning activity',
      icon: HeartPulse,
      tone: 'pink' as const,
    },
  ];

  return (
    <DashboardCard>
      <CardHeader title="Quick Insights" />
      <InsightGrid items={insights} className="pb-1 pt-1" />
    </DashboardCard>
  );
}

function DashboardCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx(CARD_CLASS, 'min-w-0 overflow-hidden', className)}>{children}</section>
  );
}

function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <h2 className="text-sm font-semibold tracking-tight text-slate-950">{title}</h2>
      {action}
    </div>
  );
}

function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-[10px] font-semibold text-blue-600 transition hover:text-blue-800"
    >
      {children}
    </Link>
  );
}

function EmptyPanel({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 max-w-xs text-xs leading-5 text-slate-500">{message}</p>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1680px] space-y-4" aria-label="Loading dashboard">
      <div className="h-36 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="h-80 animate-pulse rounded-xl bg-slate-200 xl:col-span-6" />
        <div className="h-80 animate-pulse rounded-xl bg-slate-200 xl:col-span-3" />
        <div className="h-80 animate-pulse rounded-xl bg-slate-200 xl:col-span-3" />
      </div>
    </div>
  );
}
