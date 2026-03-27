import { apiRequest } from '../../api/client';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    code: string;
  } | null;
  roles: string[];
}

export interface ListUsersResponse {
  items: UserListItem[];
  metrics: {
    total: number;
    superAdmins: number;
    schoolAdmins: number;
    teachers: number;
    students: number;
    parents: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function listUsersApi(
  accessToken: string,
  params?: {
    search?: string;
    role?: string;
    tenantId?: string;
    status?: 'active' | 'inactive' | 'all';
    page?: number;
    pageSize?: number;
    createdFrom?: string;
    createdTo?: string;
  },
): Promise<ListUsersResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role && params.role !== 'ALL') query.set('role', params.role);
  if (params?.tenantId && params.tenantId !== 'ALL') query.set('tenantId', params.tenantId);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.createdFrom) query.set('createdFrom', params.createdFrom);
  if (params?.createdTo) query.set('createdTo', params.createdTo);

  const queryString = query.toString();
  const path = queryString ? `/users?${queryString}` : '/users';

  return apiRequest<ListUsersResponse>(path, {
    method: 'GET',
    accessToken,
  });
}

export async function getUserApi(accessToken: string, userId: string) {
  return apiRequest<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
    tenant: { id: string; name: string; code: string } | null;
    roles: string[];
  }>(`/users/${userId}`, {
    method: 'GET',
    accessToken,
  });
}

export async function updateUserStatusApi(
  accessToken: string,
  userId: string,
  body: { status: 'ACTIVE' | 'INACTIVE' },
) {
  return apiRequest(`/users/${userId}/status`, {
    method: 'PATCH',
    accessToken,
    body,
  });
}
