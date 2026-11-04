import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useMemo } from 'react';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyChildrenApi } from '../features/sprint2/sprint2.api';
import { getParentReportCardsApi } from '../features/sprint5/exams.api';
import { LoadingCard, LoadingMetrics } from '../components/dashboard/dashboard-ui';
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
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { DataTable, type DataTableColumn } from '../components/ui/data-table';

interface ChildRow {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

const childColumns: DataTableColumn<ChildRow>[] = [
  {
    key: 'name',
    header: 'Student',
    sortable: true,
    mobile: 'primary',
    render: (child) => (
      <span className="flex items-center gap-2">
        <Avatar size="sm" name={`${child.firstName} ${child.lastName}`} />
        <span className="whitespace-nowrap text-sm font-medium text-slate-900">
          {child.firstName} {child.lastName}
        </span>
      </span>
    ),
  },
  {
    key: 'className',
    header: 'Class',
    mobile: 'secondary',
    render: (child) => <span className="whitespace-nowrap text-slate-600">{child.className}</span>,
  },
  {
    key: 'present',
    header: 'Present',
    align: 'center',
    render: (child) => <span className="tabular-nums text-slate-700">{child.present}</span>,
  },
  {
    key: 'absent',
    header: 'Absent',
    align: 'center',
    render: (child) => <span className="tabular-nums text-slate-700">{child.absent}</span>,
  },
  {
    key: 'late',
    header: 'Late',
    align: 'center',
    render: (child) => <span className="tabular-nums text-slate-700">{child.late}</span>,
  },
  {
    key: 'attendancePct',
    header: 'Attendance',
    align: 'center',
    mobile: 'secondary',
    render: (child) => {
      // No records is not the same as 0% attendance.
      if (child.total === 0) return <span className="text-slate-500">No records</span>;
      const percentage = Math.round((child.present / child.total) * 100);
      return (
        <Badge tone={percentage >= 90 ? 'success' : percentage >= 75 ? 'warning' : 'danger'}>
          {percentage}%
        </Badge>
      );
    },
  },
];

interface ReportCardRow {
  id: string;
  studentName: string;
  termName: string;
  averagePercentage: number;
  grade: string;
  position: number;
  classSize: number;
}

const reportCardColumns: DataTableColumn<ReportCardRow>[] = [
  {
    key: 'studentName',
    header: 'Student',
    sortable: true,
    mobile: 'primary',
  },
  {
    key: 'termName',
    header: 'Term',
    mobile: 'secondary',
  },
  {
    key: 'averagePercentage',
    header: 'Average',
    align: 'center',
    render: (row) => (
      <span className="font-medium text-slate-800">{row.averagePercentage.toFixed(1)}%</span>
    ),
  },
  {
    key: 'grade',
    header: 'Grade',
    align: 'center',
    render: (row) => <Badge tone="brand">{row.grade}</Badge>,
  },
  {
    key: 'position',
    header: 'Rank',
    align: 'center',
    render: (row) => (
      <span className="text-slate-600">
        {row.position}/{row.classSize}
      </span>
    ),
  },
];

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

  const childRows = useMemo<ChildRow[]>(
    () =>
      children.map((child) => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        className: child.currentEnrollment?.classRoom.name ?? '-',
        present: child.attendanceLast30Days.present,
        absent: child.attendanceLast30Days.absent,
        late: child.attendanceLast30Days.late,
        excused: child.attendanceLast30Days.excused,
        total: child.attendanceLast30Days.total,
      })),
    [children]
  );

  const reportCardRows = useMemo<ReportCardRow[]>(
    () =>
      reportCards.slice(0, 5).map((rc) => ({
        id: rc.id,
        studentName: `${rc.student.firstName} ${rc.student.lastName}`,
        termName: rc.term.name,
        averagePercentage: rc.totals.averagePercentage,
        grade: rc.totals.grade,
        position: rc.totals.position,
        classSize: rc.totals.classSize,
      })),
    [reportCards]
  );

  const totalPresent = children.reduce((acc, child) => acc + child.attendanceLast30Days.present, 0);
  const totalAbsent = children.reduce((acc, child) => acc + child.attendanceLast30Days.absent, 0);
  const totalLate = children.reduce((acc, child) => acc + child.attendanceLast30Days.late, 0);
  const attendanceTotal = children.reduce(
    (acc, child) => acc + child.attendanceLast30Days.total,
    0
  );
  const attendancePct =
    attendanceTotal > 0 ? Math.round((totalPresent / attendanceTotal) * 100) : null;

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
      <div className="mx-auto max-w-[1480px] space-y-5">
        <div className="h-14 w-96 max-w-full animate-pulse rounded-lg bg-slate-200" />
        <LoadingMetrics count={4} />
        <div className="grid gap-5 lg:grid-cols-2">
          <LoadingCard rows={3} />
          <LoadingCard rows={3} />
        </div>
      </div>
    );
  }

  const attention: AttentionItem[] = childRows
    .filter((child) => child.absent > 0)
    .map((child) => ({
      key: `absent-${child.id}`,
      title: `${child.firstName} missed ${child.absent} ${child.absent === 1 ? 'day' : 'days'}`,
      detail: 'In the last 30 days',
      to: '/parent/my-children',
      tone: 'warning' as const,
    }));

  return (
    <section className="mx-auto max-w-[1480px] space-y-5 text-slate-900">
      <PageHeader
        title={`Welcome${parent ? `, ${parent.firstName}` : ''}`}
        subtitle="Your children's attendance and results."
      />

      <KpiStrip
        items={[
          {
            label: 'Children',
            value: children.length.toLocaleString(),
            hint: 'Linked to your account',
            to: '/parent/my-children',
          },
          {
            label: 'Attendance',
            value: attendancePct === null ? '—' : `${attendancePct}%`,
            hint: attendancePct === null ? 'No records yet' : 'Last 30 days',
          },
          { label: 'Days absent', value: totalAbsent.toLocaleString(), hint: 'Last 30 days' },
          { label: 'Days late', value: totalLate.toLocaleString(), hint: 'Last 30 days' },
        ]}
      />

      {children.length === 0 ? (
        <DashboardCard>
          <EmptyPanel
            icon={Users}
            message="No children are linked yet. Ask your school administrator to link your children's accounts."
          />
        </DashboardCard>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-12">
          <div className="min-w-0 space-y-5 xl:col-span-8">
            <DashboardCard>
              <CardHeader title="Attendance by child" subtitle="Last 30 days" />
              <div className="px-2 pb-3 pt-1">
                <DataTable
                  ariaLabel="Children attendance"
                  columns={childColumns}
                  data={childRows}
                  rowKey={(child) => child.id}
                  emptyTitle="No children linked yet"
                  minWidth={500}
                  className="border-0 shadow-none"
                  sort={null}
                />
              </div>
            </DashboardCard>

            <DashboardCard>
              <CardHeader
                title="Recent report cards"
                action={
                  reportCards.length > 0 ? (
                    <TextLink to="/parent/report-cards">View all</TextLink>
                  ) : undefined
                }
              />
              <div className="px-2 pb-3 pt-1">
                <DataTable
                  ariaLabel="Recent report cards"
                  columns={reportCardColumns}
                  data={reportCardRows}
                  rowKey={(row) => row.id}
                  emptyTitle="No report cards yet"
                  emptyDescription="Published results will appear here."
                  minWidth={420}
                  className="border-0 shadow-none"
                  sort={null}
                />
              </div>
            </DashboardCard>
          </div>

          <div className="min-w-0 space-y-5 xl:col-span-4">
            <AttentionCard items={attention} />
            <DashboardCard>
              <CardHeader title="Children" />
              <div className="space-y-4 px-5 pb-5 pt-2">
                {childRows.map((child) => (
                  <MeterRow
                    key={child.id}
                    label={`${child.firstName} ${child.lastName}`}
                    value={
                      child.total > 0 ? `${Math.round((child.present / child.total) * 100)}%` : '—'
                    }
                    percent={child.total > 0 ? (child.present / child.total) * 100 : 0}
                    hint={
                      child.total > 0
                        ? `${child.className} · ${child.present} of ${child.total} days present${
                            child.excused > 0 ? ` · ${child.excused} excused` : ''
                          }`
                        : `${child.className} · No attendance records yet`
                    }
                  />
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>
      )}
    </section>
  );
}
