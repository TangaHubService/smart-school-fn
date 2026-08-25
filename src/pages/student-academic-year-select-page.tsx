import { Calendar, GraduationCap } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { StateView } from '../components/state-view';
import { PageSkeleton } from '../components/skeleton-loader';
import { useAuth } from '../features/auth/auth.context';
import { hasRole } from '../features/auth/auth-helpers';
import { useAcademicYear } from '../contexts/academic-year-context';

export function StudentAcademicYearSelectPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { academicYearId, availableYears, isLoading, setAcademicYear } = useAcademicYear();

  useEffect(() => {
    if (academicYearId && availableYears.some((y) => y.id === academicYearId)) {
      navigate('/student/dashboard', { replace: true });
    }
  }, [academicYearId, availableYears, navigate]);

  if (!hasRole(auth.me, 'STUDENT')) {
    return (
      <StateView
        title="Access restricted"
        message="This page is for students only. Please log in with a student account."
      />
    );
  }

  if (isLoading) {
    return <PageSkeleton variant="form" />;
  }

  if (!availableYears.length) {
    return (
      <StateView
        title="No academic years available"
        message="Your school has not set up any academic years yet. Please contact your administrator."
      />
    );
  }

  async function handleSelect(id: string) {
    await setAcademicYear(id);
    navigate('/student/dashboard', { replace: true });
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Select Academic Year</h1>
            <p className="text-sm text-slate-600">
              Choose an academic year to proceed to your dashboard
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {availableYears.map((year) => (
            <button
              key={year.id}
              type="button"
              onClick={() => void handleSelect(year.id)}
              className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Calendar className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{year.name}</p>
                <p className="text-sm text-slate-500">
                  {new Date(year.startDate).toLocaleDateString()} –{' '}
                  {new Date(year.endDate).toLocaleDateString()}
                </p>
              </div>
              <span className="text-brand-500">→</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
