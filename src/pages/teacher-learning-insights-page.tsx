import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Percent,
  RefreshCcw,
  Search,
  ArrowUpDown,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { InsightGrid, InsightCard } from '../components/ui/insight-card';
import { ChartCard } from '../components/ui/chart-card';
import { useAuth } from '../features/auth/auth.context';
import { listCoursesApi, listTeacherLearningInsightsApi } from '../features/sprint4/lms.api';

/** TEMPORARY SEED DATA — for design review only. Remove before production. */
const SEED_INSIGHTS = [
  {
    courseId: 'seed-1',courseTitle: 'Mathematics Fundamentals',
    classRoomId: 'c1',classRoomName: 'S2A',
    enrolledStudents: 28,publishedLessons: 12,
    avgCompletionPercent: 78,atRiskCount: 4,
    avgQuizScorePercent: 82,
  },
  {
    courseId: 'seed-2',courseTitle: 'English Literature',
    classRoomId: 'c1',classRoomName: 'S2A',
    enrolledStudents: 32,publishedLessons: 9,
    avgCompletionPercent: 65,atRiskCount: 7,
    avgQuizScorePercent: 71,
  },
  {
    courseId: 'seed-3',courseTitle: 'Physics & Chemistry',
    classRoomId: 'c2',classRoomName: 'S3B',
    enrolledStudents: 24,publishedLessons: 15,
    avgCompletionPercent: 91,atRiskCount: 1,
    avgQuizScorePercent: 88,
  },
  {
    courseId: 'seed-4',courseTitle: 'Biology Basics',
    classRoomId: 'c2',classRoomName: 'S3B',
    enrolledStudents: 20,publishedLessons: 10,
    avgCompletionPercent: 54,atRiskCount: 9,
    avgQuizScorePercent: 62,
  },
  {
    courseId: 'seed-5',courseTitle: 'History of Rwanda',
    classRoomId: 'c3',classRoomName: 'S1A',
    enrolledStudents: 35,publishedLessons: 8,
    avgCompletionPercent: 88,atRiskCount: 2,
    avgQuizScorePercent: 79,
  },
];

export function TeacherLearningInsightsPage() {
  const auth = useAuth();
  const [classFilter, setClassFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('courseTitle');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  const rows = (q.data?.items?.length ? q.data.items : SEED_INSIGHTS) as typeof SEED_INSIGHTS;

  const totalStudents = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.enrolledStudents ?? 0), 0);
  }, [rows]);

  const activeCourses = rows.length;
  const totalLessons = useMemo(
    () => rows.reduce((sum, r) => sum + (r.publishedLessons ?? 0), 0),
    [rows]
  );

  const avgCompletion = useMemo(() => {
    const valid = rows.map((r) => r.avgCompletionPercent).filter((v): v is number => typeof v === 'number');
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  }, [rows]);

  const atRiskTotal = useMemo(
    () => rows.reduce((sum, r) => sum + (r.atRiskCount ?? 0), 0),
    [rows]
  );

  const avgQuiz = useMemo(() => {
    const valid = rows.map((r) => r.avgQuizScorePercent).filter((v): v is number => typeof v === 'number');
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  }, [rows]);

  const chartDataCompletion = useMemo(() => {
    return rows
      .map((r) => ({
        name: r.courseTitle.length > 22 ? r.courseTitle.slice(0, 20) + '...' : r.courseTitle,
        value: r.avgCompletionPercent ?? 0,
        full: r.courseTitle,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const chartDataQuiz = useMemo(() => {
    return rows
      .map((r) => ({
        name: r.courseTitle.length > 22 ? r.courseTitle.slice(0, 20) + '...' : r.courseTitle,
        value: r.avgQuizScorePercent ?? 0,
        full: r.courseTitle,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const sortedRows = useMemo(() => {
    let data = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          (r.courseTitle ?? '').toLowerCase().includes(q) ||
          (r.classRoomName ?? '').toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const as = String(aVal ?? '').toLowerCase();
      const bs = String(bVal ?? '').toLowerCase();
      return sortDir === 'asc' ? (as < bs ? -1 : 1) : as < bs ? 1 : -1;
    });
    return data;
  }, [rows, search, sortKey, sortDir]);

  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  if (q.isError) {
    return (
      <div className="min-h-[60vh] px-4 py-10">
        <StateView
          title="Could not load insights"
          message="You may need teacher course assignments, or try again."
          action={
            <button
              type="button"
              onClick={() => void q.refetch()}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const hasData = rows.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Learning Insights
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Monitor course engagement, completion, and assessment performance.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                Teacher view
              </span>
              <button
                type="button"
                onClick={() => void q.refetch()}
                aria-label="Refresh insights"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
            <label className="grid gap-1 text-sm font-medium text-slate-700 sm:min-w-[220px]">
              Class
              <select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setCourseFilter('ALL');
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              >
                <option value="ALL">All classes</option>
                {classOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700 sm:min-w-[220px]">
              Course
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
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
                setSearch('');
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:ml-auto"
            >
              Reset
            </button>
          </div>
        </div>

        {/* KPIs — horizontal scroll with border when overflow */}
        <section className="mb-6" aria-label="Overview metrics">
          <InsightGrid
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 divide-y-0 sm:divide-x sm:divide-y-0"
            items={[
              {
                key: 'students',
                icon: Users,
                label: 'Total Students',
                value: totalStudents.toLocaleString(),
                hint: 'Enrolled across selected scope',
                tone: 'brand',
              },
              {
                key: 'courses',
                icon: BookOpen,
                label: 'Active Courses',
                value: activeCourses.toLocaleString(),
                hint: 'Courses visible with filters',
                tone: 'success',
              },
              {
                key: 'lessons',
                icon: CheckCircle2,
                label: 'Lessons Published',
                value: totalLessons.toLocaleString(),
                hint: 'Published lessons in scope',
                tone: 'purple',
              },
              {
                key: 'completion',
                icon: Percent,
                label: 'Avg Completion',
                value: avgCompletion != null ? `${avgCompletion}%` : '—',
                hint: 'Average completion %',
                tone: 'brand',
              },
              {
                key: 'atRisk',
                icon: AlertTriangle,
                label: 'Students at Risk',
                value: atRiskTotal.toLocaleString(),
                hint: 'Below 30% completion',
                tone: 'danger',
              },
              {
                key: 'quiz',
                icon: TrendingUp,
                label: 'Avg Quiz Score',
                value: avgQuiz != null ? `${avgQuiz}%` : '—',
                hint: 'Average quiz score %',
                tone: 'orange',
              },
            ]}
          />
        </section>

        {/* Charts */}
        <section className="mb-6 grid gap-6 lg:grid-cols-2" aria-label="Analytics charts">
          <ChartCard title="Completion by Course" subtitle="Average completion percentage per course">
            {q.isPending ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : !chartDataCompletion.length ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                No completion data for the selected filters.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataCompletion} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      formatter={(value: any) => [`${value}%`, 'Avg completion']}
                      labelFormatter={(label: any, payload: any) =>
                        payload?.[0]?.payload?.full ?? label
                      }
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartDataCompletion.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? '#1d4ed8' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Quiz Performance" subtitle="Average quiz score percentage per course">
            {q.isPending ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : !chartDataQuiz.length ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                No quiz data for the selected filters.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataQuiz} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      formatter={(value: any) => [`${value}%`, 'Avg score']}
                      labelFormatter={(label: any, payload: any) =>
                        payload?.[0]?.payload?.full ?? label
                      }
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartDataQuiz.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? '#0f766e' : '#14b8a6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </section>

        {/* Table */}
        <section aria-label="Course performance table">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">Course Performance</h2>
                <p className="text-xs text-slate-500">Detailed results for the selected filters.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search courses..."
                    aria-label="Search courses"
                    className="h-9 w-56 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 text-left">
                      <button type="button" onClick={() => toggleSort('courseTitle')} className="inline-flex items-center gap-1 hover:text-slate-700">
                        Course <ArrowUpDown className="h-3 w-3" aria-hidden />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button type="button" onClick={() => toggleSort('classRoomName')} className="inline-flex items-center gap-1 hover:text-slate-700">
                        Class <ArrowUpDown className="h-3 w-3" aria-hidden />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button type="button" onClick={() => toggleSort('enrolledStudents')} className="inline-flex items-center gap-1 hover:text-slate-700">
                        Students <ArrowUpDown className="h-3 w-3" aria-hidden />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button type="button" onClick={() => toggleSort('publishedLessons')} className="inline-flex items-center gap-1 hover:text-slate-700">
                        Lessons <ArrowUpDown className="h-3 w-3" aria-hidden />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">Completion</th>
                    <th className="px-4 py-3 text-right">At Risk</th>
                    <th className="px-4 py-3 text-right">Quiz %</th>
                  </tr>
                </thead>
                <tbody>
                  {q.isPending ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8">
                        <div className="space-y-3">
                          <div className="h-4 animate-pulse rounded bg-slate-100" />
                          <div className="h-4 animate-pulse rounded bg-slate-100" />
                          <div className="h-4 animate-pulse rounded bg-slate-100" />
                        </div>
                      </td>
                    </tr>
                  ) : sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        No insights match the selected class/course filters.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row) => (
                      <tr key={row.courseId} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.courseTitle}</td>
                        <td className="px-4 py-3 text-slate-700">{row.classRoomName ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.enrolledStudents}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.publishedLessons}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {row.avgCompletionPercent != null ? `${row.avgCompletionPercent}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.atRiskCount}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {row.avgQuizScorePercent != null ? `${row.avgQuizScorePercent}%` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Metrics notes */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Data notes">
          <h3 className="text-sm font-bold text-slate-950">How these metrics are calculated</h3>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-500">
            <li><strong>Average Completion</strong>: mean of per-course average completion percentages from valid backend records.</li>
            <li><strong>Students at Risk</strong>: count of students with average completion below 30% for each course, summed across selected courses.</li>
            <li><strong>Average Quiz Score</strong>: mean of per-course average quiz scores from valid submitted attempts.</li>
            <li>Counts and percentages reflect the current class, course, and filter selections.</li>
            <li>If a metric has no valid records, it is shown as “—” rather than zero.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
