import { apiRequest } from '../../api/client';

export interface AuditLogItem {
  id: string;
  event: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  ipAddress: string | null;
  actor: {
    id: string;
    email: string;
    name: string;
  } | null;
  tenant: {
    id: string;
    code: string;
    name: string;
  };
  payload: unknown;
}

export interface ListAuditLogsResponse {
  items: AuditLogItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function listAuditLogsApi(
  accessToken: string,
  params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    event?: string;
    tenantId?: string;
    actorUserId?: string;
    from?: string;
    to?: string;
  },
): Promise<ListAuditLogsResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.search) q.set('search', params.search);
  if (params?.event) q.set('event', params.event);
  if (params?.tenantId) q.set('tenantId', params.tenantId);
  if (params?.actorUserId) q.set('actorUserId', params.actorUserId);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  return apiRequest<ListAuditLogsResponse>(`/audit-logs${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    accessToken,
  });
}
