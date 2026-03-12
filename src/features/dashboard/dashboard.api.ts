import { apiRequest } from '../../api/client';

export interface SuperAdminDashboardData {
  metrics: {
    totalUsers: number;
    activeSchools: number;
    ongoingExams: number;
    supportTickets: number;
  };
  userOverview: {
    administrators: number;
    schools: number;
    teachers: number;
    students: number;
    parents: number;
    classes: number;
    subjects: number;
    activeAccounts: number;
  };
  upcomingExams: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    relativeDate: string;
  }>;
  latestReports: Array<{
    id: string;
    name: string;
    count: number;
    icon: string;
  }>;
  systemAnalytics: {
    weekly: Array<{ label: string; logins: number; courses: number; exams: number }>;
    monthly: Array<{ label: string; logins: number; courses: number; exams: number }>;
  };
}

export interface SchoolAdminDashboardData {
  school: {
    displayName: string;
    city: string | null;
  };
  metrics: {
    totalStudents: number;
    studentsChange: number;
    teachers: number;
    teachersChange: number;
    classes: number;
    classesChange: number;
    subjects: number;
  };
  userOverview: {
    students: number;
    studentsChange: number;
    teachers: number;
    teachersChange: number;
    parents: number;
    parentsChange: number;
    activeAccounts: number;
  };
  upcomingExams: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    relativeDate: string;
  }>;
  latestReports: Array<{
    id: string;
    name: string;
    value: string | number;
    icon: string;
  }>;
  systemAnalytics: {
    weekly: Array<{ label: string; logins: number; attendance: number; assignments: number }>;
    monthly: Array<{ label: string; logins: number; attendance: number; assignments: number }>;
  };
}

export function getSuperAdminDashboardApi(accessToken: string) {
  return apiRequest<SuperAdminDashboardData>('/dashboard/super-admin', {
    method: 'GET',
    accessToken,
  });
}

export function getSchoolAdminDashboardApi(accessToken: string) {
  return apiRequest<SchoolAdminDashboardData>('/dashboard/school-admin', {
    method: 'GET',
    accessToken,
  });
}

export interface StudentDashboardData {
  school: { displayName: string; city: string | null };
  metrics: {
    myCourses: number;
    assignmentsSubmitted: number;
    myAssessments: number;
    reportCards: number;
  };
  upcomingExams: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    relativeDate: string;
  }>;
  latestReports: Array<{ id: string; name: string; value: string | number }>;
}

export function getStudentDashboardApi(accessToken: string) {
  return apiRequest<StudentDashboardData>('/dashboard/student', {
    method: 'GET',
    accessToken,
  });
}

export interface TeacherDashboardData {
  school: { displayName: string; city: string | null };
  metrics: {
    myCourses: number;
    myClasses: number;
    pendingSubmissions: number;
    upcomingExams: number;
  };
  todayAttendance: {
    markedStudents: number;
    pendingClasses: number;
    totalClasses: number;
  };
  upcomingExams: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    relativeDate: string;
  }>;
}

export function getTeacherDashboardApi(accessToken: string) {
  return apiRequest<TeacherDashboardData>('/dashboard/teacher', {
    method: 'GET',
    accessToken,
  });
}
