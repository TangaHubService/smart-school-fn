import { Award, BookOpen, CheckCircle2, Circle, Clock, Lock, Play, Sparkles } from 'lucide-react';

import { ProgressRing } from '../progress-ring';
import type { MyCoursesResponse } from '../../features/sprint4/lms.api';
import {
  courseEnrollmentState,
  getCourseProgressMetrics,
  getResumeLessonId,
} from '../../utils/course-progress';

type StudentCourseItem = MyCoursesResponse['items'][number];

export function CourseOverviewPanel({
  course,
  completedLessonIds,
  onResume,
  onStartBeginning,
  onOpenLesson,
  onOpenTests,
}: {
  course: StudentCourseItem;
  completedLessonIds: string[];
  onResume: () => void;
  onStartBeginning: () => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenTests: () => void;
}) {
  const metrics = getCourseProgressMetrics(course, completedLessonIds);
  const state = courseEnrollmentState(metrics);
  const sortedLessons = [...course.lessons].sort((a, b) => a.sequence - b.sequence);
  const resumeLessonId = getResumeLessonId(course, completedLessonIds);
  const pendingTests =
    course.assignments.filter((assignment) => !assignment.mySubmission).length +
    course.assessments.filter((assessment) => assessment.latestAttempt?.status !== 'SUBMITTED').length;

  const instructor = `${course.teacher.firstName} ${course.teacher.lastName}`;
  const estHours = metrics.estimatedMinutes >= 60
    ? `${(metrics.estimatedMinutes / 60).toFixed(1)} h est.`
    : `${metrics.estimatedMinutes} min est.`;

  const isLessonDone = (id: string) => completedLessonIds.includes(id);

  return (
    <div className="space-y-5 pb-6">
      <div className="bg-gradient-to-br from-[#173C7F]/[0.05] via-white to-brand-50/30">
        <div className="grid gap-4 p-0 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-brand-700 shadow-sm ring-1 ring-brand-100">
                {course.classRoom.name}
              </span>
              <span className="rounded-full bg-slate-900/5 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {course.academicYear.name}
              </span>
              {state === 'completed' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  <Award className="h-3 w-3" aria-hidden />
                  Completed
                </span>
              ) : null}
            </div>
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {course.title}
            </h1>
            <p className="text-sm text-slate-600">
              Instructor: <span className="font-semibold text-slate-900">{instructor}</span>
              {course.subject?.name ? (
                <>
                  {' '}
                  · <span className="text-slate-800">{course.subject.name}</span>
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {state === 'completed' ? (
                <button
                  type="button"
                  onClick={onStartBeginning}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Review course
                </button>
              ) : resumeLessonId ? (
                <button
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  <Play className="h-4 w-4" aria-hidden />
                  {state === 'not_started' ? 'Start learning' : 'Resume learning'}
                </button>
              ) : null}
              {sortedLessons[0] ? (
                <button
                  type="button"
                  onClick={onStartBeginning}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-brand-200 hover:bg-brand-50/50"
                >
                  {state === 'completed' ? 'Revisit first lesson' : 'From beginning'}
                </button>
              ) : null}
              {course.assignments.length > 0 || course.assessments.length > 0 ? (
                <button
                  type="button"
                  onClick={onOpenTests}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800 transition hover:bg-brand-100"
                >
                  Tests & tasks
                  {pendingTests > 0 ? (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                      {pendingTests}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-white/70 p-3 backdrop-blur-sm">
            <ProgressRing percentage={metrics.overallProgress} size={108} strokeWidth={8} />
            <div className="grid w-full max-w-[220px] gap-2 text-center text-sm">
              <p className="font-semibold text-slate-900">
                {metrics.completedLessons}/{metrics.totalLessons} lessons
              </p>
              <p className="text-slate-600">
                {metrics.completedAssignments}/{metrics.totalAssignments} tests & tasks
              </p>
              <p className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {estHours}
              </p>
            </div>
          </div>
        </div>
      </div>

      {state === 'completed' ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="font-medium">You finished this course</p>
            <p className="mt-1 text-emerald-900/90">
              Reopen any lesson to review materials, or browse your tests from the sidebar.
            </p>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Curriculum</h2>
          <p className="text-xs text-slate-500">Sequential unlock</p>
        </div>
        <ul className="divide-y divide-slate-100 overflow-hidden bg-white">
          {sortedLessons.map((lesson, index) => {
            const prev = index > 0 ? sortedLessons[index - 1] : null;
            const locked = Boolean(prev && !isLessonDone(prev.id));
            const done = isLessonDone(lesson.id);

            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && onOpenLesson(lesson.id)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                    locked
                      ? 'cursor-not-allowed bg-slate-50/80 text-slate-400'
                      : 'hover:bg-brand-50/40'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {locked ? (
                      <Lock className="h-4 w-4" aria-hidden />
                    ) : done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{lesson.title}</p>
                    <p className="text-xs text-slate-500">
                      Lesson {lesson.sequence} · {lesson.contentType}
                      {locked ? ' · Complete previous to unlock' : ''}
                    </p>
                  </div>
                  {!locked && !done ? (
                    <span className="hidden shrink-0 text-xs font-medium text-brand-600 sm:inline">Open</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
