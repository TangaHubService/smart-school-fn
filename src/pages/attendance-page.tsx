import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  AttendanceStatus,
  getAttendanceClassReportApi,
  getStudentAttendanceHistoryApi,
  listAttendanceClassesApi,
  saveAttendanceBulkApi,
  SaveAttendanceBulkPayload,
} from '../features/sprint3/attendance.api';
import {
  clearFailedAttendanceQueueItems,
  enqueueAttendance,
  getAttendanceQueueStats,
  syncAttendanceQueue,
} from '../features/sprint3/attendance-queue';
import { ApiClientError } from '../types/api';

const statusOptions: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'EXCUSED', label: 'Excused' },
];

const saveAttendanceSchema = z.object({
  classRoomId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
        remarks: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(200),
});

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

interface GridRowState {
  status: AttendanceStatus;
  remarks: string;
}

interface SelectedStudentHistory {
  studentId: string;
  fullName: string;
}

export function AttendancePage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(getTodayKigaliDate());
  const [search, setSearch] = useState('');
  const [gridRows, setGridRows] = useState<Record<string, GridRowState>>({});
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueStats, setQueueStats] = useState({ total: 0, pending: 0, failed: 0 });
  const [selectedHistoryStudent, setSelectedHistoryStudent] =
    useState<SelectedStudentHistory | null>(null);
  const [historyFrom, setHistoryFrom] = useState(() => {
    const today = new Date(`${getTodayKigaliDate()}T00:00:00.000Z`);
    today.setUTCDate(today.getUTCDate() - 30);
    return today.toISOString().slice(0, 10);
  });
  const [historyTo, setHistoryTo] = useState(getTodayKigaliDate());

  const classesQuery = useQuery({
    queryKey: ['attendance', 'classes'],
    queryFn: () => listAttendanceClassesApi(auth.accessToken!),
  });

  const classAttendanceQuery = useQuery({
    queryKey: ['attendance', 'class-report', selectedClassId, date],
    enabled: Boolean(selectedClassId),
    queryFn: () => getAttendanceClassReportApi(auth.accessToken!, selectedClassId, date),
  });

  const studentHistoryQuery = useQuery({
    queryKey: [
      'attendance',
      'student-history',
      selectedHistoryStudent?.studentId ?? null,
      historyFrom,
      historyTo,
    ],
    enabled: Boolean(selectedHistoryStudent?.studentId),
    queryFn: () =>
      getStudentAttendanceHistoryApi(auth.accessToken!, selectedHistoryStudent!.studentId, {
        from: historyFrom,
        to: historyTo,
      }),
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: (payload: SaveAttendanceBulkPayload) =>
      saveAttendanceBulkApi(auth.accessToken!, payload),
  });

  const refreshQueueStats = useCallback(async () => {
    try {
      const stats = await getAttendanceQueueStats();
      setQueueStats(stats);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Offline queue unavailable',
        message: error instanceof Error ? error.message : 'IndexedDB unavailable',
      });
    }
  }, [showToast]);

  const syncQueue = useCallback(
    async (showNoPendingMessage: boolean, force = false) => {
      if (!auth.accessToken || (!force && !isOnline) || isSyncing) {
        return;
      }

      setIsSyncing(true);
      try {
        const result = await syncAttendanceQueue(auth.accessToken);
        await refreshQueueStats();

        if (result.synced > 0) {
          showToast({
            type: 'success',
            title: 'Attendance synced',
            message: `${result.synced} queued record set${result.synced > 1 ? 's' : ''} uploaded`,
          });
          await classAttendanceQuery.refetch();
          queryClient.invalidateQueries({ queryKey: ['attendance', 'class-report'] });
        }

        if (result.failed > 0) {
          showToast({
            type: 'error',
            title: 'Some queued items failed',
            message: 'Review class/student validity and retry sync.',
          });
        }

        if (showNoPendingMessage && result.synced === 0 && result.failed === 0) {
          showToast({
            type: 'info',
            title: 'Queue is already synced',
          });
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [auth.accessToken, classAttendanceQuery, isOnline, isSyncing, queryClient, refreshQueueStats, showToast],
  );

  useEffect(() => {
    void refreshQueueStats();
  }, [refreshQueueStats]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      void syncQueue(false, true);
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncQueue]);

  useEffect(() => {
    if (!selectedClassId && classesQuery.data?.length) {
      setSelectedClassId(classesQuery.data[0].id);
    }
  }, [classesQuery.data, selectedClassId]);

  useEffect(() => {
    const rows = classAttendanceQuery.data?.students ?? [];
    if (!rows.length) {
      setGridRows({});
      return;
    }

    const next: Record<string, GridRowState> = {};
    for (const row of rows) {
      next[row.studentId] = {
        status: row.status,
        remarks: row.remarks ?? '',
      };
    }

    setGridRows(next);
  }, [classAttendanceQuery.data?.date, classAttendanceQuery.data?.students]);

  const filteredRows = useMemo(() => {
    const rows = classAttendanceQuery.data?.students ?? [];
    const q = search.trim().toLowerCase();

    if (!q) {
      return rows;
    }

    return rows.filter((row) => {
      const fullName = `${row.firstName} ${row.lastName}`.toLowerCase();
      return fullName.includes(q) || row.studentCode.toLowerCase().includes(q);
    });
  }, [classAttendanceQuery.data?.students, search]);

  const hasUnsavedChanges = useMemo(() => {
    const rows = classAttendanceQuery.data?.students ?? [];
    if (!rows.length) {
      return false;
    }

    return rows.some((row) => {
      const local = gridRows[row.studentId];
      if (!local) {
        return false;
      }

      return local.status !== row.status || (local.remarks || '') !== (row.remarks ?? '');
    });
  }, [classAttendanceQuery.data?.students, gridRows]);

  function updateRow(studentId: string, patch: Partial<GridRowState>) {
    setGridRows((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status ?? 'PRESENT',
        remarks: prev[studentId]?.remarks ?? '',
        ...patch,
      },
    }));
  }

  function applyBulkStatus(status: AttendanceStatus) {
    setGridRows((prev) => {
      const next = { ...prev };
      for (const row of classAttendanceQuery.data?.students ?? []) {
        next[row.studentId] = {
          status,
          remarks: next[row.studentId]?.remarks ?? '',
        };
      }

      return next;
    });
  }

  async function handleSaveAttendance() {
    const students = classAttendanceQuery.data?.students ?? [];

    if (!selectedClassId) {
      showToast({
        type: 'error',
        title: 'Select class first',
      });
      return;
    }

    if (!students.length) {
      showToast({
        type: 'error',
        title: 'No enrolled students',
        message: 'Class has no active enrollments for this date.',
      });
      return;
    }

    const payload: SaveAttendanceBulkPayload = {
      sessionId: classAttendanceQuery.data?.session?.id ?? undefined,
      classRoomId: selectedClassId,
      date,
      academicYearId: classAttendanceQuery.data?.session?.academicYear?.id ?? undefined,
      records: students.map((row) => ({
        studentId: row.studentId,
        status: gridRows[row.studentId]?.status ?? 'PRESENT',
        remarks: (gridRows[row.studentId]?.remarks ?? '').trim() || undefined,
      })),
    };

    const validation = saveAttendanceSchema.safeParse(payload);
    if (!validation.success) {
      showToast({
        type: 'error',
        title: 'Invalid attendance payload',
        message: validation.error.issues[0]?.message ?? 'Fix form values and retry',
      });
      return;
    }

    if (!isOnline) {
      await enqueueAttendance(payload);
      await refreshQueueStats();
      showToast({
        type: 'info',
        title: 'Saved offline',
        message: 'Attendance queued and will sync automatically when back online.',
      });
      return;
    }

    try {
      const result = await saveAttendanceMutation.mutateAsync(payload);
      await classAttendanceQuery.refetch();
      showToast({
        type: 'success',
        title: 'Attendance saved',
        message: `${result.savedCount} records saved${result.editedCount > 0 ? `, ${result.editedCount} edited` : ''}`,
      });
    } catch (error) {
      const isNetworkError =
        !(error instanceof ApiClientError) &&
        error instanceof Error &&
        error.name === 'TypeError';

      if (isNetworkError) {
        await enqueueAttendance(payload);
        await refreshQueueStats();
        showToast({
          type: 'info',
          title: 'Network lost, queued offline',
          message: 'Attendance will sync once internet returns.',
        });
        return;
      }

      showToast({
        type: 'error',
        title: 'Could not save attendance',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    }
  }

  return (
    <SectionCard
      title="Attendance"
      subtitle="Mark class attendance quickly with offline queue and background sync."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyBulkStatus('PRESENT')}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => applyBulkStatus('ABSENT')}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
          >
            Mark All Absent
          </button>
          <button
            type="button"
            onClick={() => void handleSaveAttendance()}
            disabled={saveAttendanceMutation.isPending || classAttendanceQuery.isPending}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      }
    >
      <div
        className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
          isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
        role="status"
        aria-live="polite"
      >
        <p className="font-semibold">
          {isOnline ? 'Online' : 'Offline'} • Queue: {queueStats.pending} pending, {queueStats.failed} failed
          {isSyncing ? ' • Syncing...' : ''}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void syncQueue(true)}
            disabled={!isOnline || isSyncing || queueStats.total === 0}
            className="rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Sync now
          </button>
          <button
            type="button"
            onClick={() => {
              void clearFailedAttendanceQueueItems().then(() => refreshQueueStats());
            }}
            disabled={queueStats.failed === 0}
            className="rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Clear failed
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[220px_180px_1fr_auto]">
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Class
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            aria-label="Select class"
          >
            <option value="">Select class</option>
            {(classesQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            aria-label="Attendance date"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student code or name"
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            aria-label="Search student in attendance grid"
          />
        </label>

        <button
          type="button"
          onClick={() => void classAttendanceQuery.refetch()}
          className="mt-auto h-10 rounded-lg border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-700"
        >
          Refresh
        </button>
      </div>

      {hasUnsavedChanges ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You have unsaved attendance changes.
        </div>
      ) : null}

      {classesQuery.isPending ? (
        <div className="mb-4 grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {classesQuery.isError ? (
        <StateView
          title="Could not load classes"
          message="Retry after checking your connection."
          action={
            <button
              type="button"
              onClick={() => void classesQuery.refetch()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!classesQuery.isPending && !classesQuery.isError && classAttendanceQuery.isPending ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {!classesQuery.isPending && !classesQuery.isError && classAttendanceQuery.isError ? (
        <StateView
          title="Could not load attendance report"
          message="Retry and verify class/date selection."
          action={
            <button
              type="button"
              onClick={() => void classAttendanceQuery.refetch()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!classesQuery.isPending &&
      !classesQuery.isError &&
      !classAttendanceQuery.isPending &&
      !classAttendanceQuery.isError &&
      filteredRows.length === 0 ? (
        <EmptyState
          message={
            classAttendanceQuery.data?.students?.length
              ? 'No student matches your search query.'
              : 'No enrolled students found for this class/date.'
          }
        />
      ) : null}

      {!classAttendanceQuery.isPending &&
      !classAttendanceQuery.isError &&
      classAttendanceQuery.data ? (
        <>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <p className="text-xs uppercase tracking-[0.14em] text-brand-500">Total</p>
              <p className="text-lg font-bold">{classAttendanceQuery.data.summary.total}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-600">Present</p>
              <p className="text-lg font-bold">{classAttendanceQuery.data.summary.present}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-900">
              <p className="text-xs uppercase tracking-[0.14em] text-red-600">Absent</p>
              <p className="text-lg font-bold">{classAttendanceQuery.data.summary.absent}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="text-xs uppercase tracking-[0.14em] text-amber-600">Late</p>
              <p className="text-lg font-bold">{classAttendanceQuery.data.summary.late}</p>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-600">Excused</p>
              <p className="text-lg font-bold">{classAttendanceQuery.data.summary.excused}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-brand-100">
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-brand-700">
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Code</th>
                  <th className="px-2 py-2 font-semibold">Student</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-2 py-2 font-semibold">Remarks</th>
                  <th className="px-2 py-2 font-semibold">History</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={row.studentId} className="border-b border-brand-50">
                    <td className="px-2 py-2 align-middle text-brand-600">{index + 1}</td>
                    <td className="px-2 py-2 align-middle font-semibold text-brand-800">{row.studentCode}</td>
                    <td className="px-2 py-2 align-middle">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <select
                        value={gridRows[row.studentId]?.status ?? 'PRESENT'}
                        onChange={(event) =>
                          updateRow(row.studentId, {
                            status: event.target.value as AttendanceStatus,
                          })
                        }
                        className="h-9 rounded-lg border border-brand-200 px-2 text-sm outline-none focus:border-brand-400"
                        aria-label={`Attendance status for ${row.firstName} ${row.lastName}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <input
                        value={gridRows[row.studentId]?.remarks ?? ''}
                        onChange={(event) =>
                          updateRow(row.studentId, { remarks: event.target.value.slice(0, 300) })
                        }
                        placeholder="Optional note"
                        className="h-9 w-full min-w-[180px] rounded-lg border border-brand-200 px-2 text-sm outline-none focus:border-brand-400"
                        aria-label={`Attendance remarks for ${row.firstName} ${row.lastName}`}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedHistoryStudent({
                            studentId: row.studentId,
                            fullName: `${row.firstName} ${row.lastName}`,
                          })
                        }
                        className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <Modal
        open={Boolean(selectedHistoryStudent)}
        onClose={() => setSelectedHistoryStudent(null)}
        title="Student Attendance History"
        description={selectedHistoryStudent?.fullName}
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-brand-800">
            From
            <input
              type="date"
              value={historyFrom}
              onChange={(event) => setHistoryFrom(event.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-brand-800">
            To
            <input
              type="date"
              value={historyTo}
              onChange={(event) => setHistoryTo(event.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
        </div>

        {studentHistoryQuery.isPending ? (
          <div className="grid gap-2" role="status" aria-live="polite">
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          </div>
        ) : null}

        {studentHistoryQuery.isError ? (
          <StateView
            title="Could not load history"
            message="Retry after adjusting the date range."
            action={
              <button
                type="button"
                onClick={() => void studentHistoryQuery.refetch()}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            }
          />
        ) : null}

        {!studentHistoryQuery.isPending &&
        !studentHistoryQuery.isError &&
        studentHistoryQuery.data ? (
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">
                <p className="text-xs uppercase tracking-[0.14em] text-brand-500">Total</p>
                <p className="text-lg font-bold">{studentHistoryQuery.data.summary.total}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-600">Present</p>
                <p className="text-lg font-bold">{studentHistoryQuery.data.summary.present}</p>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-900">
                <p className="text-xs uppercase tracking-[0.14em] text-red-600">Absent</p>
                <p className="text-lg font-bold">{studentHistoryQuery.data.summary.absent}</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="text-xs uppercase tracking-[0.14em] text-amber-600">Late</p>
                <p className="text-lg font-bold">{studentHistoryQuery.data.summary.late}</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                <p className="text-xs uppercase tracking-[0.14em] text-sky-600">Excused</p>
                <p className="text-lg font-bold">{studentHistoryQuery.data.summary.excused}</p>
              </div>
            </div>

            {studentHistoryQuery.data.records.length === 0 ? (
              <EmptyState message="No attendance records in this date range." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-brand-100">
                <table className="w-full table-auto text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-100 text-brand-700">
                      <th className="px-2 py-2 font-semibold">Date</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                      <th className="px-2 py-2 font-semibold">Class</th>
                      <th className="px-2 py-2 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistoryQuery.data.records.map((item) => (
                      <tr key={item.id} className="border-b border-brand-50">
                        <td className="px-2 py-2 align-middle">{item.date}</td>
                        <td className="px-2 py-2 align-middle">{item.status}</td>
                        <td className="px-2 py-2 align-middle">
                          {item.classRoom.code} - {item.classRoom.name}
                        </td>
                        <td className="px-2 py-2 align-middle">{item.remarks ?? '-'}</td>
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
