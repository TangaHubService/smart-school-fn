import { apiRequest } from '../../api/client';

export interface AcademicByClassResponse {
  term: { id: string; name: string };
  academicYear: { id: string; name: string };
  classes: Array<{
    classRoom: { id: string; code: string; name: string; gradeLevel?: { code: string; name: string } };
    examCount: number;
    students: Array<{
      student: { id: string; studentCode: string; firstName: string; lastName: string };
      overall: { averagePercentage: number; grade: string; remark: string };
      subjectCount: number;
      gridTotal: number;
      rank: number;
    }>;
  }>;
}

export interface AcademicStudentResponse {
  term: { id: string; name: string };
  academicYear: { id: string; name: string };
  classRoom: { id: string; code: string; name: string };
  student: { id: string; studentCode: string; firstName: string; lastName: string };
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    averagePercentage: number;
    grade: string;
    remark: string;
    exams: Array<{
      examId: string;
      name: string;
      examType: 'CAT' | 'EXAM';
      marksObtained: number;
      totalMarks: number;
      percentage: number;
      weight: number;
    }>;
  }>;
  overall: { averagePercentage: number; grade: string; remark: string };
  gridTotal: number;
  rank: { position: number | null; classSize: number };
}

export interface AcademicClassResponse {
  term: { id: string; name: string };
  academicYear: { id: string; name: string };
  classRoom: { id: string; code: string; name: string; gradeLevel?: { code: string; name: string } };
  examCount: number;
  statistics: {
    classAverage: number;
    passRatePercent: number;
    passThresholdNote: string;
    enrolled: number;
  };
  topStudents: Array<{
    student: { id: string; studentCode: string; firstName: string; lastName: string };
    overall: { averagePercentage: number; grade: string; remark: string };
    gridTotal: number;
    rank: number;
  }>;
  bottomStudents: Array<{
    student: { id: string; studentCode: string; firstName: string; lastName: string };
    overall: { averagePercentage: number; grade: string; remark: string };
    gridTotal: number;
    rank: number;
  }>;
  students: Array<{
    student: { id: string; studentCode: string; firstName: string; lastName: string };
    overall: { averagePercentage: number; grade: string; remark: string };
    gridTotal: number;
    rank: number;
  }>;
}

export interface AcademicSubjectResponse {
  term: { id: string; name: string };
  academicYear: { id: string; name: string };
  subject: { id: string; code: string; name: string };
  classes: Array<{
    classRoom: { id: string; code: string; name: string };
    subjectAverage: number;
    students: Array<{
      student: { id: string; studentCode: string; firstName: string; lastName: string };
      subject: { averagePercentage: number; grade: string; remark: string } | null;
      overall: { averagePercentage: number; grade: string; remark: string };
    }>;
  }>;
}

export interface AttendanceSchoolResponse {
  range: { from: string; to: string };
  totals: {
    records: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  ratePercent: number;
  rateNote: string;
}

export interface AttendanceByClassResponse {
  range: { from: string; to: string };
  classes: Array<{
    classRoom: { id: string; code: string; name: string };
    present: number;
    absent: number;
    late: number;
    excused: number;
    records: number;
    ratePercent: number;
  }>;
}

export interface AttendanceAbsenteeismResponse {
  range: { from: string; to: string };
  minAbsent: number;
  students: Array<{
    student: { id: string; studentCode: string; firstName: string; lastName: string };
    classRoom: { id: string; code: string; name: string };
    absentDays: number;
    absentDatesSample: string[];
  }>;
}

export interface AttendanceSummaryCardsResponse {
  date: string;
  today: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    records: number;
    ratePercent: number;
  };
  weekToDate: {
    range: { from: string; to: string };
    present: number;
    absent: number;
    late: number;
    excused: number;
    records: number;
    ratePercent: number;
  };
}

export function getAcademicByClassApi(
  accessToken: string,
  params: {
    termId: string;
    classRoomId?: string;
    q?: string;
  }
) {
  const query = new URLSearchParams();
  query.set('termId', params.termId);
  if (params.classRoomId) query.set('classRoomId', params.classRoomId);
  if (params.q) query.set('q', params.q);

  return apiRequest<AcademicByClassResponse>(`/reports/academic/by-class?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function getAcademicStudentApi(
  accessToken: string,
  studentId: string,
  params: { termId: string }
) {
  const query = new URLSearchParams();
  query.set('termId', params.termId);

  return apiRequest<AcademicStudentResponse>(
    `/reports/academic/students/${studentId}?${query.toString()}`,
    {
      method: 'GET',
      accessToken,
    }
  );
}

export function getAcademicClassApi(
  accessToken: string,
  classRoomId: string,
  params: { termId: string }
) {
  const query = new URLSearchParams();
  query.set('termId', params.termId);

  return apiRequest<AcademicClassResponse>(`/reports/academic/classes/${classRoomId}?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function getAcademicSubjectApi(
  accessToken: string,
  params: {
    termId: string;
    subjectId: string;
    classRoomId?: string;
  }
) {
  const query = new URLSearchParams();
  query.set('termId', params.termId);
  query.set('subjectId', params.subjectId);
  if (params.classRoomId) query.set('classRoomId', params.classRoomId);

  return apiRequest<AcademicSubjectResponse>(`/reports/academic/subject?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function getAttendanceSchoolApi(
  accessToken: string,
  params: { from: string; to: string }
) {
  const query = new URLSearchParams();
  query.set('from', params.from);
  query.set('to', params.to);

  return apiRequest<AttendanceSchoolResponse>(`/reports/attendance/school?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function getAttendanceByClassApi(
  accessToken: string,
  params: { from: string; to: string }
) {
  const query = new URLSearchParams();
  query.set('from', params.from);
  query.set('to', params.to);

  return apiRequest<AttendanceByClassResponse>(`/reports/attendance/by-class?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function getAttendanceAbsenteeismApi(
  accessToken: string,
  params: { from: string; to: string; minAbsent?: number }
) {
  const query = new URLSearchParams();
  query.set('from', params.from);
  query.set('to', params.to);
  if (params.minAbsent) query.set('minAbsent', String(params.minAbsent));

  return apiRequest<AttendanceAbsenteeismResponse>(
    `/reports/attendance/absenteeism?${query.toString()}`,
    {
      method: 'GET',
      accessToken,
    }
  );
}

export function getAttendanceSummaryCardsApi(accessToken: string) {
  return apiRequest<AttendanceSummaryCardsResponse>('/reports/attendance/summary-cards', {
    method: 'GET',
    accessToken,
  });
}