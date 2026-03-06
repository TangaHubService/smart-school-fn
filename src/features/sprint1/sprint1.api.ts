import { apiRequest } from '../../api/client';

export interface CreateTenantPayload {
  code: string;
  name: string;
  domain?: string;
  school: {
    displayName: string;
    registrationNumber?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    district?: string;
    country?: string;
    timezone?: string;
  };
  schoolAdmin: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  };
}

export interface TenantListItem {
  id: string;
  code: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  createdAt: string;
  activeUsers: number;
  school: {
    id: string;
    displayName: string;
    city: string | null;
    district: string | null;
    country: string | null;
    setupCompletedAt: string | null;
  } | null;
}

export interface CompleteSetupPayload {
  school?: {
    displayName: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    district?: string;
    country?: string;
    timezone?: string;
  };
  academicYear?: {
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    terms: Array<{
      name: string;
      sequence: number;
      startDate: string;
      endDate: string;
    }>;
  };
  gradeLevels?: Array<{
    code: string;
    name: string;
    rank: number;
    classes: Array<{
      code: string;
      name: string;
      capacity?: number;
    }>;
  }>;
  subjects?: Array<{
    code: string;
    name: string;
    description?: string;
    isCore?: boolean;
  }>;
  markSetupComplete?: boolean;
}

export function createTenantApi(accessToken: string, payload: CreateTenantPayload) {
  return apiRequest('/tenants', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listTenantsApi(
  accessToken: string,
  params?: { page?: number; pageSize?: number; search?: string },
) {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set('page', String(params.page));
  }

  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }

  return apiRequest<TenantListItem[]>(`/tenants${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

export function setupSchoolApi(accessToken: string, payload: CompleteSetupPayload) {
  return apiRequest('/schools/setup', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function schoolSetupStatusApi(accessToken: string) {
  return apiRequest('/schools/setup-status', {
    method: 'GET',
    accessToken,
  });
}

export function inviteStaffApi(
  accessToken: string,
  payload: { email: string; roleName: string; expiresInDays?: number },
) {
  return apiRequest('/staff/invite', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listInvitesApi(accessToken: string) {
  return apiRequest('/staff/invites', {
    method: 'GET',
    accessToken,
  });
}

export function acceptInviteApi(payload: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}) {
  return apiRequest('/staff/accept-invite', {
    method: 'POST',
    body: payload,
  });
}

export function listAcademicYearsApi(accessToken: string) {
  return apiRequest('/academic-years', {
    method: 'GET',
    accessToken,
  });
}

export function createAcademicYearApi(
  accessToken: string,
  payload: { name: string; startDate: string; endDate: string; isCurrent?: boolean },
) {
  return apiRequest('/academic-years', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function deleteAcademicYearApi(accessToken: string, id: string) {
  return apiRequest(`/academic-years/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function updateAcademicYearApi(
  accessToken: string,
  id: string,
  payload: { name?: string; startDate?: string; endDate?: string; isCurrent?: boolean; isActive?: boolean },
) {
  return apiRequest(`/academic-years/${id}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function listTermsApi(accessToken: string) {
  return apiRequest('/terms', {
    method: 'GET',
    accessToken,
  });
}

export function createTermApi(
  accessToken: string,
  payload: {
    academicYearId: string;
    name: string;
    sequence: number;
    startDate: string;
    endDate: string;
  },
) {
  return apiRequest('/terms', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function deleteTermApi(accessToken: string, id: string) {
  return apiRequest(`/terms/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function updateTermApi(
  accessToken: string,
  id: string,
  payload: {
    name?: string;
    sequence?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  },
) {
  return apiRequest(`/terms/${id}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function listGradeLevelsApi(accessToken: string) {
  return apiRequest('/grade-levels', {
    method: 'GET',
    accessToken,
  });
}

export function createGradeLevelApi(
  accessToken: string,
  payload: { code: string; name: string; rank: number },
) {
  return apiRequest('/grade-levels', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function deleteGradeLevelApi(accessToken: string, id: string) {
  return apiRequest(`/grade-levels/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function updateGradeLevelApi(
  accessToken: string,
  id: string,
  payload: { code?: string; name?: string; rank?: number; isActive?: boolean },
) {
  return apiRequest(`/grade-levels/${id}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function listClassRoomsApi(accessToken: string) {
  return apiRequest('/classes', {
    method: 'GET',
    accessToken,
  });
}

export function createClassRoomApi(
  accessToken: string,
  payload: { gradeLevelId: string; code: string; name: string; capacity?: number },
) {
  return apiRequest('/classes', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function deleteClassRoomApi(accessToken: string, id: string) {
  return apiRequest(`/classes/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function updateClassRoomApi(
  accessToken: string,
  id: string,
  payload: { gradeLevelId?: string; code?: string; name?: string; capacity?: number; isActive?: boolean },
) {
  return apiRequest(`/classes/${id}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function listSubjectsApi(accessToken: string) {
  return apiRequest('/subjects', {
    method: 'GET',
    accessToken,
  });
}

export function createSubjectApi(
  accessToken: string,
  payload: { code: string; name: string; description?: string; isCore?: boolean },
) {
  return apiRequest('/subjects', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function deleteSubjectApi(accessToken: string, id: string) {
  return apiRequest(`/subjects/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function updateSubjectApi(
  accessToken: string,
  id: string,
  payload: { code?: string; name?: string; description?: string; isCore?: boolean; isActive?: boolean },
) {
  return apiRequest(`/subjects/${id}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function revokeInviteApi(accessToken: string, id: string) {
  return apiRequest(`/staff/invites/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}
