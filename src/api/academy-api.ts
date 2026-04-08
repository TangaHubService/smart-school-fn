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

export type AcademyPlanId = 'trial' | 'test' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AcademySubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PENDING_PAYMENT';

export interface AcademySubscriptionSummary {
  subscription: {
    id: string;
    planCode: AcademyPlanId;
    status: AcademySubscriptionStatus;
    isTrial: boolean;
    expiresAt: string | null;
    courseLimit: number;
    remainingSlots: number;
  };
  selectedPrograms: Array<{
    enrollmentId: string;
    programId: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    courseId: string | null;
    expiresAt: string | null;
    isTrial: boolean;
  }>;
  accessiblePrograms: Array<{
    enrollmentId: string;
    programId: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    courseId: string | null;
    expiresAt: string | null;
    isTrial: boolean;
    isLegacy: boolean;
  }>;
  pendingPayment: {
    id: string;
    planCode: AcademyPlanId;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    amount: number;
    currency: string;
    createdAt: string;
  } | null;
}

export interface AcademyPlanCheckoutRequest {
  planId: Exclude<AcademyPlanId, 'trial'>;
  phoneNumber: string;
}

export interface AcademyPlanCheckoutResponse {
  message: string;
  paymentId: string;
  paypackRef: string;
  planId: Exclude<AcademyPlanId, 'trial'>;
}

export const academyApi = {
  getPrograms: () => apiRequest<Program[]>('/public-academy/programs'),

  getProgramById: (id: string) => apiRequest<Program>(`/public-academy/programs/${id}`),

  getSubscriptionSummary: () =>
    apiRequest<AcademySubscriptionSummary>('/public-academy/subscription'),

  startPlanCheckout: (data: AcademyPlanCheckoutRequest) =>
    apiRequest<AcademyPlanCheckoutResponse>('/public-academy/subscription/checkout', {
      method: 'POST',
      body: data,
    }),

  selectProgram: (programId: string) =>
    apiRequest<AcademySubscriptionSummary>('/public-academy/subscription/programs/select', {
      method: 'POST',
      body: { programId },
    }),

  removeProgram: (programId: string) =>
    apiRequest<AcademySubscriptionSummary>(`/public-academy/subscription/programs/${programId}`, {
      method: 'DELETE',
    }),

  purchaseProgram: (data: PurchaseRequest) =>
    apiRequest<PurchaseResponse>('/public-academy/purchase', {
      method: 'POST',
      body: data,
    }),

  getMyEnrollments: () => apiRequest<ProgramEnrollment[]>('/public-academy/my-enrollments'),

  getProgramContent: (id: string) =>
    apiRequest<ProgramContentResponse>(`/public-academy/programs/${id}/content`),
};
