import { apiRequest } from '../../api/client';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceClassOption {
  id: string;
  code: string;
  name: string;
  capacity: number | null;
  gradeLevel: {
    id: string;
    code: string;
    name: string;
    rank: number;
  };
}

export interface AttendanceClassReport {
  date: string;
  classRoom: {
    id: string;
    code: string;
    name: string;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
    };
  };
  session: {
    id: string;
    classRoomId: string;
    academicYear: {
      id: string;
      name: string;
    } | null;
    date: string;
    status: 'OPEN' | 'CLOSED';
    createdAt: string;
    updatedAt: string;
  } | null;
  students: Array<{
    studentId: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    status: AttendanceStatus;
    remarks: string | null;
    recordId: string | null;
    markedAt: string | null;
    updatedAt: string | null;
  }>;
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

export interface AttendanceStudentHistoryResponse {
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  range: {
    from: string;
    to: string;
  };
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  records: Array<{
    id: string;
    date: string;
    status: AttendanceStatus;
    remarks: string | null;
    classRoom: {
      id: string;
      code: string;
      name: string;
    };
    markedAt: string;
    updatedAt: string;
  }>;
}

export interface AttendanceDashboardSummary {
  date: string;
  activeClasses: number;
  sessionsOpened: number;
  pendingClasses: number;
  coveragePercent: number;
  markedStudents: number;
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

export interface SaveAttendanceBulkPayload {
  sessionId?: string;
  classRoomId?: string;
  date?: string;
  academicYearId?: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}

export function listAttendanceClassesApi(accessToken: string, params?: { teacherOnly?: boolean }) {
  const query = new URLSearchParams();
  if (params?.teacherOnly) {
    query.set('teacherOnly', 'true');
  }
  const url = `/attendance/classes${query.toString() ? `?${query.toString()}` : ''}`;
  return apiRequest<AttendanceClassOption[]>(url, {
    method: 'GET',
    accessToken,
  });
}

export function createAttendanceSessionApi(
  accessToken: string,
  payload: {
    classRoomId: string;
    date: string;
    academicYearId?: string;
  }
) {
  return apiRequest<{
    session: AttendanceClassReport['session'];
    created: boolean;
  }>('/attendance/sessions', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function saveAttendanceBulkApi(accessToken: string, payload: SaveAttendanceBulkPayload) {
  return apiRequest<{
    session: AttendanceClassReport['session'];
    savedCount: number;
    editedCount: number;
  }>('/attendance/records/bulk', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function getAttendanceClassReportApi(accessToken: string, classId: string, date?: string) {
  const query = new URLSearchParams();
  if (date) {
    query.set('date', date);
  }

  return apiRequest<AttendanceClassReport>(
    `/attendance/classes/${classId}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    }
  );
}

export function getStudentAttendanceHistoryApi(
  accessToken: string,
  studentId: string,
  params?: {
    from?: string;
    to?: string;
  }
) {
  const query = new URLSearchParams();
  if (params?.from) {
    query.set('from', params.from);
  }
  if (params?.to) {
    query.set('to', params.to);
  }

  return apiRequest<AttendanceStudentHistoryResponse>(
    `/attendance/students/${studentId}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    }
  );
}

export function getAttendanceDashboardSummaryApi(accessToken: string, date?: string) {
  const query = new URLSearchParams();
  if (date) {
    query.set('date', date);
  }

  return apiRequest<AttendanceDashboardSummary>(
    `/attendance/summary${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    }
  );
}

export interface AttendanceReportResponse {
  range: { from: string | null; to: string | null };
  classRoom: { id: string; code: string; name: string } | null;
  student: { id: string; studentCode: string; firstName: string; lastName: string } | null;
  status: AttendanceStatus | null;
  summary: { total: number; present: number; absent: number; late: number; excused: number };
  records: Array<{
    id: string;
    date: string;
    status: AttendanceStatus;
    remarks: string | null;
    classRoom: { id: string; code: string; name: string };
    student: { id: string; studentCode: string; firstName: string; lastName: string };
  }>;
}

export function getAttendanceReportApi(
  accessToken: string,
  params: { classRoomId?: string; studentId?: string; status?: string; from?: string; to?: string } = {}
) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) query.set(k, v);
  }
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<AttendanceReportResponse>(`/attendance/report${qs}`, {
    method: 'GET',
    accessToken,
  });
}

export async function downloadAttendanceReportPdfApi(
  accessToken: string,
  params: { classRoomId?: string; studentId?: string; status?: string; from?: string; to?: string } = {}
): Promise<Blob> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) query.set(k, v);
  }
  const qs = query.toString() ? `?${query.toString()}` : '';
  const { API_BASE_URL } = await import('../../api/client');
  const response = await fetch(`${API_BASE_URL}/attendance/report/pdf${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Could not download attendance PDF');
  return response.blob();
}
