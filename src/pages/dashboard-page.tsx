import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  hasPermission,
  hasRole,
  isSchoolSetupComplete,
} from '../features/auth/auth-helpers';
import { getAttendanceDashboardSummaryApi } from '../features/sprint3/attendance.api';

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

export function DashboardPage() {
  const auth = useAuth();
  const [summaryDate, setSummaryDate] = useState(getTodayKigaliDate());

  const superAdmin = hasRole(auth.me, 'SUPER_ADMIN');
  const canSetup = hasPermission(auth.me, 'school.setup.manage');
  const canAttendance = hasPermission(auth.me, 'attendance.read');
  const setupComplete = isSchoolSetupComplete(auth.me);

  const attendanceSummaryQuery = useQuery({
    queryKey: ['attendance', 'dashboard-summary', summaryDate],
    enabled: Boolean(auth.accessToken && canAttendance && !superAdmin),
    queryFn: () => getAttendanceDashboardSummaryApi(auth.accessToken!, summaryDate),
  });

  const roleLabel = superAdmin
    ? 'Platform administration'
    : canSetup
      ? 'School administration'
      : canAttendance
        ? 'Teaching workspace'
        : 'Workspace';

  return (
    <section className="space-y-4">
      <SectionCard
        title="Dashboard"
        subtitle={`Welcome ${auth.me?.firstName ?? ''}. ${roleLabel}`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoTile label="Role" value={auth.me?.roles.join(', ') ?? '-'} />
          <InfoTile label="Tenant" value={auth.me?.tenant.name ?? '-'} />
          <InfoTile
            label="School Setup"
            value={
              superAdmin
                ? 'N/A (platform account)'
                : setupComplete
                  ? 'Completed'
                  : 'Incomplete'
            }
          />
        </div>
      </SectionCard>

      {!superAdmin && canAttendance ? (
        <SectionCard
          title="Attendance Summary"
          subtitle="Daily snapshot for attendance progress and student status."
          action={
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-sm font-semibold text-brand-800">
                Date
                <input
                  type="date"
                  value={summaryDate}
                  onChange={(event) => setSummaryDate(event.target.value)}
                  className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
                />
              </label>
              <Link
                to="/admin/attendance"
                className="h-10 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Open attendance
              </Link>
            </div>
          }
        >
          {attendanceSummaryQuery.isPending ? (
            <div className="grid gap-2" role="status" aria-live="polite">
              <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
              <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            </div>
          ) : null}

          {attendanceSummaryQuery.isError ? (
            <StateView
              title="Could not load attendance summary"
              message="Retry after checking your connection."
              action={
                <button
                  type="button"
                  onClick={() => void attendanceSummaryQuery.refetch()}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : null}

          {!attendanceSummaryQuery.isPending &&
          !attendanceSummaryQuery.isError &&
          attendanceSummaryQuery.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <InfoTile label="Active Classes" value={String(attendanceSummaryQuery.data.activeClasses)} />
                <InfoTile label="Opened Sessions" value={String(attendanceSummaryQuery.data.sessionsOpened)} />
                <InfoTile label="Pending Classes" value={String(attendanceSummaryQuery.data.pendingClasses)} />
                <InfoTile label="Coverage" value={`${attendanceSummaryQuery.data.coveragePercent}%`} />
                <InfoTile label="Marked Students" value={String(attendanceSummaryQuery.data.markedStudents)} />
                <InfoTile label="Date" value={attendanceSummaryQuery.data.date} />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatusTile label="Present" value={attendanceSummaryQuery.data.summary.present} tone="present" />
                <StatusTile label="Absent" value={attendanceSummaryQuery.data.summary.absent} tone="absent" />
                <StatusTile label="Late" value={attendanceSummaryQuery.data.summary.late} tone="late" />
                <StatusTile label="Excused" value={attendanceSummaryQuery.data.summary.excused} tone="excused" />
              </div>

              {attendanceSummaryQuery.data.activeClasses === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    message="No active classes yet. Finish setup and create classes before recording attendance."
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </SectionCard>
      ) : null}

      {superAdmin ? (
        <SectionCard title="SuperAdmin Actions" subtitle="Manage schools from one place.">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/super-admin/tenants"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Open tenants
            </Link>
          </div>
        </SectionCard>
      ) : null}

      {!superAdmin && canSetup ? (
        <SectionCard title="School Actions" subtitle="Complete setup and manage academics.">
          <div className="flex flex-wrap gap-2">
            {!setupComplete ? (
              <Link
                to="/admin/setup"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Continue setup wizard
              </Link>
            ) : (
              <>
                <Link
                  to="/admin/academic-years"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Academic years
                </Link>
                <Link
                  to="/admin/classes"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Classes
                </Link>
                <Link
                  to="/admin/attendance"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Attendance
                </Link>
                <Link
                  to="/admin/subjects"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Subjects
                </Link>
                <Link
                  to="/admin/staff"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Staff
                </Link>
              </>
            )}
          </div>
        </SectionCard>
      ) : null}

      {!superAdmin && !canSetup && canAttendance ? (
        <SectionCard title="Teacher Actions" subtitle="Open daily attendance and keep sessions up to date.">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/attendance"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Open attendance
            </Link>
          </div>
        </SectionCard>
      ) : null}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-brand-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-500">{label}</p>
      <p className="mt-2 text-base font-bold text-brand-900">{value}</p>
    </article>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'present' | 'absent' | 'late' | 'excused';
}) {
  const toneClass =
    tone === 'present'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
      : tone === 'absent'
        ? 'border-red-100 bg-red-50 text-red-900'
        : tone === 'late'
          ? 'border-amber-100 bg-amber-50 text-amber-900'
          : 'border-sky-100 bg-sky-50 text-sky-900';

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </article>
  );
}

