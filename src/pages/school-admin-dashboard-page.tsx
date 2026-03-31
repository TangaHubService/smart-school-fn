import {
  BookOpen,
  Building2,
  FileBarChart2,
  Home,
  Plus,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DashboardFilter } from '../components/dashboard/dashboard-filter';
import { LineChart } from '../components/dashboard/line-chart';
import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listAcademicYearsApi, listClassRoomsApi, listTermsApi } from '../features/sprint1/sprint1.api';
import { listCoursesApi } from '../features/sprint4/lms.api';
import {
  getSchoolAdminDashboardApi,
  type SchoolAdminDashboardData,
  type SchoolAdminDashboardFilters,
} from '../features/dashboard/dashboard.api';
import { useQuery } from '@tanstack/react-query';

function formatChange(change: number): string {
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change} This Week`;
}

const SCHOOL_ADMIN_QUICK_ACTIONS: DashboardQuickActionItem[] = [
  {
    label: 'Add Student',
    description: 'Open student management and add a new learner.',
    icon: Plus,
    to: '/admin/students',
  },
  {
    label: 'Add Teacher',
    description: 'Open staff management and invite a teacher.',
    icon: Plus,
    to: '/admin/staff',
  },
  {
    label: 'Create Exam',
    description: 'Open examinations and prepare a new exam.',
    icon: Building2,
    to: '/admin/exams',
  },
  {
    label: 'Open Courses',
    description: 'Review courses and lesson content.',
    icon: BookOpen,
    to: '/admin/courses',
  },
];

export function SchoolAdminDashboardPage() {
  const auth = useAuth();
  const [analyticsTab, setAnalyticsTab] = useState<'weekly' | 'monthly'>('weekly');

  const [filters, setFilters] = useState<SchoolAdminDashboardFilters>({
    academicYear: '',
    term: 'first',
    classFilter: 'all',
    findFilter: 'all',
  });
  const [appliedFilters, setAppliedFilters] = useState<SchoolAdminDashboardFilters>(filters);

  function termCodeFromSequence(sequence: number): string {
    if (sequence === 1) return 'first';
    if (sequence === 2) return 'second';
    if (sequence === 3) return 'third';
    return `term-${sequence}`;
  }

  const academicYearsQuery = useQuery({
    queryKey: ['academic-years', 'school-admin-dashboard'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const academicYearOptions = useMemo(() => {
    const years = (Array.isArray(academicYearsQuery.data) ? academicYearsQuery.data : []) as any[];
    return years.map((y) => ({ id: String(y.id), name: String(y.name) }));
  }, [academicYearsQuery.data]);

  const selectedAcademicYearId = filters.academicYear;

  const termOptions = useQuery({
    queryKey: ['terms', 'school-admin-dashboard', selectedAcademicYearId],
    enabled: Boolean(auth.accessToken && selectedAcademicYearId),
    queryFn: () =>
      listTermsApi(auth.accessToken!, {
        academicYearId: selectedAcademicYearId!,
      }),
  });

  const termOptionsData = useMemo(() => {
    return (Array.isArray(termOptions.data) ? termOptions.data : []) as any[];
  }, [termOptions.data]);

  const classRoomsQuery = useQuery({
    queryKey: ['class-rooms', 'school-admin-dashboard'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const classOptions = useMemo(() => {
    const rooms = (Array.isArray(classRoomsQuery.data) ? classRoomsQuery.data : []) as any[];
    return rooms.map((r) => ({
      id: String(r.id),
      name: `${r.code ?? ''}${r.code && r.name ? ' - ' : ''}${r.name ?? ''}`.trim(),
    }));
  }, [classRoomsQuery.data]);

  const coursesQuery = useQuery({
    queryKey: [
      'courses',
      'school-admin-dashboard',
      selectedAcademicYearId,
      filters.classFilter,
    ],
    enabled: Boolean(auth.accessToken && selectedAcademicYearId),
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        academicYearId: selectedAcademicYearId!,
        classId: filters.classFilter !== 'all' ? filters.classFilter : undefined,
        page: 1,
        pageSize: 50,
      }),
  });

  const courseOptions = useMemo<Array<{ id: string; title: string }>>(() => {
    const items = Array.isArray((coursesQuery.data as any)?.items) ? (coursesQuery.data as any).items : [];
    return (items as Array<{ id: string | number; title: string }>).map((c) => ({
      id: String(c.id),
      title: String(c.title),
    }));
  }, [coursesQuery.data]);

  useEffect(() => {
    if (!academicYearOptions.length) return;
    if (filters.academicYear && academicYearOptions.some((y) => y.id === filters.academicYear)) return;
    const next = academicYearOptions[0]?.id;
    if (!next) return;
    setFilters((prev) => ({ ...prev, academicYear: next }));
    setAppliedFilters((prev) => ({ ...prev, academicYear: next }));
  }, [academicYearOptions, filters.academicYear]);

  useEffect(() => {
    if (!termOptionsData.length) return;
    const termCodes = new Set(termOptionsData.map((t) => termCodeFromSequence(Number(t.sequence))));
    if (!filters.term || termCodes.has(filters.term)) return;
    const next = termOptionsData[0] ? termCodeFromSequence(Number(termOptionsData[0].sequence)) : 'first';
    setFilters((prev) => ({ ...prev, term: next }));
    setAppliedFilters((prev) => ({ ...prev, term: next }));
  }, [termOptionsData, filters.term]);

  useEffect(() => {
    if (!classOptions.length) return;
    if (filters.classFilter === 'all') return;
    if (classOptions.some((c) => c.id === filters.classFilter)) return;
    setFilters((prev) => ({ ...prev, classFilter: 'all' }));
    setAppliedFilters((prev) => ({ ...prev, classFilter: 'all' }));
  }, [classOptions, filters.classFilter]);

  useEffect(() => {
    if (!courseOptions.length) return;
    if (filters.findFilter === 'all') return;
    if (!filters.findFilter) return;
    if (courseOptions.some(({ id }) => id === filters.findFilter)) return;
    setFilters((prev) => ({ ...prev, findFilter: 'all' }));
    setAppliedFilters((prev) => ({ ...prev, findFilter: 'all' }));
  }, [courseOptions, filters.findFilter]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'school-admin', appliedFilters],
    enabled: Boolean(auth.accessToken),
    queryFn: () => getSchoolAdminDashboardApi(auth.accessToken!, appliedFilters),
  });

  if (isError) {
    return (
      <StateView
        title="Could not load dashboard"
        message="Retry to load the school admin dashboard data."
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
      <div className="flex flex-col gap-3">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="min-w-0 text-2xl font-bold text-slate-900">
              Dashboard
            </h1>
            <DashboardQuickActionsDropdown actions={SCHOOL_ADMIN_QUICK_ACTIONS} />
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Home className="h-5 w-5" />
            <span className="font-medium">
              {data.school.displayName}
              {data.school.city ? `, ${data.school.city}` : ''}
            </span>
          </div>
        </div>
        <div className="w-full">
          <DashboardFilter
            variant="school-admin"
            academicYear={filters.academicYear}
            term={filters.term}
            classFilter={filters.classFilter}
            findFilter={filters.findFilter}
            academicYearOptions={academicYearOptions}
            termOptions={termOptionsData}
            classOptions={classOptions}
            courseOptions={courseOptions}
            onAcademicYearChange={(value) => setFilters((prev) => ({ ...prev, academicYear: value }))}
            onTermChange={(value) => setFilters((prev) => ({ ...prev, term: value }))}
            onClassChange={(value) => setFilters((prev) => ({ ...prev, classFilter: value }))}
            onFindChange={(value) => setFilters((prev) => ({ ...prev, findFilter: value }))}
            onApply={() => setAppliedFilters({ ...filters })}
            onReset={() => {
              const defaultAcademicYear = academicYearOptions[0]?.id ?? '';
              const defaultTerm =
                termOptionsData[0] ? termCodeFromSequence(Number(termOptionsData[0].sequence)) : 'first';
              const reset: SchoolAdminDashboardFilters = {
                academicYear: defaultAcademicYear,
                term: defaultTerm,
                classFilter: 'all',
                findFilter: 'all',
              };
              setFilters(reset);
              setAppliedFilters({ ...reset });
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SchoolMetricCard
          icon={Users}
          label="Total Students"
          value={data.metrics.totalStudents}
          change={data.metrics.studentsChange}
          color="green"
        />
        <SchoolMetricCard
          icon={User}
          label="Teachers"
          value={data.metrics.teachers}
          change={data.metrics.teachersChange}
          color="orange"
        />
        <SchoolMetricCard
          icon={Building2}
          label="Classes"
          value={data.metrics.classes}
          change={data.metrics.classesChange}
          color="blue"
        />
        <SchoolMetricCard
          icon={BookOpen}
          label="Subjects"
          value={data.metrics.subjects}
          color="blue"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SchoolUserOverviewCard data={data} />
        <SchoolSystemAnalyticsCard
          data={data}
          tab={analyticsTab}
          onTabChange={setAnalyticsTab}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SchoolUpcomingExamsCard data={data} />
        <SchoolLatestReportsCard data={data} />
      </div>
    </section>
  );
}

function SchoolMetricCard({
  icon: Icon,
  label,
  value,
  change,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  change?: number;
  color: 'green' | 'orange' | 'blue';
}) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
  };
  const changeColor =
    change !== undefined && change >= 0 ? 'text-green-600' : 'text-slate-600';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${colorClasses[color]}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {change !== undefined && (
            <p className={`text-xs font-medium ${changeColor}`}>
              {formatChange(change)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function SchoolUserOverviewCard({ data }: { data: SchoolAdminDashboardData }) {
  const items = [
    {
      label: 'Students',
      value: data.userOverview.students,
      change: data.userOverview.studentsChange,
      color: 'green',
    },
    {
      label: 'Teachers',
      value: data.userOverview.teachers,
      change: data.userOverview.teachersChange,
      color: 'orange',
    },
    {
      label: 'Parents',
      value: data.userOverview.parents,
      change: data.userOverview.parentsChange,
      color: 'pink',
    },
    {
      label: 'Active Accounts',
      value: data.userOverview.activeAccounts,
      color: 'blue',
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">User Overview</h2>
        <Link to="/admin/students" className="text-sm font-semibold text-brand-500">
          View All &gt;
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
          >
            <Users className="h-5 w-5 text-slate-500" />
            <p className="mt-2 text-xs font-medium text-slate-600">{item.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {item.value.toLocaleString()}
            </p>
            {item.change !== undefined && (
              <p
                className={`text-xs font-medium ${
                  item.change >= 0 ? 'text-green-600' : 'text-slate-600'
                }`}
              >
                {formatChange(item.change)}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SchoolSystemAnalyticsCard({
  data,
  tab,
  onTabChange,
}: {
  data: SchoolAdminDashboardData;
  tab: 'weekly' | 'monthly';
  onTabChange: (t: 'weekly' | 'monthly') => void;
}) {
  const chartData = tab === 'weekly' ? data.systemAnalytics.weekly : data.systemAnalytics.monthly;
  const lines = [
    { key: 'logins', color: '#1E5AA8', label: 'Logins' },
    { key: 'attendance', color: '#F59E0B', label: 'Attendance' },
    { key: 'assignments', color: '#10B981', label: 'Assignments Submitted' },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">System Analytics</h2>
        <Link to="/admin/attendance" className="text-sm font-semibold text-brand-500">
          View All &gt;
        </Link>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onTabChange('weekly')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'weekly'
              ? 'bg-brand-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Weekly
        </button>
        <button
          type="button"
          onClick={() => onTabChange('monthly')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'monthly'
              ? 'bg-brand-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Monthly
        </button>
      </div>
      <div className="mt-4">
        <LineChart data={chartData} lines={lines} height={180} />
      </div>
    </section>
  );
}

function SchoolUpcomingExamsCard({ data }: { data: SchoolAdminDashboardData }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Upcoming Exams</h2>
      <div className="mt-4 space-y-3">
        {data.upcomingExams.length ? (
          data.upcomingExams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <div>
                  <p className="font-semibold text-slate-900">{exam.title}</p>
                  <p className="text-sm text-slate-500">{exam.relativeDate}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-600">{exam.time}</p>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">No upcoming exams</p>
        )}
      </div>
    </section>
  );
}

function SchoolLatestReportsCard({ data }: { data: SchoolAdminDashboardData }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Latest Reports</h2>
        <Link to="/admin" className="text-sm font-semibold text-brand-500">
          View All &gt;
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.latestReports.map((report) => (
          <div
            key={report.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
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
          </div>
        ))}
      </div>
    </section>
  );
}
