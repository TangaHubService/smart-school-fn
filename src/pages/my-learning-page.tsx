import { BookOpen, PlayCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { hasRole } from '../features/auth/auth-helpers';
import { listMyCoursesApi } from '../features/sprint4/lms.api';
import { getStoredAcademicYearId } from './student-academic-year-select-page';
import { StateView } from '../components/state-view';
import { ProgressRing } from '../components/progress-ring';
import { SectionCard } from '../components/section-card';
import { getCourseProgressMetrics, getResumeLessonId } from '../utils/course-progress';

export function MyLearningPage() {
  const auth = useAuth();
  const academicYearId = getStoredAcademicYearId();
  const isPublicLearner = hasRole(auth.me, 'PUBLIC_LEARNER');

  if (!academicYearId && !isPublicLearner) {
    return <Navigate to="/student/academic-year" replace />;
  }

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['lms', 'student-courses', 'my-learning'],
    enabled: Boolean(auth.accessToken && (academicYearId || isPublicLearner)),
    queryFn: () => listMyCoursesApi(auth.accessToken!, { page: 1, pageSize: 50 }),
  });

  if (isError) {
    return (
      <StateView
        title="Could not load your courses"
        message="Please try again to see your learning progress."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 placeholder-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const courses = data?.items ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Learning</h1>
          <p className="mt-0.5 text-sm text-slate-600">Your enrolled courses and progress.</p>
        </div>
        <Link
          to="/student/courses"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
        >
          All courses
        </Link>
      </header>

      {courses.length === 0 ? (
        <SectionCard title="Start Your Journey">
          <div className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-brand-50 p-4">
              <BookOpen className="h-8 w-8 text-brand-500" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">No enrolled courses yet</h3>
            <p className="mt-2 text-slate-600">Explore our academy program to start learning.</p>
            <Link
              to="/academy"
              className="mt-6 rounded-xl bg-brand-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Browse Catalog
            </Link>
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const metrics = getCourseProgressMetrics(course, course.completedLessonIds ?? []);
            const nextId = getResumeLessonId(course, course.completedLessonIds ?? []);
            const nextLesson = nextId ? course.lessons.find((l) => l.id === nextId) : null;
            return (
              <CourseProgressCard key={course.id} course={course} metrics={metrics} nextLesson={nextLesson} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseProgressCard({
  course,
  metrics,
  nextLesson,
}: {
  course: any;
  metrics: ReturnType<typeof getCourseProgressMetrics>;
  nextLesson: { title: string } | null | undefined;
}) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800 ring-1 ring-brand-100">
            {course.classRoom?.name ?? 'Academy course'}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 underline-offset-2 group-hover:underline">
            {course.title}
          </h3>
          <p className="text-sm text-slate-500">{course.subject?.name ?? 'General Elective'}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ProgressRing percentage={metrics.overallProgress} size={56} strokeWidth={6} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 border-t border-slate-100 pt-4">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-500">Curriculum</p>
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              {metrics.completedLessons} / {metrics.totalLessons} Lessons
            </span>
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-500">Next activity</p>
          <div className="flex items-center gap-2 overflow-hidden">
            <Clock className="h-4 w-4 text-brand-500" />
            <span className="truncate text-sm font-medium text-slate-700">
              {nextLesson?.title ?? (metrics.overallProgress >= 100 ? 'Course complete' : 'Open course')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to={`/student/courses/${course.id}`}
          className="flex-1 rounded-xl bg-brand-500 py-2.5 text-center text-sm font-medium text-white transition hover:bg-brand-600"
        >
          {metrics.overallProgress === 0 ? 'Start' : metrics.overallProgress >= 100 ? 'Review' : 'Resume'}
        </Link>
        <Link
          to={`/student/courses/${course.id}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Syllabus
        </Link>
      </div>
    </article>
  );
}
