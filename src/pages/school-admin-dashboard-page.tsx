import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CalendarCheck2,
  FileBarChart2,
  FileText,
  ReceiptText,
  School,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
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
import { listStudentsApi, type StudentListItem } from '../features/sprint2/sprint2.api';
import { listCoursesApi } from '../features/sprint4/lms.api';
import { listLessonPlansApi, type LessonPlan } from '../features/sprint4/lesson-plans.api';
import { AnnouncementList } from '../components/ui/announcement-list';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { DataTable, type DataTableColumn } from '../components/ui/data-table';
import {
  AttentionCard,
  CardHeader,
  DashboardCard,
  EmptyPanel,
  KpiStrip,
  MeterRow,
  PageHeader,
  TextLink,
  type AttentionItem,
} from '../components/ui/dashboard-kit';
import {
  CHART_AXIS_TICK,
  CHART_GRID,
  CHART_SERIES,
  CHART_TOOLTIP_STYLE,
} from '../components/ui/chart-theme';
import { DashboardQuickActionsDropdown, type DashboardQuickActionItem } from '../components/dashboard/quick-actions-dropdown';
import { formatExact, formatPercentOf } from '../utils/format-number';


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

  const canReadStudents = hasPermission(auth.me, 'students.read');

  const studentsQuery = useQuery({
    queryKey: ['students', 'school-dashboard', selectedAcademicYearId, classFilter],
    enabled: Boolean(auth.accessToken && canReadStudents),
    queryFn: () =>
      listStudentsApi(auth.accessToken!, {
        academicYearId: selectedAcademicYearId || undefined,
        classId: classFilter !== 'all' ? classFilter : undefined,
        page: 1,
        pageSize: 8,
      }),
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

  const invoice = billingQuery.data?.invoice;
  const plansToReview = lessonPlans.filter((plan) => plan.status === 'SUBMITTED').length;
  const attention: AttentionItem[] = [
    ...(invoice && invoice.status !== 'PAID'
      ? [
          {
            key: 'invoice',
            title: 'Subscription payment due',
            detail: `${formatExact(invoice.amountDue)} ${invoice.currency} by ${formatDate(invoice.dueDate)}`,
            to: '/admin/subscription',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(data.metrics.attendanceToday === null
      ? [
          {
            key: 'attendance',
            title: 'Attendance not recorded today',
            to: '/admin/attendance',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(plansToReview
      ? [
          {
            key: 'lesson-plans',
            title: `${plansToReview}${plansToReview >= lessonPlans.length && lessonPlans.length >= 5 ? '+' : ''} lesson ${plansToReview === 1 ? 'plan' : 'plans'} to review`,
            to: '/teacher/lesson-plans',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(data.metrics.examsConducted === 0
      ? [
          {
            key: 'exams',
            title: 'No exam marks this term',
            detail: 'Class performance appears once marks are entered.',
            to: '/admin/exams',
            tone: 'info' as const,
          },
        ]
      : []),
  ];

  return (
    <section className="mx-auto max-w-[1480px] space-y-5 text-slate-900">
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

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <OverviewAnalyticsCard data={data.overviewAnalytics} />
          <QuickInsightsCard data={data.quickInsights} />
          <StudentsCard
            items={studentsQuery.data?.items ?? []}
            total={studentsQuery.data?.pagination.totalItems ?? 0}
            isLoading={studentsQuery.isPending}
            canRead={canReadStudents}
          />
          <LessonPlanAuditCard
            items={lessonPlans}
            isLoading={lessonPlansQuery.isPending}
            canRead={canReadCourses}
          />
        </div>
        <div className="min-w-0 space-y-5 xl:col-span-4">
          <AttentionCard items={attention} />
          <StudentEnrollmentCard
            data={demographicsQuery.data}
            isLoading={demographicsQuery.isPending}
          />
          <TopClassesCard items={data.topClasses} />
          <SubscriptionCard
            data={billingQuery.data}
            isLoading={billingQuery.isPending}
            canRead={canReadBilling}
          />
          <AnnouncementsCard
            items={announcements}
            isLoading={announcementsQuery.isPending}
            canRead={canReadAnnouncements}
          />
        </div>
      </div>
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
    <PageHeader
      title={data.school.displayName}
      subtitle={`Welcome back, ${userName}. ${new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`}
      actions={
        <>
          <label className="sr-only" htmlFor="dashboard-class-filter">
            Filter by class
          </label>
          <select
            id="dashboard-class-filter"
            value={classFilter}
            onChange={(event) => onClassChange(event.target.value)}
            className="h-10 w-full min-w-36 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:w-auto"
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
            className="h-10 w-full min-w-36 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:w-auto"
          >
            <option value="all">All courses</option>
            {courseOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
          {quickActions.length ? (
            <DashboardQuickActionsDropdown
              actions={quickActions.map((action) => ({
                label: action.label,
                to: action.to,
                icon: action.icon,
                description: 'Navigate to ' + action.label.toLowerCase(),
              }))}
            />
          ) : null}
        </>
      }
    />
  );
}

function MetricGrid({ data }: { data: SchoolAdminDashboardData }) {
  const change = (count: number) =>
    count > 0
      ? { hint: `+${count.toLocaleString()} this month`, positive: true }
      : { hint: 'No change this month' };

  return (
    <KpiStrip
      items={[
        {
          label: 'Students',
          value: data.metrics.totalStudents.toLocaleString(),
          to: '/admin/students',
          ...change(data.metrics.studentsChange),
        },
        {
          label: 'Teachers',
          value: data.metrics.teachers.toLocaleString(),
          to: '/admin/staff',
          ...change(data.metrics.teachersChange),
        },
        {
          label: 'Classes',
          value: data.metrics.classes.toLocaleString(),
          to: '/admin/classes',
          ...change(data.metrics.classesChange),
        },
        {
          label: 'Attendance today',
          value: formatPercent(data.metrics.attendanceToday),
          hint: data.metrics.attendanceToday === null ? 'Not recorded yet' : 'Recorded today',
          to: '/admin/attendance',
        },
        {
          label: 'Exams conducted',
          value: data.metrics.examsConducted.toLocaleString(),
          hint: 'With marks this term',
          to: '/admin/exams',
        },
      ]}
    />
  );
}

function StudentEnrollmentCard({
  data,
  isLoading,
  className,
}: {
  data?: DemographicsData;
  isLoading: boolean;
  className?: string;
}) {
  const total = data?.totalStudents ?? 0;
  const boys = data?.totalBoys ?? 0;
  const girls = data?.totalGirls ?? 0;
  const disabilityCount = data?.studentsWithDisabilities ?? 0;
  const pct = (value: number) =>
    total > 0 ? formatPercentOf(value, total) : '';

  const breakdown = [
    { label: 'Boys', value: boys },
    { label: 'Girls', value: girls },
    { label: 'Students with a disability', value: disabilityCount },
  ];

  return (
    <DashboardCard className={className}>
      <CardHeader title="Student enrollment" />
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !data ? (
        <EmptyPanel icon={Users} message="Student distribution is not available yet." />
      ) : (
        <div className="px-5 pb-5 pt-2">
          <p className="text-[26px] font-semibold leading-8 tracking-tight tabular-nums text-slate-900">
            {total.toLocaleString()}
            <span className="ml-1.5 text-[13px] font-normal tracking-normal text-slate-500">
              students
            </span>
          </p>
          <div className="mt-4 space-y-3.5">
            {breakdown.map((row) => (
              <MeterRow
                key={row.label}
                label={row.label}
                value={`${row.value.toLocaleString()}${pct(row.value) ? ` · ${pct(row.value)}` : ''}`}
                percent={total > 0 ? (row.value / total) * 100 : 0}
              />
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

const dashboardStudentColumns: DataTableColumn<StudentListItem>[] = [
  {
    key: 'student',
    header: 'Student',
    mobile: 'primary',
    render: (student) => (
      <span className="flex items-center gap-2">
        <Avatar size="sm" name={`${student.firstName} ${student.lastName}`} />
        <span className="min-w-0">
          <span className="block max-w-40 truncate text-xs font-semibold text-slate-800">
            {student.firstName} {student.lastName}
          </span>
          <span className="block truncate text-[11px] text-slate-500">{student.studentCode}</span>
        </span>
      </span>
    ),
  },
  {
    key: 'class',
    header: 'Class',
    mobile: 'secondary',
    render: (student) => (
      <span className="text-xs text-slate-600">
        {student.currentEnrollment
          ? `${student.currentEnrollment.classRoom.code} · ${student.currentEnrollment.classRoom.name}`
          : '—'}
      </span>
    ),
  },
  {
    key: 'gender',
    header: 'Gender',
    render: (student) => (
      <span className="text-xs text-slate-600">
        {student.gender
          ? student.gender.charAt(0) + student.gender.slice(1).toLowerCase()
          : '—'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (student) => (
      <Badge tone={student.isActive ? 'success' : 'neutral'}>
        {student.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

function StudentsCard({
  items,
  total,
  isLoading,
  canRead,
  className,
}: {
  items: StudentListItem[];
  total: number;
  isLoading: boolean;
  canRead: boolean;
  className?: string;
}) {
  return (
    <DashboardCard className={className}>
      <CardHeader
        title="Students"
        action={
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-slate-500">
              {total.toLocaleString()} total
            </span>
            {canRead ? <TextLink to="/admin/students">View all</TextLink> : null}
          </div>
        }
      />
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !canRead ? (
        <EmptyPanel icon={Users} message="Student access is not enabled for this account." />
      ) : (
        <div className="p-2 pb-3">
          <DataTable
            ariaLabel="Students"
            columns={dashboardStudentColumns}
            data={items}
            rowKey={(student) => student.id}
            emptyTitle="No students"
            emptyDescription="No students enrolled in the current scope yet."
            minWidth={520}
            skeletonRows={5}
            className="border-0 shadow-none"
          />
        </div>
      )}
    </DashboardCard>
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
    <DashboardCard className={className}>
      <CardHeader title="School trends" subtitle="Last 8 months" />
      <div className="grid gap-6 px-5 pb-5 pt-3 md:grid-cols-2">
        <figure className="min-w-0">
          <figcaption className="mb-2 text-[13px] font-medium text-slate-700">Total students enrolled</figcaption>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} />
                <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: '#F1F5F9' }} />
                <Bar
                  dataKey="enrollments"
                  name="Students enrolled"
                  fill={CHART_SERIES[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
        <figure className="min-w-0">
          <figcaption className="mb-2 text-[13px] font-medium text-slate-700">
            Attendance and assessment scores
          </figcaption>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_AXIS_TICK}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  name="Attendance"
                  stroke={CHART_SERIES[0]}
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3, strokeWidth: 0, fill: CHART_SERIES[0] }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="assessments"
                  name="Assessment score"
                  stroke={CHART_SERIES[1]}
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3, strokeWidth: 0, fill: CHART_SERIES[1] }}
                  activeDot={{ r: 5 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>
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
    <DashboardCard className={className}>
      <CardHeader
        title="Recent announcements"
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
        title="Lesson plan audit"
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
        title="Top performing classes"
        action={<TextLink to="/admin/class-marks">View all</TextLink>}
      />
      {items.length === 0 ? (
        <EmptyPanel
          icon={TrendingUp}
          message="Class performance appears after exam marks are entered."
        />
      ) : (
        <div className="space-y-3.5 px-5 pb-5 pt-2">
          {items.slice(0, 5).map((item) => (
            <MeterRow
              key={item.id}
              label={`${item.name} · ${item.students.toLocaleString()} students`}
              value={`${item.averageScore.toFixed(1)}%`}
              percent={item.averageScore}
            />
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
        <CardHeader title="Subscription and billing" />
        <ListSkeleton rows={3} />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className={className}>
      <CardHeader
        title="Subscription and billing"
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
        <div className="px-5 pb-5 pt-2">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-[13px] text-slate-600 text-slate-900">{data.invoice.title}</p>
            <Badge tone={data.invoice.status === 'PAID' ? 'success' : 'warning'}>
              {data.invoice.status === 'PAID' ? 'Paid' : 'Payment due'}
            </Badge>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
            {formatExact(data.invoice.amountDue)}{' '}
            <span className="text-sm font-medium text-slate-500">{data.invoice.currency}</span>
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            {data.invoice.status === 'PAID' ? 'Valid until' : 'Due'}{' '}
            {formatDate(
              data.invoice.status === 'PAID' ? data.invoice.periodEnd : data.invoice.dueDate
            )}
          </p>
        </div>
      )}
    </DashboardCard>
  );
}

function QuickInsightsCard({ data }: { data: SchoolAdminDashboardData['quickInsights'] }) {
  const insights = [
    { label: 'Average score', value: data.averageScore, hint: 'Recorded exam marks' },
    { label: 'Pass rate', value: data.passRate, hint: 'Configured pass marks' },
    { label: 'Attendance rate', value: data.attendanceRate, hint: 'Present and late' },
    { label: 'Behavior index', value: data.behaviorIndex, hint: 'Conduct marks this term' },
    { label: 'Engagement', value: data.engagementScore, hint: 'Completed activity' },
  ];

  return (
    <DashboardCard>
      <CardHeader title="Academic health" subtitle="Selected term" />
      <div className="grid gap-x-8 gap-y-5 px-5 pb-5 pt-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {insights.map((item) => (
          <MeterRow
            key={item.label}
            label={item.label}
            value={formatPercent(item.value)}
            percent={item.value ?? 0}
            hint={item.value === null ? 'No data yet' : item.hint}
          />
        ))}
      </div>
    </DashboardCard>
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
    <div className="mx-auto max-w-[1480px] space-y-5" aria-label="Loading dashboard">
      <div className="h-14 w-96 max-w-full animate-pulse rounded-lg bg-slate-200" />
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
