import { CalendarClock, ReceiptText, School, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../features/auth/auth.context';
import {
  getSuperAdminDashboardApi,
  getSuperAdminDashboardFiltersApi,
  type SuperAdminDashboardFilterOptions,
  type SuperAdminDashboardFilters,
} from '../features/dashboard/dashboard.api';
import { DashboardFilter } from '../components/dashboard/dashboard-filter';
import { Skeleton } from '../components/skeleton-loader';
import { StateView } from '../components/state-view';
import { Badge } from '../components/ui/badge';
import {
  CHART_AXIS_TICK,
  CHART_GRID,
  CHART_SERIES,
  CHART_TOOLTIP_STYLE,
} from '../components/ui/chart-theme';
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
import { formatExact } from '../utils/format-number';

const DEFAULT_FILTERS: SuperAdminDashboardFilters = {
  academicYear: '',
  term: '',
  region: 'all-regions',
  school: 'all-schools',
  status: 'all',
};

/** The API labels months as "2026-10"; show them as "Oct 2026". */
function formatMonth(label: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(label);
  if (!match) return label;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

export function SuperAdminDashboardPage() {
  const auth = useAuth();
  const [filters, setFilters] = useState<SuperAdminDashboardFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<SuperAdminDashboardFilters>(DEFAULT_FILTERS);

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

  const adminName = useMemo(() => {
    const name = auth.me?.firstName?.trim();
    return name || auth.me?.email?.split('@')[0] || 'Administrator';
  }, [auth.me]);

  if (isError) {
    return (
      <StateView
        title="Could not load dashboard"
        message="Check your connection and try again."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (isPending || !data || filtersQuery.isPending) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-16 w-96 max-w-full rounded-lg" />
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-80 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const enrollmentTrend = (data.enrollmentTrends?.monthly ?? []).map((row) => ({
    ...row,
    label: formatMonth(row.label),
  }));
  const hasEnrollment = enrollmentTrend.some((row) => row.count > 0);
  const revenueTrend = (data.revenue?.monthlyRevenue ?? []).map((row) => ({
    ...row,
    month: formatMonth(row.month),
  }));
  const hasRevenue = revenueTrend.some((row) => row.amount > 0);
  const schools = filtersQuery.data?.schools ?? [];
  const upcomingExams = data.upcomingExams ?? [];

  const roles = [
    { label: 'Students', value: data.userOverview?.students ?? 0 },
    { label: 'Teachers', value: data.userOverview?.teachers ?? 0 },
    { label: 'Parents', value: data.userOverview?.parents ?? 0 },
    { label: 'Administrators', value: data.userOverview?.administrators ?? 0 },
  ];
  const largestRole = Math.max(...roles.map((role) => role.value), 1);

  const billing = [
    { label: 'Active school subscriptions', value: data.billing?.schoolSubscriptionsActive ?? 0 },
    { label: 'Active academy learners', value: data.billing?.academyLearnersActive ?? 0 },
    { label: 'Academy payments pending', value: data.billing?.academyPaymentsPending ?? 0 },
  ];

  const inactiveSchools = schools.filter((school) => !school.isActive).length;
  const openTickets = data.metrics.supportTickets ?? 0;
  const pendingPayments = data.billing?.academyPaymentsPending ?? 0;
  const attention: AttentionItem[] = [
    ...(openTickets
      ? [
          {
            key: 'tickets',
            title: `${openTickets.toLocaleString()} open support ${openTickets === 1 ? 'ticket' : 'tickets'}`,
            to: '/super-admin/support',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(pendingPayments
      ? [
          {
            key: 'payments',
            title: `${pendingPayments.toLocaleString()} academy ${pendingPayments === 1 ? 'payment' : 'payments'} pending`,
            to: '/super-admin/subscriptions',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(inactiveSchools
      ? [
          {
            key: 'schools',
            title: `${inactiveSchools.toLocaleString()} inactive ${inactiveSchools === 1 ? 'school' : 'schools'}`,
            to: '/super-admin/schools',
            tone: 'info' as const,
          },
        ]
      : []),
  ];

  const success = data.studentSuccessRate;
  const outcomes = [
    {
      label: 'Student success rate',
      value: success?.rate ?? null,
      hint: success ? `${success.passed} of ${success.eligible} results passed` : undefined,
    },
    { label: 'Course completion', value: data.completionRates?.courseCompletionRate ?? null },
    { label: 'Assessment completion', value: data.completionRates?.assessmentCompletionRate ?? null },
  ];

  return (
    <section className="mx-auto max-w-[1480px] space-y-5 text-slate-900">
      <PageHeader
        title="Platform overview"
        subtitle={`Welcome back, ${adminName}. ${new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`}
      />

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
          setFilters((prev) => ({
            ...prev,
            status: value as SuperAdminDashboardFilters['status'],
          }))
        }
        onApply={() => setAppliedFilters(filters)}
        onReset={() => {
          setFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
        }}
      />

      <KpiStrip
        items={[
          {
            label: 'Schools',
            value: (data.metrics.activeSchools ?? 0).toLocaleString(),
            hint: 'Registered on the platform',
            to: '/super-admin/schools',
          },
          {
            label: 'Users',
            value: (data.metrics.totalUsers ?? 0).toLocaleString(),
            hint: `${(data.activeUsers?.monthlyActive ?? 0).toLocaleString()} active this month`,
            to: '/users',
          },
          {
            label: 'Students',
            value: (data.userOverview?.students ?? 0).toLocaleString(),
            hint: 'Enrolled students',
          },
          {
            label: 'Teachers',
            value: (data.userOverview?.teachers ?? 0).toLocaleString(),
            hint: 'Active teachers',
          },
          {
            label: 'Classes',
            value: (data.userOverview?.classes ?? 0).toLocaleString(),
            hint: 'Active classrooms',
          },
        ]}
      />

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <div className="grid gap-5 md:grid-cols-2">
            <DashboardCard>
              <CardHeader title="Student enrollment" subtitle="New enrollments per month" />
              <div className="px-5 pb-5 pt-3">
                {hasEnrollment ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={enrollmentTrend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: '#F1F5F9' }} />
                        <Bar
                          dataKey="count"
                          name="Students"
                          fill={CHART_SERIES[0]}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyPanel icon={TrendingUp} message="Enrollment trends appear once students are enrolled." className="h-56" />
                )}
              </div>
            </DashboardCard>

            <DashboardCard>
              <CardHeader
                title="Academy revenue"
                subtitle={`${formatExact(data.revenue?.revenueThisMonth ?? 0)} RWF this month`}
              />
              <div className="px-5 pb-5 pt-3">
                {hasRevenue ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueTrend} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={CHART_AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value: number) => value.toLocaleString()}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          cursor={{ fill: '#F1F5F9' }}
                          formatter={(value) => `${formatExact(Number(value))} RWF`}
                        />
                        <Bar
                          dataKey="amount"
                          name="Revenue"
                          fill={CHART_SERIES[0]}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyPanel icon={ReceiptText} message="Revenue appears here once payments are recorded." className="h-56" />
                )}
              </div>
            </DashboardCard>
          </div>

          <DashboardCard>
            <CardHeader
              title="Schools"
              subtitle={`${schools.length.toLocaleString()} registered`}
              action={<TextLink to="/super-admin/schools">View all</TextLink>}
            />
            {schools.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 font-medium">School</th>
                      <th scope="col" className="hidden px-5 py-2.5 font-medium sm:table-cell">Province</th>
                      <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schools.slice(0, 8).map((school) => (
                      <tr key={school.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">{school.name}</td>
                        <td className="hidden px-5 py-3 text-slate-600 sm:table-cell">{school.province ?? '—'}</td>
                        <td className="px-5 py-3">
                          <Badge tone={school.isActive ? 'success' : 'neutral'}>
                            {school.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyPanel icon={School} message="Schools appear here once they are registered." />
            )}
          </DashboardCard>
        </div>

        <div className="min-w-0 space-y-5 xl:col-span-4">
          <AttentionCard items={attention} />

          <DashboardCard>
            <CardHeader title="Learning outcomes" />
            <div className="space-y-3.5 px-5 pb-5 pt-2">
              {outcomes.map((row) => (
                <MeterRow
                  key={row.label}
                  label={row.label}
                  value={row.value === null ? '—' : `${row.value}%`}
                  percent={row.value ?? 0}
                  hint={row.value === null ? 'No data yet' : row.hint}
                />
              ))}
            </div>
          </DashboardCard>

          <DashboardCard>
            <CardHeader
              title="People"
              subtitle={`${(data.activeUsers?.weeklyActive ?? 0).toLocaleString()} active this week`}
            />
            <div className="space-y-3.5 px-5 pb-5 pt-2">
              {roles.map((role) => (
                <MeterRow
                  key={role.label}
                  label={role.label}
                  value={role.value.toLocaleString()}
                  percent={(role.value / largestRole) * 100}
                />
              ))}
            </div>
          </DashboardCard>

          <DashboardCard>
            <CardHeader
              title="Billing"
              action={<TextLink to="/super-admin/subscriptions">Manage</TextLink>}
            />
            <dl className="px-5 pb-3 pt-1">
              {billing.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0">
                  <dt className="text-[13px] text-slate-600">{row.label}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-slate-900">
                    {row.value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          </DashboardCard>

          <DashboardCard>
            <CardHeader title="Upcoming exams" />
            {upcomingExams.length ? (
              <ul className="px-5 pb-3 pt-1">
                {upcomingExams.slice(0, 4).map((exam) => (
                  <li key={exam.id} className="flex items-start gap-3 border-t border-slate-100 py-2.5 first:border-t-0">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-slate-900">{exam.title}</p>
                      <p className="text-xs text-slate-500">
                        {exam.relativeDate} · {exam.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 pt-1 text-[13px] text-slate-500">No exams are scheduled.</p>
            )}
          </DashboardCard>
        </div>
      </div>
    </section>
  );
}
