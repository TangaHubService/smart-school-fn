import { apiRequest } from '../../api/client';

export interface SuperAdminDashboardData {
  metrics: {
    totalUsers: number;
    activeSchools: number;
    ongoingExams: number;
    supportTickets: number;
  };
  billing: {
    schoolSubscriptionsActive: number;
    academyLearnersActive: number;
    academyPaymentsPending: number;
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
  revenue: {
    totalRevenue: number;
    monthlyRevenue: Array<{ month: string; amount: number }>;
    revenueThisMonth: number;
    revenueChange: number;
  };
  enrollmentTrends: {
    weekly: Array<{ label: string; count: number }>;
    monthly: Array<{ label: string; count: number }>;
  };
  completionRates: {
    courseCompletionRate: number | null;
    assessmentCompletionRate: number | null;
    overallRate: number | null;
  };
  activeUsers: {
    weeklyActive: number;
    monthlyActive: number;
  };
}

export interface SuperAdminDashboardFilters {
  academicYear?: string;
  term?: string;
  region?: string;
  school?: string;
  status?: 'active' | 'inactive' | 'all';
}

export interface SuperAdminDashboardFilterOptions {
  schools: Array<{ id: string; name: string; province: string | null; isActive: boolean }>;
  regions: string[];
  academicYears: Array<{ id: string; name: string }>;
  terms: Array<{ id: string; name: string; sequence: number }>;
}

export interface SchoolAdminDashboardData {
  school: {
    displayName: string;
    city: string | null;
    logoUrl: string | null;
  };
  metrics: {
    totalStudents: number;
    studentsChange: number;
    teachers: number;
    teachersChange: number;
    classes: number;
    classesChange: number;
    subjects: number;
    attendanceToday: number | null;
    examsConducted: number;
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
  revenue: {
    totalRevenue: number;
    monthlyRevenue: Array<{ month: string; amount: number }>;
    revenueThisMonth: number;
    revenueChange: number;
  };
  enrollmentTrends: {
    weekly: Array<{ label: string; count: number }>;
    monthly: Array<{ label: string; count: number }>;
  };
  completionRates: {
    courseCompletionRate: number | null;
    assessmentCompletionRate: number | null;
    overallRate: number | null;
  };
  activeUsers: {
    weeklyActive: number;
    monthlyActive: number;
  };
  overviewAnalytics: Array<{
    label: string;
    enrollments: number;
    attendance: number | null;
    assessments: number | null;
  }>;
  topClasses: Array<{
    id: string;
    name: string;
    averageScore: number;
    students: number;
  }>;
  quickInsights: {
    averageScore: number | null;
    passRate: number | null;
    attendanceRate: number | null;
    behaviorIndex: number | null;
    engagementScore: number | null;
  };
}

export interface SchoolAdminDashboardFilters {
  academicYear?: string;
  term?: string;
  classFilter?: string;
  findFilter?: string;
}

export function getSuperAdminDashboardApi(
  accessToken: string,
  filters?: SuperAdminDashboardFilters
) {
  const params = new URLSearchParams();
  if (filters?.academicYear) params.set('academicYear', filters.academicYear);
  if (filters?.term) params.set('term', filters.term);
  if (filters?.region) params.set('region', filters.region);
  if (filters?.school) params.set('school', filters.school);
  if (filters?.status) params.set('status', filters.status);

  const query = params.toString();
  const path = query ? `/dashboard/super-admin?${query}` : '/dashboard/super-admin';

  return apiRequest<SuperAdminDashboardData>(path, {
    method: 'GET',
    accessToken,
  });
}

export function getSuperAdminDashboardFiltersApi(accessToken: string) {
  return apiRequest<SuperAdminDashboardFilterOptions>('/dashboard/super-admin/filters', {
    method: 'GET',
    accessToken,
  });
}

export function getSchoolAdminDashboardApi(
  accessToken: string,
  filters?: SchoolAdminDashboardFilters
) {
  const params = new URLSearchParams();
  if (filters?.academicYear) params.set('academicYear', filters.academicYear);
  if (filters?.term) params.set('term', filters.term);
  if (filters?.classFilter && filters.classFilter !== 'all')
    params.set('class', filters.classFilter);
  if (filters?.findFilter && filters.findFilter !== 'all') params.set('find', filters.findFilter);

  const query = params.toString();
  const path = query ? `/dashboard/school-admin?${query}` : '/dashboard/school-admin';

  return apiRequest<SchoolAdminDashboardData>(path, {
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
  learningStats?: {
    timeSpentSecondsTotal: number;
    lastLessonActivityAt: string | null;
    avgAssessmentScorePercent: number | null;
  };
  upcomingExams: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    relativeDate: string;
    classLabel?: string;
    subjectName?: string;
  }>;
  latestReports: Array<{ id: string; name: string; value: string | number }>;
  recentAnnouncements?: Array<{
    id: string;
    title: string;
    publishedAt: string | null;
    excerpt: string;
  }>;
  attendanceWeek?: {
    daysWithRecords: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  } | null;
  conductOpen?: number | null;
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
  todayClasses: Array<{
    classRoomId: string;
    className: string;
    subjectNames: string[];
    totalStudents: number;
    markedStudents: number;
    status: 'COMPLETE' | 'PARTIAL' | 'UNMARKED';
  }>;
  upcomingExams: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    relativeDate: string;
  }>;
}

export interface DemographicsData {
  totalStudents: number;
  totalBoys: number;
  totalGirls: number;
  studentsWithDisabilities: number;
  disabilitiesBreakdown?: {
    visual: number;
    hearing: number;
    mobility: number;
    intellectual: number;
    other: number;
  };
  bySector: Array<{ sector: string; boys: number; girls: number; disabilities: number }>;
  byGrade: Array<{ grade: string; boys: number; girls: number; disabilities: number }>;
  byAcademicYear: Array<{ year: string; boys: number; girls: number; disabilities: number }>;
}

export function getDemographicsApi(
  accessToken: string,
  filters?: { academicYear?: string; term?: string }
) {
  const params = new URLSearchParams();
  if (filters?.academicYear) params.set('academicYear', filters.academicYear);
  if (filters?.term) params.set('term', filters.term);
  const query = params.toString();
  const path = query ? `/dashboard/demographics?${query}` : '/dashboard/demographics';
  return apiRequest<DemographicsData>(path, { method: 'GET', accessToken });
}

export function getTeacherDashboardApi(accessToken: string) {
  return apiRequest<TeacherDashboardData>('/dashboard/teacher', {
    method: 'GET',
    accessToken,
  });
}
