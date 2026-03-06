import { ApiClientError, ApiEnvelope } from '../../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const ACCESS_TOKEN_KEY = 'ssr_access_token';
export const REFRESH_TOKEN_KEY = 'ssr_refresh_token';

export interface SessionTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

type SessionListener = (tokens: SessionTokens) => void;

interface RefreshResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

const listeners = new Set<SessionListener>();

let refreshPromise: Promise<SessionTokens> | null = null;
let sessionTokens = readSessionTokens();

function readStorageValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStorageValue(key: string, value: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (value) {
    window.localStorage.setItem(key, value);
    return;
  }

  window.localStorage.removeItem(key);
}

function readSessionTokens(): SessionTokens {
  return {
    accessToken: readStorageValue(ACCESS_TOKEN_KEY),
    refreshToken: readStorageValue(REFRESH_TOKEN_KEY),
  };
}

function emitSessionChange() {
  for (const listener of listeners) {
    listener(sessionTokens);
  }
}

function createApiError<T>(status: number, envelope: ApiEnvelope<T>): ApiClientError {
  return new ApiClientError(
    status,
    envelope.error?.code ?? 'UNKNOWN_ERROR',
    envelope.error?.message ?? 'Request failed',
    envelope.error?.details,
  );
}

function isTerminalRefreshError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.status === 400 || error.status === 401 || error.status === 403)
  );
}

export function getSessionTokens(): SessionTokens {
  return sessionTokens;
}

export function getSessionAccessToken(): string | null {
  return sessionTokens.accessToken;
}

export function getSessionRefreshToken(): string | null {
  return sessionTokens.refreshToken;
}

export function setSessionTokens(nextTokens: SessionTokens) {
  sessionTokens = nextTokens;
  writeStorageValue(ACCESS_TOKEN_KEY, nextTokens.accessToken);
  writeStorageValue(REFRESH_TOKEN_KEY, nextTokens.refreshToken);
  emitSessionChange();
}

export function clearSessionTokens() {
  setSessionTokens({
    accessToken: null,
    refreshToken: null,
  });
}

export function subscribeToSession(listener: SessionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshSessionTokens(): Promise<SessionTokens> {
  const currentRefreshToken = getSessionRefreshToken();

  if (!currentRefreshToken) {
    clearSessionTokens();
    throw new ApiClientError(401, 'UNAUTHENTICATED', 'Session expired');
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: currentRefreshToken }),
  })
    .then(async (response) => {
      const envelope = (await response.json()) as ApiEnvelope<RefreshResponse>;

      if (!response.ok || envelope.error || !envelope.data) {
        throw createApiError(response.status, envelope);
      }

      const nextTokens = {
        accessToken: envelope.data.accessToken,
        refreshToken: envelope.data.refreshToken,
      };

      setSessionTokens(nextTokens);
      return nextTokens;
    })
    .catch((error) => {
      if (isTerminalRefreshError(error)) {
        clearSessionTokens();
      }

      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
