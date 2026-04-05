/**
 * Local persistence for learner progress on flaky / offline connections.
 * Draft quiz answers and pending lesson completions sync when the device is back online.
 */

const PREFIX = 'ss:v1:';
const ASSESSMENT_DRAFT_KEY = `${PREFIX}assessment-draft:`;
const PENDING_LESSONS_KEY = `${PREFIX}pending-lessons`;

export type CachedAssessmentDraft = {
  answers: Record<string, { selectedOptionId: string | null; textResponse: string }>;
  updatedAt: number;
  pendingSync: boolean;
};

function parseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readAssessmentDraft(attemptId: string): CachedAssessmentDraft | null {
  return parseJson<CachedAssessmentDraft>(localStorage.getItem(ASSESSMENT_DRAFT_KEY + attemptId));
}

export function writeAssessmentDraft(attemptId: string, draft: CachedAssessmentDraft): void {
  try {
    localStorage.setItem(ASSESSMENT_DRAFT_KEY + attemptId, JSON.stringify(draft));
  } catch {
    // Storage full or disabled
  }
}

export function clearAssessmentDraft(attemptId: string): void {
  try {
    localStorage.removeItem(ASSESSMENT_DRAFT_KEY + attemptId);
  } catch {
    // ignore
  }
}

export function getPendingLessonIds(): string[] {
  const list = parseJson<string[]>(localStorage.getItem(PENDING_LESSONS_KEY));
  return Array.isArray(list) ? list : [];
}

export function addPendingLessonComplete(lessonId: string): void {
  const list = getPendingLessonIds();
  if (list.includes(lessonId)) {
    return;
  }
  list.push(lessonId);
  try {
    localStorage.setItem(PENDING_LESSONS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function removePendingLessonComplete(lessonId: string): void {
  const list = getPendingLessonIds().filter((id) => id !== lessonId);
  try {
    localStorage.setItem(PENDING_LESSONS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
