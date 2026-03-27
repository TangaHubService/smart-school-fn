import { apiRequest } from '../../api/client';

export interface SystemAnnouncementItem {
  id: string;
  title: string;
  body: string;
  status: string;
  targetType: string;
  targetTenantIds: string[];
  targetRoleNames: string[];
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export async function listSystemAnnouncementsApi(
  accessToken: string,
  params?: { page?: number; pageSize?: number; status?: string },
) {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.status) q.set('status', params.status);
  const qs = q.toString();
  return apiRequest<{
    items: SystemAnnouncementItem[];
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  }>(`/system-announcements${qs ? `?${qs}` : ''}`, { method: 'GET', accessToken });
}

export async function createSystemAnnouncementApi(
  accessToken: string,
  body: {
    title: string;
    body: string;
    targetType: string;
    targetTenantIds?: string[];
    targetRoleNames?: string[];
    status?: string;
    publishedAt?: string | null;
    expiresAt?: string | null;
  },
) {
  return apiRequest(`/system-announcements`, {
    method: 'POST',
    accessToken,
    body,
  });
}

export async function updateSystemAnnouncementApi(
  accessToken: string,
  id: string,
  body: Record<string, unknown>,
) {
  return apiRequest(`/system-announcements/${id}`, {
    method: 'PATCH',
    accessToken,
    body,
  });
}
