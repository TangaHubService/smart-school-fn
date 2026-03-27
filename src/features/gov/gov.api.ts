import { apiRequest } from '../../api/client';
import {
  ConductIncident,
  ConductIncidentListResponse,
  ConductIncidentStatus,
  ConductSeverity,
} from '../conduct/conduct.api';

export type GovScopeLevel = 'SECTOR' | 'DISTRICT' | 'PROVINCE' | 'COUNTRY';

export interface GovAuditorScope {
  id: string;
  scopeLevel: GovScopeLevel;
  country: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  notes: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GovAuditor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
  scopes: GovAuditorScope[];
}

export interface GovDashboardResponse {
  scope: {
    schoolsInScope: number;
    activeAssignments: number;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    last30Days: number;
  };
  feedback: {
    authoredByMe: number;
    recentDiscussion: Array<{
      id: string;
      body: string;
      createdAt: string;
      authorName: string;
      incidentId: string;
      incidentTitle: string;
      schoolName: string | null;
    }>;
  };
  myScopes: Array<{
    id: string;
    label: string;
    scopeLevel: GovScopeLevel;
    assignedBy: { firstName: string; lastName: string; email: string } | null;
  }>;
}

export interface GovSchoolListResponse {
  items: GovSchoolListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface GovSchoolListItem {
  id: string;
  tenantId: string;
  code: string;
  displayName: string;
  district: string | null;
  sector: string | null;
  province: string | null;
  country: string | null;
  setupCompletedAt: string | null;
  isActive: boolean;
  /** Which active assignment matches this school (auditors only; null for super admin). */
  scopeLabel: string | null;
}

export interface GovSchoolDetailResponse {
  school: GovSchoolListItem;
  summary: {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
  };
  recentIncidents: ConductIncident[];
}

export function createGovAuditorApi(
  accessToken: string,
  payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  },
) {
  return apiRequest<GovAuditor>('/gov/admin/auditors', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateGovAuditorApi(
  accessToken: string,
  auditorUserId: string,
  payload: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
  },
) {
  return apiRequest<GovAuditor>(`/gov/admin/auditors/${auditorUserId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function listGovAuditorsApi(
  accessToken: string,
  params?: { q?: string },
) {
  const query = new URLSearchParams();
  if (params?.q?.trim()) {
    query.set('q', params.q.trim());
  }

  return apiRequest<{ items: GovAuditor[] }>(
    `/gov/admin/auditors${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function listGovAuditorScopesApi(accessToken: string, auditorUserId: string) {
  return apiRequest<{ items: GovAuditorScope[] }>(
    `/gov/admin/auditors/${auditorUserId}/scopes`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function assignGovAuditorScopeApi(
  accessToken: string,
  auditorUserId: string,
  payload: {
    scopeLevel: GovScopeLevel;
    country?: string;
    province?: string;
    district?: string;
    sector?: string;
    notes?: string;
    startsAt?: string;
    endsAt?: string;
  },
) {
  return apiRequest<GovAuditorScope>(`/gov/admin/auditors/${auditorUserId}/scopes`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateGovScopeApi(
  accessToken: string,
  scopeId: string,
  payload: {
    notes?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive?: boolean;
  },
) {
  return apiRequest<GovAuditorScope>(`/gov/admin/scopes/${scopeId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function getGovDashboardApi(accessToken: string) {
  return apiRequest<GovDashboardResponse>('/gov/dashboard', {
    method: 'GET',
    accessToken,
  });
}

export function listGovSchoolsApi(
  accessToken: string,
  params?: {
    q?: string;
    province?: string;
    district?: string;
    sector?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.q?.trim()) {
    query.set('q', params.q.trim());
  }
  if (params?.province?.trim()) {
    query.set('province', params.province.trim());
  }
  if (params?.district?.trim()) {
    query.set('district', params.district.trim());
  }
  if (params?.sector?.trim()) {
    query.set('sector', params.sector.trim());
  }
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<GovSchoolListResponse>(
    `/gov/schools${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function getGovSchoolDetailApi(accessToken: string, tenantId: string) {
  return apiRequest<GovSchoolDetailResponse>(`/gov/schools/${tenantId}`, {
    method: 'GET',
    accessToken,
  });
}

export function listGovIncidentsApi(
  accessToken: string,
  params?: {
    tenantId?: string;
    status?: ConductIncidentStatus;
    severity?: ConductSeverity;
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.tenantId) {
    query.set('tenantId', params.tenantId);
  }
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.severity) {
    query.set('severity', params.severity);
  }
  if (params?.q?.trim()) {
    query.set('q', params.q.trim());
  }
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<ConductIncidentListResponse>(
    `/gov/incidents${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function getGovIncidentDetailApi(accessToken: string, incidentId: string) {
  return apiRequest<ConductIncident>(`/gov/incidents/${incidentId}`, {
    method: 'GET',
    accessToken,
  });
}

export function addGovIncidentFeedbackApi(
  accessToken: string,
  incidentId: string,
  payload: { body: string },
) {
  return apiRequest<ConductIncident>(`/gov/incidents/${incidentId}/feedback`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export interface GovSchoolCourseItem {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  updatedAt: string;
  academicYear: { id: string; name: string };
  classRoom: { id: string; code: string; name: string };
  subject: { id: string; code: string; name: string } | null;
  teacher: { id: string; firstName: string; lastName: string };
}

export interface GovSchoolCoursesResponse {
  items: GovSchoolCourseItem[];
}

export function listGovSchoolCoursesApi(accessToken: string, tenantId: string) {
  return apiRequest<GovSchoolCoursesResponse>(`/gov/schools/${tenantId}/courses`, {
    method: 'GET',
    accessToken,
  });
}

export interface GovConductSummaryResponse {
  range: { from: string; to: string };
  totalIncidents: number;
  byStatus: Array<{ status: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
}

export function getGovSchoolConductSummaryApi(
  accessToken: string,
  tenantId: string,
  params: { from: string; to: string },
) {
  const query = new URLSearchParams();
  query.set('from', params.from);
  query.set('to', params.to);
  return apiRequest<GovConductSummaryResponse>(
    `/gov/schools/${tenantId}/reports/conduct-summary?${query.toString()}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}
