import { apiRequest, API_BASE_URL } from '../../api/client';
import type { UploadedAssetPayload } from '../sprint4/lms.api';

interface ActivityLog {
  id: string;
  event: string;
  actionType: string | null;
  module: string | null;
  description: string | null;
  entity: string | null;
  entityId: string | null;
  recordId: string | null;
  createdAt: string;
  timestamp: string;
  ipAddress: string | null;
  device: string | null;
  status: string | null;
  sessionId: string | null;
  actor: {
    id: string | null;
    email: string | null;
    name: string | null;
    role: string | null;
  } | null;
  schoolName: string | null;
  oldValue: unknown;
  newValue: unknown;
  payload: unknown;
}

interface ListActivityLogsResponse {
  items: ActivityLog[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

interface ListActivityLogsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  event?: string;
  actionType?: string;
  module?: string;
  status?: string;
  from?: string;
  to?: string;
}

export async function listActivityLogsApi(
  params: ListActivityLogsParams = {}
): Promise<ListActivityLogsResponse> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.search) query.search = params.search;
  if (params.event) query.event = params.event;
  if (params.actionType) query.actionType = params.actionType;
  if (params.module) query.module = params.module;
  if (params.status) query.status = params.status;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  const queryString = new URLSearchParams(query).toString();
  const path = queryString ? `/activity-logs?${queryString}` : '/activity-logs';

  return apiRequest(path);
}

export type AcademicAuditModule =
  | 'ATTENDANCE'
  | 'COURSE_MANAGEMENT'
  | 'LEARNING_INSIGHTS'
  | 'CONTINUOUS_ASSESSMENTS'
  | 'MARKS'
  | 'TIMETABLE'
  | 'FINANCE'
  | 'TEACHERS'
  | 'STUDENT_RECORDS'
  | 'INFRASTRUCTURE'
  | 'ICT'
  | 'SAFETY'
  | 'COMPLIANCE';

/** Modules with an auto-fetched summary the auditor reviews before scoring. */
export const AUDITOR_AUDIT_MODULES = [
  'ATTENDANCE',
  'COURSE_MANAGEMENT',
  'LEARNING_INSIGHTS',
  'CONTINUOUS_ASSESSMENTS',
  'MARKS',
  'TIMETABLE',
] as const satisfies readonly AcademicAuditModule[];

export type AuditorAuditModule = (typeof AUDITOR_AUDIT_MODULES)[number];

/** Modules with no auto-fetched summary — the auditor enters findings directly. */
export const AUDITOR_FREEFORM_MODULES = [
  'FINANCE',
  'TEACHERS',
  'STUDENT_RECORDS',
  'INFRASTRUCTURE',
  'ICT',
  'SAFETY',
  'COMPLIANCE',
] as const satisfies readonly AcademicAuditModule[];

export type AuditorFreeformModule = (typeof AUDITOR_FREEFORM_MODULES)[number];

export function isAuditorFreeformModule(value: string | null): value is AuditorFreeformModule {
  return AUDITOR_FREEFORM_MODULES.some((module) => module === value);
}

export const ACADEMIC_AUDIT_MODULE_LABELS: Record<AcademicAuditModule, string> = {
  ATTENDANCE: 'Attendance',
  COURSE_MANAGEMENT: 'Course Management',
  LEARNING_INSIGHTS: 'Learning Insights',
  CONTINUOUS_ASSESSMENTS: 'Continuous Assessment Test',
  MARKS: 'Marks',
  TIMETABLE: 'Timetable',
  FINANCE: 'Finance',
  TEACHERS: 'Teachers',
  STUDENT_RECORDS: 'Student Records',
  INFRASTRUCTURE: 'Infrastructure',
  ICT: 'ICT',
  SAFETY: 'Safety',
  COMPLIANCE: 'Compliance',
};

export const ACADEMIC_AUDIT_STATUS_LABELS: Record<AcademicAuditStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_REVISION: 'Needs Revision',
};

export function isAuditorAuditModule(value: string | null): value is AuditorAuditModule {
  return AUDITOR_AUDIT_MODULES.some((module) => module === value);
}

export interface School {
  id: string;
  displayName: string;
  registrationNumber: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  tenant: {
    id: string;
    code: string;
  };
}

interface AuditorScope {
  level: 'NATIONAL' | 'PROVINCE' | 'DISTRICT' | 'SECTOR';
  country: string;
  province: string | null;
  district: string | null;
  sector: string | null;
}

interface AuditorDashboard {
  scope: AuditorScope;
  stats: {
    totalSchoolsInScope: number;
    completedAudits: number;
    draftAudits: number;
    pendingSchools: number;
    pendingReview: number;
    averageComplianceScore: number | null;
  };
  recentAudits: Array<{
    id: string;
    school: string;
    module: AcademicAuditModule;
    score: number;
    status: AcademicAuditStatus;
    createdAt: string;
  }>;
}

export async function getAuditorDashboardApi(): Promise<AuditorDashboard> {
  return apiRequest('/gov/dashboard');
}

export async function listAuditorSchoolsApi(): Promise<School[]> {
  return apiRequest('/gov/schools');
}

export interface SchoolAttendanceData {
  school: { id: string; displayName: string };
  academicYear: { id: string; name: string } | null;
  summary: { totalSessions: number; averageAttendance: number };
  data: Array<{
    id: string;
    date: string;
    classRoom: string;
    status: string;
  }>;
}

export async function getSchoolAttendanceApi(schoolId: string): Promise<SchoolAttendanceData> {
  return apiRequest(`/gov/schools/${schoolId}/attendance`);
}

export interface CourseData {
  school: { id: string; displayName: string };
  totalCourses: number;
  data: Array<{
    id: string;
    name: string;
    subject: string;
    classRoom: string;
    teacher: string;
    lessonsCount: number;
    assignmentsCount: number;
    isPublished: boolean;
  }>;
}

export async function getSchoolCoursesApi(schoolId: string): Promise<CourseData> {
  return apiRequest(`/gov/schools/${schoolId}/courses`);
}

export interface LearningInsightsData {
  school: { id: string; displayName: string };
  academicYear: { id: string; name: string } | null;
  summary: {
    totalStudents: number;
    totalCourses: number;
    activeEnrollments: number;
    completedLessons: number;
  };
}

export async function getSchoolLearningInsightsApi(
  schoolId: string
): Promise<LearningInsightsData> {
  return apiRequest(`/gov/schools/${schoolId}/learning-insights`);
}

export interface AssessmentData {
  school: { id: string; displayName: string };
  totalAssessments: number;
  totalAttempts: number;
  data: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    duration: number | null;
    questionsCount: number;
    attemptsCount: number;
    createdBy: string;
    createdAt: string;
  }>;
}

export async function getSchoolAssessmentsApi(schoolId: string): Promise<AssessmentData> {
  return apiRequest(`/gov/schools/${schoolId}/assessments`);
}

export interface MarksData {
  school: { id: string; displayName: string };
  academicYear: { id: string; name: string } | null;
  summary: {
    totalExams: number;
    marksCompletionRate: number;
  };
  data: Array<{
    id: string;
    title: string;
    subject: string;
    classRoom: string;
    examType: string;
    totalMarks: number;
    marksEntered: number;
    status: string;
    createdAt: string;
  }>;
}

export async function getSchoolMarksApi(schoolId: string): Promise<MarksData> {
  return apiRequest(`/gov/schools/${schoolId}/marks`);
}

export interface TimetableData {
  school: { id: string; displayName: string };
  academicYear: { id: string; name: string } | null;
  term: { id: string; name: string } | null;
  totalSlots: number;
  data: Array<{
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    classRoom: string;
    subject: string;
    teacher: string;
  }>;
}

export async function getSchoolTimetableApi(schoolId: string): Promise<TimetableData> {
  return apiRequest(`/gov/schools/${schoolId}/timetable`);
}

export type AcademicAuditModuleData =
  | SchoolAttendanceData
  | CourseData
  | LearningInsightsData
  | AssessmentData
  | MarksData
  | TimetableData;

export type AcademicAuditStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_REVISION';

export interface AuditAttachment {
  id: string;
  originalName: string;
  mimeType: string | null;
  bytes: number | null;
  // null for PDFs — fetch via the protected file stream endpoint instead.
  secureUrl: string | null;
}

interface SubmitAuditInput {
  schoolId: string;
  module: AcademicAuditModule;
  score: number;
  comment?: string;
  recommendation?: string;
  attachments?: UploadedAssetPayload[];
  asDraft?: boolean;
}

interface AcademicAudit {
  id: string;
  auditorId: string;
  schoolId: string;
  module: AcademicAuditModule;
  subType: string;
  score: number;
  status: AcademicAuditStatus;
  comment: string | null;
  recommendation: string | null;
  reviewNote?: string | null;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  attachments?: AuditAttachment[];
  createdAt: string;
}

export async function submitAcademicAuditApi(input: SubmitAuditInput): Promise<AcademicAudit> {
  return apiRequest('/gov/audits', {
    method: 'POST',
    body: input,
  });
}

export async function updateAcademicAuditApi(
  auditId: string,
  input: Partial<{
    score: number;
    comment: string;
    recommendation: string | null;
    attachments: UploadedAssetPayload[];
  }>
): Promise<AcademicAudit> {
  return apiRequest(`/gov/audits/${auditId}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function submitDraftAuditApi(auditId: string): Promise<AcademicAudit> {
  return apiRequest(`/gov/audits/${auditId}/submit`, { method: 'POST' });
}

export async function reviewAuditApi(
  auditId: string,
  input: { decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'; reviewNote?: string }
): Promise<AcademicAudit> {
  return apiRequest(`/gov/audits/${auditId}/review`, { method: 'POST', body: input });
}

export async function reopenAuditApi(
  auditId: string,
  input: { reviewNote?: string }
): Promise<AcademicAudit> {
  return apiRequest(`/gov/audits/${auditId}/reopen`, { method: 'POST', body: input });
}

export async function downloadAuditReportPdfApi(accessToken: string, auditId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/gov/audits/${auditId}/pdf`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Could not load audit report PDF');
  }
  return response.blob();
}

interface AcademicAuditListItem {
  id: string;
  school: {
    id: string;
    displayName: string;
    province: string | null;
    district: string | null;
    sector: string | null;
  };
  module: AcademicAuditModule;
  score: number;
  status: AcademicAuditStatus;
  comment: string | null;
  recommendation: string | null;
  createdAt: string;
}

interface ListAuditsResponse {
  items: AcademicAuditListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ListAuditsParams {
  page?: number;
  pageSize?: number;
  schoolId?: string;
  module?: AcademicAuditModule;
  status?: AcademicAuditStatus;
  auditorId?: string;
  from?: string;
  to?: string;
  province?: string;
  district?: string;
  sector?: string;
}

export async function listAuditsApi(params: ListAuditsParams = {}): Promise<ListAuditsResponse> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.schoolId) query.schoolId = params.schoolId;
  if (params.module) query.module = params.module;
  if (params.status) query.status = params.status;
  if (params.auditorId) query.auditorId = params.auditorId;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.province) query.province = params.province;
  if (params.district) query.district = params.district;
  if (params.sector) query.sector = params.sector;

  const queryString = new URLSearchParams(query).toString();
  const path = queryString ? `/gov/audits?${queryString}` : '/gov/audits';

  return apiRequest(path);
}

export async function getAuditByIdApi(auditId: string): Promise<AcademicAudit> {
  return apiRequest(`/gov/audits/${auditId}`);
}

export interface AuditorScopeResponse {
  level: 'NATIONAL' | 'PROVINCE' | 'DISTRICT' | 'SECTOR';
  country: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  isActive: boolean;
}

export async function getAuditorScopeApi(): Promise<AuditorScopeResponse> {
  return apiRequest('/admin/auditors/scope');
}

export interface AuditorReportData {
  scope: AuditorScope;
  report: {
    totalSchoolsInScope: number;
    schoolsAudited: number;
    pendingSchools: number;
    totalAudits: number;
    averageScore: number | null;
    moduleDistribution: Record<string, number>;
    schools: Array<{
      id: string;
      name: string;
      province: string | null;
      district: string | null;
      sector: string | null;
      auditCount: number;
      latestScore: number | null;
    }>;
    recentAudits: Array<{
      id: string;
      school: string;
      module: AcademicAuditModule;
      score: number;
      status: string;
      createdAt: string;
    }>;
  };
}

export async function getAuditorReportApi(): Promise<AuditorReportData> {
  return apiRequest('/admin/auditors/report');
}
