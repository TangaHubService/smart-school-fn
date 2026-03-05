import { ApiClientError, ApiEnvelope } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || envelope.error) {
    throw new ApiClientError(
      response.status,
      envelope.error?.code ?? 'UNKNOWN_ERROR',
      envelope.error?.message ?? 'Request failed',
      envelope.error?.details,
    );
  }

  return envelope.data as T;
}
