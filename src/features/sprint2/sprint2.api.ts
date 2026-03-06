import { apiRequest } from '../../api/client';

export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED';

export interface StudentListResponse {
  items: StudentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface StudentListItem {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  gender: StudentGender | null;
  dateOfBirth: string | null;
  isActive: boolean;
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
  parents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    relationship: string;
    isPrimary: boolean;
  }>;
}

export interface ParentListResponse {
  items: ParentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ParentListItem {
  id: string;
  parentCode: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  hasLogin: boolean;
  linkedStudentsCount: number;
  linkedStudents: Array<{
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    relationship: string;
    isPrimary: boolean;
  }>;
}

export interface MyChildrenResponse {
  parent: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  students: Array<{
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    gender: StudentGender | null;
    dateOfBirth: string | null;
    relationship: string;
    isPrimary: boolean;
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
    attendanceLast30Days: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      lastMarkedDate: string | null;
    };
  }>;
}

export interface MyChildAttendanceHistoryResponse {
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
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
  range: {
    from: string;
    to: string;
  };
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  records: Array<{
    id: string;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    remarks: string | null;
    classRoom: {
      id: string;
      code: string;
      name: string;
    };
    markedAt: string;
    updatedAt: string;
  }>;
}

export interface LinkableStudentOption {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
}

export function createStudentApi(
  accessToken: string,
  payload: {
    studentCode: string;
    firstName: string;
    lastName: string;
    gender?: StudentGender;
    dateOfBirth?: string;
    enrollment: {
      academicYearId: string;
      classRoomId: string;
      enrolledAt?: string;
    };
  },
) {
  return apiRequest('/students', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listStudentsApi(
  accessToken: string,
  params: {
    classId?: string;
    academicYearId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();

  if (params.classId) {
    query.set('classId', params.classId);
  }
  if (params.academicYearId) {
    query.set('academicYearId', params.academicYearId);
  }
  if (params.q?.trim()) {
    query.set('q', params.q.trim());
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<StudentListResponse>(`/students?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function updateStudentApi(
  accessToken: string,
  id: string,
  payload: {
    studentCode?: string;
    firstName?: string;
    lastName?: string;
    gender?: StudentGender | null;
    dateOfBirth?: string | null;
    isActive?: boolean;
    enrollment?: {
      academicYearId: string;
      classRoomId: string;
      enrolledAt?: string;
    };
  },
) {
  return apiRequest(`/students/${id}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function deleteStudentApi(accessToken: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`/students/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function importStudentsApi(
  accessToken: string,
  payload: {
    csv: string;
    mode: 'preview' | 'commit';
    allowPartial?: boolean;
    defaultAcademicYearId?: string;
    defaultClassRoomId?: string;
  },
) {
  return apiRequest<{
    mode: 'preview' | 'commit';
    summary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      importedRows?: number;
      skippedRows?: number;
    };
    rows: Array<{
      rowNumber: number;
      source: Record<string, string>;
      studentCode: string;
      firstName: string;
      lastName: string;
      academicYearId: string | null;
      classRoomId: string | null;
      errors: string[];
    }>;
  }>('/students/import', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function exportStudentsApi(
  accessToken: string,
  params: {
    classId?: string;
    academicYearId?: string;
    q?: string;
  },
) {
  const query = new URLSearchParams();

  if (params.classId) {
    query.set('classId', params.classId);
  }
  if (params.academicYearId) {
    query.set('academicYearId', params.academicYearId);
  }
  if (params.q?.trim()) {
    query.set('q', params.q.trim());
  }

  return apiRequest<{
    fileName: string;
    rowCount: number;
    csv: string;
  }>(`/students/export${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

export function listParentsApi(
  accessToken: string,
  params: {
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();

  if (params.q?.trim()) {
    query.set('q', params.q.trim());
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<ParentListResponse>(`/parents${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}

export function createParentApi(
  accessToken: string,
  payload: {
    parentCode?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    createLogin?: boolean;
    password?: string;
  },
) {
  return apiRequest('/parents', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function updateParentApi(
  accessToken: string,
  parentId: string,
  payload: {
    parentCode?: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
    createLogin?: boolean;
    password?: string;
  },
) {
  return apiRequest(`/parents/${parentId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export function listLinkableStudentsApi(
  accessToken: string,
  params?: {
    q?: string;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();

  if (params?.q?.trim()) {
    query.set('q', params.q.trim());
  }
  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<LinkableStudentOption[]>(
    `/parents/linkable-students${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function linkParentStudentApi(
  accessToken: string,
  parentId: string,
  payload: {
    studentId: string;
    relationship?: 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';
    isPrimary?: boolean;
  },
) {
  return apiRequest(`/parents/${parentId}/link-student`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function listMyChildrenApi(accessToken: string) {
  return apiRequest<MyChildrenResponse>('/parents/me/students', {
    method: 'GET',
    accessToken,
  });
}

export function listMyChildAttendanceApi(
  accessToken: string,
  studentId: string,
  params?: {
    from?: string;
    to?: string;
  },
) {
  const query = new URLSearchParams();

  if (params?.from) {
    query.set('from', params.from);
  }
  if (params?.to) {
    query.set('to', params.to);
  }

  return apiRequest<MyChildAttendanceHistoryResponse>(
    `/parents/me/students/${studentId}/attendance${query.toString() ? `?${query.toString()}` : ''}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}
