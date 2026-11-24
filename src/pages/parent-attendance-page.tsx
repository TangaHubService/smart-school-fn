import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { StateView } from '../components/state-view';
import { Badge, type BadgeTone } from '../components/ui/badge';
import { DataTable, type DataTableColumn } from '../components/ui/data-table';
import {
  CardHeader,
  DashboardCard,
  EmptyPanel,
  KpiStrip,
  PageHeader,
} from '../components/ui/dashboard-kit';
import { useAuth } from '../features/auth/auth.context';
import {
  listMyChildAttendanceApi,
  listMyChildrenApi,
  type MyChildAttendanceHistoryResponse,
} from '../features/sprint2/sprint2.api';
import { percentOf } from '../utils/format-number';

type AttendanceRecord = MyChildAttendanceHistoryResponse['records'][number];

const STATUS_TONE: Record<AttendanceRecord['status'], BadgeTone> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  EXCUSED: 'info',
};

const STATUS_LABEL: Record<AttendanceRecord['status'], string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused',
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const columns: DataTableColumn<AttendanceRecord>[] = [
  {
    key: 'date',
    header: 'Date',
    mobile: 'primary',
    render: (record) => (
      <span className="whitespace-nowrap font-medium text-slate-800">
        {new Date(record.date).toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    mobile: 'secondary',
    render: (record) => (
      <Badge tone={STATUS_TONE[record.status]}>{STATUS_LABEL[record.status]}</Badge>
    ),
  },
  {
    key: 'classRoom',
    header: 'Class',
    render: (record) => <span className="text-slate-600">{record.classRoom.name}</span>,
  },
  {
    key: 'remarks',
    header: 'Remarks',
    render: (record) => <span className="text-slate-600">{record.remarks || '—'}</span>,
  },
];

export function ParentAttendancePage() {
  const auth = useAuth();
  const [studentId, setStudentId] = useState('');
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(() => isoDate(new Date()));

  const childrenQuery = useQuery({
    queryKey: ['parent', 'my-children'],
    queryFn: () => listMyChildrenApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });
  const children = useMemo(() => childrenQuery.data?.students ?? [], [childrenQuery.data]);

  useEffect(() => {
    if (!studentId && children.length > 0) setStudentId(children[0].id);
  }, [children, studentId]);

  const attendanceQuery = useQuery({
    queryKey: ['parent', 'attendance', studentId, from, to],
    queryFn: () => listMyChildAttendanceApi(auth.accessToken!, studentId, { from, to }),
    enabled: Boolean(auth.accessToken && studentId),
  });

  if (childrenQuery.isError) {
    return (
      <StateView
        title="Could not load your children"
        message="Retry in a moment."
        action={
          <button
            type="button"
            onClick={() => void childrenQuery.refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const summary = attendanceQuery.data?.summary;
  const records = attendanceQuery.data?.records ?? [];
  const rate = summary && summary.total > 0 ? `${percentOf(summary.present, summary.total)}%` : '—';

  return (
    <section className="mx-auto max-w-[1480px] space-y-5 text-slate-900">
      <PageHeader title="Attendance" subtitle="Daily attendance records for your children." />

      {!childrenQuery.isPending && children.length === 0 ? (
        <DashboardCard>
          <EmptyPanel
            icon={Users}
            message="No children are linked yet. Ask your school administrator to link your children's accounts."
          />
        </DashboardCard>
      ) : (
        <>
          <DashboardCard>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Child</span>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                      {child.currentEnrollment ? ` — ${child.currentEnrollment.classRoom.name}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">From</span>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">To</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
          </DashboardCard>

          <KpiStrip
            items={[
              { label: 'Attendance rate', value: rate, hint: `${summary?.total ?? 0} school ${summary?.total === 1 ? 'day' : 'days'} recorded` },
              { label: 'Present', value: String(summary?.present ?? 0), hint: 'Days', positive: true },
              { label: 'Absent', value: String(summary?.absent ?? 0), hint: 'Days' },
              {
                label: 'Late',
                value: String(summary?.late ?? 0),
                hint: `${summary?.excused ?? 0} excused`,
              },
            ]}
          />

          <DashboardCard>
            <CardHeader title="Attendance records" subtitle={`${from} to ${to}`} />
            <div className="px-2 pb-3 pt-1">
              <DataTable<AttendanceRecord>
                ariaLabel="Attendance records"
                columns={columns}
                data={records}
                rowKey={(record) => record.id}
                loading={childrenQuery.isPending || attendanceQuery.isPending}
                skeletonRows={5}
                error={
                  attendanceQuery.isError
                    ? { title: 'Could not load attendance', message: 'Retry in a moment.' }
                    : null
                }
                onRetry={() => void attendanceQuery.refetch()}
                emptyTitle="No attendance records"
                emptyDescription="No attendance was taken in this date range."
                minWidth={520}
                className="border-0 shadow-none"
                sort={null}
              />
            </div>
          </DashboardCard>
        </>
      )}
    </section>
  );
}
