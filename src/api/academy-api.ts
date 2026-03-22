import { apiRequest } from './client';

export interface Program {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  price: number;
  durationDays: number;
  courseId?: string | null;
}

export interface ProgramEnrollment {
  id: string;
  programId: string;
  userId: string;
  isActive: boolean;
  isTrial?: boolean;
  expiresAt: string | null;
  program: Program;
}

export interface PurchaseRequest {
  programId: string;
  phoneNumber: string;
  planId: string;
}

export interface PurchaseResponse {
  message: string;
  paymentId: string;
  paypackRef: string;
}

export interface ProgramContentResponse {
  programId: string;
  programTitle: string;
  course: any; // We can refine this type based on the Course model if needed
}

export const academyApi = {
  getPrograms: () => apiRequest<Program[]>('/public-academy/programs'),

  getProgramById: (id: string) => apiRequest<Program>(`/public-academy/programs/${id}`),

  purchaseProgram: (data: PurchaseRequest) =>
    apiRequest<PurchaseResponse>('/public-academy/purchase', {
      method: 'POST',
      body: data,
    }),

  getMyEnrollments: () => apiRequest<ProgramEnrollment[]>('/public-academy/my-enrollments'),

  getProgramContent: (id: string) =>
    apiRequest<ProgramContentResponse>(`/public-academy/programs/${id}/content`),
};
