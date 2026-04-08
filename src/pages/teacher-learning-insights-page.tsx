import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listTeacherLearningInsightsApi } from '../features/sprint4/lms.api';

export function TeacherLearningInsightsPage() {
  const auth = useAuth();
  const q = useQuery({
    queryKey: ['lms', 'teacher-learning-insights'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => listTeacherLearningInsightsApi(auth.accessToken!),
  });

  if (q.isError) {
    return (
      <StateView
        title="Could not load insights"
        message="You may need teacher course assignments, or try again."
        action={
          <button
            type="button"
            onClick={() => void q.refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <SectionCard
      title="Learning insights"
      subtitle="Completion and quiz performance for courses you teach."
      action={
        <span className="inline-flex items-center gap-2 text-sm text-slate-500">
          <BarChart3 className="h-4 w-4 text-brand-600" aria-hidden />
          Teacher view
        </span>
      }
    >
      {q.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium">Course</th>
                <th className="px-4 py-2 font-medium">Students</th>
                <th className="px-4 py-2 font-medium">Lessons</th>
                <th className="px-4 py-2 font-medium">Avg completion</th>
                <th className="px-4 py-2 font-medium">At risk (&lt;30%)</th>
                <th className="px-4 py-2 font-medium">Avg quiz %</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.items.length ? (
                q.data.items.map((row) => (
                  <tr key={row.courseId} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.courseTitle}</td>
                    <td className="px-4 py-3 text-slate-700">{row.enrolledStudents}</td>
                    <td className="px-4 py-3 text-slate-700">{row.publishedLessons}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.avgCompletionPercent != null ? `${row.avgCompletionPercent}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.atRiskCount}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.avgQuizScorePercent != null ? `${row.avgQuizScorePercent}%` : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No courses assigned to you yet, or no enrollments to analyze.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
