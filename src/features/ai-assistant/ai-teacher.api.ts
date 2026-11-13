import { apiRequest } from '../../api/client';
import type { AiStatus } from './ai-assistant.api';

export type AiLanguage = 'en' | 'fr' | 'rw';
export type AiQuestionType = 'MCQ_SINGLE' | 'OPEN_TEXT';
export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface LessonPlanDraft {
  title: string;
  objectives: string;
  materials: string;
  activities: string;
  assessment: string;
}

export interface GeneratedQuestion {
  type: AiQuestionType;
  prompt: string;
  points: number;
  explanation?: string;
  options: Array<{ label: string; isCorrect: boolean }>;
}

export function getAiTeacherStatusApi(accessToken: string) {
  return apiRequest<AiStatus>('/ai/teacher/status', { method: 'GET', accessToken });
}

/** Returns a draft only; nothing is saved until the teacher saves the lesson plan form. */
export function draftLessonPlanWithAiApi(
  accessToken: string,
  payload: {
    academicYearId: string;
    classRoomId: string;
    subjectId: string;
    topic: string;
    weekNumber?: number;
    durationMinutes?: number;
    notes?: string;
    language?: AiLanguage;
  }
) {
  return apiRequest<LessonPlanDraft>('/ai/teacher/lesson-plan-draft', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

/** Returns draft questions only; the teacher reviews them, then they are added with the bulk API. */
export function generateAssessmentQuestionsWithAiApi(
  accessToken: string,
  payload: {
    assessmentId: string;
    lessonIds?: string[];
    count?: number;
    types?: AiQuestionType[];
    difficulty?: AiDifficulty;
    instructions?: string;
    language?: AiLanguage;
  }
) {
  return apiRequest<{ questions: GeneratedQuestion[]; basedOnLessons: string[] }>(
    '/ai/teacher/assessment-questions',
    { method: 'POST', accessToken, body: payload }
  );
}
