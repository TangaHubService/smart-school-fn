import { z } from 'zod';

const staffLoginFormSchema = z.object({
  loginAs: z.literal('staff'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const studentLoginFormSchema = z.object({
  loginAs: z.literal('student'),
  schoolCode: z.string().trim().min(1, 'School code is required').max(20, 'School code is too long'),
  studentId: z.string().trim().min(1, 'Student ID is required').max(40, 'Student ID is too long'),
});

export const loginFormSchema = z.discriminatedUnion('loginAs', [
  staffLoginFormSchema,
  studentLoginFormSchema,
]);

export const registerFormSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is too short').max(50),
  lastName: z.string().trim().min(2, 'Last name is too short').max(50),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterInput = z.infer<typeof registerFormSchema>;

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
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    currentEnrollment: {
      id: string;
      academicYear: {
        id: string;
        name: string;
      };
      classRoom: {
        id: string;
        code: string;
        name: string;
      };
    } | null;
  } | null;
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
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
  otp: z.string().min(1, 'OTP is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include a capital letter')
    .regex(/[a-z]/, 'Must include a small letter')
    .regex(/[0-9]/, 'Must include a number')
    .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
