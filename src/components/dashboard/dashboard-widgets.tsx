import { BarChart3, DollarSign, GraduationCap, TrendingUp, Users } from 'lucide-react';

import { BarChart } from './bar-chart';

interface RevenueWidgetProps {
  totalRevenue: number;
  monthlyRevenue: Array<{ month: string; amount: number }>;
  revenueThisMonth: number;
  revenueChange: number;
}

export function RevenueWidget({ totalRevenue, monthlyRevenue, revenueThisMonth, revenueChange }: RevenueWidgetProps) {
  const changeColor = revenueChange >= 0 ? 'text-green-600' : 'text-red-600';
  const changeIcon = revenueChange >= 0 ? '+' : '';
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Revenue</h2>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[11px] font-medium text-slate-500">Total</p>
          <p className="text-sm font-bold text-slate-900">
            {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[11px] font-medium text-slate-500">This Month</p>
          <p className="text-sm font-bold text-slate-900">
            {revenueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[11px] font-medium text-slate-500">Change</p>
          <p className={`text-sm font-bold ${changeColor}`}>
            {changeIcon}{revenueChange}%
          </p>
        </div>
      </div>
      {monthlyRevenue.length > 0 && (
        <div className="h-24">
          <BarChart
            data={monthlyRevenue.map(m => ({ label: m.month.slice(5), value: m.amount }))}
            height={96}
          />
        </div>
      )}
    </section>
  );
}

interface EnrollmentTrendsWidgetProps {
  weekly: Array<{ label: string; count: number }>;
  monthly: Array<{ label: string; count: number }>;
}

export function EnrollmentTrendsWidget({ weekly, monthly }: EnrollmentTrendsWidgetProps) {
  const data = weekly.length > 0 ? weekly : monthly;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-bold text-slate-900">Enrollment Trends</h2>
      </div>
      {data.length > 0 ? (
        <div className="h-24">
          <BarChart
            data={data.map(d => ({ label: d.label, value: d.count }))}
            height={96}
          />
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-slate-500">No enrollment data</p>
      )}
    </section>
  );
}

interface CompletionRatesWidgetProps {
  courseCompletionRate: number | null;
  assessmentCompletionRate: number | null;
  overallRate: number | null;
}

export function CompletionRatesWidget({
  courseCompletionRate,
  assessmentCompletionRate,
  overallRate,
}: CompletionRatesWidgetProps) {
  const items = [
    { label: 'Course Completion', value: courseCompletionRate, icon: GraduationCap, color: 'text-blue-600' },
    { label: 'Assessment Completion', value: assessmentCompletionRate, icon: BarChart3, color: 'text-purple-600' },
    { label: 'Overall Rate', value: overallRate, icon: TrendingUp, color: 'text-emerald-600' },
  ];
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-sm font-bold text-slate-900">Completion Rates</h2>
      <div className="grid grid-cols-3 gap-2">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg bg-slate-50 p-2 text-center">
              <Icon className={`mx-auto mb-1 h-4 w-4 ${item.color}`} />
              <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
              <p className="text-sm font-bold text-slate-900">
                {item.value !== null ? `${item.value}%` : '—'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface ActiveUsersWidgetProps {
  weeklyActive: number;
  monthlyActive: number;
}

export function ActiveUsersWidget({ weeklyActive, monthlyActive }: ActiveUsersWidgetProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Users className="h-4 w-4 text-indigo-600" />
        <h2 className="text-sm font-bold text-slate-900">Active Users</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[11px] font-medium text-slate-500">Past 7 Days</p>
          <p className="text-lg font-bold text-slate-900">{weeklyActive.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[11px] font-medium text-slate-500">Past 30 Days</p>
          <p className="text-lg font-bold text-slate-900">{monthlyActive.toLocaleString()}</p>
        </div>
      </div>
    </section>
  );
}
