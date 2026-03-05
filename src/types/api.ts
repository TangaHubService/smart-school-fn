export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details: unknown;
  } | null;
  meta: {
    requestId: string;
    timestamp: string;
    pagination: PaginationMeta | null;
  };
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
