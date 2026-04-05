import { apiRequest } from '../../api/client';

export type SchoolSubscriptionRow = {
  tenantId: string;
  schoolName: string;
  tenantCode: string;
  plan: {
    id: string;
    code: string;
    name: string;
    maxStudents: number | null;
    maxStaff: number | null;
  };
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
};

export type SubscriptionPlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxStudents: number | null;
  maxStaff: number | null;
};

export type AcademyCatalogProgramAdminRow = {
  id: string;
  title: string;
  price: number;
  durationDays: number;
  listedInPublicCatalog: boolean;
  courseId: string | null;
  courseTitle: string | null;
};

export type AcademyEnrollmentAdminRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  programId: string;
  programTitle: string;
  tenantName: string;
  tenantCode: string;
  isActive: boolean;
  isTrial: boolean;
  expiresAt: string | null;
  updatedAt: string;
  lastPayment: {
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
  } | null;
};

export async function listSchoolSubscriptionsApi(accessToken: string) {
  return apiRequest<{ items: SchoolSubscriptionRow[] }>('/subscriptions/schools', {
    method: 'GET',
    accessToken,
  });
}

export async function listSubscriptionPlansApi(accessToken: string) {
  return apiRequest<{ items: SubscriptionPlanRow[] }>('/subscription-plans', {
    method: 'GET',
    accessToken,
  });
}

export async function updateSchoolSubscriptionApi(
  accessToken: string,
  tenantId: string,
  body: {
    planId: string;
    status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
    trialEndsAt?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  },
) {
  return apiRequest<unknown>(`/subscriptions/schools/${tenantId}`, {
    method: 'PATCH',
    accessToken,
    body,
  });
}

export async function listAcademyCatalogProgramsAdminApi(accessToken: string) {
  return apiRequest<{
    catalogConfigured: boolean;
    catalogTenantId: string | null;
    items: AcademyCatalogProgramAdminRow[];
  }>('/subscriptions/academy/catalog-programs', {
    method: 'GET',
    accessToken,
  });
}

export async function listAcademyEnrollmentsAdminApi(
  accessToken: string,
  params?: { page?: number; pageSize?: number },
) {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiRequest<{
    pagination: { page: number; pageSize: number; total: number };
    items: AcademyEnrollmentAdminRow[];
  }>(`/subscriptions/academy/enrollments${suffix}`, {
    method: 'GET',
    accessToken,
  });
}

export async function grantAcademyAccessApi(
  accessToken: string,
  body: {
    userId?: string;
    email?: string;
    programId: string;
    durationDays?: number;
  },
) {
  return apiRequest<{
    enrollmentId: string;
    userId: string;
    email: string;
    programId: string;
    programTitle: string;
    expiresAt: string;
    isTrial: boolean;
  }>('/subscriptions/academy/grant-access', {
    method: 'POST',
    accessToken,
    body,
  });
}
