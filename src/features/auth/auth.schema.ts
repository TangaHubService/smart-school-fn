import { z } from 'zod';

export const loginFormSchema = z.object({
  tenantCode: z
    .string()
    .trim()
    .max(50, 'School code is too long')
    .refine(
      (value) => value.length === 0 || value.length >= 2,
      'School code must be at least 2 characters',
    ),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export interface MeResponse {
  id: string;
  tenant: {
    id: string;
    code: string;
    name: string;
  };
  school: {
    id: string;
    displayName: string;
    setupCompletedAt: string | null;
  } | null;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  user: {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  roles: string[];
  permissions: string[];
}
