import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  getGovAuditApi,
  submitGovAuditReportApi,
} from '../features/gov/gov.api';
import {
  GovAuditReportFormValue,
  defaultGovAuditReportForm,
  getFirstFormErrorMessage,
  govAuditReportFormSchema,
} from '../features/gov/gov.form-models';

const ratingOptions = [1, 2, 3, 4, 5];

function scoreLabel(value: number) {
  return `${value}/5`;
}

export function GovConductAuditPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<GovAuditReportFormValue>(defaultGovAuditReportForm);

  const auditQuery = useQuery({
    queryKey: ['gov-audit', auditId],
    queryFn: () => getGovAuditApi(auth.accessToken!, auditId!),
    enabled: Boolean(auditId),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submitGovAuditReportApi(auth.accessToken!, {
        auditId: auditId!,
        teachingQuality: form.teachingQuality,
        infrastructure: form.infrastructure,
        discipline: form.discipline,
        comment: form.comment.trim(),
        findings: form.findings.trim(),
        recommendations: form.recommendations.trim(),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gov-audit', auditId] }),
        queryClient.invalidateQueries({ queryKey: ['gov-audits'] }),
        queryClient.invalidateQueries({ queryKey: ['gov-reports'] }),
        queryClient.invalidateQueries({ queryKey: ['gov-dashboard'] }),
      ]);
      showToast({ type: 'success', title: 'Audit report submitted' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not submit report',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = govAuditReportFormSchema.safeParse(form);
    if (!parsed.success) {
      showToast({
        type: 'error',
        title: 'Please review the audit report',
        message: getFirstFormErrorMessage(parsed.error),
      });
      return;
    }

    void submitMutation.mutate();
  }

  if (auditQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-32 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-96 animate-pulse rounded-xl bg-brand-100" />
      </div>
    );
  }

  if (auditQuery.isError || !auditQuery.data) {
    return (
      <StateView
        title="Could not load audit"
        message="Retry the request. The audit plan is still saved."
        action={
          <button
            type="button"
            onClick={() => void auditQuery.refetch()}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const audit = auditQuery.data;
  const report = audit.report;

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Conduct Audit"
        subtitle="Use the simple scoring form below to complete the school audit report."
        action={
          <Link
            to="/gov/audits"
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50"
          >
            Back to Audits
          </Link>
        }
      >
        <div className="grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">School</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{audit.school.name}</p>
            <p className="text-sm text-slate-600">
              {audit.school.sector ?? 'N/A'} / {audit.school.district ?? 'N/A'} / {audit.school.province ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audit Plan</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{audit.auditType} audit</p>
            <p className="text-sm text-slate-600">{new Date(audit.plannedDate).toLocaleDateString()}</p>
            <p className="mt-2 text-sm text-slate-600">{audit.planNotes || 'No planning notes added.'}</p>
          </div>
        </div>
      </SectionCard>

      {report ? (
        <SectionCard title="Submitted Report" subtitle="This audit has already been completed.">
          <div className="grid gap-4 rounded-2xl border border-brand-100 bg-white p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{report.score}</p>
              </div>
              <div className="rounded-xl border border-brand-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Teaching</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{report.teachingQuality}</p>
              </div>
              <div className="rounded-xl border border-brand-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Infrastructure</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{report.infrastructure}</p>
              </div>
              <div className="rounded-xl border border-brand-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Discipline</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{report.discipline}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-brand-100 bg-white p-4">
                <h3 className="font-semibold text-slate-900">Comment</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{report.comment}</p>
              </article>
              <article className="rounded-xl border border-brand-100 bg-white p-4">
                <h3 className="font-semibold text-slate-900">Findings</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{report.findings}</p>
              </article>
              <article className="rounded-xl border border-brand-100 bg-white p-4">
                <h3 className="font-semibold text-slate-900">Recommendations</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{report.recommendations}</p>
              </article>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Audit Form" subtitle="Score each area from 1 to 5, then submit the final report.">
          <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-brand-100 bg-white p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm text-slate-700">
                <span className="font-medium">Teaching Quality</span>
                <select
                  value={form.teachingQuality}
                  onChange={(event) =>
                    setForm((current: GovAuditReportFormValue) => ({
                      ...current,
                      teachingQuality: Number(event.target.value),
                    }))
                  }
                  className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                >
                  {ratingOptions.map((option) => (
                    <option key={option} value={option}>
                      {scoreLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span className="font-medium">Infrastructure</span>
                <select
                  value={form.infrastructure}
                  onChange={(event) =>
                    setForm((current: GovAuditReportFormValue) => ({
                      ...current,
                      infrastructure: Number(event.target.value),
                    }))
                  }
                  className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                >
                  {ratingOptions.map((option) => (
                    <option key={option} value={option}>
                      {scoreLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span className="font-medium">Discipline</span>
                <select
                  value={form.discipline}
                  onChange={(event) =>
                    setForm((current: GovAuditReportFormValue) => ({
                      ...current,
                      discipline: Number(event.target.value),
                    }))
                  }
                  className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                >
                  {ratingOptions.map((option) => (
                    <option key={option} value={option}>
                      {scoreLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Comment</span>
              <textarea
                value={form.comment}
                onChange={(event) =>
                  setForm((current: GovAuditReportFormValue) => ({ ...current, comment: event.target.value }))
                }
                rows={4}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400"
                required
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Findings</span>
              <textarea
                value={form.findings}
                onChange={(event) =>
                  setForm((current: GovAuditReportFormValue) => ({ ...current, findings: event.target.value }))
                }
                rows={4}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400"
                required
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Recommendations</span>
              <textarea
                value={form.recommendations}
                onChange={(event) =>
                  setForm((current: GovAuditReportFormValue) => ({
                    ...current,
                    recommendations: event.target.value,
                  }))
                }
                rows={4}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400"
                required
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
