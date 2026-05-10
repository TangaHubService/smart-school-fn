import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  FileBarChart2,
  Home,
  Loader2,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyChildrenApi } from '../features/sprint2/sprint2.api';
import { getParentReportCardsApi } from '../features/sprint5/exams.api';

export function ParentDashboardPage() {
  const auth = useAuth();

  const childrenQuery = useQuery({
    queryKey: ['parent', 'my-children'],
    queryFn: () => listMyChildrenApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });

  const reportCardsQuery = useQuery({
    queryKey: ['parent-report-cards', 'dashboard'],
    queryFn: () => getParentReportCardsApi(auth.accessToken!, {}),
    enabled: Boolean(auth.accessToken),
  });

  const isLoading = childrenQuery.isPending || reportCardsQuery.isPending;
  const isError = childrenQuery.isError || reportCardsQuery.isError;

  const children = childrenQuery.data?.students ?? [];
  const parent = childrenQuery.data?.parent;
  const reportCards = reportCardsQuery.data?.items ?? [];

  const totalPresent = children.reduce((acc, child) => acc + child.attendanceLast30Days.present, 0);
  const totalAbsent = children.reduce((acc, child) => acc + child.attendanceLast30Days.absent, 0);
  const totalLate = children.reduce((acc, child) => acc + child.attendanceLast30Days.late, 0);
  const totalExcused = children.reduce((acc, child) => acc + child.attendanceLast30Days.excused, 0);

  if (isError) {
    return (
      <StateView
        title="Could not load dashboard"
        message="Retry to load your dashboard data."
        action={
          <button
            type="button"
            onClick={() => {
              void childrenQuery.refetch();
              void reportCardsQuery.refetch();
            }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome{parent ? `, ${parent.firstName}` : ''}!
        </h1>
        <p className="text-slate-600">
          Monitor your children&apos;s academic progress and stay updated.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Linked Children"
              value={children.length}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Present (30d)"
              value={totalPresent}
              icon={ClipboardList}
              color="emerald"
            />
            <StatCard
              label="Absent (30d)"
              value={totalAbsent}
              icon={ClipboardList}
              color="red"
            />
            <StatCard
              label="Late (30d)"
              value={totalLate}
              icon={ClipboardList}
              color="amber"
            />
          </div>

          {children.length > 0 && (
            <SectionCard
              title="Children Performance"
              subtitle="Attendance comparison over the last 30 days"
            >
              <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                <table className="w-full min-w-[600px] table-auto text-left text-sm">
                  <thead>
<tr className="border-b border-brand-100 bg-brand-50 text-slate-700">
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Class</th>
                      <th className="px-4 py-3 font-semibold text-center">Present</th>
                      <th className="px-4 py-3 font-semibold text-center">Absent</th>
                      <th className="px-4 py-3 font-semibold text-center">Late</th>
                      <th className="px-4 py-3 font-semibold text-center">Excused</th>
                      <th className="px-4 py-3 font-semibold text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((child) => {
                      const total = child.attendanceLast30Days.total;
                      const present = child.attendanceLast30Days.present;
                      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
                      return (
                        <tr key={child.id} className="border-b border-brand-50 hover:bg-brand-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xs font-bold">
                                {child.firstName[0]}{child.lastName[0]}
                              </div>
                              <span className="font-medium text-slate-900">
                                {child.firstName} {child.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {child.currentEnrollment?.classRoom.name ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              {child.attendanceLast30Days.present}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                              {child.attendanceLast30Days.absent}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                              {child.attendanceLast30Days.late}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                              {child.attendanceLast30Days.excused}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-brand-100">
                                <div
                                  className={`h-full ${percentage >= 90 ? 'bg-emerald-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold ${percentage >= 90 ? 'text-emerald-700' : percentage >= 75 ? 'text-amber-700' : 'text-red-700'}`}>
                                {percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              title="Recent Report Cards"
              subtitle="Latest published results"
            >
              {reportCards.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No report cards available yet.</p>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                  <table className="w-full min-w-[400px] table-auto text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 bg-brand-50 text-slate-700">
                        <th className="px-4 py-3 font-semibold">Student</th>
                        <th className="px-4 py-3 font-semibold">Term</th>
                        <th className="px-4 py-3 font-semibold text-center">Average</th>
                        <th className="px-4 py-3 font-semibold text-center">Grade</th>
                        <th className="px-4 py-3 font-semibold text-center">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportCards.slice(0, 5).map((rc) => (
                        <tr key={rc.id} className="border-b border-brand-50 hover:bg-brand-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {rc.student.firstName} {rc.student.lastName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{rc.term.name}</td>
                          <td className="px-4 py-3 text-center font-medium text-slate-800">
                            {rc.totals.averagePercentage.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                              {rc.totals.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {rc.totals.position}/{rc.totals.classSize}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {reportCards.length > 0 && (
                <Link
                  to="/parent/report-cards"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  View all report cards
                </Link>
              )}
            </SectionCard>

            <SectionCard
              title="Recent Activity"
              subtitle="Latest updates from your children"
            >
              <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                <table className="w-full min-w-[400px] table-auto text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-100 bg-brand-50 text-slate-700">
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Activity</th>
                      <th className="px-4 py-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.slice(0, 5).map((child) => (
                      <tr key={child.id} className="border-b border-brand-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {child.firstName} {child.lastName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                            <ClipboardList className="h-3 w-3" />
                            Attendance
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {child.attendanceLast30Days.lastMarkedDate 
                            ? `Last marked: ${child.attendanceLast30Days.lastMarkedDate}` 
                            : 'No records'}
                        </td>
                      </tr>
                    ))}
                    {reportCards.slice(0, 3).map((rc) => (
                      <tr key={`rc-${rc.id}`} className="border-b border-brand-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {rc.student.firstName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                            <FileBarChart2 className="h-3 w-3" />
                            Report Card
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {rc.term.name} - {rc.totals.grade}
                        </td>
                      </tr>
                    ))}
                    {children.length === 0 && reportCards.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No recent activity
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {children.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="font-semibold text-amber-900">No children linked yet</p>
              <p className="text-sm text-amber-700">
                Contact your school administrator to link your children&apos;s accounts.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Home;
  color: 'blue' | 'emerald' | 'red' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClasses[color]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}