import {
  Activity,
  BookOpen,
  Building2,
  CheckCircle2,
  CreditCard,
  FileBarChart2,
  GraduationCap,
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
import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
import { StateView } from '../components/state-view';
import { ChartCard, PeriodTabs } from '../components/ui/chart-card';
import { WelcomeBanner } from '../components/ui/welcome-banner';
import { useAuth } from '../features/auth/auth.context';
import {
  getSuperAdminDashboardApi,
  getSuperAdminDashboardFiltersApi,
  type SuperAdminDashboardData,
  type SuperAdminDashboardFilters,
  type SuperAdminDashboardFilterOptions,
} from '../features/dashboard/dashboard.api';
import { ActiveUsersWidget, CompletionRatesWidget, EnrollmentTrendsWidget, RevenueWidget } from '../components/dashboard/dashboard-widgets';
import { fetchPublicHealthInfo } from '../features/platform/health-info.api';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Card,
  CardActionLink,
  CardHeader,
  MetricCard,
  type DashboardTone,
} from '../components/dashboard/dashboard-ui';

const USER_OVERVIEW_ITEMS: Record<string, { icon: typeof User; tone: DashboardTone }> = {
  administrators: { icon: Lock, tone: 'purple' },
  schools: { icon: Building2, tone: 'brand' },
  teachers: { icon: User, tone: 'warning' },
  students: { icon: Video, tone: 'success' },
  parents: { icon: Users, tone: 'neutral' },
  classes: { icon: LayoutGrid, tone: 'brand' },
  subjects: { icon: BookOpen, tone: 'warning' },
  activeAccounts: { icon: User, tone: 'brand' },
};

const SUPER_ADMIN_QUICK_ACTIONS: DashboardQuickActionItem[] = [
  {
    label: 'Add New User',
    description: 'Open users and manage platform accounts.',
    icon: Plus,
    to: '/users',
  },
  {
    label: 'Create School',
    description: 'Open school management and add a new school.',
    icon: Building2,
    to: '/super-admin/schools?create=1',
  },
  {
    label: 'Manage Courses',
    description: 'Open the course workspace.',
    icon: BookOpen,
    to: '/admin/courses',
  },
  {
    label: 'System Settings',
    description: 'Review platform settings.',
    icon: Settings,
    to: '/admin/setup',
  },
];

export function SuperAdminDashboardPage() {
  const auth = useAuth();
  const [analyticsTab, setAnalyticsTab] = useState<'weekly' | 'monthly'>('weekly');
  const [filters, setFilters] = useState<SuperAdminDashboardFilters>({
    academicYear: '2023/2024',
    term: 'first',
    region: 'all-regions',
    school: 'all-schools',
    /** Aligns with Users page default: all tenants (active + inactive), not “active schools only”. */
    status: 'all',
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

  const healthInfoQuery = useQuery({
    queryKey: ['health', 'public-info'],
    queryFn: fetchPublicHealthInfo,
    staleTime: 30_000,
    retry: 1,
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

  const billing = data.billing ?? {
    schoolSubscriptionsActive: 0,
    academyLearnersActive: 0,
    academyPaymentsPending: 0,
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <WelcomeBanner
          eyebrow="Platform administration"
          title="Super Administrator Dashboard"
          subtitle="Monitor schools, users, exams, and platform support activity from one place."
          actions={<DashboardQuickActionsDropdown actions={SUPER_ADMIN_QUICK_ACTIONS} />}
        />
        <div className="mt-4 min-w-0">
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
            onAcademicYearChange={(value) =>
              setFilters((prev) => ({ ...prev, academicYear: value }))
            }
            onTermChange={(value) => setFilters((prev) => ({ ...prev, term: value }))}
            onRegionChange={(value) => setFilters((prev) => ({ ...prev, region: value }))}
            onSchoolChange={(value) => setFilters((prev) => ({ ...prev, school: value }))}
            onStatusChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                status: value as SuperAdminDashboardFilters['status'],
              }))
            }
            onApply={() => setAppliedFilters(filters)}
            onReset={() => {
              const reset: SuperAdminDashboardFilters = {
                academicYear: '2023/2024',
                term: 'first',
                region: 'all-regions',
                school: 'all-schools',
                status: 'all',
              };
              setFilters(reset);
              setAppliedFilters(reset);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Total Users" value={data.metrics.totalUsers.toLocaleString()} tone="brand" to="/users" />
        <MetricCard icon={Building2} label="Active Schools" value={data.metrics.activeSchools.toLocaleString()} tone="success" to="/super-admin/schools" />
        <MetricCard icon={CheckCircle2} label="Ongoing Exams" value={data.metrics.ongoingExams.toLocaleString()} tone="warning" />
        <MetricCard icon={Headphones} label="Support Tickets" value={data.metrics.supportTickets.toLocaleString()} tone="danger" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BillingCard billing={billing} />
        <PlatformOpsCard healthInfoQuery={healthInfoQuery} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <UserOverviewCard data={data} />
        <SystemAnalyticsCard data={data} tab={analyticsTab} onTabChange={setAnalyticsTab} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <UpcomingExamsCard data={data} />
        <LatestReportsCard data={data} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <RevenueWidget
          totalRevenue={data.revenue?.totalRevenue ?? 0}
          monthlyRevenue={data.revenue?.monthlyRevenue ?? []}
          revenueThisMonth={data.revenue?.revenueThisMonth ?? 0}
          revenueChange={data.revenue?.revenueChange ?? 0}
        />
        <EnrollmentTrendsWidget
          weekly={data.enrollmentTrends?.weekly ?? []}
          monthly={data.enrollmentTrends?.monthly ?? []}
        />
        <CompletionRatesWidget
          courseCompletionRate={data.completionRates?.courseCompletionRate ?? null}
          assessmentCompletionRate={data.completionRates?.assessmentCompletionRate ?? null}
          overallRate={data.completionRates?.overallRate ?? null}
        />
        <ActiveUsersWidget
          weeklyActive={data.activeUsers?.weeklyActive ?? 0}
          monthlyActive={data.activeUsers?.monthlyActive ?? 0}
        />
      </div>
    </section>
  );
}

function BillingCard({
  billing,
}: {
  billing: {
    schoolSubscriptionsActive: number;
    academyLearnersActive: number;
    academyPaymentsPending: number;
  };
}) {
  return (
    <Card>
      <CardHeader
        title="Billing & academy"
        subtitle="Same numbers as the subscriptions page: school SaaS plans, active catalog learners, and pending MoMo checkouts."
        icon={CreditCard}
        tone="brand"
        action={<CardActionLink to="/super-admin/subscriptions">Open billing workspace</CardActionLink>}
      />
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-brand-600" aria-hidden />
            School plans (active / trialing)
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {billing.schoolSubscriptionsActive.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <GraduationCap className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            Academy learners (active access)
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {billing.academyLearnersActive.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <CreditCard className="h-3.5 w-3.5 text-amber-600" aria-hidden />
            Pending academy payments
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {billing.academyPaymentsPending.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}

function PlatformOpsCard({
  healthInfoQuery,
}: {
  healthInfoQuery: {
    isPending: boolean;
    isError: boolean;
    data: {
      status: string;
      db: string;
      deployRegion: string | null;
      activeRefreshSessions: number;
      version: string | null;
      commit: string | null;
      uptimeSec: number;
      nodeEnv: string;
    } | null | undefined;
  };
}) {
  return (
    <Card>
      <CardHeader
        title="Platform / ops"
        subtitle="Read-only snapshot from the public GET /health/info endpoint (build metadata, DB reachability, non-revoked refresh sessions)."
        icon={Activity}
        tone="purple"
      />
      <div className="p-5">
        {healthInfoQuery.isPending ? (
          <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
        ) : null}
        {healthInfoQuery.isError ? (
          <p className="text-xs text-amber-700">
            Health info could not be loaded (check API URL and CORS). Dashboard data above is
            unaffected.
          </p>
        ) : null}
        {healthInfoQuery.data ? (
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-medium text-slate-500">Status</dt>
              <dd className="font-semibold text-slate-900">{healthInfoQuery.data.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Database</dt>
              <dd className="font-semibold text-slate-900">{healthInfoQuery.data.db}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Deploy region</dt>
              <dd className="font-semibold text-slate-900">
                {healthInfoQuery.data.deployRegion ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Active refresh sessions</dt>
              <dd className="font-semibold text-slate-900">
                {healthInfoQuery.data.activeRefreshSessions.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Version</dt>
              <dd className="font-mono text-[11px] text-slate-800">
                {healthInfoQuery.data.version ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Commit</dt>
              <dd className="font-mono text-[11px] text-slate-800 break-all">
                {healthInfoQuery.data.commit ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Uptime (s)</dt>
              <dd className="font-semibold text-slate-900">{healthInfoQuery.data.uptimeSec}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Node env</dt>
              <dd className="font-semibold text-slate-900">{healthInfoQuery.data.nodeEnv}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </Card>
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
    <Card>
      <CardHeader
        title="User Overview"
        subtitle="Accounts across the platform"
        icon={Users}
        tone="brand"
        action={<CardActionLink to="/super-admin/schools">View all</CardActionLink>}
      />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        {items.map((item) => {
          const { icon: Icon, tone } = USER_OVERVIEW_ITEMS[item.key] ?? {
            icon: User,
            tone: 'neutral' as DashboardTone,
          };
          return (
            <div key={item.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                  tone === 'brand'
                    ? 'bg-brand-50 text-brand-600'
                    : tone === 'success'
                      ? 'bg-emerald-50 text-emerald-600'
                      : tone === 'warning'
                        ? 'bg-amber-50 text-amber-600'
                        : tone === 'purple'
                          ? 'bg-violet-50 text-violet-600'
                          : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[11px] font-medium text-slate-600">{item.label}</p>
              <p className="text-lg font-bold tabular-nums text-slate-900">{item.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>
    </Card>
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
    <ChartCard
      title="System Analytics"
      subtitle="Platform activity over time"
      action={
        <PeriodTabs
          value={tab}
          onChange={onTabChange}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
      }
    >
      <LineChart data={chartData} lines={lines} height={160} />
    </ChartCard>
  );
}

function UpcomingExamsCard({ data }: { data: SuperAdminDashboardData }) {
  return (
    <Card>
      <CardHeader
        title="Upcoming Exams"
        subtitle="Examinations scheduled across the platform"
        icon={CheckCircle2}
        tone="danger"
        action={<CardActionLink to="/admin/exams">Exams</CardActionLink>}
      />
      <div className="space-y-3 p-5">
        {data.upcomingExams.length ? (
          data.upcomingExams.map((exam) => (
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
          ))
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">No upcoming exams</p>
        )}
      </div>
    </Card>
  );
}

const REPORT_TONES: Record<string, DashboardTone> = {
  student: 'purple',
  teachers: 'warning',
  admin: 'brand',
  school: 'brand',
  finance: 'warning',
  discipline: 'danger',
};

function LatestReportsCard({ data }: { data: SuperAdminDashboardData }) {
  return (
    <Card>
      <CardHeader
        title="Latest Reports"
        subtitle="Platform report activity"
        icon={FileBarChart2}
        tone="success"
        action={<CardActionLink to="/admin">View all</CardActionLink>}
      />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
        {data.latestReports.map((report) => (
          <div
            key={report.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                  REPORT_TONES[report.id] === 'danger'
                    ? 'bg-red-50 text-red-600'
                    : REPORT_TONES[report.id] === 'warning'
                      ? 'bg-amber-50 text-amber-600'
                      : REPORT_TONES[report.id] === 'success'
                        ? 'bg-emerald-50 text-emerald-600'
                        : REPORT_TONES[report.id] === 'purple'
                          ? 'bg-violet-50 text-violet-600'
                          : 'bg-brand-50 text-brand-600'
                }`}
              >
                <FileBarChart2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-slate-900">{report.name}</p>
                <p className="text-lg font-bold tabular-nums text-slate-900">{report.count.toLocaleString()}</p>
              </div>
            </div>
            <span className="text-slate-400">→</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
