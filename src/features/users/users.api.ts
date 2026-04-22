import { apiRequest } from '../../api/client';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  tenant: {
    id: string;
    name: string;
    code: string;
  } | null;
  roles: string[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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
  pagination: PaginationMeta;
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
  },
): Promise<ListUsersResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role && params.role !== 'ALL') query.set('role', params.role);
  if (params?.tenantId && params.tenantId !== 'ALL') query.set('tenantId', params.tenantId);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const queryString = query.toString();
  const path = queryString ? `/users?${queryString}` : '/users';

  return apiRequest<ListUsersResponse>(path, {
    method: 'GET',
    accessToken,
  });
}

export async function fetchAllUsers(
  accessToken: string,
  params?: {
    search?: string;
    role?: string;
    tenantId?: string;
    status?: 'active' | 'inactive' | 'all';
  },
): Promise<UserListItem[]> {
  const allUsers: UserListItem[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await listUsersApi(accessToken, {
      ...params,
      page,
      pageSize,
    });
    allUsers.push(...response.items);
    hasMore = response.pagination.page < response.pagination.totalPages;
    page++;
  }

  return allUsers;
}

export async function exportUsersApi(
  accessToken: string,
  params?: {
    search?: string;
    role?: string;
    tenantId?: string;
    status?: 'active' | 'inactive' | 'all';
  },
): Promise<{ fileName: string; rowCount: number; csv: string }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role && params.role !== 'ALL') query.set('role', params.role);
  if (params?.tenantId && params.tenantId !== 'ALL') query.set('tenantId', params.tenantId);
  if (params?.status && params.status !== 'all') query.set('status', params.status);

  const queryString = query.toString();
  const path = queryString ? `/users/export?${queryString}` : '/users/export';

  return apiRequest<{ fileName: string; rowCount: number; csv: string }>(path, {
    method: 'GET',
    accessToken,
  });
}

