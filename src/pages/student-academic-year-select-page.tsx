import { Calendar, GraduationCap } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { hasRole } from '../features/auth/auth-helpers';
import { listAcademicYearsApi } from '../features/sprint1/sprint1.api';
import { useQuery } from '@tanstack/react-query';

const ACADEMIC_YEAR_STORAGE_KEY = 'smart-school-selected-academic-year-id';

interface AcademicYearItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export function getStoredAcademicYearId(): string | null {
  return sessionStorage.getItem(ACADEMIC_YEAR_STORAGE_KEY);
}

export function setStoredAcademicYearId(id: string): void {
  sessionStorage.setItem(ACADEMIC_YEAR_STORAGE_KEY, id);
}

export function clearStoredAcademicYearId(): void {
  sessionStorage.removeItem(ACADEMIC_YEAR_STORAGE_KEY);
}

export function StudentAcademicYearSelectPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['academic-years', 'student'],
    enabled: Boolean(auth.accessToken && hasRole(auth.me, 'STUDENT')),
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const years: AcademicYearItem[] = Array.isArray(data) ? (data as AcademicYearItem[]) : [];

  useEffect(() => {
    const stored = getStoredAcademicYearId();
    if (stored && years.length) {
      const exists = years.some((y) => y.id === stored);
      if (exists) {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [years, navigate]);

  if (!hasRole(auth.me, 'STUDENT')) {
    return (
      <StateView
        title="Access restricted"
        message="This page is for students only. Please log in with a student account."
      />
    );
  }

  if (isError) {
    return (
      <StateView
        title="Could not load academic years"
        message="Retry to load available academic years."
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

  if (isPending || data === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  if (!years.length) {
    return (
      <StateView
        title="No academic years available"
        message="Your school has not set up any academic years yet. Please contact your administrator."
      />
    );
  }

  function handleSelect(id: string) {
    setStoredAcademicYearId(id);
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
          {years.map((year) => (
            <button
              key={year.id}
              type="button"
              onClick={() => handleSelect(year.id)}
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
