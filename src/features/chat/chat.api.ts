import { apiRequest } from '../../api/client';
import type { UploadedAssetPayload } from '../sprint4/lms.api';

export interface ChatRosterMember {
  id: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER';
}

export interface ChatRoom {
  id: string;
  classRoom: { id: string; code: string; name: string };
  academicYear: { id: string; name: string };
  title: string;
  createdAt: string;
  roster: ChatRosterMember[];
  permissions: {
    canSend: boolean;
    canModerate: boolean;
    canPin: boolean;
  };
}

export interface ChatAttachment {
  id: string;
  originalName: string;
  mimeType: string | null;
  bytes: number | null;
  resourceType: string;
  secureUrl: string | null;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ChatMessage {
  id: string;
  content: string | null;
  isDeleted: boolean;
  deletedByUserId: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  pinnedByUserId: string | null;
  isAnnouncement: boolean;
  mentionedUserIds: string[];
  sender: { id: string; firstName: string; lastName: string };
  createdAt: string;
  attachment: ChatAttachment | null;
  reactions: ChatReaction[];
  replyTo: { id: string; content: string | null; sender: { id: string; firstName: string; lastName: string } } | null;
}

export interface ChatMessagesResponse {
  items: ChatMessage[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface ChatReadReceipt {
  user: { id: string; firstName: string; lastName: string };
  lastReadAt: string;
}

export function getOrCreateChatApi(accessToken: string, classRoomId: string, academicYearId?: string) {
  const query = academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : '';
  return apiRequest<ChatRoom>(`/chats/class/${classRoomId}${query}`, {
    method: 'GET',
    accessToken,
  });
}

export function listChatMessagesApi(
  accessToken: string,
  chatId: string,
  params?: { page?: number; pageSize?: number; q?: string }
) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.q) query.set('q', params.q);
  return apiRequest<ChatMessagesResponse>(`/chats/${chatId}/messages?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function listPinnedMessagesApi(accessToken: string, chatId: string) {
  return apiRequest<ChatMessage[]>(`/chats/${chatId}/messages/pinned`, {
    method: 'GET',
    accessToken,
  });
}

export function sendChatMessageApi(
  accessToken: string,
  chatId: string,
  payload: {
    content: string;
    attachment?: UploadedAssetPayload;
    replyToId?: string;
    mentionedUserIds?: string[];
    isAnnouncement?: boolean;
  }
) {
  return apiRequest<ChatMessage>(`/chats/${chatId}/messages`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export function reactToMessageApi(accessToken: string, chatId: string, messageId: string, emoji: string) {
  return apiRequest<ChatMessage>(`/chats/${chatId}/messages/${messageId}/reactions`, {
    method: 'POST',
    accessToken,
    body: { emoji },
  });
}

export function removeReactionApi(accessToken: string, chatId: string, messageId: string, emoji: string) {
  return apiRequest<ChatMessage>(
    `/chats/${chatId}/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
    {
      method: 'DELETE',
      accessToken,
    }
  );
}

export function pinMessageApi(accessToken: string, chatId: string, messageId: string) {
  return apiRequest<ChatMessage>(`/chats/${chatId}/messages/${messageId}/pin`, {
    method: 'POST',
    accessToken,
  });
}

export function unpinMessageApi(accessToken: string, chatId: string, messageId: string) {
  return apiRequest<ChatMessage>(`/chats/${chatId}/messages/${messageId}/pin`, {
    method: 'DELETE',
    accessToken,
  });
}

export function deleteMessageApi(accessToken: string, chatId: string, messageId: string) {
  return apiRequest<ChatMessage>(`/chats/${chatId}/messages/${messageId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function markChatReadApi(accessToken: string, chatId: string) {
  return apiRequest<{ read: boolean }>(`/chats/${chatId}/read`, {
    method: 'POST',
    accessToken,
  });
}

export function getReadReceiptsApi(accessToken: string, chatId: string) {
  return apiRequest<ChatReadReceipt[]>(`/chats/${chatId}/read-receipts`, {
    method: 'GET',
    accessToken,
  });
}
