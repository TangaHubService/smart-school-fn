import { apiRequest } from '../../api/client';

export interface ConductTermSettingRow {
  id: string;
  name: string;
  sequence: number;
  totalMarks: number | null;
  settingUpdatedAt: string | null;
}

export function listConductTermSettingsApi(accessToken: string, academicYearId: string) {
  const q = new URLSearchParams({ academicYearId });
  return apiRequest<{
    academicYear: { id: string; name: string };
    terms: ConductTermSettingRow[];
  }>(`/conduct-marks/term-settings?${q.toString()}`, { method: 'GET', accessToken });
}

export function upsertConductTermSettingApi(
  accessToken: string,
  termId: string,
  body: { totalMarks: number },
) {
  return apiRequest<{ termId: string; totalMarks: number; updatedAt: string }>(
    `/conduct-marks/term-settings/${termId}`,
    { method: 'PUT', accessToken, body },
  );
}

export function createConductDeductionApi(
  accessToken: string,
  body: {
    academicYearId: string;
    termId: string;
    classRoomId: string;
    studentId: string;
    pointsDeducted: number;
    reason: string;
    occurredAt?: string;
  },
) {
  return apiRequest<unknown>('/conduct-marks/deductions', { method: 'POST', accessToken, body });
}

export function listStudentConductDeductionsApi(
  accessToken: string,
  studentId: string,
  params: { page?: number; pageSize?: number; termId?: string },
) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  if (params.termId) q.set('termId', params.termId);
  return apiRequest<{
    items: Array<{
      id: string;
      pointsDeducted: number;
      reason: string;
      occurredAt: string;
      createdAt: string;
      term: { id: string; name: string; sequence: number };
      academicYear: { id: string; name: string };
      classRoom: { id: string; code: string; name: string };
      recordedBy: { id: string; firstName: string; lastName: string; email: string };
    }>;
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  }>(`/conduct-marks/students/${studentId}/deductions?${q.toString()}`, { method: 'GET', accessToken });
}

export function getStudentConductMarksSummaryApi(
  accessToken: string,
  studentId: string,
  academicYearId: string,
) {
  const q = new URLSearchParams({ academicYearId });
  return apiRequest<{
    academicYearId: string;
    classRoomId: string | null;
    terms: Array<{ termId: string; termName: string; finalScore: number; totalMarks: number; grade: string }>;
  }>(`/conduct-marks/students/${studentId}/summary?${q.toString()}`, { method: 'GET', accessToken });
}
