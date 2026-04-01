import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  listMyChildAttendanceApi,
  listMyChildrenApi,
} from '../features/sprint2/sprint2.api';

function getTodayKigaliDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const value = formatter.format(new Date());
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

interface SelectedStudent {
  id: string;
  fullName: string;
}

export function ParentMyChildrenPage() {
  const auth = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [historyFrom, setHistoryFrom] = useState(() => {
    const today = new Date(`${getTodayKigaliDate()}T00:00:00.000Z`);
    today.setUTCDate(today.getUTCDate() - 30);
    return today.toISOString().slice(0, 10);
  });
  const [historyTo, setHistoryTo] = useState(getTodayKigaliDate());

  const childrenQuery = useQuery({
    queryKey: ['parent', 'my-children'],
    queryFn: () => listMyChildrenApi(auth.accessToken!),
  });

  const childAttendanceQuery = useQuery({
    queryKey: ['parent', 'my-children', 'attendance', selectedStudent?.id ?? null, historyFrom, historyTo],
    enabled: Boolean(selectedStudent?.id),
    queryFn: () =>
      listMyChildAttendanceApi(auth.accessToken!, selectedStudent!.id, {
        from: historyFrom,
        to: historyTo,
      }),
  });

  const parent = childrenQuery.data?.parent;
  const students = childrenQuery.data?.students ?? [];

  return (
    <SectionCard
      title="My Children"
      subtitle="View linked student profiles, active enrollment, and attendance history."
    >
      {childrenQuery.isPending ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {childrenQuery.isError ? (
        <StateView
          title="Could not load linked students"
          message="Please retry."
          action={
            <button
              type="button"
              onClick={() => void childrenQuery.refetch()}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError ? (
        <div className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-slate-700">
          Parent profile: {parent ? `${parent.firstName} ${parent.lastName}` : 'Not linked yet'}
        </div>
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError && students.length === 0 ? (
        <EmptyState message="No children linked to your account yet. Contact school administration." />
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError && students.length > 0 ? (
        <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full min-w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-slate-700">
                <th className="px-2 py-2 font-semibold">Student</th>
                <th className="px-2 py-2 font-semibold">Code</th>
                <th className="px-2 py-2 font-semibold">Relationship</th>
                <th className="px-2 py-2 font-semibold">Class</th>
                <th className="px-2 py-2 font-semibold">Attendance (30d)</th>
                <th className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-brand-50">
                  <td className="px-2 py-2 align-middle font-semibold text-slate-800">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-2 py-2 align-middle">{student.studentCode}</td>
                  <td className="px-2 py-2 align-middle">
                    {student.relationship}
                    {student.isPrimary ? ' (Primary)' : ''}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    {student.currentEnrollment?.classRoom.name ?? '-'}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">
                        P {student.attendanceLast30Days.present}
                      </span>
                      <span className="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-800">
                        A {student.attendanceLast30Days.absent}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-800">
                        L {student.attendanceLast30Days.late}
                      </span>
                      <span className="rounded-full bg-sky-50 px-2 py-1 font-semibold text-sky-800">
                        E {student.attendanceLast30Days.excused}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Last marked: {student.attendanceLast30Days.lastMarkedDate ?? 'No records'}
                    </p>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStudent({
                          id: student.id,
                          fullName: `${student.firstName} ${student.lastName}`,
                        })
                      }
                      className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      View history
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        title="Attendance History"
        description={selectedStudent?.fullName}
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            From
            <input
              type="date"
              value={historyFrom}
              onChange={(event) => setHistoryFrom(event.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            To
            <input
              type="date"
              value={historyTo}
              onChange={(event) => setHistoryTo(event.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
        </div>

        {childAttendanceQuery.isPending ? (
          <div className="grid gap-2" role="status" aria-live="polite">
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          </div>
        ) : null}

        {childAttendanceQuery.isError ? (
          <StateView
            title="Could not load attendance history"
            message="Retry after adjusting the date range."
            action={
              <button
                type="button"
                onClick={() => void childAttendanceQuery.refetch()}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            }
          />
        ) : null}

        {!childAttendanceQuery.isPending && !childAttendanceQuery.isError && childAttendanceQuery.data ? (
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryTile label="Total" value={childAttendanceQuery.data.summary.total} />
              <SummaryTile label="Present" value={childAttendanceQuery.data.summary.present} tone="present" />
              <SummaryTile label="Absent" value={childAttendanceQuery.data.summary.absent} tone="absent" />
              <SummaryTile label="Late" value={childAttendanceQuery.data.summary.late} tone="late" />
              <SummaryTile label="Excused" value={childAttendanceQuery.data.summary.excused} tone="excused" />
            </div>

            {childAttendanceQuery.data.records.length === 0 ? (
              <EmptyState message="No attendance records in this range." />
            ) : (
              <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                <table className="w-full min-w-full table-auto text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-100 text-slate-700">
                      <th className="px-2 py-2 font-semibold">Date</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                      <th className="px-2 py-2 font-semibold">Class</th>
                      <th className="px-2 py-2 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childAttendanceQuery.data.records.map((record) => (
                      <tr key={record.id} className="border-b border-brand-50">
                        <td className="px-2 py-2 align-middle">{record.date}</td>
                        <td className="px-2 py-2 align-middle">{record.status}</td>
                        <td className="px-2 py-2 align-middle">
                          {record.classRoom.code} - {record.classRoom.name}
                        </td>
                        <td className="px-2 py-2 align-middle">{record.remarks ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </SectionCard>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'present' | 'absent' | 'late' | 'excused';
}) {
  const toneClass =
    tone === 'present'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
      : tone === 'absent'
        ? 'border-red-100 bg-red-50 text-red-900'
        : tone === 'late'
          ? 'border-amber-100 bg-amber-50 text-amber-900'
          : tone === 'excused'
            ? 'border-sky-100 bg-sky-50 text-sky-900'
            : 'border-brand-100 bg-brand-50 text-slate-900';

  return (
    <article className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </article>
  );
}

