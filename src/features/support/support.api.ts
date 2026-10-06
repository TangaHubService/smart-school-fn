import { apiRequest } from '../../api/client';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface TicketAttachmentInput {
  fileAssetId?: string;
  fileUrl?: string;
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  email?: string | null;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    id: string;
    originalName: string;
    fileUrl?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
  }>;
  replies: Array<{
    id: string;
    body: string;
    isStaffReply: boolean;
    authorName?: string | null;
    createdAt: string;
    attachments: Array<{ id: string; originalName: string; fileUrl?: string | null }>;
  }>;
}

export const ALLOWED_TICKET_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
];
export const MAX_TICKET_FILE_BYTES = 10 * 1024 * 1024;

export function validateTicketFiles(files: File[]): string | null {
  if (files.length > 5) return 'Maximum 5 attachments allowed';
  for (const f of files) {
    if (f.size > MAX_TICKET_FILE_BYTES) return `${f.name} exceeds 10MB`;
    if (f.type && !ALLOWED_TICKET_TYPES.includes(f.type)) {
      return `${f.name}: unsupported file type`;
    }
  }
  return null;
}

/**
 * Upload ticket files to Cloudinary (purpose 'support') and map to the
 * attachment input the ticket API expects. Falls back to metadata-only
 * entries when upload fails so the ticket still records the reference.
 */
export async function uploadTicketFiles(
  accessToken: string,
  files: File[],
  upload: (
    token: string,
    purpose: 'support',
    file: File
  ) => Promise<{
    secureUrl: string;
    originalName: string;
    mimeType?: string;
    bytes?: number;
  }>
): Promise<TicketAttachmentInput[]> {
  const results: TicketAttachmentInput[] = [];
  for (const f of files) {
    try {
      const asset = await upload(accessToken, 'support', f);
      results.push({
        fileUrl: asset.secureUrl,
        originalName: asset.originalName || f.name,
        mimeType: asset.mimeType || f.type || undefined,
        sizeBytes: asset.bytes ?? f.size,
      });
    } catch {
      results.push({ originalName: f.name, mimeType: f.type || undefined, sizeBytes: f.size });
    }
  }
  return results;
}

export function createPublicTicketApi(body: {
  name?: string;
  email?: string;
  subject: string;
  message: string;
  priority?: TicketPriority;
  attachments?: TicketAttachmentInput[];
}): Promise<SupportTicket> {
  return apiRequest<{ data: SupportTicket }>('/support/tickets/public', {
    method: 'POST',
    body,
    skipAuthRefresh: true,
  }).then((r) => r.data);
}

export function createTicketApi(
  accessToken: string,
  body: {
    subject: string;
    message: string;
    priority?: TicketPriority;
    attachments?: TicketAttachmentInput[];
  }
): Promise<SupportTicket> {
  return apiRequest<{ data: SupportTicket }>('/support/tickets', {
    method: 'POST',
    body,
    accessToken,
  }).then((r) => r.data);
}

export function listTicketsApi(
  accessToken: string,
  params: {
    status?: string;
    priority?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  data: SupportTicket[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiRequest(`/support/tickets${suffix}`, { accessToken });
}

export function getTicketApi(accessToken: string, id: string): Promise<SupportTicket> {
  return apiRequest<{ data: SupportTicket }>(`/support/tickets/${id}`, { accessToken }).then(
    (r) => r.data
  );
}

export function replyTicketApi(
  accessToken: string,
  id: string,
  body: { body: string; attachments?: TicketAttachmentInput[] }
): Promise<unknown> {
  return apiRequest(`/support/tickets/${id}/replies`, { method: 'POST', body, accessToken });
}

export function updateTicketApi(
  accessToken: string,
  id: string,
  body: { status?: TicketStatus; priority?: TicketPriority }
): Promise<SupportTicket> {
  return apiRequest<{ data: SupportTicket }>(`/support/tickets/${id}`, {
    method: 'PATCH',
    body,
    accessToken,
  }).then((r) => r.data);
}
