import { apiRequest } from '../../api/client';

export type AssessmentType = 'GENERAL' | 'OPENENDED' | 'PSYCHOMETRIC' | 'INTERVIEW';
export type AssessmentQuestionType = 'MCQ_SINGLE' | 'OPEN_TEXT';
export type AssessmentAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED';

export interface AssessmentSummary {
  id: string;
  type: AssessmentType;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    title: string;
    classRoom: {
      id: string;
      code: string;
      name: string;
    };
    academicYear: {
      id: string;
      name: string;
    };
    subject: {
      id: string;
      code: string;
      name: string;
    } | null;
  };
  lesson: {
    id: string;
    title: string;
    sequence: number;
  } | null;
  counts: {
    questions: number;
    attempts: number;
  };
}

export interface AssessmentQuestionOption {
  id: string;
  label: string;
  sequence: number;
  isCorrect?: boolean;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  explanation: string | null;
  type: AssessmentQuestionType;
  sequence: number;
  points: number;
  options: AssessmentQuestionOption[];
}

export interface AssessmentDetail extends AssessmentSummary {
  questions: AssessmentQuestion[];
}

export interface AssessmentAttemptSummary {
  id: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  autoScore: number | null;
  manualScore: number | null;
  score: number;
  maxScore: number | null;
  manualFeedback?: string | null;
  manuallyGradedAt?: string | null;
  manuallyGradedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  student?: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface MyAssessmentItem extends AssessmentSummary {
  latestAttempt: AssessmentAttemptSummary | null;
}

export interface AssessmentListResponse {
  items: AssessmentSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface MyAssessmentListResponse {
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  items: MyAssessmentItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface MyAssessmentDetailResponse extends MyAssessmentItem {
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
}

export interface AssessmentResultsResponse {
  assessment: AssessmentSummary;
  items: Array<AssessmentAttemptSummary & {
    student: {
      id: string;
      studentCode: string;
      firstName: string;
      lastName: string;
    };
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AssessmentAttemptDetail {
  id: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  autoScore: number | null;
  manualScore: number | null;
  score: number;
  maxScore: number | null;
  manualFeedback: string | null;
  manuallyGradedAt: string | null;
  manuallyGradedByUser: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  } | null;
  assessment: {
    id: string;
    type: AssessmentType;
    title: string;
    instructions: string | null;
    dueAt: string | null;
    timeLimitMinutes: number | null;
    maxAttempts: number;
    course: AssessmentSummary['course'];
    lesson: AssessmentSummary['lesson'];
  };
  questions: Array<{
    id: string;
    prompt: string;
    explanation: string | null;
    hint?: string | null;
    remedialLessonId?: string | null;
    type: AssessmentQuestionType;
    sequence: number;
    points: number;
    selectedOptionId: string | null;
    textResponse: string | null;
    isCorrect: boolean | null;
    pointsAwarded: number | null;
    manualPointsAwarded: number | null;
    effectivePointsAwarded: number | null;
    options: AssessmentQuestionOption[];
  }>;
}

export function createAssessmentApi(
  accessToken: string,
  payload: {
    courseId: string;
    lessonId?: string;
    type?: AssessmentType;
    title: string;
    instructions?: string;
    dueAt?: string;
    timeLimitMinutes?: number;
    maxAttempts?: number;
    isPublished?: boolean;
  },
) {
  return apiRequest<AssessmentSummary>('/assessments', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listAssessmentsApi(
  accessToken: string,
  params: {
    courseId?: string;
    classId?: string;
    academicYearId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.courseId) query.set('courseId', params.courseId);
  if (params.classId) query.set('classId', params.classId);
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params.q) query.set('q', params.q);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<AssessmentListResponse>(`/assessments${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

export function getAssessmentDetailApi(accessToken: string, assessmentId: string) {
  return apiRequest<AssessmentDetail>(`/assessments/${assessmentId}`, {
    method: 'GET',
    accessToken,
  });
}

export function updateAssessmentApi(
  accessToken: string,
  assessmentId: string,
  payload: {
    lessonId?: string | null;
    title?: string;
    instructions?: string | null;
    dueAt?: string | null;
    timeLimitMinutes?: number | null;
    maxAttempts?: number;
  },
) {
  return apiRequest<AssessmentSummary>(`/assessments/${assessmentId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function addAssessmentQuestionApi(
  accessToken: string,
  assessmentId: string,
  payload: {
    prompt: string;
    explanation?: string;
    type?: AssessmentQuestionType;
    sequence?: number;
    points?: number;
    options?: Array<{
      label: string;
      isCorrect: boolean;
      sequence?: number;
    }>;
  },
) {
  return apiRequest<AssessmentQuestion>(`/assessments/${assessmentId}/questions`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function publishAssessmentApi(
  accessToken: string,
  assessmentId: string,
  isPublished: boolean,
) {
  return apiRequest<AssessmentSummary>(`/assessments/${assessmentId}/publish`, {
    method: 'PATCH',
    accessToken,
    body: { isPublished },
  });
}

export function updateAssessmentQuestionApi(
  accessToken: string,
  questionId: string,
  payload: {
    prompt: string;
    explanation?: string;
    type?: AssessmentQuestionType;
    sequence?: number;
    points?: number;
    options?: Array<{
      label: string;
      isCorrect: boolean;
      sequence?: number;
    }>;
  },
) {
  return apiRequest<AssessmentQuestion>(`/assessment-questions/${questionId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteAssessmentQuestionApi(accessToken: string, questionId: string) {
  return apiRequest<{ id: string; deleted: boolean }>(`/assessment-questions/${questionId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function listAssessmentResultsApi(
  accessToken: string,
  assessmentId: string,
  params: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<AssessmentResultsResponse>(
    `/assessments/${assessmentId}/results${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function listMyAssessmentsApi(
  accessToken: string,
  params: {
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<MyAssessmentListResponse>(
    `/students/me/assessments${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function getMyAssessmentDetailApi(accessToken: string, assessmentId: string) {
  return apiRequest<MyAssessmentDetailResponse>(`/students/me/assessments/${assessmentId}`, {
    method: 'GET',
    accessToken,
  });
}

export function startAssessmentAttemptApi(accessToken: string, assessmentId: string) {
  return apiRequest<AssessmentAttemptDetail>(`/assessments/${assessmentId}/attempts/start`, {
    method: 'POST',
    accessToken,
  });
}

export function saveAssessmentAttemptAnswersApi(
  accessToken: string,
  attemptId: string,
  answers: Array<{
    questionId: string;
    selectedOptionId: string | null;
    textResponse?: string | null;
  }>,
) {
  return apiRequest<AssessmentAttemptDetail>(`/assessment-attempts/${attemptId}/answers`, {
    method: 'PUT',
    accessToken,
    body: { answers },
  });
}

export function submitAssessmentAttemptApi(accessToken: string, attemptId: string) {
  return apiRequest<AssessmentAttemptDetail>(`/assessment-attempts/${attemptId}/submit`, {
    method: 'POST',
    accessToken,
  });
}

export function getAssessmentAttemptApi(accessToken: string, attemptId: string) {
  return apiRequest<AssessmentAttemptDetail>(`/assessment-attempts/${attemptId}`, {
    method: 'GET',
    accessToken,
  });
}

export function regradeAssessmentAttemptApi(
  accessToken: string,
  attemptId: string,
  payload: {
    manualFeedback?: string;
    answers: Array<{
      questionId: string;
      pointsAwarded: number;
    }>;
  },
) {
  return apiRequest<AssessmentAttemptDetail>(`/assessment-attempts/${attemptId}/regrade`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}
