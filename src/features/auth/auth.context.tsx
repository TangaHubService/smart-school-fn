import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { loginApi, logoutApi, meApi, refreshApi } from './auth.api';
import { LoginFormValues, MeResponse } from './auth.schema';

const ACCESS_TOKEN_KEY = 'ssr_access_token';
const REFRESH_TOKEN_KEY = 'ssr_refresh_token';

interface AuthContextValue {
  accessToken: string | null;
  refreshToken: string | null;
  me: MeResponse | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  login: (payload: LoginFormValues) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem(REFRESH_TOKEN_KEY),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasRetriedRefresh = useRef(false);

  const meQuery = useQuery({
    queryKey: ['me', accessToken],
    queryFn: () => meApi(accessToken as string),
    enabled: Boolean(accessToken),
    retry: false,
  });

  useEffect(() => {
    if (!meQuery.error || !refreshToken || hasRetriedRefresh.current) {
      return;
    }

    hasRetriedRefresh.current = true;
    setIsRefreshing(true);

    void refreshApi(refreshToken)
      .then((refreshResult) => {
        setAccessToken(refreshResult.accessToken);
        setRefreshToken(refreshResult.refreshToken);
        localStorage.setItem(ACCESS_TOKEN_KEY, refreshResult.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshResult.refreshToken);
        return queryClient.invalidateQueries({ queryKey: ['me'] });
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [meQuery.error, refreshToken, queryClient]);

  function clearSession() {
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    queryClient.removeQueries({ queryKey: ['me'] });
  }

  async function login(payload: LoginFormValues): Promise<void> {
    const result = await loginApi(payload);
    setAccessToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    hasRetriedRefresh.current = false;
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  }

  async function logout(): Promise<void> {
    if (accessToken && refreshToken) {
      try {
        await logoutApi(accessToken, refreshToken);
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
      isLoadingSession: (Boolean(accessToken) && meQuery.isLoading) || isRefreshing,
      login,
      logout,
    }),
    [accessToken, refreshToken, meQuery.data, meQuery.isLoading, isRefreshing],
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
