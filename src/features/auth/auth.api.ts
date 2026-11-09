import { apiRequest } from '../../api/client';
import {
  AmbiguousLoginResponse,
  AuthStepResponse,
  ForgotPasswordInput,
  LoginFormValues,
  LoginResponse,
  MeResponse,
  RegisterInput,
  ResetPasswordInput,
  SelectSchoolInput,
  VerifyOtpInput,
} from './auth.schema';

export async function loginApi(
  payload: LoginFormValues
): Promise<AuthStepResponse | AmbiguousLoginResponse> {
  return apiRequest<AuthStepResponse | AmbiguousLoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function selectSchoolApi(payload: SelectSchoolInput): Promise<AuthStepResponse> {
  return apiRequest<AuthStepResponse>('/auth/select-school', {
    method: 'POST',
    body: payload,
  });
}

export async function registerApi(payload: RegisterInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function refreshApi(refreshToken: string): Promise<{
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}> {
  return apiRequest('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    skipAuthRefresh: true,
  });
}

export async function logoutApi(
  accessToken: string,
  refreshToken: string
): Promise<{ loggedOut: boolean }> {
  return apiRequest('/auth/logout', {
    method: 'POST',
    accessToken,
    body: {
      refreshToken,
      allDevices: false,
    },
  });
}

export async function meApi(accessToken: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/me', {
    method: 'GET',
    accessToken,
  });
}

export async function forgotPasswordApi(
  payload: ForgotPasswordInput
): Promise<{ message: string }> {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyOtpApi(payload: VerifyOtpInput): Promise<{ message: string }> {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyTwoFactorApi(payload: {
  challengeToken: string;
  otp: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/verify-two-factor', {
    method: 'POST',
    body: payload,
    skipAuthRefresh: true,
  });
}

export async function resendTwoFactorOtpApi(payload: {
  challengeToken: string;
}): Promise<{ message: string; expiresAt: string }> {
  return apiRequest<{ message: string; expiresAt: string }>('/auth/resend-two-factor-otp', {
    method: 'POST',
    body: payload,
    skipAuthRefresh: true,
  });
}

export async function completePasswordChangeApi(payload: {
  challengeToken: string;
  newPassword: string;
}): Promise<AuthStepResponse> {
  return apiRequest<AuthStepResponse>('/auth/complete-password-change', {
    method: 'POST',
    body: payload,
    skipAuthRefresh: true,
  });
}

export async function resetPasswordApi(payload: ResetPasswordInput): Promise<{ message: string }> {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: payload,
  });
}
