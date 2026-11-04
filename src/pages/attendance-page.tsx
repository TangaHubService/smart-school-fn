import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { z } from 'zod';

import { Avatar } from '../components/ui/avatar';
import { EmptyState } from '../components/empty-state';
import { AppDrawer } from '../components/drawer';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  AttendanceStatus,
  downloadAttendanceReportPdfApi,
  getAttendanceClassReportApi,
  getAttendanceReportApi,
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
import { exportToExcel, exportToPDF } from '../utils/report-export';

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
      })
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
    typeof navigator === 'undefined' ? true : navigator.onLine
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
  // Report range filter (Rev #20): works with class + status filters.
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportStatus, setReportStatus] = useState<'' | AttendanceStatus>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const attendanceReportQuery = useQuery({
    queryKey: ['attendance', 'report', selectedClassId, reportFrom, reportTo, reportStatus],
    enabled: Boolean(selectedClassId && (reportFrom || reportTo || reportStatus)),
    queryFn: () =>
      getAttendanceReportApi(auth.accessToken!, {
        classRoomId: selectedClassId || undefined,
        status: reportStatus || undefined,
        from: reportFrom || undefined,
        to: reportTo || undefined,
      }),
  });

  const handleDownloadServerPdf = async () => {
    if (!selectedClassId) {
      showToast({ type: 'error', title: 'Select a class first' });
      return;
    }
    setDownloadingPdf(true);
    try {
      const blob = await downloadAttendanceReportPdfApi(auth.accessToken!, {
        classRoomId: selectedClassId,
        status: reportStatus || undefined,
        from: reportFrom || undefined,
        to: reportTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${selectedClassId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ type: 'success', title: 'Attendance PDF downloaded' });
    } catch {
      showToast({ type: 'error', title: 'PDF download failed' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const isTeacherOnly =
    auth.me?.roles?.includes('TEACHER') &&
    !auth.me?.roles?.includes('SCHOOL_ADMIN') &&
    !auth.me?.roles?.includes('SUPER_ADMIN');

  const classesQuery = useQuery({
    queryKey: ['attendance', 'classes', isTeacherOnly],
    queryFn: () =>
      listAttendanceClassesApi(auth.accessToken!, {
        teacherOnly: isTeacherOnly || undefined,
      }),
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
    [
      auth.accessToken,
      classAttendanceQuery,
      isOnline,
      isSyncing,
      queryClient,
      refreshQueueStats,
      showToast,
    ]
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

    return rows.filter((row) => {
      const matchesSearch = !q || `${row.firstName} ${row.lastName}`.toLowerCase().includes(q) || row.studentCode.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [classAttendanceQuery.data?.students, search, statusFilter]);

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

  const handleExportExcel = () => {
    const students = classAttendanceQuery.data?.students ?? [];
    if (!students.length) return;
    
    const className = selectedClassId ? classesQuery.data?.find(c => c.id === selectedClassId)?.name : 'Class';
    const data = {
      title: `Attendance - ${className || 'Class'}`,
      subtitle: `Date: ${date}`,
      columns: [
        { header: '#', key: 'index' },
        { header: 'Student Code', key: 'studentCode' },
        { header: 'Student Name', key: 'studentName' },
        { header: 'Status', key: 'status' },
        { header: 'Remarks', key: 'remarks' },
      ],
      rows: students.map((row, idx) => ({
        index: idx + 1,
        studentCode: row.studentCode,
        studentName: `${row.firstName} ${row.lastName}`,
        status: gridRows[row.studentId]?.status ?? 'PRESENT',
        remarks: gridRows[row.studentId]?.remarks ?? '',
      })),
    };
    exportToExcel(data);
  };

  const handleExportPDF = () => {
    const students = classAttendanceQuery.data?.students ?? [];
    if (!students.length) return;
    
    const className = selectedClassId ? classesQuery.data?.find(c => c.id === selectedClassId)?.name : 'Class';
    const data = {
      title: `Attendance - ${className || 'Class'}`,
      subtitle: `Date: ${date}`,
      columns: [
        { header: '#', key: 'index' },
        { header: 'Student Code', key: 'studentCode' },
        { header: 'Student Name', key: 'studentName' },
        { header: 'Status', key: 'status' },
        { header: 'Remarks', key: 'remarks' },
      ],
      rows: students.map((row, idx) => ({
        index: idx + 1,
        studentCode: row.studentCode,
        studentName: `${row.firstName} ${row.lastName}`,
        status: gridRows[row.studentId]?.status ?? 'PRESENT',
        remarks: gridRows[row.studentId]?.remarks ?? '',
      })),
    };
    exportToPDF(data);
  };

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
        !(error instanceof ApiClientError) && error instanceof Error && error.name === 'TypeError';

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
      subtitle="Record, review, and manage daily class attendance."
      action={
        <div className="flex flex-wrap items-center gap-2">
          {classAttendanceQuery.data && classAttendanceQuery.data.students.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-brand-100"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-brand-100"
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void handleSaveAttendance()}
            disabled={saveAttendanceMutation.isPending || classAttendanceQuery.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
          >
            {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      }
    >
      <div
        className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
          isOnline
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
            aria-hidden="true"
          />
          <p className="font-semibold leading-relaxed">
            <span className="uppercase tracking-wide text-[11px] font-bold text-slate-500">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {isSyncing ? (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-emerald-700" />
                Syncing...
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void syncQueue(true)}
            disabled={!isOnline || isSyncing || queueStats.total === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/40 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:opacity-40"
          >
            Sync now
          </button>
          <button
            type="button"
            onClick={() => {
              void clearFailedAttendanceQueueItems().then(() => refreshQueueStats());
            }}
            disabled={queueStats.failed === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-40"
          >
            Clear failed
          </button>
        </div>
        <p className="w-full text-[11px] text-slate-500 mt-1">Queue: <span className="font-semibold text-slate-700">{queueStats.pending}</span> pending • <span className="font-semibold text-slate-700">{queueStats.failed}</span> failed</p>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-[1fr_1fr_2fr_1fr_auto] lg:grid-cols-[220px_180px_2fr_160px_auto] items-end">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Class
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 shadow-sm"
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

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 shadow-sm"
              aria-label="Attendance date"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Search student
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or student code"
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 shadow-sm"
              aria-label="Search student in attendance grid"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 shadow-sm"
              aria-label="Filter by attendance status"
            >
              <option value="">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setSelectedClassId('');
              setDate(getTodayKigaliDate());
              setSearch('');
              setStatusFilter('');
            }}
            className="h-10 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-brand-100"
          >
            Reset
          </button>
        </div>
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
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
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
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
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
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-blue-50/30 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">Total</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{classAttendanceQuery.data.summary.total}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-emerald-50/30 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Present</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{classAttendanceQuery.data.summary.present}</p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/60 to-red-50/30 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">Absent</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{classAttendanceQuery.data.summary.absent}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-amber-50/30 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Late</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{classAttendanceQuery.data.summary.late}</p>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/60 to-cyan-50/30 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-cyan-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-600">Excused</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{classAttendanceQuery.data.summary.excused}</p>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
            <table className="w-full min-w-full table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-slate-700 bg-slate-50/50">
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">#</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Student</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Remarks</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">History</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={row.studentId} className="border-b border-brand-50 hover:bg-slate-50/60 transition">
                    <td className="px-3 py-3 align-middle text-slate-600 font-medium">{index + 1}</td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{row.firstName} {row.lastName}</p>
                          <p className="text-xs text-slate-500">{row.studentCode}</p>
                        </div>
                      </div>
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
                        className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
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

      <AppDrawer
        open={Boolean(selectedHistoryStudent)}
        onClose={() => setSelectedHistoryStudent(null)}
        title="Student Attendance History"
        description={selectedHistoryStudent?.fullName}
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
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
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
              <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-slate-800">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total</p>
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
      </AppDrawer>
    </SectionCard>
  );
}
