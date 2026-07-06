import { apiRequest } from '../../api/client';
import type { UploadedAssetPayload } from '../sprint4/lms.api';

export type AnnouncementAudience =
  | 'ALL'
  | 'CLASS_ROOM'
  | 'GRADE_LEVEL'
  | 'SUBJECT'
  | 'SPECIFIC_ROLES'
  | 'INDIVIDUAL_USERS';

export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface AnnouncementAttachment {
  id: string;
  originalName: string;
  mimeType: string | null;
  bytes: number | null;
  // null for PDFs — fetch via the protected file stream endpoint instead.
  secureUrl: string | null;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  targetClassRoomIds: string[];
  targetGradeLevelIds: string[];
  targetSubjectIds: string[];
  targetRoleNames: string[];
  targetUserIds: string[];
  emailNotify: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  attachments: AnnouncementAttachment[];
  isRead?: boolean;
  readAt?: string | null;
}

export interface AnnouncementListResponse {
  items: AnnouncementItem[];
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
  }
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
    { method: 'GET', accessToken }
  );
}

export function listMyAnnouncementsApi(
  accessToken: string,
  params?: { unreadOnly?: boolean; page?: number; pageSize?: number }
) {
  const query = new URLSearchParams();
  if (params?.unreadOnly) query.set('unreadOnly', 'true');
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<AnnouncementListResponse>(
    `/announcements/me${query.toString() ? `?${query.toString()}` : ''}`,
    { method: 'GET', accessToken }
  );
}

export function markAnnouncementReadApi(accessToken: string, id: string) {
  return apiRequest<{ read: boolean }>(`/announcements/${id}/read`, {
    method: 'POST',
    accessToken,
  });
}

export function getAnnouncementApi(accessToken: string, id: string) {
  return apiRequest<AnnouncementItem>(`/announcements/${id}`, {
    method: 'GET',
    accessToken,
  });
}

export interface AnnouncementWritePayload {
  title: string;
  body: string;
  audience?: AnnouncementAudience;
  priority?: AnnouncementPriority;
  targetClassRoomIds?: string[];
  targetGradeLevelIds?: string[];
  targetSubjectIds?: string[];
  targetRoleNames?: string[];
  targetUserIds?: string[];
  attachments?: UploadedAssetPayload[];
  emailNotify?: boolean;
  publishedAt?: string;
  expiresAt?: string;
}

export function createAnnouncementApi(accessToken: string, payload: AnnouncementWritePayload) {
  return apiRequest<AnnouncementItem>('/announcements', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export interface AnnouncementUpdatePayload
  extends Omit<Partial<AnnouncementWritePayload>, 'publishedAt' | 'expiresAt'> {
  publishedAt?: string | null;
  expiresAt?: string | null;
}

export function updateAnnouncementApi(
  accessToken: string,
  id: string,
  payload: AnnouncementUpdatePayload
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
