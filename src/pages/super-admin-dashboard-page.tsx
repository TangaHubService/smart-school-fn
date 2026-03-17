import {
  BookOpen,
  Building2,
  CheckCircle2,
  FileBarChart2,
  Headphones,
  LayoutGrid,
  Lock,
  Plus,
  Settings,
  User,
  Users,
  Video,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DashboardFilter } from '../components/dashboard/dashboard-filter';
import { LineChart } from '../components/dashboard/line-chart';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  getSuperAdminDashboardApi,
  getSuperAdminDashboardFiltersApi,
  type SuperAdminDashboardData,
  type SuperAdminDashboardFilters,
  type SuperAdminDashboardFilterOptions,
} from '../features/dashboard/dashboard.api';
import { useQuery } from '@tanstack/react-query';

const USER_OVERVIEW_ITEMS: Record<
  string,
  { icon: typeof User; color: string }
> = {
  administrators: { icon: Lock, color: 'bg-purple-100 text-purple-600' },
  schools: { icon: Building2, color: 'bg-blue-100 text-blue-600' },
  teachers: { icon: User, color: 'bg-orange-100 text-orange-600' },
  students: { icon: Video, color: 'bg-green-100 text-green-600' },
  parents: { icon: Users, color: 'bg-pink-100 text-pink-600' },
  classes: { icon: LayoutGrid, color: 'bg-teal-100 text-teal-600' },
  subjects: { icon: BookOpen, color: 'bg-orange-100 text-orange-600' },
  activeAccounts: { icon: User, color: 'bg-blue-100 text-blue-600' },
};

export function SuperAdminDashboardPage() {
  const auth = useAuth();
  const [analyticsTab, setAnalyticsTab] = useState<'weekly' | 'monthly'>('weekly');
  const [filters, setFilters] = useState<SuperAdminDashboardFilters>({
    academicYear: '2023/2024',
    term: 'first',
    region: 'all-regions',
    school: 'all-schools',
    status: 'active',
  });
  const [appliedFilters, setAppliedFilters] = useState<SuperAdminDashboardFilters>(filters);

  const filtersQuery = useQuery<SuperAdminDashboardFilterOptions>({
    queryKey: ['dashboard', 'super-admin', 'filters'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => getSuperAdminDashboardFiltersApi(auth.accessToken!),
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'super-admin', appliedFilters],
    enabled: Boolean(auth.accessToken),
    queryFn: () => getSuperAdminDashboardApi(auth.accessToken!, appliedFilters),
  });

  if (isError) {
    return (
      <StateView
        title="Could not load dashboard"
        message="Retry to load the super admin dashboard data."
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

  if (isPending || !data || filtersQuery.isPending) {
    return (
      <div className="space-y-5">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <DashboardFilter
        variant="super-admin"
        academicYearOptions={filtersQuery.data?.academicYears ?? []}
        termOptions={filtersQuery.data?.terms ?? []}
        regionOptions={filtersQuery.data?.regions ?? []}
        schoolOptions={filtersQuery.data?.schools ?? []}
        academicYear={filters.academicYear}
        term={filters.term}
        region={filters.region}
        school={filters.school}
        status={filters.status}
        onAcademicYearChange={(value) => setFilters((prev) => ({ ...prev, academicYear: value }))}
        onTermChange={(value) => setFilters((prev) => ({ ...prev, term: value }))}
        onRegionChange={(value) => setFilters((prev) => ({ ...prev, region: value }))}
        onSchoolChange={(value) => setFilters((prev) => ({ ...prev, school: value }))}
        onStatusChange={(value) =>
          setFilters((prev) => ({ ...prev, status: value as SuperAdminDashboardFilters['status'] }))
        }
        onApply={() => setAppliedFilters(filters)}
        onReset={() => {
          const reset: SuperAdminDashboardFilters = {
            academicYear: '2023/2024',
            term: 'first',
            region: 'all-regions',
            school: 'all-schools',
            status: 'active',
          };
          setFilters(reset);
          setAppliedFilters(reset);
        }}
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total Users"
          value={data.metrics.totalUsers.toLocaleString()}
          valueColor="text-blue-600"
        />
        <MetricCard
          icon={Building2}
          label="Active Schools"
          value={String(data.metrics.activeSchools)}
          valueColor="text-blue-600"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Ongoing Exams"
          value={String(data.metrics.ongoingExams)}
          valueColor="text-green-600"
        />
        <MetricCard
          icon={Headphones}
          label="Support Tickets"
          value={String(data.metrics.supportTickets)}
          valueColor="text-blue-600"
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <UserOverviewCard data={data} />
        <SystemAnalyticsCard data={data} tab={analyticsTab} onTabChange={setAnalyticsTab} />
        <QuickActionsCard />
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <UpcomingExamsCard data={data} />
        <LatestReportsCard data={data} />
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  valueColor = 'text-slate-900',
}: {
  icon: typeof Users;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
      </div>
    </article>
  );
}

function UserOverviewCard({ data }: { data: SuperAdminDashboardData }) {
  const items = [
    { key: 'administrators', label: 'Administrators', value: data.userOverview.administrators },
    { key: 'schools', label: 'Schools', value: data.userOverview.schools },
    { key: 'teachers', label: 'Teachers', value: data.userOverview.teachers },
    { key: 'students', label: 'Students', value: data.userOverview.students },
    { key: 'parents', label: 'Parents', value: data.userOverview.parents },
    { key: 'classes', label: 'Classes', value: data.userOverview.classes },
    { key: 'subjects', label: 'Subjects', value: data.userOverview.subjects },
    { key: 'activeAccounts', label: 'Active Accounts', value: data.userOverview.activeAccounts },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">User Overview</h2>
        <Link to="/super-admin/schools" className="text-xs font-semibold text-blue-600">
          View All &gt;
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const { icon: Icon, color } = USER_OVERVIEW_ITEMS[item.key] ?? {
            icon: User,
            color: 'bg-slate-100 text-slate-600',
          };
          return (
            <div
              key={item.key}
              className="rounded-lg border border-slate-100 bg-slate-50/50 p-2"
            >
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-1 text-[11px] font-medium text-slate-600">{item.label}</p>
              <p className="text-base font-bold text-slate-900">
                {item.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SystemAnalyticsCard({
  data,
  tab,
  onTabChange,
}: {
  data: SuperAdminDashboardData;
  tab: 'weekly' | 'monthly';
  onTabChange: (t: 'weekly' | 'monthly') => void;
}) {
  const chartData = tab === 'weekly' ? data.systemAnalytics.weekly : data.systemAnalytics.monthly;
  const lines = [
    { key: 'logins', color: '#173C7F', label: 'Logins' },
    { key: 'courses', color: '#F59E0B', label: 'Courses' },
    { key: 'exams', color: '#10B981', label: 'Exams' },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">System Analytics</h2>
        <Link to="/super-admin/schools" className="text-xs font-semibold text-blue-600">
          View All &gt;
        </Link>
      </div>
      <div className="mb-2 flex gap-1">
        <button
          type="button"
          onClick={() => onTabChange('weekly')}
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            tab === 'weekly'
              ? 'bg-dashboard-blue text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Weekly
        </button>
        <button
          type="button"
          onClick={() => onTabChange('monthly')}
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            tab === 'monthly'
              ? 'bg-dashboard-blue text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Monthly
        </button>
      </div>
      <div>
        <LineChart data={chartData} lines={lines} height={140} />
      </div>
    </section>
  );
}

function QuickActionsCard() {
  const actions = [
    { label: 'Add New User', icon: Plus, to: '/users', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Create School', icon: Building2, to: '/super-admin/schools?create=1', color: 'bg-green-500 hover:bg-green-600' },
    { label: 'Manage Courses', icon: BookOpen, to: '/admin/courses', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'System Settings', icon: Settings, to: '/admin/setup', color: 'bg-dashboard-blue hover:bg-[#0f2a5c]' },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-sm font-bold text-slate-900">Quick Actions</h2>
      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${action.color}`}
            >
              <Icon className="h-4 w-4" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function UpcomingExamsCard({ data }: { data: SuperAdminDashboardData }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-sm font-bold text-slate-900">Upcoming Exams</h2>
      <div className="space-y-2">
        {data.upcomingExams.length ? (
          data.upcomingExams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{exam.title}</p>
                  <p className="text-xs text-slate-500">{exam.relativeDate}</p>
                </div>
              </div>
              <p className="text-xs font-medium text-green-600">{exam.time}</p>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-xs text-slate-500">No upcoming exams</p>
        )}
      </div>
    </section>
  );
}

const REPORT_COLORS: Record<string, string> = {
  student: 'bg-purple-100 text-purple-600',
  teachers: 'bg-orange-100 text-orange-600',
  admin: 'bg-blue-100 text-blue-600',
  school: 'bg-blue-100 text-blue-600',
  finance: 'bg-orange-100 text-orange-600',
  discipline: 'bg-red-100 text-red-600',
};

function LatestReportsCard({ data }: { data: SuperAdminDashboardData }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Latest Reports</h2>
        <Link to="/admin" className="text-xs font-semibold text-blue-600">
          View All &gt;
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.latestReports.map((report) => (
          <div
            key={report.id}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${REPORT_COLORS[report.id] ?? 'bg-slate-100 text-slate-600'}`}
              >
                <FileBarChart2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-slate-900">{report.name}</p>
                <p className="text-sm font-bold text-slate-900">
                  {report.count.toLocaleString()}
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
