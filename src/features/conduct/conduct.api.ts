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
  termId: string | null;
  term: {
    id: string;
    name: string;
    sequence: number;
  } | null;
  category: string;
  title: string;
  description: string;
  deductionPoints: number;
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
  conductMark: ConductMark | ConductMarkProvisional | null;
  termMarks: ConductMark[];
  incidents: ConductIncident[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ConductMark {
  id: string;
  tenantId: string;
  studentId: string;
  termId: string;
  score: number;
  maxScore: number;
  isLocked: boolean;
  computedFromIncidents: boolean;
  overrideReason: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  term: {
    id: string;
    name: string;
    sequence: number;
    academicYear: {
      id: string;
      name: string;
    };
  };
  updatedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  lockedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface ConductMarkProvisional {
  id: null;
  tenantId: string;
  studentId: string;
  termId: string;
  score: number;
  maxScore: number;
  isLocked: boolean;
  computedFromIncidents: boolean;
  overrideReason: null;
  lockedAt: null;
  createdAt: null;
  updatedAt: null;
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
  };
  term: {
    id: string;
    name: string;
    sequence: number;
    academicYear: {
      id: string;
      name: string;
    };
  } | null;
  updatedBy: null;
  lockedBy: null;
  isProvisional: true;
  deductionPointsTotal?: number;
}

export interface ConductMarkSheetResponse {
  config: {
    method: 'MANUAL' | 'DEDUCT';
    maxScore: number;
  };
  term: {
    id: string;
    name: string;
    sequence: number;
  };
  items: Array<{
    student: {
      id: string;
      studentCode: string;
      firstName: string;
      lastName: string;
    };
    classRoom: {
      id: string;
      code: string;
      name: string;
    };
    academicYear: {
      id: string;
      name: string;
    };
    term: {
      id: string;
      name: string;
      sequence: number;
    };
    deductionPointsTotal: number;
    mark: ConductMark | ConductMarkProvisional;
  }>;
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
    termId?: string;
    classRoomId?: string;
    occurredAt: string;
    category: string;
    title: string;
    description: string;
    deductionPoints?: number;
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
    termId?: string;
    classRoomId?: string;
    classId?: string;
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
  if (params?.termId) {
    query.set('termId', params.termId);
  }
  if (params?.classRoomId) {
    query.set('classRoomId', params.classRoomId);
  }
  if (params?.classId) {
    query.set('classId', params.classId);
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
    termId?: string | null;
    category?: string;
    title?: string;
    description?: string;
    deductionPoints?: number;
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
  params?: { termId?: string; page?: number; pageSize?: number },
) {
  const query = new URLSearchParams();

  if (params?.termId) {
    query.set('termId', params.termId);
  }
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

export function getStudentConductApi(
  accessToken: string,
  studentId: string,
  params?: { termId?: string; page?: number; pageSize?: number },
) {
  const query = new URLSearchParams();

  if (params?.termId) {
    query.set('termId', params.termId);
  }
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<StudentConductProfileResponse>(
    `/students/${studentId}/conduct${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function listConductMarksApi(
  accessToken: string,
  params?: {
    termId?: string;
    classRoomId?: string;
    classId?: string;
    studentId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.termId) query.set('termId', params.termId);
  if (params?.classRoomId) query.set('classRoomId', params.classRoomId);
  if (params?.classId) query.set('classId', params.classId);
  if (params?.studentId) query.set('studentId', params.studentId);
  if (params?.q?.trim()) query.set('q', params.q.trim());
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<ConductMarkSheetResponse>(
    `/conduct/marks${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function updateConductMarkApi(
  accessToken: string,
  studentId: string,
  termId: string,
  payload: {
    score: number;
    maxScore?: number;
    reason?: string;
    manualOverride?: boolean;
  },
) {
  return apiRequest<ConductMark>(`/conduct/marks/${studentId}/${termId}`, {
    method: 'PUT',
    accessToken,
    body: payload,
  });
}

export function recalculateConductMarkApi(
  accessToken: string,
  studentId: string,
  termId: string,
  payload?: {
    maxScore?: number;
    reason?: string;
  },
) {
  return apiRequest<ConductMark>(`/conduct/marks/${studentId}/${termId}/recalculate`, {
    method: 'POST',
    accessToken,
    body: payload ?? {},
  });
}

export function lockConductMarkApi(
  accessToken: string,
  studentId: string,
  termId: string,
  payload?: {
    reason?: string;
  },
) {
  return apiRequest<ConductMark>(`/conduct/marks/${studentId}/${termId}/lock`, {
    method: 'POST',
    accessToken,
    body: payload ?? {},
  });
}
