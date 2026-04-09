import { apiRequest } from '../../api/client';
import type { MyAssessmentItem } from '../assessments/assessments.api';

export type LessonContentType = 'TEXT' | 'PDF' | 'VIDEO' | 'LINK';
export type SubmissionStatus = 'SUBMITTED' | 'GRADED';
export type FileAssetResourceType = 'IMAGE' | 'VIDEO' | 'RAW';

export interface FileAsset {
  id: string;
  secureUrl: string;
  originalName: string;
  format: string | null;
  mimeType: string | null;
  resourceType: FileAssetResourceType;
  bytes: number | null;
}

export interface CourseSummary {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  } | null;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CourseTeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CourseSubjectOption {
  id: string;
  code: string;
  name: string;
}

export interface LessonItem {
  id: string;
  title: string;
  summary: string | null;
  contentType: LessonContentType;
  body: string | null;
  externalUrl: string | null;
  sequence: number;
  isPublished: boolean;
  publishedAt: string | null;
  mustPassAssessmentId?: string | null;
  createdAt: string;
  updatedAt: string;
  fileAsset: FileAsset | null;
}

export interface SubmissionItem {
  id: string;
  textAnswer: string | null;
  linkUrl: string | null;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt: string | null;
  gradePoints: number | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  fileAsset: FileAsset | null;
  gradedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface AssignmentItem {
  id: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  maxPoints: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  lesson: {
    id: string;
    title: string;
  } | null;
  course?: {
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
  } | null;
  attachmentAsset: FileAsset | null;
  submissionCount: number;
  mySubmission?: SubmissionItem | null;
}

export type CourseAssessmentItem = MyAssessmentItem;

export interface CourseListResponse {
  items: Array<
    CourseSummary & {
      counts: {
        lessons: number;
        assignments: number;
      };
    }
  >;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CourseDetailResponse {
  course: CourseSummary;
  lessons: {
    items: LessonItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
  assignments: AssignmentItem[];
}

export interface AssignmentSubmissionsResponse {
  assignment: {
    id: string;
    title: string;
    maxPoints: number;
  };
  items: SubmissionItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AssignmentListResponse {
  items: AssignmentItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface MyCoursesResponse {
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  items: Array<
    CourseSummary & {
      lessons: LessonItem[];
      assignments: Array<AssignmentItem & { mySubmission: SubmissionItem | null }>;
      assessments: CourseAssessmentItem[];
      completedLessonIds: string[];
      submittedAssessmentIds?: string[];
    }
  >;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface SignedUploadResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

export interface UploadedAssetPayload {
  publicId: string;
  secureUrl: string;
  originalName: string;
  bytes?: number;
  format?: string;
  mimeType?: string;
  resourceType: FileAssetResourceType;
}

export function listCoursesApi(
  accessToken: string,
  params: {
    classId?: string;
    academicYearId?: string;
    teacherUserId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.classId) {
    query.set('classId', params.classId);
  }
  if (params.academicYearId) {
    query.set('academicYearId', params.academicYearId);
  }
  if (params.teacherUserId) {
    query.set('teacherUserId', params.teacherUserId);
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<CourseListResponse>(`/courses${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

export function getCourseDetailApi(
  accessToken: string,
  courseId: string,
  params: {
    lessonsPage?: number;
    lessonsPageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.lessonsPage) {
    query.set('lessonsPage', String(params.lessonsPage));
  }
  if (params.lessonsPageSize) {
    query.set('lessonsPageSize', String(params.lessonsPageSize));
  }

  return apiRequest<CourseDetailResponse>(
    `/courses/${courseId}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function listCourseTeacherOptionsApi(
  accessToken: string,
  params: {
    q?: string;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.q?.trim()) {
    query.set('q', params.q.trim());
  }

  return apiRequest<CourseTeacherOption[]>(
    `/courses/teacher-options${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function listCourseSubjectOptionsApi(
  accessToken: string,
  params: {
    q?: string;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.q?.trim()) {
    query.set('q', params.q.trim());
  }

  return apiRequest<CourseSubjectOption[]>(
    `/courses/subject-options${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function createCourseApi(
  accessToken: string,
  payload: {
    academicYearId: string;
    classRoomId: string;
    subjectId?: string;
    teacherUserId?: string;
    title: string;
    description?: string;
  },
) {
  return apiRequest<CourseSummary>('/courses', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateCourseApi(
  accessToken: string,
  courseId: string,
  payload: {
    academicYearId?: string;
    classRoomId?: string;
    subjectId?: string | null;
    title?: string;
    description?: string | null;
  },
) {
  return apiRequest<CourseSummary>(`/courses/${courseId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteCourseApi(
  accessToken: string,
  courseId: string,
) {
  return apiRequest<{ id: string; deleted: boolean }>(`/courses/${courseId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function assignCourseTeacherApi(
  accessToken: string,
  courseId: string,
  payload: {
    teacherUserId: string;
  },
) {
  return apiRequest<CourseSummary>(`/courses/${courseId}/teacher`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function assignTeacherBySubjectApi(
  accessToken: string,
  payload: {
    teacherUserId: string;
    academicYearId: string;
    classRoomId: string;
    subjectId: string;
  },
) {
  return apiRequest<CourseSummary>('/courses/assign-by-subject', {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function createLessonApi(
  accessToken: string,
  courseId: string,
  payload: {
    title: string;
    summary?: string;
    contentType: LessonContentType;
    body?: string;
    externalUrl?: string;
    sequence?: number;
    asset?: UploadedAssetPayload;
  },
) {
  return apiRequest<LessonItem>(`/courses/${courseId}/lessons`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateLessonApi(
  accessToken: string,
  lessonId: string,
  payload: {
    title?: string;
    summary?: string | null;
    contentType?: LessonContentType;
    body?: string | null;
    externalUrl?: string | null;
    sequence?: number;
    asset?: UploadedAssetPayload;
    removeAsset?: boolean;
  },
) {
  return apiRequest<LessonItem>(`/lessons/${lessonId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteLessonApi(
  accessToken: string,
  lessonId: string,
) {
  return apiRequest<{ id: string; deleted: boolean }>(`/lessons/${lessonId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function publishLessonApi(
  accessToken: string,
  lessonId: string,
  isPublished: boolean,
) {
  return apiRequest<LessonItem>(`/lessons/${lessonId}/publish`, {
    method: 'PATCH',
    accessToken,
    body: {
      isPublished,
    },
  });
}

export function createAssignmentApi(
  accessToken: string,
  payload: {
    courseId: string;
    lessonId?: string;
    title: string;
    instructions: string;
    dueAt?: string;
    maxPoints: number;
    isPublished?: boolean;
    asset?: UploadedAssetPayload;
  },
) {
  return apiRequest<AssignmentItem>('/assignments', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listAssignmentsApi(
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
  if (params.courseId) {
    query.set('courseId', params.courseId);
  }
  if (params.classId) {
    query.set('classId', params.classId);
  }
  if (params.academicYearId) {
    query.set('academicYearId', params.academicYearId);
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

  return apiRequest<AssignmentListResponse>(
    `/assignments${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function listAssignmentSubmissionsApi(
  accessToken: string,
  assignmentId: string,
  params: {
    page?: number;
    pageSize?: number;
    status?: SubmissionStatus;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.status) {
    query.set('status', params.status);
  }

  return apiRequest<AssignmentSubmissionsResponse>(
    `/assignments/${assignmentId}/submissions${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function submitAssignmentApi(
  accessToken: string,
  assignmentId: string,
  payload: {
    textAnswer?: string;
    linkUrl?: string;
    asset?: UploadedAssetPayload;
  },
) {
  return apiRequest<SubmissionItem>(`/assignments/${assignmentId}/submissions`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function gradeSubmissionApi(
  accessToken: string,
  submissionId: string,
  payload: {
    gradePoints: number;
    feedback?: string;
  },
) {
  return apiRequest<SubmissionItem>(`/submissions/${submissionId}/grade`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function listMyCoursesApi(
  accessToken: string,
  params: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<MyCoursesResponse>(
    `/students/me/courses${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function markLessonCompleteApi(
  accessToken: string,
  lessonId: string,
) {
  return apiRequest<{ isCompleted: boolean; completedAt: string }>(
    `/lessons/${lessonId}/mark-complete`,
    {
      method: 'POST',
      accessToken,
      body: {},
    },
  );
}

export function recordLessonActivityApi(
  accessToken: string,
  lessonId: string,
  secondsDelta: number,
) {
  return apiRequest<{
    lessonId: string;
    timeSpentSeconds: number;
    lastActivityAt: string;
  }>(`/lessons/${lessonId}/activity`, {
    method: 'POST',
    accessToken,
    body: { secondsDelta },
  });
}

export type TeacherLearningInsightRow = {
  courseId: string;
  courseTitle: string;
  enrolledStudents: number;
  publishedLessons: number;
  avgCompletionPercent: number | null;
  atRiskCount: number;
  avgQuizScorePercent: number | null;
};

export function listTeacherLearningInsightsApi(accessToken: string) {
  return apiRequest<{ items: TeacherLearningInsightRow[] }>('/teacher/learning-insights', {
    method: 'GET',
    accessToken,
  });
}

export function signUploadApi(
  accessToken: string,
  payload: {
    purpose: 'lesson' | 'assignment' | 'submission' | 'logo';
    fileName: string;
  },
) {
  return apiRequest<SignedUploadResponse>('/files/sign-upload', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export interface AcademyProgram {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  price: number;
  durationDays: number;
  isActive: boolean;
  listedInPublicCatalog: boolean;
  courseId: string | null;
  createdAt: string;
  updatedAt: string;
  linkedCourse: { id: string; title: string } | null;
}

export function listAcademyProgramsApi(accessToken: string) {
  return apiRequest<AcademyProgram[]>('/academy-programs', {
    method: 'GET',
    accessToken,
  });
}

export function createAcademyProgramApi(
  accessToken: string,
  payload: {
    title: string;
    description?: string;
    thumbnail?: string;
    price: number;
    durationDays?: number;
    isActive?: boolean;
    listedInPublicCatalog?: boolean;
    courseId?: string | null;
  },
) {
  return apiRequest<AcademyProgram>('/academy-programs', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateAcademyProgramApi(
  accessToken: string,
  programId: string,
  payload: {
    title?: string;
    description?: string | null;
    thumbnail?: string | null;
    price?: number;
    durationDays?: number;
    isActive?: boolean;
    listedInPublicCatalog?: boolean;
    courseId?: string | null;
  },
) {
  return apiRequest<AcademyProgram>(`/academy-programs/${programId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}
