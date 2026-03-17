import { apiRequest } from '../../api/client';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  tenant: {
    id: string;
    name: string;
    code: string;
  } | null;
  roles: string[];
}

interface ListUsersResponse {
  items: UserListItem[];
}

export async function listUsersApi(accessToken: string): Promise<ListUsersResponse> {
  return apiRequest<ListUsersResponse>('/users', {
    method: 'GET',
    accessToken,
  });
}

