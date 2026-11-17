import { apiRequest } from '../../api/client';

export type AiMode = 'ask' | 'summarize' | 'examples' | 'quiz';

export interface AiStatus {
  enabled: boolean;
  model: string;
  dailyLimit: number;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  courseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface AiConversation extends AiConversationSummary {
  messages: AiMessage[];
}

export function getAiStatusApi(accessToken: string) {
  return apiRequest<AiStatus>('/ai/status', { method: 'GET', accessToken });
}

export function listAiConversationsApi(accessToken: string) {
  return apiRequest<AiConversationSummary[]>('/ai/conversations', { method: 'GET', accessToken });
}

export function createAiConversationApi(accessToken: string, payload: { courseId?: string; title?: string }) {
  return apiRequest<AiConversationSummary>('/ai/conversations', { method: 'POST', accessToken, body: payload });
}

export function getAiConversationApi(accessToken: string, id: string) {
  return apiRequest<AiConversation>(`/ai/conversations/${id}`, { method: 'GET', accessToken });
}

export function deleteAiConversationApi(accessToken: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`/ai/conversations/${id}`, { method: 'DELETE', accessToken });
}

export function sendAiMessageApi(accessToken: string, id: string, payload: { content: string; mode: AiMode }) {
  return apiRequest<{ userMessage: AiMessage; assistantMessage: AiMessage; remainingToday: number }>(
    `/ai/conversations/${id}/messages`,
    { method: 'POST', accessToken, body: payload }
  );
}

/** Platform-wide AI settings (super admin only): one OpenAI key shared by all schools. */
export interface AiSettings {
  hasKey: boolean;
  keyLast4: string | null;
  model: string;
  enabled: boolean;
  dailyLimitPerStudent: number;
  dailyLimitPerTeacher: number;
  /** No key saved in the app; the server's environment key is being used. */
  usingEnvKey: boolean;
  /** True when schools can actually use AI right now (switched on and a key is available). */
  active: boolean;
  updatedAt: string | null;
}

export function getAiSettingsApi(accessToken: string) {
  return apiRequest<AiSettings>('/platform/ai/settings', { method: 'GET', accessToken });
}

export function updateAiSettingsApi(
  accessToken: string,
  payload: {
    apiKey?: string;
    model?: string;
    enabled?: boolean;
    dailyLimitPerStudent?: number;
    dailyLimitPerTeacher?: number;
  }
) {
  return apiRequest<AiSettings>('/platform/ai/settings', { method: 'PUT', accessToken, body: payload });
}

export function removeAiKeyApi(accessToken: string) {
  return apiRequest<AiSettings>('/platform/ai/settings/key', { method: 'DELETE', accessToken });
}
