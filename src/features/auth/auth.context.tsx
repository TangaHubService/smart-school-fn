import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { loginApi, logoutApi, meApi, verifyTwoFactorApi, resendTwoFactorOtpApi } from './auth.api';
import { LoginFormValues, LoginResponse, MeResponse } from './auth.schema';
import {
  clearSessionTokens,
  getSessionRefreshToken,
  getSessionTokens,
  refreshSessionTokens,
  setSessionTokens as setTokens,
  subscribeToSession,
} from './auth.session';

interface PendingTwoFactor {
  email: string;
  role?: string;
}

interface AuthContextValue {
  accessToken: string | null;
  refreshToken: string | null;
  me: MeResponse | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  pendingTwoFactor: PendingTwoFactor | null;
  login: (payload: LoginFormValues) => Promise<LoginResponse>;
  setSessionTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => Promise<void>;
  setPendingTwoFactor: (pending: PendingTwoFactor | null) => void;
  verifyTwoFactor: (otp: string) => Promise<LoginResponse>;
  resendTwoFactorOtp: () => Promise<{ message: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(getSessionTokens);
  const [isBootstrappingSession, setIsBootstrappingSession] = useState(
    () => !getSessionTokens().accessToken && Boolean(getSessionTokens().refreshToken)
  );
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactor | null>(null);

  const accessToken = session.accessToken;
  const refreshToken = session.refreshToken;

  const meQuery = useQuery({
    queryKey: ['me', accessToken],
    queryFn: () => meApi(accessToken as string),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
      // Do not set tokens yet; store pending state
      setPendingTwoFactor({ email: payload.identifier });
      return result;
    }
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
    setPendingTwoFactor(null);
  }

  async function verifyTwoFactor(otp: string): Promise<LoginResponse> {
    if (!pendingTwoFactor) throw new Error('No pending 2FA');
    const result = await verifyTwoFactorApi({ email: pendingTwoFactor.email, otp });
    setTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    setPendingTwoFactor(null);
    return result;
  }

  async function resendTwoFactorOtp(): Promise<{ message: string }> {
    if (!pendingTwoFactor) throw new Error('No pending 2FA');
    return resendTwoFactorOtpApi({ email: pendingTwoFactor.email });
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      refreshToken,
      me: meQuery.data ?? null,
      isAuthenticated: Boolean(accessToken && meQuery.data),
      isLoadingSession: (Boolean(accessToken) && meQuery.isLoading) || isBootstrappingSession,
      pendingTwoFactor,
      login,
      setSessionTokens: handleSetSessionTokens,
      logout,
      setPendingTwoFactor,
      verifyTwoFactor,
      resendTwoFactorOtp,
    }),
    [accessToken, refreshToken, meQuery.data, meQuery.isLoading, isBootstrappingSession, pendingTwoFactor]
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
