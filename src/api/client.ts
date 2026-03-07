import { ApiClientError, ApiEnvelope } from '../types/api';
import {
  getSessionAccessToken,
  getSessionRefreshToken,
  refreshSessionTokens,
} from '../features/auth/auth.session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
  skipAuthRefresh?: boolean;
}

function createApiError<T>(status: number, envelope: ApiEnvelope<T>): ApiClientError {
  return new ApiClientError(
    status,
    envelope.error?.code ?? 'UNKNOWN_ERROR',
    envelope.error?.message ?? 'Request failed',
    envelope.error?.details,
  );
}

async function sendRequest<T>(
  path: string,
  options: ApiRequestOptions,
  accessToken?: string | null,
): Promise<{ response: Response; envelope: ApiEnvelope<T> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return { response, envelope };
}

function isUnauthorizedResponse<T>(response: Response, envelope: ApiEnvelope<T>): boolean {
  return response.status === 401 || envelope.error?.code === 'UNAUTHENTICATED';
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const currentAccessToken = getSessionAccessToken() ?? options.accessToken;
  let result = await sendRequest<T>(path, options, currentAccessToken);

  const shouldTryRefresh =
    !options.skipAuthRefresh &&
    path !== '/auth/refresh' &&
    Boolean(getSessionRefreshToken()) &&
    Boolean(currentAccessToken) &&
    isUnauthorizedResponse(result.response, result.envelope);

  if (shouldTryRefresh) {
    const refreshedTokens = await refreshSessionTokens();
    result = await sendRequest<T>(path, options, refreshedTokens.accessToken);
  }

  if (!result.response.ok || result.envelope.error) {
    throw createApiError(result.response.status, result.envelope);
  }

  return result.envelope.data as T;
}
