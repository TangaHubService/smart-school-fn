import { apiRequest } from '../../api/client';

export type SubscriptionInvoiceStatus = 'PENDING' | 'PAID' | 'VOID';

export interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  yearLabel: string;
  title: string;
  description: string;
  amountDue: number;
  currency: string;
  status: SubscriptionInvoiceStatus;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
}

export interface SubscriptionInvoicePaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  provider: string;
  providerRef: string;
  createdAt: string;
  completedAt: string | null;
}

export interface MySubscriptionInvoiceResponse {
  invoice: SubscriptionInvoice;
  schoolName: string;
  tenantCode: string;
  payments: SubscriptionInvoicePaymentRow[];
}

export interface PaySubscriptionInvoiceResponse {
  status: 'PAID' | 'PENDING';
  provider: string;
  ref: string;
  message: string;
}

export function getMySubscriptionInvoiceApi(accessToken: string) {
  return apiRequest<MySubscriptionInvoiceResponse>('/billing/invoice', {
    method: 'GET',
    accessToken,
  });
}

export function paySubscriptionInvoiceApi(accessToken: string, phoneNumber: string) {
  return apiRequest<PaySubscriptionInvoiceResponse>('/billing/invoice/pay', {
    method: 'POST',
    accessToken,
    body: { phoneNumber },
  });
}

export const MOBILE_MONEY_PHONE_PATTERN = /^(?:\+?250|0)7\d{8}$/;

export function formatInvoiceAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US')} ${currency}`;
}

export type BillingAccessResponse =
  | { blocked: false }
  | {
      blocked: true;
      schoolName: string;
      /** Whether this person can pay this invoice by Mobile Money. */
      canPay: boolean;
      /** Null for people without billing access. */
      invoice: SubscriptionInvoice | null;
    };

export function getBillingAccessApi(accessToken: string) {
  return apiRequest<BillingAccessResponse>('/billing/access', {
    method: 'GET',
    accessToken,
  });
}
