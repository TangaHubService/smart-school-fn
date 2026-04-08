import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileBarChart2,
  Home,
  School,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import {
  DashboardQuickActionsDropdown,
  type DashboardQuickActionItem,
} from '../components/dashboard/quick-actions-dropdown';
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

const TEACHER_QUICK_ACTIONS: DashboardQuickActionItem[] = [
  {
    label: 'Mark attendance',
    description: 'Open today attendance and mark your classes.',
    icon: ClipboardCheck,
    to: '/admin/attendance',
  },
  {
    label: 'Grade submissions',
    description: 'Open assignments and review pending work.',
    icon: ClipboardCheck,
    to: '/admin/assignments',
  },
  {
    label: 'Enter marks',
    description: 'Go to exams and update marks.',
    icon: FileBarChart2,
    to: '/admin/exams',
  },
  {
    label: 'My courses',
    description: 'Open your course and lesson workspace.',
    icon: BookOpen,
    to: '/admin/courses',
  },
  {
    label: 'Learning insights',
    description: 'See class completion and quiz performance.',
    icon: BarChart3,
    to: '/admin/learning-insights',
  },
];

export function TeacherDashboardPage() {
  const { t } = useTranslation('teacher');
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
        title={t('dashboard.errorTitle')}
        message={t('dashboard.errorMessage')}
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            {t('dashboard.retry')}
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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t('dashboard.portal')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-900">
              {data.school.displayName}
              {data.school.city ? `, ${data.school.city}` : ''}
            </h1>
            <DashboardQuickActionsDropdown actions={TEACHER_QUICK_ACTIONS} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <span className="text-sm text-slate-600">{t('dashboard.today', { date: todayStr })}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherMetricCard
          icon={BookOpen}
          label={t('dashboard.metrics.myCourses')}
          value={data.metrics.myCourses}
          to="/admin/courses"
          color="green"
        />
        <TeacherMetricCard
          icon={School}
          label={t('dashboard.metrics.myClasses')}
          value={data.metrics.myClasses}
          to="/admin/my-classes"
          color="blue"
        />
        <TeacherMetricCard
          icon={ClipboardCheck}
          label={t('dashboard.metrics.pendingToGrade')}
          value={data.metrics.pendingSubmissions}
          to="/admin/assignments"
          color="orange"
        />
        <TeacherMetricCard
          icon={Users}
          label={t('dashboard.metrics.markedToday')}
          value={data.todayAttendance.markedStudents}
          to="/admin/attendance"
          color="green"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">{t('dashboard.attendanceTitle')}</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">{t('dashboard.classesWithSessions')}</span>
              <span className="font-semibold text-slate-900">
                {data.todayAttendance.totalClasses - data.todayAttendance.pendingClasses} /{' '}
                {data.todayAttendance.totalClasses}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">{t('dashboard.studentsMarked')}</span>
              <span className="font-semibold text-slate-900">{data.todayAttendance.markedStudents}</span>
            </div>
            {data.todayAttendance.pendingClasses > 0 && (
              <Link
                to="/admin/attendance"
                className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
              >
                {t('dashboard.pendingClasses', { count: data.todayAttendance.pendingClasses })} →
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{t('dashboard.upcomingExams')}</h2>
            <Link to="/admin/exams" className="text-sm font-semibold text-brand-500">
              {t('dashboard.viewAll')} →
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
              <p className="py-6 text-center text-sm text-slate-500">{t('dashboard.noUpcomingExams')}</p>
            )}
          </div>
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
