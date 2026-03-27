import { apiRequest } from '../../api/client';

export async function getReportsAcademicByClassApi(
  accessToken: string,
  params: { termId: string; classRoomId?: string; q?: string },
) {
  const search = new URLSearchParams({ termId: params.termId });
  if (params.classRoomId) search.set('classRoomId', params.classRoomId);
  if (params.q) search.set('q', params.q);
  return apiRequest<unknown>(`/reports/academic/by-class?${search.toString()}`, {
    accessToken,
  });
}

export async function getReportsAcademicStudentApi(
  accessToken: string,
  studentId: string,
  params: { termId: string },
) {
  const search = new URLSearchParams({ termId: params.termId });
  return apiRequest<unknown>(`/reports/academic/students/${studentId}?${search.toString()}`, {
    accessToken,
  });
}

export async function getReportsAcademicClassApi(
  accessToken: string,
  classRoomId: string,
  params: { termId: string },
) {
  const search = new URLSearchParams({ termId: params.termId });
  return apiRequest<unknown>(`/reports/academic/classes/${classRoomId}?${search.toString()}`, {
    accessToken,
  });
}

export async function getReportsAcademicSubjectApi(
  accessToken: string,
  params: { termId: string; subjectId: string; classRoomId?: string },
) {
  const search = new URLSearchParams({
    termId: params.termId,
    subjectId: params.subjectId,
  });
  if (params.classRoomId) search.set('classRoomId', params.classRoomId);
  return apiRequest<unknown>(`/reports/academic/subject?${search.toString()}`, {
    accessToken,
  });
}

export async function getReportsAttendanceSchoolApi(
  accessToken: string,
  params: { from: string; to: string },
) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  return apiRequest<unknown>(`/reports/attendance/school?${search.toString()}`, {
    accessToken,
  });
}

export async function getReportsAttendanceByClassApi(
  accessToken: string,
  params: { from: string; to: string },
) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  return apiRequest<unknown>(`/reports/attendance/by-class?${search.toString()}`, {
    accessToken,
  });
}

export async function getReportsAttendanceAbsenteeismApi(
  accessToken: string,
  params: { from: string; to: string; minAbsent?: number },
) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  if (params.minAbsent != null) search.set('minAbsent', String(params.minAbsent));
  return apiRequest<unknown>(`/reports/attendance/absenteeism?${search.toString()}`, {
    accessToken,
  });
}

export async function getReportsAttendanceSummaryCardsApi(accessToken: string) {
  return apiRequest<unknown>('/reports/attendance/summary-cards', { accessToken });
}

export async function getReportsTeachersWorkloadApi(
  accessToken: string,
  params: { academicYearId: string; termId?: string },
) {
  const search = new URLSearchParams({ academicYearId: params.academicYearId });
  if (params.termId) search.set('termId', params.termId);
  return apiRequest<unknown>(`/reports/teachers/workload?${search.toString()}`, { accessToken });
}

export async function getReportsTeachersAllocationApi(
  accessToken: string,
  params: { academicYearId: string; termId?: string },
) {
  const search = new URLSearchParams({ academicYearId: params.academicYearId });
  if (params.termId) search.set('termId', params.termId);
  return apiRequest<unknown>(`/reports/teachers/allocation?${search.toString()}`, { accessToken });
}

export async function getReportsTeachersActivityApi(
  accessToken: string,
  params: { from: string; to: string },
) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  return apiRequest<unknown>(`/reports/teachers/activity?${search.toString()}`, { accessToken });
}

export async function getReportsTimetableApi(
  accessToken: string,
  params: {
    academicYearId: string;
    termId?: string;
    classRoomId?: string;
    teacherUserId?: string;
    dayOfWeek?: number;
  },
) {
  const search = new URLSearchParams({ academicYearId: params.academicYearId });
  if (params.termId) search.set('termId', params.termId);
  if (params.classRoomId) search.set('classRoomId', params.classRoomId);
  if (params.teacherUserId) search.set('teacherUserId', params.teacherUserId);
  if (params.dayOfWeek != null) search.set('dayOfWeek', String(params.dayOfWeek));
  return apiRequest<unknown>(`/reports/timetable?${search.toString()}`, { accessToken });
}

export async function getReportsConductSchoolSummaryApi(
  accessToken: string,
  params: {
    from: string;
    to: string;
    classRoomId?: string;
    status?: string;
    severity?: string;
  },
) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  if (params.classRoomId) search.set('classRoomId', params.classRoomId);
  if (params.status) search.set('status', params.status);
  if (params.severity) search.set('severity', params.severity);
  return apiRequest<unknown>(`/reports/conduct/school-summary?${search.toString()}`, {
    accessToken,
  });
}

export async function getReportsConductByClassApi(
  accessToken: string,
  params: {
    from: string;
    to: string;
    classRoomId?: string;
    status?: string;
    severity?: string;
  },
) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  if (params.classRoomId) search.set('classRoomId', params.classRoomId);
  if (params.status) search.set('status', params.status);
  if (params.severity) search.set('severity', params.severity);
  return apiRequest<unknown>(`/reports/conduct/by-class?${search.toString()}`, { accessToken });
}

export async function getReportsConductStudentApi(
  accessToken: string,
  studentId: string,
  params: { from: string; to: string },
) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  return apiRequest<unknown>(`/reports/conduct/students/${studentId}?${search.toString()}`, {
    accessToken,
  });
}
