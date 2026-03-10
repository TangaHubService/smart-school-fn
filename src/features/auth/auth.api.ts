import { apiRequest } from '../../api/client';
import { LoginFormValues, LoginResponse, MeResponse, RegisterInput } from './auth.schema';

export async function loginApi(payload: LoginFormValues): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
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
  refreshToken: string,
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
