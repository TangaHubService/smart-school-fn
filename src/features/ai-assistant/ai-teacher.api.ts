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
  return apiRequest<AiStatus & { remainingToday?: number }>('/ai/teacher/status', { method: 'GET', accessToken });
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

// ---- Knowledge base tools (study material + assessment preparation) -------------

export type StudyMaterialFormat = 'summary' | 'revision-notes' | 'key-terms' | 'study-guide';

export interface KnowledgeBaseLesson {
  id: string;
  title: string;
  contentType: 'TEXT' | 'PDF' | 'VIDEO' | 'LINK';
  sectionId: string | null;
  isPublished: boolean;
  /** The lesson has written text the AI can read (otherwise only its title is used). */
  hasText: boolean;
}

export interface KnowledgeBaseCourse {
  id: string;
  title: string;
  subjectName: string | null;
  classRoomName: string | null;
  academicYearName: string | null;
  sections: Array<{ id: string; title: string }>;
  lessons: KnowledgeBaseLesson[];
}

export interface StudyMaterialResult {
  title: string;
  format: StudyMaterialFormat;
  content: string;
  basedOnLessons: string[];
  usedWrittenContent: boolean;
  contentShortened: boolean;
}

export interface AssessmentPrepResult {
  title: string;
  instructions: string;
  questions: GeneratedQuestion[];
  totalPoints: number;
  basedOnLessons: string[];
  usedWrittenContent: boolean;
  contentShortened: boolean;
}

export function getAiKnowledgeBaseApi(accessToken: string) {
  return apiRequest<KnowledgeBaseCourse[]>('/ai/teacher/knowledge-base', { method: 'GET', accessToken });
}

export function generateStudyMaterialApi(
  accessToken: string,
  payload: {
    courseId: string;
    lessonIds: string[];
    format: StudyMaterialFormat;
    instructions?: string;
    language: AiLanguage;
  }
) {
  return apiRequest<StudyMaterialResult>('/ai/teacher/study-material', { method: 'POST', accessToken, body: payload });
}

export function prepareAssessmentWithAiApi(
  accessToken: string,
  payload: {
    courseId: string;
    lessonIds: string[];
    count: number;
    types: AiQuestionType[];
    difficulty: AiDifficulty;
    instructions?: string;
    language: AiLanguage;
  }
) {
  return apiRequest<AssessmentPrepResult>('/ai/teacher/assessment-prep', { method: 'POST', accessToken, body: payload });
}
