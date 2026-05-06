import { apiRequest } from '../../api/client';
import {
  ConductIncident,
  ConductIncidentListResponse,
  ConductIncidentStatus,
  ConductSeverity,
} from '../conduct/conduct.api';

export type GovScopeLevel = 'SECTOR' | 'DISTRICT' | 'PROVINCE' | 'COUNTRY';
export type AuditorLevel = 'NATIONAL' | 'PROVINCE' | 'DISTRICT' | 'SECTOR';
export type GovAuditType = 'ACADEMIC' | 'FINANCIAL' | 'INFRASTRUCTURE' | 'COMPLIANCE';
export type GovAuditStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
export type GovAuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

interface PaginationData {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface GovAssignedByUser {
  firstName: string;
  lastName: string;
  email: string;
}

export interface GovAuditorScope {
  id: string;
  label: string;
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
  assignedBy: GovAssignedByUser | null;
}

export interface GovAuditor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  level: AuditorLevel;
  country: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  assignmentLabel: string;
  scopes: GovAuditorScope[];
}

export interface GovAuditItem {
  id: string;
  auditType: GovAuditType;
  status: GovAuditStatus;
  plannedDate: string;
  planNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  school: {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    province: string | null;
    district: string | null;
    sector: string | null;
    country: string | null;
    isActive: boolean;
  };
  auditor: {
    id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    level: AuditorLevel;
    country: string;
    province: string | null;
    district: string | null;
    sector: string | null;
    assignmentLabel: string;
  };
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  report: {
    id: string;
    teachingQuality: number;
    infrastructure: number;
    discipline: number;
    comment: string;
    findings: string;
    recommendations: string;
    score: number;
    submittedAt: string;
    submittedBy: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  } | null;
}

export interface GovDashboardResponse {
  audits: {
    totalSchools: number;
    plannedAudits: number;
    completedAudits: number;
    averageScore: number;
    recentAudits: Array<{
      id: string;
      schoolName: string;
      auditType: GovAuditType;
      plannedDate: string;
      status: GovAuditStatus;
      score: number | null;
    }>;
    upcomingAudits: Array<{
      id: string;
      schoolName: string;
      auditType: GovAuditType;
      plannedDate: string;
      status: GovAuditStatus;
    }>;
  };
  scope: {
    schoolsInScope: number;
    activeAssignments: number;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    last30Days?: number;
  };
  feedback: {
    authoredByMe: number;
    recentDiscussion?: Array<{
      id: string;
      body: string;
      createdAt: string;
      authorName: string;
      incidentId: string;
      incidentTitle: string;
      schoolName: string | null;
    }>;
  };
  myScopes?: Array<{
    id: string;
    label: string;
    scopeLevel: GovScopeLevel;
    assignedBy: { firstName: string; lastName: string; email: string } | null;
  }>;
}

export interface GovSchoolListResponse {
  items: GovSchoolListItem[];
  pagination: PaginationData;
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
  scopeLabel?: string | null;
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

export interface GovAuditListResponse {
  items: GovAuditItem[];
  pagination: PaginationData;
}

export interface GovActivityLogItem {
  id: string;
  event: string;
  actionType: GovAuditActionType | null;
  module: string | null;
  description: string | null;
  entity: string | null;
  entityId: string | null;
  recordId: string | null;
  createdAt: string;
  timestamp: string;
  ipAddress: string | null;
  device: string | null;
  status: string | null;
  sessionId: string | null;
  actor: {
    id: string | null;
    email: string | null;
    name: string | null;
    role: string | null;
  } | null;
  schoolName: string | null;
  tenant: {
    id: string;
    code: string;
    name: string;
  };
  oldValue: unknown;
  newValue: unknown;
  payload: unknown;
}

export interface GovActivityLogResponse {
  items: GovActivityLogItem[];
  pagination: PaginationData;
}

export function createGovAuditorApi(
  accessToken: string,
  payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    level: AuditorLevel;
    country?: string;
    province?: string;
    district?: string;
    sector?: string;
  }
) {
  return apiRequest<GovAuditor>('/gov/admin/auditors', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listGovAuditorsApi(accessToken: string, params?: { q?: string }) {
  const query = new URLSearchParams();
  if (params?.q?.trim()) {
    query.set('q', params.q.trim());
  }

  return apiRequest<{ items: GovAuditor[] }>(
    `/gov/admin/auditors${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    }
  );
}

export function listGovAuditorScopesApi(accessToken: string, auditorUserId: string) {
  return apiRequest<{ items: GovAuditorScope[] }>(`/gov/admin/auditors/${auditorUserId}/scopes`, {
    method: 'GET',
    accessToken,
  });
}

export function listGovMyScopesApi(accessToken: string) {
  return apiRequest<{ items: GovAuditorScope[] }>('/gov/me/scopes', {
    method: 'GET',
    accessToken,
  });
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
  }
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
  }
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
  }
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
    }
  );
}

export function getGovSchoolDetailApi(accessToken: string, tenantId: string) {
  return apiRequest<GovSchoolDetailResponse>(`/gov/schools/${tenantId}`, {
    method: 'GET',
    accessToken,
  });
}

export function createGovAuditApi(
  accessToken: string,
  payload: {
    schoolId: string;
    auditorUserId?: string;
    auditType: GovAuditType;
    plannedDate: string;
    planNotes?: string;
  }
) {
  return apiRequest<GovAuditItem>('/gov/audits', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listGovAuditsApi(
  accessToken: string,
  params?: {
    status?: GovAuditStatus;
    auditType?: GovAuditType;
    schoolId?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.auditType) {
    query.set('auditType', params.auditType);
  }
  if (params?.schoolId) {
    query.set('schoolId', params.schoolId);
  }
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<GovAuditListResponse>(
    `/gov/audits${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    }
  );
}

export function getGovAuditApi(accessToken: string, auditId: string) {
  return apiRequest<GovAuditItem>(`/gov/audits/${auditId}`, {
    method: 'GET',
    accessToken,
  });
}

export function submitGovAuditReportApi(
  accessToken: string,
  payload: {
    auditId: string;
    teachingQuality: number;
    infrastructure: number;
    discipline: number;
    comment: string;
    findings: string;
    recommendations: string;
  }
) {
  return apiRequest<GovAuditItem>('/gov/reports', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listGovReportsApi(
  accessToken: string,
  params?: {
    auditType?: GovAuditType;
    schoolId?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const query = new URLSearchParams();
  if (params?.auditType) {
    query.set('auditType', params.auditType);
  }
  if (params?.schoolId) {
    query.set('schoolId', params.schoolId);
  }
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<GovAuditListResponse>(
    `/gov/reports${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    }
  );
}

export function listGovActivityLogsApi(
  accessToken: string,
  params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    actionType?: GovAuditActionType;
    module?: string;
  }
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
  if (params?.actionType) {
    query.set('actionType', params.actionType);
  }
  if (params?.module?.trim()) {
    query.set('module', params.module.trim());
  }

  return apiRequest<GovActivityLogResponse>(
    `/gov/activity-logs${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    }
  );
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
  }
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
    }
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
  payload: { body: string }
) {
  return apiRequest<ConductIncident>(`/gov/incidents/${incidentId}/feedback`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}
