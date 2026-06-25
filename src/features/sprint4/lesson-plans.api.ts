import { apiRequest } from '../../api/client';

export type LessonPlanStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface LessonPlan {
  id: string;
  title: string;
  objectives: string | null;
  materials: string | null;
  activities: string | null;
  assessment: string | null;
  feedback: string | null;
  status: LessonPlanStatus;
  weekNumber: number | null;
  durationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; firstName: string; lastName: string; email: string };
  academicYear: { id: string; name: string };
  classRoom: { id: string; code: string; name: string };
  subject: { id: string; code: string; name: string };
}

export interface LessonPlansResponse {
  items: LessonPlan[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export function listLessonPlansApi(
  accessToken: string,
  params?: {
    academicYearId?: string;
    classRoomId?: string;
    subjectId?: string;
    teacherUserId?: string;
    status?: LessonPlanStatus;
    page?: number;
    pageSize?: number;
  }
) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query.set(k, String(v));
    });
  }
  return apiRequest<LessonPlansResponse>(`/lesson-plans?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function createLessonPlanApi(
  accessToken: string,
  payload: {
    title: string;
    academicYearId: string;
    classRoomId: string;
    subjectId: string;
    objectives?: string;
    materials?: string;
    activities?: string;
    assessment?: string;
    weekNumber?: number;
    durationMinutes?: number;
  }
) {
  return apiRequest<LessonPlan>('/lesson-plans', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateLessonPlanApi(
  accessToken: string,
  planId: string,
  payload: {
    title?: string;
    objectives?: string | null;
    materials?: string | null;
    activities?: string | null;
    assessment?: string | null;
    weekNumber?: number | null;
    durationMinutes?: number | null;
    status?: LessonPlanStatus;
  }
) {
  return apiRequest<LessonPlan>(`/lesson-plans/${planId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteLessonPlanApi(accessToken: string, planId: string) {
  return apiRequest<{ deleted: boolean }>(`/lesson-plans/${planId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function addLessonPlanFeedbackApi(
  accessToken: string,
  planId: string,
  payload: { feedback: string }
) {
  return apiRequest<LessonPlan>(`/lesson-plans/${planId}/feedback`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}
