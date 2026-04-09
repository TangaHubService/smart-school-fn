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
  examType?: 'CAT' | 'EXAM';
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

/** Row from GET /report-cards/catalog (one per published/locked snapshot). */
export interface ReportCardCatalogRow {
  id: string;
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
  academicYear: {
    id: string;
    name: string;
  };
  term: {
    id: string;
    name: string;
  };
  status: 'LOCKED' | 'PUBLISHED';
}

export interface ReportCardCatalogResponse {
  items: ReportCardCatalogRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export function listReportCardsCatalogApi(
  accessToken: string,
  params: {
    /** Omit to list across all academic years (paginated). */
    academicYearId?: string;
    termId?: string;
    classRoomId?: string;
    studentId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();
  if (params.academicYearId) {
    query.set('academicYearId', params.academicYearId);
  }
  if (params.termId) {
    query.set('termId', params.termId);
  }
  if (params.classRoomId) {
    query.set('classRoomId', params.classRoomId);
  }
  if (params.studentId) {
    query.set('studentId', params.studentId);
  }
  if (params.q?.trim()) {
    query.set('q', params.q.trim());
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  return apiRequest<ReportCardCatalogResponse>(`/report-cards/catalog?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
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
    examType?: 'CAT' | 'EXAM';
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

export function updateExamApi(
  accessToken: string,
  examId: string,
  payload: {
    termId?: string;
    classRoomId?: string;
    subjectId?: string;
    gradingSchemeId?: string | null;
    examType?: 'CAT' | 'EXAM';
    name?: string;
    description?: string | null;
    totalMarks?: number;
    weight?: number;
    examDate?: string | null;
  },
) {
  return apiRequest<ExamSummary>(`/exams/${examId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteExamApi(accessToken: string, examId: string) {
  return apiRequest<{ id: string; deleted: boolean }>(`/exams/${examId}`, {
    method: 'DELETE',
    accessToken,
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

export interface MarksGridSubject {
  id: string;
  code: string;
  name: string;
}

export interface MarksGridStudentRow {
  index: number;
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  subjectMarks: Array<{
    subjectId: string;
    testMarks: number | null;
    examMarks: number | null;
    total: number;
  }>;
  total: number;
  rank: number;
  /** Term conduct score (final/total) from configured pool minus deductions. */
  conduct: { grade: string; remark: string | null };
}

export interface MarksGridResponse {
  academicYear: { id: string; name: string };
  term: { id: string; name: string };
  classRoom: { id: string; code: string; name: string };
  subjects: MarksGridSubject[];
  students: MarksGridStudentRow[];
  /** False when results are locked/published for this term+class — grid is view-only. */
  marksEditable?: boolean;
}

/** Per-subject cell on a wide ledger row (CAT / EXAM / weighted total / grade). */
export interface AllMarksLedgerSubjectScore {
  testPercent: number | null;
  examPercent: number | null;
  subjectScore: number;
  grade: string;
  remark: string;
}

/** One row per student per class per term — subjects spread horizontally (combined marks sheet). */
export interface AllMarksLedgerWideRow {
  academicYear: { id: string; name: string };
  term: { id: string; name: string };
  classRoom: { id: string; code: string; name: string };
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  rank: number;
  studentTermTotal: number;
  studentTermAverage: number;
  termGrade: string;
  termRemark: string;
  scores: Record<string, AllMarksLedgerSubjectScore | null>;
  conduct: { grade: string; remark: string | null };
}

export interface AllMarksLedgerResponse {
  academicYear: { id: string; name: string };
  /** Union of subjects in the filtered result; column order for `scores`. */
  subjects: Array<{ id: string; code: string; name: string }>;
  items: AllMarksLedgerWideRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export function listAllMarksLedgerApi(
  accessToken: string,
  params: {
    /** Omit to load marks for every academic year (paginated). */
    academicYearId?: string;
    termId?: string;
    classRoomId?: string;
    studentId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'rank' | 'studentName' | 'classCode' | 'term' | 'subject' | 'total' | 'average';
    sortDir?: 'asc' | 'desc';
  },
) {
  const query = new URLSearchParams();
  if (params.academicYearId) {
    query.set('academicYearId', params.academicYearId);
  }
  if (params.termId) {
    query.set('termId', params.termId);
  }
  if (params.classRoomId) {
    query.set('classRoomId', params.classRoomId);
  }
  if (params.studentId) {
    query.set('studentId', params.studentId);
  }
  if (params.q?.trim()) {
    query.set('q', params.q.trim());
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortDir) {
    query.set('sortDir', params.sortDir);
  }
  return apiRequest<AllMarksLedgerResponse>(`/classes/all-marks-ledger?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function getMarksGridApi(
  accessToken: string,
  params: { termId: string; classRoomId: string },
) {
  const query = new URLSearchParams();
  query.set('termId', params.termId);
  query.set('classRoomId', params.classRoomId);
  return apiRequest<MarksGridResponse>(`/classes/marks-grid?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function saveMarksGridApi(
  accessToken: string,
  payload: {
    termId: string;
    classRoomId: string;
    entries: Array<{
      studentId: string;
      subjectId: string;
      testMarks?: number | null;
      examMarks?: number | null;
    }>;
  },
) {
  return apiRequest<{ savedCount: number; createdExamsCount: number }>('/classes/marks-grid', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listConductGradesForEntryApi(
  accessToken: string,
  params: { termId: string; classRoomId: string },
) {
  const query = new URLSearchParams();
  query.set('termId', params.termId);
  query.set('classRoomId', params.classRoomId);
  return apiRequest<{
    students: Array<{
      id: string;
      studentCode: string;
      firstName: string;
      lastName: string;
      grade: string;
      remark: string;
      totalMarks: number;
      totalDeducted: number;
      finalScore: number;
    }>;
  }>(`/results/conduct?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function bulkSaveConductGradesApi(
  accessToken: string,
  payload: {
    termId: string;
    classRoomId: string;
    entries: Array<{ studentId: string; grade: string; remark?: string }>;
  },
) {
  return apiRequest<{ savedCount: number }>('/results/conduct/bulk', {
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

export function getStudentReportCardsApi(
  accessToken: string,
  studentId: string,
  params: { termId?: string; academicYearId?: string } = {},
) {
  const query = new URLSearchParams();
  if (params.termId) query.set('termId', params.termId);
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  return apiRequest<MyReportCardsResponse>(
    `/report-cards/students/${studentId}${query.toString() ? `?${query.toString()}` : ''}`,
    { method: 'GET', accessToken },
  );
}

export function downloadStudentReportCardPdfApi(
  accessToken: string,
  studentId: string,
  termId: string,
) {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  const url = `${base}/report-cards/students/${studentId}/pdf?termId=${encodeURIComponent(termId)}`;
  return fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((res) => {
    if (!res.ok) throw new Error('Could not load report card PDF');
    return res.blob();
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
