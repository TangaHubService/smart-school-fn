import { apiRequest } from '../../api/client';

export interface ChatRoom {
  id: string;
  classRoom: { id: string; code: string; name: string };
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  fileUrl: string | null;
  sender: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface ChatMessagesResponse {
  items: ChatMessage[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export function getOrCreateChatApi(accessToken: string, classRoomId: string) {
  return apiRequest<ChatRoom>(`/chats/class/${classRoomId}`, {
    method: 'GET',
    accessToken,
  });
}

export function listChatMessagesApi(
  accessToken: string,
  chatId: string,
  params?: { page?: number; pageSize?: number }
) {
  const query = new URLSearchParams();
  if (params) {
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
  }
  return apiRequest<ChatMessagesResponse>(`/chats/${chatId}/messages?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export function sendChatMessageApi(
  accessToken: string,
  chatId: string,
  payload: { content: string; fileUrl?: string }
) {
  return apiRequest<ChatMessage>(`/chats/${chatId}/messages`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}
