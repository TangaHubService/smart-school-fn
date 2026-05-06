import { apiRequest } from '../../api/client';

export type AuditorLevel = 'NATIONAL' | 'PROVINCE' | 'DISTRICT' | 'SECTOR';

export interface Auditor {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  level: AuditorLevel;
  country: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedAuditors {
  items: Auditor[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface LocationData {
  provinces?: string[];
  districts?: string[];
  sectors?: string[];
}

export interface AssignAuditorRequest {
  level: AuditorLevel;
  province?: string;
  district?: string;
  sector?: string;
  notes?: string;
}

export interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function getLocationsApi(params?: {
  province?: string;
  district?: string;
}): Promise<LocationData> {
  const query = new URLSearchParams();
  if (params?.province) query.set('province', params.province);
  if (params?.district) query.set('district', params.district);

  return apiRequest(`/admin/auditors/locations?${query}`);
}

export async function searchUsersApi(query: string): Promise<UserSearchResult[]> {
  return apiRequest(`/admin/auditors/users/search?q=${encodeURIComponent(query)}`);
}

export async function listAuditorsApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  level?: AuditorLevel;
}): Promise<PaginatedAuditors> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.search) query.set('search', params.search);
  if (params?.level) query.set('level', params.level);

  return apiRequest(`/admin/auditors?${query}`);
}

export async function getAuditorByIdApi(auditorId: string): Promise<Auditor> {
  return apiRequest(`/admin/auditors/${auditorId}`);
}

export async function assignAuditorApi(
  userId: string,
  data: AssignAuditorRequest
): Promise<Auditor> {
  return apiRequest(`/admin/auditors/${userId}/assign`, {
    method: 'POST',
    body: data,
  });
}

export async function removeAuditorScopeApi(auditorId: string): Promise<{ message: string }> {
  return apiRequest(`/admin/auditors/${auditorId}/scope`, {
    method: 'DELETE',
  });
}

export interface CreateAuditorUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  level: AuditorLevel;
  province?: string;
  district?: string;
  sector?: string;
  notes?: string;
}

export interface CreatedAuditorUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function createAuditorUserApi(
  input: CreateAuditorUserInput
): Promise<CreatedAuditorUser> {
  return apiRequest('/admin/auditors/create', {
    method: 'POST',
    body: input,
  });
}
