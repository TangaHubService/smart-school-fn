import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileBarChart2, Home, Users } from 'lucide-react';
import { useMemo } from 'react';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyChildrenApi } from '../features/sprint2/sprint2.api';
import { getParentReportCardsApi } from '../features/sprint5/exams.api';
import {
  Card,
  CardActionLink,
  CardHeader,
  LoadingCard,
  LoadingMetrics,
  MetricCard,
} from '../components/dashboard/dashboard-ui';
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
        <span className="text-sm font-medium text-slate-900">
          {child.firstName} {child.lastName}
        </span>
      </span>
    ),
  },
  {
    key: 'className',
    header: 'Class',
    mobile: 'secondary',
    render: (child) => <span className="text-slate-600">{child.className}</span>,
  },
  {
    key: 'present',
    header: 'Present',
    align: 'center',
    render: (child) => <Badge tone="success">{child.present}</Badge>,
  },
  {
    key: 'absent',
    header: 'Absent',
    align: 'center',
    render: (child) => <Badge tone="danger">{child.absent}</Badge>,
  },
  {
    key: 'late',
    header: 'Late',
    align: 'center',
    render: (child) => <Badge tone="warning">{child.late}</Badge>,
  },
  {
    key: 'excused',
    header: 'Excused',
    align: 'center',
    render: (child) => <Badge tone="neutral">{child.excused}</Badge>,
  },
  {
    key: 'attendancePct',
    header: 'Attendance %',
    align: 'center',
    mobile: 'secondary',
    render: (child) => {
      const percentage = child.total > 0 ? Math.round((child.present / child.total) * 100) : 0;
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

      {childRows.length > 0 && (
        <Card>
          <CardHeader
            title="Children Performance"
            subtitle="Attendance comparison over the last 30 days"
            icon={Users}
            tone="brand"
          />
          <div className="p-4">
            <DataTable
              ariaLabel="Children attendance"
              columns={childColumns}
              data={childRows}
              rowKey={(child) => child.id}
              emptyTitle="No children linked yet"
              emptyDescription="Contact your school administrator to link your children's accounts."
              minWidth={640}
              className="border-0 shadow-none"
              sort={null}
            />
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
          <div className="p-4">
            <DataTable
              ariaLabel="Recent report cards"
              columns={reportCardColumns}
              data={reportCardRows}
              rowKey={(row) => row.id}
              emptyTitle="No report cards available yet"
              minWidth={420}
              className="border-0 shadow-none"
              sort={null}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent Activity"
            subtitle="Latest updates from your children"
            icon={Home}
            tone="success"
          />
          <div className="p-4">
            <DataTable
              ariaLabel="Recent activity"
              columns={activityColumns}
              data={activityRows(childRows, reportCardRows)}
              rowKey={(row) => row.id}
              emptyTitle="No recent activity"
              minWidth={420}
              className="border-0 shadow-none"
              sort={null}
            />
          </div>
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

interface ActivityRowData {
  id: string;
  student: string;
  activity: string;
  details: string;
}

const activityColumns: DataTableColumn<ActivityRowData>[] = [
  { key: 'student', header: 'Student', mobile: 'primary' },
  { key: 'activity', header: 'Activity', mobile: 'secondary' },
  { key: 'details', header: 'Details' },
];

function activityRows(
  childRows: ChildRow[],
  reportCardRows: ReportCardRow[]
): ActivityRowData[] {
  const rows: ActivityRowData[] = [];

  childRows.slice(0, 5).forEach((child) => {
    rows.push({
      id: `attendance-${child.id}`,
      student: `${child.firstName} ${child.lastName}`,
      activity: 'Attendance',
      details: `Last 30 days: ${child.present}/${child.total} present`,
    });
  });

  reportCardRows.slice(0, 3).forEach((rc) => {
    rows.push({
      id: `report-${rc.id}`,
      student: rc.studentName,
      activity: 'Report card',
      details: `${rc.termName} - ${rc.grade}`,
    });
  });

  return rows;
}
