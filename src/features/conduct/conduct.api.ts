import { apiRequest } from '../../api/client';

export type ConductSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type ConductIncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
export type ConductActionType =
  | 'WARNING'
  | 'COUNSELING'
  | 'PARENT_MEETING'
  | 'COMMUNITY_SERVICE'
  | 'DETENTION'
  | 'SUSPENSION'
  | 'OTHER';
export type ConductFeedbackAuthorType = 'SCHOOL_STAFF' | 'GOV_AUDITOR';

export interface ConductIncident {
  id: string;
  tenantId: string;
  occurredAt: string;
  category: string;
  title: string;
  description: string;
  severity: ConductSeverity;
  status: ConductIncidentStatus;
  location: string | null;
  reporterNotes: string | null;
  resolutionSummary: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  school: {
    id: string;
    tenantId: string;
    code: string;
    displayName: string;
    province: string | null;
    district: string | null;
    sector: string | null;
    country: string | null;
  } | null;
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    gender: string | null;
    dateOfBirth: string | null;
    currentEnrollment: {
      id: string;
      enrolledAt: string;
      academicYear: {
        id: string;
        name: string;
      };
      classRoom: {
        id: string;
        code: string;
        name: string;
      };
    } | null;
  };
  classRoom: {
    id: string;
    code: string;
    name: string;
  } | null;
  reportedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  resolvedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  actions: Array<{
    id: string;
    type: ConductActionType;
    title: string;
    description: string | null;
    actionDate: string;
    dueDate: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  feedback: Array<{
    id: string;
    authorType: ConductFeedbackAuthorType;
    body: string;
    createdAt: string;
    updatedAt: string;
    author: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

export interface ConductIncidentListResponse {
  items: ConductIncident[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface StudentConductProfileResponse {
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    gender: string | null;
    dateOfBirth: string | null;
    currentEnrollment: {
      id: string;
      enrolledAt: string;
      academicYear: {
        id: string;
        name: string;
      };
      classRoom: {
        id: string;
        code: string;
        name: string;
      };
    } | null;
  };
  summary: {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
    actionItems: number;
  };
  incidents: ConductIncident[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export function createConductIncidentApi(
  accessToken: string,
  payload: {
    studentId: string;
    classRoomId?: string;
    occurredAt: string;
    category: string;
    title: string;
    description: string;
    severity?: ConductSeverity;
    location?: string;
    reporterNotes?: string;
  },
) {
  return apiRequest<ConductIncident>('/conduct/incidents', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listConductIncidentsApi(
  accessToken: string,
  params?: {
    studentId?: string;
    classRoomId?: string;
    status?: ConductIncidentStatus;
    severity?: ConductSeverity;
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();

  if (params?.studentId) {
    query.set('studentId', params.studentId);
  }
  if (params?.classRoomId) {
    query.set('classRoomId', params.classRoomId);
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
    `/conduct/incidents${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function getConductIncidentApi(accessToken: string, incidentId: string) {
  return apiRequest<ConductIncident>(`/conduct/incidents/${incidentId}`, {
    method: 'GET',
    accessToken,
  });
}

export function updateConductIncidentApi(
  accessToken: string,
  incidentId: string,
  payload: {
    category?: string;
    title?: string;
    description?: string;
    severity?: ConductSeverity;
    status?: Exclude<ConductIncidentStatus, 'RESOLVED'>;
    occurredAt?: string;
    location?: string | null;
    reporterNotes?: string | null;
  },
) {
  return apiRequest<ConductIncident>(`/conduct/incidents/${incidentId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function addConductActionApi(
  accessToken: string,
  incidentId: string,
  payload: {
    type: ConductActionType;
    title: string;
    description?: string;
    actionDate: string;
    dueDate?: string;
    completedAt?: string;
  },
) {
  return apiRequest<ConductIncident>(`/conduct/incidents/${incidentId}/actions`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function resolveConductIncidentApi(
  accessToken: string,
  incidentId: string,
  payload: {
    resolutionSummary: string;
  },
) {
  return apiRequest<ConductIncident>(`/conduct/incidents/${incidentId}/resolve`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function getStudentConductProfileApi(
  accessToken: string,
  studentId: string,
  params?: { page?: number; pageSize?: number },
) {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<StudentConductProfileResponse>(
    `/conduct/students/${studentId}/profile${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}
