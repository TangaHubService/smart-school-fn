import { apiRequest } from './client';

export interface Program {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  durationDays: number;
}

export interface ProgramEnrollment {
  id: string;
  programId: string;
  userId: string;
  isActive: boolean;
  expiresAt: string;
  program: Program;
}

export interface PurchaseRequest {
  programId: string;
  phoneNumber: string;
  amount: number;
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
