import {
  BookOpen,
  ClipboardCheck,
  FileBarChart2,
  Home,
  School,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { getTeacherDashboardApi } from '../features/dashboard/dashboard.api';
import { useQuery } from '@tanstack/react-query';

function getTodayKigaliDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const value = formatter.format(new Date());
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

export function TeacherDashboardPage() {
  const auth = useAuth();
  const todayStr = getTodayKigaliDate();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'teacher'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => getTeacherDashboardApi(auth.accessToken!),
  });

  if (isError) {
    return (
      <StateView
        title="Could not load dashboard"
        message="Retry to load your teacher dashboard."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Teacher Portal
          </p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-slate-900">
            {data.school.displayName}
            {data.school.city ? `, ${data.school.city}` : ''}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Your classes, attendance, and assignments at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:justify-end">
          <span className="text-sm text-slate-600">Today: {todayStr}</span>
          <Link
            to="/admin/attendance"
            className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Mark attendance
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherMetricCard
          icon={BookOpen}
          label="My Courses"
          value={data.metrics.myCourses}
          to="/admin/courses"
          color="green"
        />
        <TeacherMetricCard
          icon={School}
          label="My Classes"
          value={data.metrics.myClasses}
          to="/admin/my-classes"
          color="blue"
        />
        <TeacherMetricCard
          icon={ClipboardCheck}
          label="Pending to grade"
          value={data.metrics.pendingSubmissions}
          to="/admin/assignments"
          color="orange"
        />
        <TeacherMetricCard
          icon={Users}
          label="Marked today"
          value={data.todayAttendance.markedStudents}
          to="/admin/attendance"
          color="green"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Today&apos;s attendance</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Classes with sessions</span>
              <span className="font-semibold text-slate-900">
                {data.todayAttendance.totalClasses - data.todayAttendance.pendingClasses} /{' '}
                {data.todayAttendance.totalClasses}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Students marked</span>
              <span className="font-semibold text-slate-900">{data.todayAttendance.markedStudents}</span>
            </div>
            {data.todayAttendance.pendingClasses > 0 && (
              <Link
                to="/admin/attendance"
                className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
              >
                {data.todayAttendance.pendingClasses} classes still need attendance →
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Upcoming exams</h2>
            <Link to="/admin/exams" className="text-sm font-semibold text-brand-500">
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.upcomingExams.length ? (
              data.upcomingExams.map((exam) => (
                <Link
                  key={exam.id}
                  to="/admin/exams"
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:bg-slate-100"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{exam.title}</p>
                    <p className="text-sm text-slate-500">{exam.relativeDate}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-600">{exam.time}</span>
                </Link>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No upcoming exams</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/admin/attendance"
            className="flex items-center gap-3 rounded-xl bg-brand-500 px-4 py-3 text-white transition hover:bg-brand-600"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span className="font-semibold">Mark attendance</span>
          </Link>
          <Link
            to="/admin/assignments"
            className="flex items-center gap-3 rounded-xl bg-amber-500 px-4 py-3 text-white transition hover:bg-amber-600"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span className="font-semibold">Grade submissions</span>
          </Link>
          <Link
            to="/admin/exams"
            className="flex items-center gap-3 rounded-xl bg-slate-600 px-4 py-3 text-white transition hover:bg-slate-700"
          >
            <FileBarChart2 className="h-5 w-5" />
            <span className="font-semibold">Enter marks</span>
          </Link>
          <Link
            to="/admin/courses"
            className="flex items-center gap-3 rounded-xl bg-green-500 px-4 py-3 text-white transition hover:bg-green-600"
          >
            <BookOpen className="h-5 w-5" />
            <span className="font-semibold">My courses</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function TeacherMetricCard({
  icon: Icon,
  label,
  value,
  to,
  color,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  to: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <Link
      to={to}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${colorClasses[color] ?? 'bg-slate-100 text-slate-600'}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </Link>
  );
}
