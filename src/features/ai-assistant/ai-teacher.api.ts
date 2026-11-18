import { API_BASE_URL, apiRequest } from '../../api/client';
import { getSessionAccessToken } from '../auth/auth.session';
import { ApiClientError, type ApiEnvelope } from '../../types/api';
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
    documentIds?: string[];
    avoidPrompts?: string[];
    count?: number;
    types?: AiQuestionType[];
    difficulty?: AiDifficulty;
    instructions?: string;
    language?: AiLanguage;
  }
) {
  return apiRequest<{ questions: GeneratedQuestion[]; basedOnLessons: string[]; basedOnDocuments?: string[] }>(
    '/ai/teacher/assessment-questions',
    { method: 'POST', accessToken, body: payload }
  );
}

// ---- Knowledge base tools (study material + assessment preparation) -------------

export type StudyMaterialFormat = 'summary' | 'revision-notes' | 'key-terms' | 'study-guide' | 'custom';

/** Most questions a teacher can ask for at once (sent to the server in parts). */
export const MAX_AI_QUESTIONS = 200;
/** Questions requested per call when a teacher asks for many. */
export const AI_QUESTIONS_PER_REQUEST = 40;

/** A document (book, notes…) uploaded to the teacher's AI knowledge base. */
export interface KnowledgeDocument {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  charCount: number;
  createdAt: string;
}

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
  basedOnDocuments: string[];
  usedWrittenContent: boolean;
  contentShortened: boolean;
}

export interface AssessmentPrepResult {
  title: string;
  instructions: string;
  questions: GeneratedQuestion[];
  totalPoints: number;
  basedOnLessons: string[];
  basedOnDocuments: string[];
  usedWrittenContent: boolean;
  contentShortened: boolean;
}

export function getAiKnowledgeBaseApi(accessToken: string) {
  return apiRequest<KnowledgeBaseCourse[]>('/ai/teacher/knowledge-base', { method: 'GET', accessToken });
}

export function generateStudyMaterialApi(
  accessToken: string,
  payload: {
    courseId?: string;
    lessonIds: string[];
    documentIds: string[];
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
    courseId?: string;
    lessonIds: string[];
    documentIds: string[];
    avoidPrompts?: string[];
    count: number;
    types: AiQuestionType[];
    difficulty: AiDifficulty;
    instructions?: string;
    language: AiLanguage;
  }
) {
  return apiRequest<AssessmentPrepResult>('/ai/teacher/assessment-prep', { method: 'POST', accessToken, body: payload });
}

export function listKnowledgeDocumentsApi(accessToken: string) {
  return apiRequest<KnowledgeDocument[]>('/ai/teacher/documents', { method: 'GET', accessToken });
}

export function deleteKnowledgeDocumentApi(accessToken: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`/ai/teacher/documents/${id}`, { method: 'DELETE', accessToken });
}

/** Uploads the file as-is; the server extracts its text for the AI. */
export async function uploadKnowledgeDocumentApi(accessToken: string, file: File) {
  const token = getSessionAccessToken() ?? accessToken;
  const response = await fetch(`${API_BASE_URL}/ai/teacher/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: file,
  });
  let envelope: ApiEnvelope<KnowledgeDocument>;
  try {
    envelope = (await response.json()) as ApiEnvelope<KnowledgeDocument>;
  } catch {
    throw new ApiClientError(
      response.status,
      'UPLOAD_FAILED',
      response.status === 413 ? 'The file is too large (25 MB max).' : 'Upload failed. Please try again.'
    );
  }
  if (!response.ok || envelope.error) {
    throw new ApiClientError(
      response.status,
      envelope.error?.code ?? 'UPLOAD_FAILED',
      envelope.error?.message ?? 'Upload failed. Please try again.',
      envelope.error?.details
    );
  }
  return envelope.data as KnowledgeDocument;
}

/**
 * Asks for `count` questions in parts of AI_QUESTIONS_PER_REQUEST, telling each part what
 * was already written so nothing repeats. Calls `onProgress` after each part. If a later part
 * fails, the questions already written are kept (returned with `partialError`).
 */
export async function generateQuestionsInParts<R extends { questions: GeneratedQuestion[] }>(
  count: number,
  fetchPart: (partCount: number, avoidPrompts: string[]) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<{ first: R | null; questions: GeneratedQuestion[]; partialError: unknown }> {
  const questions: GeneratedQuestion[] = [];
  let first: R | null = null;
  let emptyParts = 0;
  onProgress?.(0, count);
  while (questions.length < count && emptyParts < 2) {
    const partCount = Math.min(AI_QUESTIONS_PER_REQUEST, count - questions.length);
    let result: R;
    try {
      result = await fetchPart(
        partCount,
        questions.map((q) => q.prompt.slice(0, 280)).slice(-400)
      );
    } catch (error) {
      if (!questions.length) throw error;
      return { first, questions, partialError: error };
    }
    first ??= result;
    const before = questions.length;
    questions.push(...result.questions.slice(0, count - questions.length));
    emptyParts = questions.length === before ? emptyParts + 1 : 0;
    onProgress?.(questions.length, count);
  }
  return { first, questions, partialError: null };
}
