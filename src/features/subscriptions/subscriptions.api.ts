import { apiRequest } from '../../api/client';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxStudents: number | null;
  maxStaff: number | null;
}

export interface SchoolSubscriptionRow {
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
}

export async function listSubscriptionPlansApi(accessToken: string) {
  return apiRequest<{ items: SubscriptionPlan[] }>('/subscription-plans', {
    method: 'GET',
    accessToken,
  });
}

export async function listSchoolSubscriptionsApi(accessToken: string) {
  return apiRequest<{ items: SchoolSubscriptionRow[] }>('/subscriptions/schools', {
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
  return apiRequest(`/subscriptions/schools/${tenantId}`, {
    method: 'PATCH',
    accessToken,
    body,
  });
}
