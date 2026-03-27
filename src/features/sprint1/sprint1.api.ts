import { apiRequest } from '../../api/client';

export interface CreateTenantPayload {
  code: string;
  name: string;
  domain?: string;
  isAcademyCatalog?: boolean;
  school?: {
    displayName: string;
    registrationNumber?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    province?: string;
    city?: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    country?: string;
    timezone?: string;
  };
  schoolAdmin?: {
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
  isAcademyCatalog?: boolean;
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

export interface SchoolDetail {
  id: string;
  code: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  isAcademyCatalog?: boolean;
  createdAt: string;
  updatedAt: string;
  activeUsers: number;
  school: {
    id: string;
    displayName: string;
    registrationNumber: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    province: string | null;
    city: string | null;
    district: string | null;
    sector: string | null;
    cell: string | null;
    village: string | null;
    country: string;
    timezone: string;
    setupCompletedAt: string | null;
  } | null;
  pendingInvites: Array<{
    id: string;
    email: string;
    roleName: string;
    expiresAt: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  }>;
  schoolAdmins?: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  }>;
}

export interface CompleteSetupPayload {
  school?: {
    displayName: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    province?: string;
    city?: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    country?: string;
    timezone?: string;
    logoUrl?: string;
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

export function inviteTenantAdminApi(
  accessToken: string,
  tenantId: string,
  payload: { email: string; expiresInDays?: number },
) {
  return apiRequest(`/tenants/${tenantId}/admin-invite`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function assignSchoolAdminApi(
  accessToken: string,
  tenantId: string,
  payload: { userId: string },
) {
  return apiRequest(`/tenants/${tenantId}/school-admins`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function getTenantDetailApi(accessToken: string, tenantId: string) {
  return apiRequest<SchoolDetail>(`/tenants/${tenantId}`, {
    method: 'GET',
    accessToken,
  });
}

export function updateTenantApi(
  accessToken: string,
  tenantId: string,
  payload: {
    code: string;
    name: string;
    domain?: string | null;
    isAcademyCatalog?: boolean;
    school: {
      displayName: string;
      email?: string | null;
      phone?: string | null;
    };
  },
) {
  return apiRequest(`/tenants/${tenantId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteTenantApi(accessToken: string, tenantId: string) {
  return apiRequest(`/tenants/${tenantId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function updateTenantStatusApi(
  accessToken: string,
  tenantId: string,
  payload: { isActive: boolean },
) {
  return apiRequest(`/tenants/${tenantId}/status`, {
    method: 'PATCH',
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

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export function listStaffMembersApi(
  accessToken: string,
  params: { q?: string; roleName?: string; status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' } = {},
) {
  const query = new URLSearchParams();

  if (params.q?.trim()) {
    query.set('q', params.q.trim());
  }

  if (params.roleName?.trim()) {
    query.set('roleName', params.roleName.trim());
  }

  if (params.status) {
    query.set('status', params.status);
  }

  return apiRequest<StaffMember[]>(`/staff/members${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

export function getStaffMemberApi(accessToken: string, memberId: string) {
  return apiRequest<StaffMember>(`/staff/members/${memberId}`, {
    method: 'GET',
    accessToken,
  });
}

export function updateStaffMemberApi(
  accessToken: string,
  memberId: string,
  payload: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  },
) {
  return apiRequest<StaffMember>(`/staff/members/${memberId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteStaffMemberApi(accessToken: string, memberId: string) {
  return apiRequest<{ deleted: boolean }>(`/staff/members/${memberId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function acceptInviteApi(payload: {
  token: string;
  firstName: string;
  lastName: string;
  phone?: string;
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

export function listTermsApi(
  accessToken: string,
  params?: { academicYearId?: string },
) {
  const query = new URLSearchParams();
  if (params?.academicYearId) {
    query.set('academicYearId', params.academicYearId);
  }
  return apiRequest(
    `/terms${query.toString() ? `?${query.toString()}` : ''}`,
    { method: 'GET', accessToken },
  );
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
