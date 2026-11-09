import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  completePasswordChangeApi,
  loginApi,
  logoutApi,
  meApi,
  resendTwoFactorOtpApi,
  selectSchoolApi,
  verifyTwoFactorApi,
} from './auth.api';
import {
  AmbiguousLoginResponse,
  AuthStepResponse,
  isPasswordChangeChallenge,
  isTwoFactorChallenge,
  LoginFormValues,
  LoginResponse,
  MeResponse,
  SelectSchoolInput,
} from './auth.schema';
import {
  clearSessionTokens,
  getSessionRefreshToken,
  getSessionTokens,
  refreshSessionTokens,
  setSessionTokens as setTokens,
  subscribeToSession,
} from './auth.session';

/** A sign-in that still needs one more step before a session exists. */
export interface PendingTwoFactor {
  challengeToken: string;
  expiresAt: string;
  destination: string;
}

export interface PendingPasswordChange {
  challengeToken: string;
}

interface AuthContextValue {
  accessToken: string | null;
  refreshToken: string | null;
  me: MeResponse | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  pendingTwoFactor: PendingTwoFactor | null;
  pendingPasswordChange: PendingPasswordChange | null;
  login: (payload: LoginFormValues) => Promise<AuthStepResponse | AmbiguousLoginResponse>;
  selectSchool: (payload: SelectSchoolInput) => Promise<AuthStepResponse>;
  completePasswordChange: (newPassword: string) => Promise<AuthStepResponse>;
  setSessionTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => Promise<void>;
  setPendingTwoFactor: (pending: PendingTwoFactor | null) => void;
  verifyTwoFactor: (otp: string) => Promise<LoginResponse>;
  resendTwoFactorOtp: () => Promise<{ message: string; expiresAt: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(getSessionTokens);
  const [isBootstrappingSession, setIsBootstrappingSession] = useState(
    () => !getSessionTokens().accessToken && Boolean(getSessionTokens().refreshToken)
  );
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactor | null>(null);
  const [pendingPasswordChange, setPendingPasswordChange] = useState<PendingPasswordChange | null>(
    null
  );

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

  /**
   * Applies the server's answer to any sign-in step: store the next pending
   * challenge, or start the session when tokens arrive.
   */
  function applyAuthStep<T extends AuthStepResponse | AmbiguousLoginResponse>(result: T): T {
    queryClient.removeQueries({ queryKey: ['me'] });
    if (isPasswordChangeChallenge(result)) {
      setPendingTwoFactor(null);
      setPendingPasswordChange({ challengeToken: result.challengeToken });
      return result;
    }
    if (isTwoFactorChallenge(result)) {
      setPendingPasswordChange(null);
      setPendingTwoFactor({
        challengeToken: result.challengeToken,
        expiresAt: result.expiresAt,
        destination: result.destination,
      });
      return result;
    }
    if ('requiresSchoolSelection' in result && result.requiresSchoolSelection) {
      return result;
    }
    const loginResult = result as LoginResponse;
    setPendingTwoFactor(null);
    setPendingPasswordChange(null);
    setTokens({
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    });
    return result;
  }

  async function login(
    payload: LoginFormValues
  ): Promise<AuthStepResponse | AmbiguousLoginResponse> {
    return applyAuthStep(await loginApi(payload));
  }

  async function selectSchool(payload: SelectSchoolInput): Promise<AuthStepResponse> {
    return applyAuthStep(await selectSchoolApi(payload));
  }

  async function completePasswordChange(newPassword: string): Promise<AuthStepResponse> {
    if (!pendingPasswordChange) throw new Error('No pending password change');
    return applyAuthStep(
      await completePasswordChangeApi({
        challengeToken: pendingPasswordChange.challengeToken,
        newPassword,
      })
    );
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
    setPendingPasswordChange(null);
  }

  async function verifyTwoFactor(otp: string): Promise<LoginResponse> {
    if (!pendingTwoFactor) throw new Error('No pending 2FA');
    const result = await verifyTwoFactorApi({
      challengeToken: pendingTwoFactor.challengeToken,
      otp,
    });
    return applyAuthStep(result);
  }

  async function resendTwoFactorOtp(): Promise<{ message: string; expiresAt: string }> {
    if (!pendingTwoFactor) throw new Error('No pending 2FA');
    const result = await resendTwoFactorOtpApi({ challengeToken: pendingTwoFactor.challengeToken });
    setPendingTwoFactor({ ...pendingTwoFactor, expiresAt: result.expiresAt });
    return result;
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      refreshToken,
      me: meQuery.data ?? null,
      isAuthenticated: Boolean(accessToken && meQuery.data),
      isLoadingSession: (Boolean(accessToken) && meQuery.isLoading) || isBootstrappingSession,
      pendingTwoFactor,
      pendingPasswordChange,
      login,
      selectSchool,
      completePasswordChange,
      setSessionTokens: handleSetSessionTokens,
      logout,
      setPendingTwoFactor,
      verifyTwoFactor,
      resendTwoFactorOtp,
    }),
    [
      accessToken,
      refreshToken,
      meQuery.data,
      meQuery.isLoading,
      isBootstrappingSession,
      pendingTwoFactor,
      pendingPasswordChange,
    ]
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
