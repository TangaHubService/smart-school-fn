/**
 * Single source of truth for student course completion %.
 * Formula: (completedLessons + completedWorkItems) / (totalLessons + totalWorkItems) × 100.
 * All items weighted equally; empty course → 0%.
 */

export type CourseProgressSource = {
  lessons: { id: string; sequence: number }[];
  assignments?: Array<{ mySubmission?: unknown }>;
  assessments?: Array<{ latestAttempt?: { status?: string } | null }>;
  completedLessonIds?: string[];
};

export type CourseProgressMetrics = {
  totalLessons: number;
  completedLessons: number;
  totalAssignments: number;
  completedAssignments: number;
  lessonProgress: number;
  assignmentProgress: number;
  overallProgress: number;
  /** Rough demo-friendly estimate: ~15 min per lesson, ~20 min per assignment */
  estimatedMinutes: number;
};

export function getCourseProgressMetrics(
  course: CourseProgressSource,
  completedLessonIds?: string[],
): CourseProgressMetrics {
  const ids = completedLessonIds ?? course.completedLessonIds ?? [];
  const assignments = course.assignments ?? [];
  const assessments = course.assessments ?? [];
  const totalLessons = course.lessons.length;
  const completedLessons = course.lessons.filter((lesson) => ids.includes(lesson.id)).length;
  const totalAssignments = assignments.length + assessments.length;
  const completedAssignments =
    assignments.filter((a) => Boolean(a.mySubmission)).length +
    assessments.filter((assessment) => assessment.latestAttempt?.status === 'SUBMITTED').length;

  const lessonProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const assignmentProgress =
    totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  const denom = totalLessons + totalAssignments;
  const overallProgress =
    denom > 0 ? Math.round(((completedLessons + completedAssignments) / denom) * 100) : 0;

  const estimatedMinutes = totalLessons * 15 + totalAssignments * 20;

  return {
    totalLessons,
    completedLessons,
    totalAssignments,
    completedAssignments,
    lessonProgress,
    assignmentProgress,
    overallProgress,
    estimatedMinutes,
  };
}

export function getResumeLessonId(
  course: { lessons: { id: string; sequence: number }[] },
  completedLessonIds: string[],
): string | null {
  const sorted = [...course.lessons].sort((a, b) => a.sequence - b.sequence);
  const next = sorted.find((l) => !completedLessonIds.includes(l.id));
  return next?.id ?? sorted[0]?.id ?? null;
}

export function courseEnrollmentState(
  metrics: CourseProgressMetrics,
): 'not_started' | 'in_progress' | 'completed' {
  if (metrics.totalLessons + metrics.totalAssignments === 0) {
    return 'not_started';
  }
  if (metrics.overallProgress >= 100) {
    return 'completed';
  }
  if (metrics.overallProgress > 0) {
    return 'in_progress';
  }
  return 'not_started';
}
