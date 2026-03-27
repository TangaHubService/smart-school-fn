import { apiRequest } from '../../api/client';

export type AnnouncementAudience = 'ALL' | 'CLASS_ROOM' | 'GRADE_LEVEL';

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  targetClassRoomIds?: string[];
  targetGradeLevelIds?: string[];
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface SystemBroadcastItem {
  id: string;
  title: string;
  body: string;
  source: 'system';
  targetType: string;
  publishedAt: string | null;
  expiresAt: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface AnnouncementListResponse {
  items: AnnouncementItem[];
  systemBroadcasts?: SystemBroadcastItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export function listAnnouncementsApi(
  accessToken: string,
  params?: {
    audience?: AnnouncementAudience;
    classRoomId?: string;
    gradeLevelId?: string;
    publishedOnly?: boolean;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.audience) query.set('audience', params.audience);
  if (params?.classRoomId) query.set('classRoomId', params.classRoomId);
  if (params?.gradeLevelId) query.set('gradeLevelId', params.gradeLevelId);
  if (params?.publishedOnly) query.set('publishedOnly', 'true');
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<AnnouncementListResponse>(
    `/announcements${query.toString() ? `?${query.toString()}` : ''}`,
    { method: 'GET', accessToken },
  );
}

export function listMyAnnouncementsApi(
  accessToken: string,
  params?: { page?: number; pageSize?: number },
) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<AnnouncementListResponse>(
    `/announcements/me${query.toString() ? `?${query.toString()}` : ''}`,
    { method: 'GET', accessToken },
  );
}

export function getAnnouncementApi(accessToken: string, id: string) {
  return apiRequest<AnnouncementItem>(`/announcements/${id}`, {
    method: 'GET',
    accessToken,
  });
}

export function createAnnouncementApi(
  accessToken: string,
  payload: {
    title: string;
    body: string;
    audience?: AnnouncementAudience;
    targetClassRoomIds?: string[];
    targetGradeLevelIds?: string[];
    publishedAt?: string;
    expiresAt?: string;
  },
) {
  return apiRequest<AnnouncementItem>('/announcements', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateAnnouncementApi(
  accessToken: string,
  id: string,
  payload: Partial<{
    title: string;
    body: string;
    audience: AnnouncementAudience;
    targetClassRoomIds: string[];
    targetGradeLevelIds: string[];
    publishedAt: string | null;
    expiresAt: string | null;
  }>,
) {
  return apiRequest<AnnouncementItem>(`/announcements/${id}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteAnnouncementApi(accessToken: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`/announcements/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}
