import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { ConductDeductionForm } from '../components/conduct-deduction-form';
import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { hasPermission } from '../features/auth/auth-helpers';
import {
  listConductTermSettingsApi,
  upsertConductTermSettingApi,
} from '../features/conduct-marks/conduct-marks.api';
import { listAcademicYearsApi } from '../features/sprint1/sprint1.api';

export function ConductMarksSettingsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const yearInitRef = useRef(false);

  const canConfigurePools =
    hasPermission(auth.me, 'term.manage') || hasPermission(auth.me, 'academic_year.manage');
  const canRecordDeduction = hasPermission(auth.me, 'conduct.manage');

  const [academicYearId, setAcademicYearId] = useState('');
  const [draftTotals, setDraftTotals] = useState<Record<string, string>>({});
  const [recordConductModalOpen, setRecordConductModalOpen] = useState(false);

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken && (canConfigurePools || canRecordDeduction)),
  });

  const years = Array.isArray(yearsQuery.data) ? yearsQuery.data : [];

  useEffect(() => {
    if (yearInitRef.current || years.length === 0 || !canConfigurePools) {
      return;
    }
    yearInitRef.current = true;
    const current = years.find((y: { isCurrent?: boolean }) => y.isCurrent);
    setAcademicYearId(current?.id ?? years[0]?.id ?? '');
  }, [years, canConfigurePools]);

  const settingsQuery = useQuery({
    queryKey: ['conduct-term-settings', academicYearId],
    queryFn: () => listConductTermSettingsApi(auth.accessToken!, academicYearId),
    enabled: Boolean(auth.accessToken && academicYearId && canConfigurePools),
  });

  useEffect(() => {
    if (!settingsQuery.data?.terms) {
      return;
    }
    const next: Record<string, string> = {};
    for (const t of settingsQuery.data.terms) {
      next[t.id] = String(t.totalMarks ?? 100);
    }
    setDraftTotals(next);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ termId, totalMarks }: { termId: string; totalMarks: number }) =>
      upsertConductTermSettingApi(auth.accessToken!, termId, { totalMarks }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conduct-term-settings', academicYearId] });
      void queryClient.invalidateQueries({ queryKey: ['marks-grid'] });
      void queryClient.invalidateQueries({ queryKey: ['all-marks-ledger'] });
      showToast({ type: 'success', title: 'Conduct pool saved' });
    },
    onError: (e: Error) => {
      showToast({ type: 'error', title: 'Save failed', message: e.message });
    },
  });

  if (!canConfigurePools && !canRecordDeduction) {
    return (
      <SectionCard title="Conduct marks">
        <p className="text-sm text-slate-600">
          You need permission to configure term pools or record conduct deductions.
        </p>
      </SectionCard>
    );
  }

  if (yearsQuery.isPending) {
    return <div className="h-40 animate-pulse rounded-xl bg-brand-100" />;
  }

  if (yearsQuery.isError) {
    return (
      <StateView
        title="Could not load academic years"
        message="Check your connection and try again."
        action={
          <button
            type="button"
            onClick={() => void yearsQuery.refetch()}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="grid gap-6">
      {canRecordDeduction && auth.accessToken ? (
        <>
          <SectionCard
            title="Student conduct"
            action={
              <button
                type="button"
                onClick={() => setRecordConductModalOpen(true)}
                className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
              >
                Record student conduct
              </button>
            }
          >
          </SectionCard>

          {recordConductModalOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="conduct-settings-modal-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setRecordConductModalOpen(false);
                }
              }}
            >
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-brand-100 bg-white p-5 shadow-xl">
                <ConductDeductionForm
                  accessToken={auth.accessToken}
                  titleId="conduct-settings-modal-title"
                  description=""
                  showCancel
                  onCancel={() => setRecordConductModalOpen(false)}
                  onSuccess={() => setRecordConductModalOpen(false)}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {canConfigurePools ? (
        <SectionCard
          title="Conduct marks (per term)"
        >
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
              Academic year
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="h-10 min-w-[12rem] rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
              >
                {years.map((y: { id: string; name: string }) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {settingsQuery.isPending ? (
            <div className="h-32 animate-pulse rounded-xl bg-brand-50" />
          ) : settingsQuery.isError ? (
            <StateView title="Could not load term settings" message={(settingsQuery.error as Error).message} />
          ) : !settingsQuery.data?.terms.length ? (
            <EmptyState message="No terms found for this academic year." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-brand-100">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-200 bg-brand-50">
                    <th className="px-4 py-3 font-semibold text-slate-800">Term</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">Total conduct marks</th>
                    <th className="px-4 py-3 font-semibold text-slate-800"> </th>
                  </tr>
                </thead>
                <tbody>
                  {settingsQuery.data.terms.map((t) => (
                    <tr key={t.id} className="border-b border-brand-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {t.name}
                        <span className="ml-2 text-xs text-slate-500">(seq. {t.sequence})</span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          className="h-9 w-24 rounded-lg border border-brand-200 px-2 text-sm tabular-nums outline-none focus:border-brand-400"
                          value={draftTotals[t.id] ?? ''}
                          onChange={(e) =>
                            setDraftTotals((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                          aria-label={`Total marks for ${t.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={saveMutation.isPending}
                          onClick={() => {
                            const raw = parseInt(draftTotals[t.id] ?? '', 10);
                            if (Number.isNaN(raw) || raw < 1) {
                              showToast({ type: 'error', title: 'Enter a valid total (≥ 1)' });
                              return;
                            }
                            saveMutation.mutate({ termId: t.id, totalMarks: raw });
                          }}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
