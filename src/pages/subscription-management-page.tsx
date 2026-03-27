import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  listSchoolSubscriptionsApi,
  listSubscriptionPlansApi,
  updateSchoolSubscriptionApi,
  type SchoolSubscriptionRow,
} from '../features/subscriptions/subscriptions.api';

export function SubscriptionManagementPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editRow, setEditRow] = useState<SchoolSubscriptionRow | null>(null);
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'>('ACTIVE');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const plansQuery = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => listSubscriptionPlansApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });

  const subsQuery = useQuery({
    queryKey: ['school-subscriptions'],
    queryFn: () => listSchoolSubscriptionsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSchoolSubscriptionApi(auth.accessToken!, editRow!.tenantId, {
        planId,
        status,
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['school-subscriptions'] });
      showToast({ type: 'success', title: 'Saved', message: 'Subscription updated.' });
      setEditRow(null);
    },
  });

  function openEdit(row: SchoolSubscriptionRow) {
    setEditRow(row);
    setPlanId(row.plan.id);
    setStatus(row.status as 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED');
    setTrialEndsAt(row.trialEndsAt ? row.trialEndsAt.slice(0, 10) : '');
    setPeriodEnd(row.currentPeriodEnd ? row.currentPeriodEnd.slice(0, 10) : '');
  }

  const plans = plansQuery.data?.items ?? [];
  const rows = subsQuery.data?.items ?? [];

  return (
    <SectionCard
      title="Subscription Management"
      subtitle="Plans, trial, renewal dates, and status per school (billing-ready, no payment gateway)."
    >
      {subsQuery.isPending ? (
        <p className="text-sm text-slate-600">Loading subscriptions…</p>
      ) : subsQuery.isError ? (
        <StateView title="Could not load data" message="Check your connection and try again." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-slate-600">
                <th className="pb-2">School</th>
                <th className="pb-2">Plan</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Trial ends</th>
                <th className="pb-2">Period end</th>
                <th className="pb-2">Limits</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.tenantId} className="border-b border-brand-50">
                  <td className="py-3 font-medium text-slate-900">{row.schoolName}</td>
                  <td className="py-3">{row.plan.name}</td>
                  <td className="py-3">{row.status}</td>
                  <td className="py-3 text-slate-600">
                    {row.trialEndsAt ? new Date(row.trialEndsAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 text-slate-600">
                    {row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 text-xs text-slate-500">
                    students {row.plan.maxStudents ?? '—'} / staff {row.plan.maxStaff ?? '—'}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(editRow)} onClose={() => setEditRow(null)} title="Update subscription">
        {editRow ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-slate-900">{editRow.schoolName}</p>
            <label className="block">
              <span className="text-slate-600">Plan</span>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="mt-1 w-full rounded border border-brand-200 px-3 py-2"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-slate-600">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="mt-1 w-full rounded border border-brand-200 px-3 py-2"
              >
                <option value="TRIALING">TRIALING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAST_DUE">PAST_DUE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
            <label className="block">
              <span className="text-slate-600">Trial end (optional)</span>
              <input
                type="date"
                value={trialEndsAt}
                onChange={(e) => setTrialEndsAt(e.target.value)}
                className="mt-1 w-full rounded border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-slate-600">Current period end (optional)</span>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1 w-full rounded border border-brand-200 px-3 py-2"
              />
            </label>
            <button
              type="button"
              disabled={updateMutation.isPending || !planId}
              onClick={() => updateMutation.mutate()}
              className="w-full rounded-lg bg-brand-500 py-2 font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
        ) : null}
      </Modal>
    </SectionCard>
  );
}
