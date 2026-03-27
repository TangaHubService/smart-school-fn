import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyExamScheduleApi } from '../features/sprint5/exams.api';
import { getStoredAcademicYearId } from './student-academic-year-select-page';

export function StudentExamSchedulePage() {
  const auth = useAuth();
  const academicYearId = getStoredAcademicYearId();
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  if (!academicYearId) {
    return <Navigate to="/student/academic-year" replace />;
  }

  const query = useQuery({
    queryKey: ['student-exam-schedule', upcomingOnly],
    enabled: Boolean(auth.accessToken && academicYearId),
    queryFn: () =>
      listMyExamScheduleApi(auth.accessToken!, {
        upcomingOnly: upcomingOnly || undefined,
      }),
  });

  if (query.isError) {
    return (
      <StateView
        title="Could not load schedule"
        message="We could not load your exam schedule. Try again."
        action={
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const items = query.data?.items ?? [];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam schedule</h1>
          <p className="text-sm text-slate-600">
            Scheduled written exams for your enrolled classes. Online tests are under Tests.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={upcomingOnly}
            onChange={(e) => setUpcomingOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Upcoming only
        </label>
      </div>

      <SectionCard title="Scheduled exams">
        {query.isPending ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No exams listed"
            message={
              upcomingOnly
                ? 'No upcoming exams with dates set for your classes.'
                : 'No exams are scheduled for your classes in the current academic year.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Exam</th>
                  <th className="py-2 pr-4 font-medium">Subject</th>
                  <th className="py-2 pr-4 font-medium">Class</th>
                  <th className="py-2 font-medium">Term</th>
                </tr>
              </thead>
              <tbody>
                {items.map((exam) => (
                  <tr key={exam.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 text-slate-800">
                      {exam.examDate
                        ? new Date(exam.examDate).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900">{exam.name}</td>
                    <td className="py-3 pr-4 text-slate-700">{exam.subject.name}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      {exam.classRoom.code} {exam.classRoom.name}
                    </td>
                    <td className="py-3 text-slate-600">{exam.term.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </section>
  );
}
