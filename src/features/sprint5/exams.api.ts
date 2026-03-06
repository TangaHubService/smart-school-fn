import { apiRequest } from '../../api/client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface GradingBand {
  min: number;
  max: number;
  grade: string;
  remark?: string;
}

export interface GradingSchemeItem {
  id: string;
  name: string;
  version: number;
  description: string | null;
  rules: GradingBand[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamSummary {
  id: string;
  name: string;
  description: string | null;
  totalMarks: number;
  weight: number;
  examDate: string | null;
  createdAt: string;
  updatedAt: string;
  marksEnteredCount: number;
  resultStatus: 'UNLOCKED' | 'LOCKED' | 'PUBLISHED';
  term: {
    id: string;
    name: string;
    sequence: number;
    academicYearId: string;
  };
  academicYear: {
    id: string;
    name: string;
  };
  classRoom: {
    id: string;
    code: string;
    name: string;
  };
  subject: {
    id: string;
    code: string;
    name: string;
  };
  gradingScheme: {
    id: string;
    name: string;
    version: number;
  };
  teacherUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ExamDetail extends ExamSummary {
  students: Array<{
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    marksObtained: number | null;
  }>;
  warnings: {
    missingCount: number;
  };
}

export interface ReportCardSummary {
  id: string;
  status: 'LOCKED' | 'PUBLISHED';
  lockedAt: string;
  publishedAt: string | null;
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  classRoom: {
    id: string;
    code: string;
    name: string;
  };
  term: {
    id: string;
    name: string;
    sequence: number;
    startDate: string;
    endDate: string;
  };
  academicYear: {
    id: string;
    name: string;
  };
  gradingScheme: {
    id: string;
    name: string;
    version: number;
  };
  totals: {
    totalMarksObtained: number;
    totalMarksPossible: number;
    averagePercentage: number;
    grade: string;
    remark: string;
    position: number;
    classSize: number;
  };
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    averagePercentage: number;
    grade: string;
    remark: string;
  }>;
}

export interface ExamListResponse {
  items: ExamSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface MyReportCardsResponse {
  student?: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  parent?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  items: ReportCardSummary[];
}

export interface PublicReportCardVerificationResponse {
  valid: boolean;
  verificationCode: string;
  verificationUrl: string;
  school: {
    name: string;
    code: string | null;
    district: string | null;
  };
  student: {
    name: string;
    studentCode: string;
  };
  classRoom: {
    id: string;
    code: string;
    name: string;
  };
  term: {
    id: string;
    name: string;
    sequence: number;
    startDate: string;
    endDate: string;
  };
  academicYear: {
    id: string;
    name: string;
  };
  totals: {
    totalMarksObtained: number;
    totalMarksPossible: number;
    averagePercentage: number;
    grade: string;
    remark: string;
    position: number;
    classSize: number;
  };
  issuedAt: string;
  message: string;
}

export function listGradingSchemesApi(accessToken: string) {
  return apiRequest<GradingSchemeItem[]>('/grading-schemes', {
    method: 'GET',
    accessToken,
  });
}

export function createGradingSchemeApi(
  accessToken: string,
  payload: {
    name: string;
    description?: string;
    isDefault?: boolean;
    rules: GradingBand[];
  },
) {
  return apiRequest<GradingSchemeItem>('/grading-schemes', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function createExamApi(
  accessToken: string,
  payload: {
    termId: string;
    classRoomId: string;
    subjectId: string;
    gradingSchemeId?: string;
    name: string;
    description?: string;
    totalMarks: number;
    weight: number;
    examDate?: string;
  },
) {
  return apiRequest<ExamSummary>('/exams', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listExamsApi(
  accessToken: string,
  params: {
    termId?: string;
    classId?: string;
    subjectId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.termId) query.set('termId', params.termId);
  if (params.classId) query.set('classId', params.classId);
  if (params.subjectId) query.set('subjectId', params.subjectId);
  if (params.q) query.set('q', params.q);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<ExamListResponse>(`/exams${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

export function getExamDetailApi(accessToken: string, examId: string) {
  return apiRequest<ExamDetail>(`/exams/${examId}`, {
    method: 'GET',
    accessToken,
  });
}

export function bulkSaveExamMarksApi(
  accessToken: string,
  examId: string,
  payload: {
    entries: Array<{
      studentId: string;
      marksObtained: number | null;
    }>;
  },
) {
  return apiRequest<{
    exam: ExamSummary;
    savedCount: number;
    warnings: {
      missingCount: number;
      missingStudentIds: string[];
    };
  }>(`/exams/${examId}/marks/bulk`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function lockResultsApi(
  accessToken: string,
  payload: { termId: string; classRoomId: string; gradingSchemeId?: string },
) {
  return apiRequest<{ status: 'LOCKED'; snapshotsCreated: number; classSize: number }>('/results/lock', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function unlockResultsApi(
  accessToken: string,
  payload: { termId: string; classRoomId: string; gradingSchemeId?: string },
) {
  return apiRequest<{ deleted: boolean; snapshotsRemoved: number }>('/results/unlock', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function publishResultsApi(
  accessToken: string,
  payload: { termId: string; classRoomId: string; gradingSchemeId?: string },
) {
  return apiRequest<{ status: 'PUBLISHED'; snapshotsUpdated: number; publishedAt: string }>('/results/publish', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function getMyReportCardsApi(accessToken: string, termId?: string) {
  const query = new URLSearchParams();
  if (termId) query.set('termId', termId);
  return apiRequest<MyReportCardsResponse>(`/students/me/report-cards${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

export function getParentReportCardsApi(
  accessToken: string,
  params: { studentId?: string; termId?: string } = {},
) {
  const query = new URLSearchParams();
  if (params.studentId) query.set('studentId', params.studentId);
  if (params.termId) query.set('termId', params.termId);
  return apiRequest<MyReportCardsResponse>(`/parents/me/report-cards${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

async function fetchPdfBlob(accessToken: string, path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Could not load PDF');
  }

  return response.blob();
}

export function downloadMyReportCardPdfApi(accessToken: string, snapshotId: string) {
  return fetchPdfBlob(accessToken, `/students/me/report-cards/${snapshotId}/pdf`);
}

export function downloadParentReportCardPdfApi(accessToken: string, snapshotId: string) {
  return fetchPdfBlob(accessToken, `/parents/me/report-cards/${snapshotId}/pdf`);
}

export function verifyReportCardPublicApi(snapshotId: string) {
  return apiRequest<PublicReportCardVerificationResponse>(`/report-cards/verify/${snapshotId}`, {
    method: 'GET',
  });
}
