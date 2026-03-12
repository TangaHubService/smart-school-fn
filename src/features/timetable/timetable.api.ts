import { apiRequest } from '../../api/client';

export interface TimetableSlot {
  id: string;
  academicYearId: string;
  termId: string;
  classRoomId: string;
  courseId: string;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  academicYear: { id: string; name: string };
  term: { id: string; name: string; sequence: number };
  classRoom: {
    id: string;
    code: string;
    name: string;
    gradeLevel: { id: string; code: string; name: string };
  };
  course: {
    id: string;
    title: string;
    subject: { id: string; code: string; name: string } | null;
    teacherUser: { id: string; firstName: string; lastName: string };
  };
}

export interface ListTimetableSlotsResponse {
  slots: TimetableSlot[];
}

export function listTimetableSlotsApi(
  accessToken: string,
  params: {
    academicYearId: string;
    termId?: string;
    classRoomId: string;
  },
) {
  const query = new URLSearchParams();
  query.set('academicYearId', params.academicYearId);
  if (params.termId) query.set('termId', params.termId);
  query.set('classRoomId', params.classRoomId);

  return apiRequest<ListTimetableSlotsResponse>(
    `/timetable?${query.toString()}`,
    { method: 'GET', accessToken },
  );
}

export function createTimetableSlotApi(
  accessToken: string,
  payload: {
    academicYearId: string;
    termId: string;
    classRoomId: string;
    courseId: string;
    dayOfWeek: number;
    periodNumber: number;
    startTime: string;
    endTime: string;
  },
) {
  return apiRequest<TimetableSlot>('/timetable', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateTimetableSlotApi(
  accessToken: string,
  slotId: string,
  payload: Partial<{
    academicYearId: string;
    termId: string;
    classRoomId: string;
    courseId: string;
    dayOfWeek: number;
    periodNumber: number;
    startTime: string;
    endTime: string;
  }>,
) {
  return apiRequest<TimetableSlot>(`/timetable/${slotId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteTimetableSlotApi(accessToken: string, slotId: string) {
  return apiRequest<{ deleted: boolean }>(`/timetable/${slotId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function bulkUpsertTimetableSlotsApi(
  accessToken: string,
  payload: {
    academicYearId: string;
    termId: string;
    classRoomId: string;
    slots: Array<{
      courseId: string;
      dayOfWeek: number;
      periodNumber: number;
      startTime: string;
      endTime: string;
    }>;
  },
) {
  return apiRequest<{ created: number; slots: TimetableSlot[] }>('/timetable/bulk', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}
