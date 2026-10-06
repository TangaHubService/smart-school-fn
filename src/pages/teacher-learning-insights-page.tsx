import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listCoursesApi, listTeacherLearningInsightsApi } from '../features/sprint4/lms.api';

export function TeacherLearningInsightsPage() {
  const auth = useAuth();
  const [classFilter, setClassFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');

  const q = useQuery({
    queryKey: ['lms', 'teacher-learning-insights', classFilter, courseFilter],
    enabled: Boolean(auth.accessToken),
    queryFn: () =>
      listTeacherLearningInsightsApi(auth.accessToken!, {
        classId: classFilter !== 'ALL' ? classFilter : undefined,
        courseId: courseFilter !== 'ALL' ? courseFilter : undefined,
      }),
  });

  const coursesQuery = useQuery({
    queryKey: ['lms', 'teacher-courses-options'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => listCoursesApi(auth.accessToken!, { page: 1, pageSize: 100 }),
  });

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of coursesQuery.data?.items ?? []) {
      map.set(c.classRoom.id, `${c.classRoom.code} - ${c.classRoom.name}`);
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [coursesQuery.data]);

  const courseOptions = useMemo(() => {
    return (coursesQuery.data?.items ?? [])
      .filter((c) => classFilter === 'ALL' || c.classRoom.id === classFilter)
      .map((c) => ({ id: c.id, label: c.title }));
  }, [coursesQuery.data, classFilter]);

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
      <div className="mb-4 grid gap-2 sm:grid-cols-[220px_220px_auto]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Class
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setCourseFilter('ALL');
            }}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
          >
            <option value="ALL">All classes</option>
            {classOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Course
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
          >
            <option value="ALL">All courses</option>
            {courseOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setClassFilter('ALL');
            setCourseFilter('ALL');
          }}
          className="mt-auto h-10 rounded-lg border border-brand-200 px-3 text-sm font-semibold"
        >
          Reset
        </button>
      </div>
      {q.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium">Course</th>
                <th className="px-4 py-2 font-medium">Class</th>
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
                    <td className="px-4 py-3 text-slate-700">{row.classRoomName ?? '—'}</td>
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
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No insights match the selected class/course filters.
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
