import {
  Activity, Building2, Shield, CheckCircle2, FileBarChart2, Users, ArrowRight,
  School, UserPlus, BookOpen, Clock3, ClipboardCheck, Bell, Search, ChevronDown, Menu
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { useAuth } from '../features/auth/auth.context';
import { useQuery } from '@tanstack/react-query';
import {
  getSuperAdminDashboardApi, getSuperAdminDashboardFiltersApi,
  type SuperAdminDashboardData, type SuperAdminDashboardFilters, type SuperAdminDashboardFilterOptions
} from '../features/dashboard/dashboard.api';
import { DashboardFilter } from '../components/dashboard/dashboard-filter';
import { StateView } from '../components/state-view';
import { Skeleton } from '../components/skeleton-loader';
import { StatCard } from '../components/ui/stat-card';
import { ChartCard } from '../components/ui/chart-card';
import {
  DEMO_ENROLLMENT_TREND, DEMO_STUDENTS_BY_LEVEL, DEMO_SCHOOLS_BY_LEVEL,
  DEMO_SCHOOLS_TABLE, DEMO_SYSTEM_HEALTH, DEMO_RECENT_ACTIVITY, DEMO_MODE
} from '../features/dashboard/dashboard.mock';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface DateRange {
  label: string;
  value: string;
}

const DATE_RANGES: DateRange[] = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This academic year', value: 'year' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SuperAdminDashboardPage() {
  const auth = useAuth();
  const [dateRange, setDateRange] = useState('30d');
  const [filters, setFilters] = useState<SuperAdminDashboardFilters>({
    academicYear: '2023/2024',
    term: 'first',
    region: 'all-regions',
    school: 'all-schools',
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

  const adminName = useMemo(() => {
    const n = `${auth.me?.firstName ?? ''} ${auth.me?.lastName ?? ''}`.trim();
    return n || auth.me?.email?.split('@')[0] || 'Administrator';
  }, [auth.me]);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }, []);

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F3F7FC] p-6">
        <StateView
          title="Could not load dashboard"
          message="Retry to load the super admin dashboard data."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >Retry</button>
          }
        />
      </div>
    );
  }

  if (isPending || !data || filtersQuery.isPending) {
    return (
      <div className="min-h-screen bg-[#F3F7FC] px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6">
            <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2 flex-1"><Skeleton className="h-6 w-64 rounded" /><Skeleton className="h-4 w-96 rounded" /></div></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          <div className="grid gap-6 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[#F3F7FC] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Welcome header with date range */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(23,63,122,0.06)] overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-500 to-brand-700" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 md:p-6">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 shadow-sm">
                <Shield className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Super Admin Dashboard</p>
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#10213F] mt-1">
                  Welcome back, <span className="text-brand-700">{adminName}</span>
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500 max-w-2xl">
                  Overview of the SMART School platform across all schools in Rwanda.
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs font-medium text-slate-400">
                  <span className="inline-flex h-5 items-center rounded-full bg-slate-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Super Admin</span>
                  <span>•</span>
                  <span>{todayLabel}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 hidden sm:inline">Range:</span>
              <select
                className="text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                aria-label="Select date range"
              >
                {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(23,63,122,0.06)] px-5 py-4">
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
            onAcademicYearChange={(v) => setFilters(p => ({...p, academicYear: v}))}
            onTermChange={(v) => setFilters(p => ({...p, term: v}))}
            onRegionChange={(v) => setFilters(p => ({...p, region: v}))}
            onSchoolChange={(v) => setFilters(p => ({...p, school: v}))}
            onStatusChange={(v) => setFilters(p => ({...p, status: v as SuperAdminDashboardFilters['status']}))}
            onApply={() => setAppliedFilters(filters)}
            onReset={() => {
              const reset: SuperAdminDashboardFilters = { academicYear: '2023/2024', term: 'first', region: 'all-regions', school: 'all-schools', status: 'all' };
              setFilters(reset); setAppliedFilters(reset);
            }}
          />
        </div>

        {/* KPI Cards — 5 cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={School} label="Total Schools" value={data.metrics.activeSchools?.toLocaleString() ?? '—'}
            description="Registered school tenants"
            tone="brand" to="/super-admin/schools"
          />
          <StatCard
            icon={Users} label="Total Users" value={data.metrics.totalUsers?.toLocaleString() ?? '—'}
            description="All platform accounts"
            tone="brand" to="/users"
          />
          <StatCard
            icon={BookOpen} label="Total Students" value={(data.userOverview?.students ?? 0).toLocaleString()}
            description="Enrolled students"
            tone="success"
          />
          <StatCard
            icon={UserPlus} label="Total Teachers" value={(data.userOverview?.teachers ?? 0).toLocaleString()}
            description="Active teachers"
            tone="orange"
          />
          <StatCard
            icon={ClipboardCheck} label="Total Classes" value={(data.userOverview?.classes ?? 0).toLocaleString()}
            description="Active class rooms"
            tone="danger"
          />
        </div>

        {/* Analytics charts row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Enrollment trend — uses real API data when available, else demo */}
          <ChartCard title="Student Enrollment Trend" subtitle="Monthly enrollment over time" action={DEMO_MODE ? <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Demo Data</span> : null}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(DEMO_MODE ? DEMO_ENROLLMENT_TREND : (data.enrollmentTrends?.monthly ?? [])) as any}>
                  <defs>
                    <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey={DEMO_MODE ? 'month' : 'label'} tick={{fontSize: 11, fill: '#64748B'}} axisLine={{stroke: '#E2E8F0'}} tickLine={false} />
                  <YAxis tick={{fontSize: 11, fill: '#64748B'}} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v/1000}k`} />
                  <Tooltip
                    contentStyle={{borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}}
                    formatter={(v: any) => [`${v?.toLocaleString?.() ?? v} students`, 'Students']}
                  />
                  <Area type="monotone" dataKey={DEMO_MODE ? 'students' : 'count'} stroke="#2563EB" strokeWidth={2.5} fill="url(#enrollGrad)" dot={{r: 3, fill: '#2563EB', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 5}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Students by education level — doughnut */}
          <ChartCard title="Students by Education Level" subtitle="Distribution by level" action={DEMO_MODE ? <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Demo Data</span> : null}>
            <div className="flex items-center gap-4 h-72">
              <div className="w-48 h-48 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DEMO_MODE ? DEMO_STUDENTS_BY_LEVEL : [{name:'Primary',value:9842,color:'#2563EB'},{name:'Secondary',value:6231,color:'#22C55E'},{name:'A-Level',value:1248,color:'#F97316'},{name:'TVET',value:876,color:'#8B5CF6'},{name:'Other',value:635,color:'#94A3B8'}]}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}
                      dataKey="value" nameKey="name" stroke="none"
                      label={({name, percent}) => `${Math.round((percent ?? 0) * 100)}%`}
                    >
                      {(DEMO_MODE ? DEMO_STUDENTS_BY_LEVEL : [{name:'Primary',value:9842,color:'#2563EB'},{name:'Secondary',value:6231,color:'#22C55E'},{name:'A-Level',value:1248,color:'#F97316'},{name:'TVET',value:876,color:'#8B5CF6'},{name:'Other',value:635,color:'#94A3B8'}]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-slate-900">18,732</span>
                  <span className="text-[10px] font-medium text-slate-500">Total Students</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {(DEMO_MODE ? DEMO_STUDENTS_BY_LEVEL : [{name:'Primary',value:9842,color:'#2563EB',pct:'52.6%'},{name:'Secondary',value:6231,color:'#22C55E',pct:'33.3%'},{name:'A-Level',value:1248,color:'#F97316',pct:'6.7%'},{name:'TVET',value:876,color:'#8B5CF6',pct:'4.7%'},{name:'Other',value:635,color:'#94A3B8',pct:'3.4%'}]).map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: item.color}} /> <span className="font-medium text-slate-700">{item.name}</span></div>
                    <div className="text-right"><span className="font-bold text-slate-900">{(item.value ?? 0).toLocaleString()}</span> <span className="text-slate-400 ml-1">{(item as any).pct ?? ''}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Schools by education level — bar chart */}
          <ChartCard title="Schools by Education Level" subtitle="Count per level" action={DEMO_MODE ? <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Demo Data</span> : null}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEMO_MODE ? DEMO_SCHOOLS_BY_LEVEL : [{level:'Primary',count:8},{level:'Secondary',count:7},{level:'A-Level',count:5},{level:'TVET',count:4}]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="level" tick={{fontSize: 11, fill: '#64748B'}} axisLine={{stroke: '#E2E8F0'}} tickLine={false} />
                  <YAxis tick={{fontSize: 11, fill: '#64748B'}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12}} cursor={{fill: '#F1F5F9'}} />
                  <Bar dataKey="count" radius={[6,6,0,0]}>
                    {(DEMO_MODE ? DEMO_SCHOOLS_BY_LEVEL : [{level:'Primary',count:8},{level:'Secondary',count:7},{level:'A-Level',count:5},{level:'TVET',count:4}]).map((entry, i) => (
                      <Cell key={`bar-${i}`} fill={['#2563EB','#22C55E','#F97316','#8B5CF6'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Schools Overview Table + System Health + Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Schools table — wider */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#10213F]">Schools Overview</h2>
                <p className="text-xs text-slate-500">Registered schools on the platform</p>
              </div>
              <Link to="/super-admin/schools" className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline">View all schools →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/60 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3">School Name</th>
                    <th className="text-left px-4 py-3">Code</th>
                    <th className="text-left px-4 py-3">Level</th>
                    <th className="text-left px-4 py-3">Students</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(DEMO_MODE ? DEMO_SCHOOLS_TABLE : (filtersQuery.data?.schools ?? [])).map((school: any, i: number) => (
                    <tr key={school.id ?? i} className="border-b border-slate-100 hover:bg-brand-50/30 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{school.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{school.code ?? '—'}</td>
                      <td className="px-4 py-3"><span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{school.level ?? '—'}</span></td>
                      <td className="px-4 py-3 font-medium text-slate-700">{(school.students ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active</span></td>
                      <td className="px-4 py-3">
                        <Link to={ `/super-admin/schools` } className="text-xs font-semibold text-brand-600 hover:text-brand-700">Details</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {DEMO_MODE && (
              <div className="px-5 py-2 bg-amber-50/60 border-t border-amber-100 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Demo Data — Real APIs for full school lists available at /super-admin/schools
              </div>
            )}
          </div>

          {/* Right column: System Health + Recent Activity */}
          <div className="space-y-6">
            {/* System Health */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-[#10213F]">System Health</h2>
                  <p className="text-xs text-slate-500">Platform service status</p>
                </div>
                <Link to="#" className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline">View details →</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {(DEMO_MODE ? DEMO_SYSTEM_HEALTH : []).map((service: any) => (
                  <div key={service.service} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/40 transition">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-slate-800">{service.service}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-700">{service.status}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{service.uptime}</span>
                    </div>
                  </div>
                ))}
                {!DEMO_MODE && !DEMO_SYSTEM_HEALTH.length && (
                  <div className="px-5 py-4 text-xs text-slate-400">Status unavailable — Not monitored</div>
                )}
              </div>
              {DEMO_MODE && (
                <div className="px-5 py-2 bg-amber-50/60 border-t border-amber-100 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Demo Health Data — Real monitoring endpoints not configured
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-[#10213F]">Recent Activity</h2>
                  <p className="text-xs text-slate-500">Latest platform events</p>
                </div>
                <Link to="#" className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline">View all →</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {(DEMO_MODE ? DEMO_RECENT_ACTIVITY : []).map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/40 transition">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-100">
                      <Users className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">{item.action}</span>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{item.actor} · {item.entity}</p>
                    </div>
                  </div>
                ))}
              </div>
              {DEMO_MODE && (
                <div className="px-5 py-2 bg-amber-50/60 border-t border-amber-100 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Demo Activity — Real audit logs at /super-admin/audit-logs
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-[10px] text-slate-400">
          SMART School v1.0.0 · {DEMO_MODE ? 'Dashboard running in DEMO DATA mode — connect real APIs for live statistics' : 'Live data from production APIs'}
        </div>

      </div>
    </section>
  );
}
