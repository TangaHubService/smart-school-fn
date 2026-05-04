import { apiRequest } from '../../api/client';

interface ActivityLog {
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
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  const queryString = new URLSearchParams(query).toString();
  const path = queryString ? `/activity-logs?${queryString}` : '/activity-logs';

  return apiRequest(path);
}