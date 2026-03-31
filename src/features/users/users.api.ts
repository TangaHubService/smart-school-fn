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
}

export async function listUsersApi(
  accessToken: string,
  params?: {
    search?: string;
    role?: string;
    tenantId?: string;
    status?: 'active' | 'inactive' | 'all';
  },
): Promise<ListUsersResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role && params.role !== 'ALL') query.set('role', params.role);
  if (params?.tenantId && params.tenantId !== 'ALL') query.set('tenantId', params.tenantId);
  if (params?.status && params.status !== 'all') query.set('status', params.status);

  const queryString = query.toString();
  const path = queryString ? `/users?${queryString}` : '/users';

  return apiRequest<ListUsersResponse>(path, {
    method: 'GET',
    accessToken,
  });
}

