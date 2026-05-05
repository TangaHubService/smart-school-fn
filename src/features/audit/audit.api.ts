import { apiRequest } from '../../api/client';

interface ActivityLog {
  id: string;
  event: string;
  actionType: string | null;
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
  oldValue: unknown;
  newValue: unknown;
  payload: unknown;
}

interface ListActivityLogsResponse {
    items: ActivityLog[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
}

interface ListActivityLogsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  event?: string;
  actionType?: string;
  module?: string;
  status?: string;
  from?: string;
  to?: string;
}

export async function listActivityLogsApi(
  params: ListActivityLogsParams = {},
): Promise<ListActivityLogsResponse> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.search) query.search = params.search;
  if (params.event) query.event = params.event;
  if (params.actionType) query.actionType = params.actionType;
  if (params.module) query.module = params.module;
  if (params.status) query.status = params.status;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  const queryString = new URLSearchParams(query).toString();
  const path = queryString ? `/activity-logs?${queryString}` : '/activity-logs';

  return apiRequest(path);
}
