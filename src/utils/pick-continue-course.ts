import { getCourseProgressMetrics, type CourseProgressSource } from './course-progress';

/** Picks the best course to surface as "continue learning" for demo UX. */
export function pickContinueCourse<C extends CourseProgressSource>(courses: C[]): C | null {
  if (!courses.length) {
    return null;
  }

  const progressOf = (c: C) => getCourseProgressMetrics(c).overallProgress;

  const inProgress = courses.find((c) => {
    const p = progressOf(c);
    return p > 0 && p < 100;
  });
  if (inProgress) {
    return inProgress;
  }

  const notStarted = courses.find((c) => progressOf(c) === 0 && c.lessons.length > 0);
  if (notStarted) {
    return notStarted;
  }

  return courses[0];
}
