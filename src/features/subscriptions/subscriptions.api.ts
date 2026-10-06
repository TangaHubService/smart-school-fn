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
  }
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
  params?: { page?: number; pageSize?: number }
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
  }
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

export const BILLING_CURRENCIES = ['RWF', 'USD', 'EUR', 'KES', 'UGX', 'TZS'] as const;
export const BILLING_PAYMENT_METHODS = ['CASH', 'BANK', 'MOBILE_MONEY', 'CARD', 'OTHER'] as const;

export interface ManualInvoiceInput {
  tenantId: string;
  title: string;
  description: string;
  amountDue: number;
  currency: string;
  paymentMethod?: string;
  paymentDate?: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  status: 'PENDING' | 'PAID' | 'VOID';
  reference?: string;
  notes?: string;
}

export function createManualInvoiceApi(accessToken: string, body: ManualInvoiceInput) {
  return apiRequest('/billing/invoices/manual', { method: 'POST', accessToken, body });
}

export function recordManualPaymentApi(
  accessToken: string,
  invoiceId: string,
  body: { amount: number; currency: string; paymentMethod: string; reference?: string; paymentDate?: string }
) {
  return apiRequest(`/billing/invoices/${invoiceId}/payments/manual`, {
    method: 'POST',
    accessToken,
    body,
  });
}

export interface SchoolInvoiceRow {
  id: string;
  invoiceNumber: string;
  yearLabel: string;
  title: string;
  description: string;
  amountDue: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'VOID';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentDate: string | null;
  reference: string | null;
  notes: string | null;
  tenant: { id: string; code: string; name: string };
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    completedAt: string | null;
    createdAt: string;
  }>;
}

export function listSchoolInvoicesApi(
  accessToken: string,
  params: { tenantId?: string; status?: string; page?: number; pageSize?: number } = {}
) {
  const q = new URLSearchParams();
  if (params.tenantId) q.set('tenantId', params.tenantId);
  if (params.status) q.set('status', params.status);
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiRequest<{
    items: SchoolInvoiceRow[];
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  }>(`/billing/invoices${suffix}`, { method: 'GET', accessToken });
}
