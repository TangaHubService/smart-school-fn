import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loginApi, logoutApi, meApi } from './auth.api';
import { LoginFormValues, LoginResponse, MeResponse } from './auth.schema';
import {
  clearSessionTokens,
  getSessionRefreshToken,
  getSessionTokens,
  refreshSessionTokens,
  setSessionTokens as setTokens,
  subscribeToSession,
} from './auth.session';

interface AuthContextValue {
  accessToken: string | null;
  refreshToken: string | null;
  me: MeResponse | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  login: (payload: LoginFormValues) => Promise<LoginResponse>;
  setSessionTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(getSessionTokens);
  const [isBootstrappingSession, setIsBootstrappingSession] = useState(
    () => !getSessionTokens().accessToken && Boolean(getSessionTokens().refreshToken),
  );

  const accessToken = session.accessToken;
  const refreshToken = session.refreshToken;

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => meApi(accessToken as string),
    enabled: Boolean(accessToken),
    retry: false,
  });

  useEffect(() => {
    return subscribeToSession(setSession);
  }, []);

  useEffect(() => {
    if (accessToken || !refreshToken) {
      setIsBootstrappingSession(false);
      return;
    }

    let isCancelled = false;
    setIsBootstrappingSession(true);

    void refreshSessionTokens()
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        if (!isCancelled) {
          setIsBootstrappingSession(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [accessToken, refreshToken]);

  function clearSession() {
    clearSessionTokens();
    queryClient.removeQueries({ queryKey: ['me'] });
  }

  async function login(payload: LoginFormValues): Promise<LoginResponse> {
    const result = await loginApi(payload);
    queryClient.removeQueries({ queryKey: ['me'] });
    setTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  function handleSetSessionTokens(tokens: { accessToken: string; refreshToken: string }) {
    queryClient.removeQueries({ queryKey: ['me'] });
    setTokens(tokens);
  }

  async function logout(): Promise<void> {
    const currentAccessToken = accessToken;
    const currentRefreshToken = refreshToken ?? getSessionRefreshToken();

    if (currentAccessToken && currentRefreshToken) {
      try {
        await logoutApi(currentAccessToken, currentRefreshToken);
      } catch (_error) {
        // Ignore backend logout failure and clear local session.
      }
    }

    clearSession();
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      refreshToken,
      me: meQuery.data ?? null,
      isAuthenticated: Boolean(accessToken && meQuery.data),
      isLoadingSession: (Boolean(accessToken) && meQuery.isLoading) || isBootstrappingSession,
      login,
      setSessionTokens: handleSetSessionTokens,
      logout,
    }),
    [accessToken, refreshToken, meQuery.data, meQuery.isLoading, isBootstrappingSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
