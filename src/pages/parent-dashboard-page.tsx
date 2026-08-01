import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileBarChart2, Home, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyChildrenApi } from '../features/sprint2/sprint2.api';
import { getParentReportCardsApi } from '../features/sprint5/exams.api';
import {
  Badge,
  Card,
  CardActionLink,
  CardHeader,
  LoadingCard,
  LoadingMetrics,
  MetricCard,
} from '../components/dashboard/dashboard-ui';

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
  const attendanceTotal = children.reduce(
    (acc, child) => acc + child.attendanceLast30Days.total,
    0
  );
  const attendancePct =
    attendanceTotal > 0 ? Math.round((totalPresent / attendanceTotal) * 100) : 0;

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

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <LoadingMetrics count={4} />
        <div className="grid gap-5 lg:grid-cols-2">
          <LoadingCard rows={3} />
          <LoadingCard rows={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Parent portal
        </p>
        <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-slate-900">
          Welcome{parent ? `, ${parent.firstName}` : ''}!
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Monitor your children&apos;s academic progress and stay updated.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Linked Children" value={children.length} tone="brand" />
        <MetricCard icon={ClipboardList} label="Present (30d)" value={totalPresent} tone="success" />
        <MetricCard icon={ClipboardList} label="Absent (30d)" value={totalAbsent} tone="danger" />
        <MetricCard icon={ClipboardList} label="Late (30d)" value={totalLate} tone="warning" helper={attendancePct > 0 ? `${attendancePct}% attendance` : undefined} />
      </div>

      {children.length > 0 && (
        <Card>
          <CardHeader
            title="Children Performance"
            subtitle="Attendance comparison over the last 30 days"
            icon={Users}
            tone="brand"
          />
          <div className="w-full overflow-x-auto p-5">
            <table className="w-full min-w-[600px] table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
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
                    <tr key={child.id} className="border-b border-slate-100 hover:bg-slate-50">
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
                        <Badge tone="success">{child.attendanceLast30Days.present}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone="danger">{child.attendanceLast30Days.absent}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone="warning">{child.attendanceLast30Days.late}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone="neutral">{child.attendanceLast30Days.excused}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-semibold ${
                            percentage >= 90
                              ? 'text-emerald-700'
                              : percentage >= 75
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent Report Cards"
            subtitle="Latest published results"
            icon={FileBarChart2}
            tone="brand"
            action={
              reportCards.length > 0 ? (
                <CardActionLink to="/parent/report-cards">View all report cards</CardActionLink>
              ) : undefined
            }
          />
          {reportCards.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-500">No report cards available yet.</p>
          ) : (
            <div className="w-full overflow-x-auto p-5 pt-4">
              <table className="w-full min-w-[400px] table-auto text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Term</th>
                    <th className="px-4 py-3 font-semibold text-center">Average</th>
                    <th className="px-4 py-3 font-semibold text-center">Grade</th>
                    <th className="px-4 py-3 font-semibold text-center">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCards.slice(0, 5).map((rc) => (
                    <tr key={rc.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {rc.student.firstName} {rc.student.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{rc.term.name}</td>
                      <td className="px-4 py-3 text-center font-medium text-slate-800">
                        {rc.totals.averagePercentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone="brand">{rc.totals.grade}</Badge>
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
        </Card>

        <Card>
          <CardHeader
            title="Recent Activity"
            subtitle="Latest updates from your children"
            icon={Home}
            tone="success"
          />
          {children.length === 0 && reportCards.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-500">No recent activity.</p>
          ) : (
            <div className="w-full overflow-x-auto p-5 pt-4">
              <table className="w-full min-w-[400px] table-auto text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Activity</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {children.slice(0, 5).map((child) => (
                    <tr key={child.id} className="border-b border-slate-100">
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
                    <tr key={`rc-${rc.id}`} className="border-b border-slate-100">
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
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {children.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-semibold text-amber-900">No children linked yet</p>
          <p className="mt-1 text-sm text-amber-700">
            Contact your school administrator to link your children&apos;s accounts.
          </p>
        </div>
      )}
    </div>
  );
}
