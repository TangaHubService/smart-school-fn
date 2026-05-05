import { useMutation, useQuery } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { isSuperAdmin } from '../features/auth/auth-helpers';
import {
  GovAuditor,
  createGovAuditApi,
  listGovAuditorsApi,
  listGovMyScopesApi,
  listGovSchoolsApi,
} from '../features/gov/gov.api';
import {
  GovPlanAuditFormValue,
  buildDefaultGovPlanAuditForm,
  getFirstFormErrorMessage,
  govAuditTypeOptions,
  govPlanAuditFormSchema,
} from '../features/gov/gov.form-models';

function formatAuditType(value: (typeof govAuditTypeOptions)[number]) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString();
}

function getActiveScope(auditor: GovAuditor | null) {
  return auditor?.scopes.find((scope) => scope.isActive) ?? null;
}

export function GovPlanAuditPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<GovPlanAuditFormValue>(() =>
    buildDefaultGovPlanAuditForm(searchParams.get('schoolId') ?? undefined),
  );
  const canAssignAuditor = isSuperAdmin(auth.me);

  const schoolsQuery = useQuery({
    queryKey: ['gov-audit-schools', search],
    queryFn: () =>
      listGovSchoolsApi(auth.accessToken!, {
        q: search.trim() || undefined,
        page: 1,
        pageSize: 100,
      }),
  });

  const auditorsQuery = useQuery({
    queryKey: ['gov-audit-auditors'],
    queryFn: () => listGovAuditorsApi(auth.accessToken!),
    enabled: canAssignAuditor,
  });

  const scopesQuery = useQuery({
    queryKey: ['gov-my-scopes', auth.me?.id],
    queryFn: () => listGovMyScopesApi(auth.accessToken!),
    enabled: Boolean(auth.me?.id) && !canAssignAuditor,
  });

  const eligibleAuditors = useMemo(
    () =>
      (auditorsQuery.data?.items ?? []).filter(
        (auditor) => auditor.status === 'ACTIVE' && auditor.scopes.some((scope) => scope.isActive),
      ),
    [auditorsQuery.data],
  );

  const selectedAuditor = useMemo(
    () => eligibleAuditors.find((auditor) => auditor.id === form.auditorUserId) ?? null,
    [eligibleAuditors, form.auditorUserId],
  );

  const activeScope = useMemo(() => getActiveScope(selectedAuditor), [selectedAuditor]);

  useEffect(() => {
    if (!canAssignAuditor) {
      return;
    }

    const nextAuditorId = eligibleAuditors[0]?.id ?? '';
    const hasValidSelection = eligibleAuditors.some((auditor) => auditor.id === form.auditorUserId);
    if (hasValidSelection || form.auditorUserId === nextAuditorId) {
      return;
    }

    setForm((current: GovPlanAuditFormValue) => ({ ...current, auditorUserId: nextAuditorId }));
  }, [canAssignAuditor, eligibleAuditors, form.auditorUserId]);

  const createMutation = useMutation({
    mutationFn: () =>
      createGovAuditApi(auth.accessToken!, {
        schoolId: form.schoolId,
        auditorUserId: canAssignAuditor ? form.auditorUserId || undefined : undefined,
        auditType: form.auditType,
        plannedDate: form.plannedDate,
        planNotes: form.planNotes.trim() || undefined,
      }),
    onSuccess: (audit) => {
      showToast({ type: 'success', title: canAssignAuditor ? 'Audit planned and assigned' : 'Audit planned' });
      void navigate(canAssignAuditor ? '/gov/audits' : `/gov/audits/${audit.id}/conduct`);
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not plan audit',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const schoolOptions = useMemo(() => schoolsQuery.data?.items ?? [], [schoolsQuery.data]);
  const myScopes = scopesQuery.data?.items ?? [];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = govPlanAuditFormSchema.safeParse(form);
    if (!parsed.success) {
      showToast({
        type: 'error',
        title: 'Please review the audit form',
        message: getFirstFormErrorMessage(parsed.error),
      });
      return;
    }

    if (canAssignAuditor && !form.auditorUserId) {
      showToast({
        type: 'error',
        title: 'Choose an auditor',
        message: 'Super admins must assign an auditor before planning the audit.',
      });
      return;
    }

    void createMutation.mutate();
  }

  if (schoolsQuery.isError || (canAssignAuditor && auditorsQuery.isError)) {
    return (
      <StateView
        title={canAssignAuditor ? 'Could not load schools or auditors' : 'Could not load schools'}
        message={
          canAssignAuditor
            ? 'Retry the request. Super admins need both the school list and eligible auditor assignments before planning.'
            : 'Retry the request. Audits can only be planned for schools inside your scope.'
        }
        action={
          <button
            type="button"
            onClick={() => {
              void schoolsQuery.refetch();
              if (canAssignAuditor) {
                void auditorsQuery.refetch();
              }
            }}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const submitDisabled =
    createMutation.isPending ||
    schoolsQuery.isPending ||
    (canAssignAuditor && (auditorsQuery.isPending || !selectedAuditor));

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Plan Audit"
        subtitle={
          canAssignAuditor
            ? 'Pick a school, assign the right auditor, then schedule the visit.'
            : 'Pick a school in your assigned scope, choose the audit type, and schedule the visit.'
        }
        action={
          <Link
            to="/gov/audits"
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50"
          >
            Back to Audits
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step 1</p>
            <h3 className="mt-2 text-base font-bold text-slate-950">Choose the school</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Start with a school inside the active scope. If a school does not appear, it is outside your current
              area, inactive, or your assignment window is not active yet.
            </p>
          </article>
          <article className="rounded-2xl border border-brand-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step 2</p>
            <h3 className="mt-2 text-base font-bold text-slate-950">Define the visit</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Select the audit type, planned date, and notes so the visit has a clear purpose before field work starts.
            </p>
          </article>
          <article className="rounded-2xl border border-brand-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step 3</p>
            <h3 className="mt-2 text-base font-bold text-slate-950">Conduct and report</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Planning creates the audit record. After the visit, the assigned auditor submits the scored report and
              recommendations from the audit details page.
            </p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Why planning matters</h3>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
              <p>Planning links the audit to the correct school, scope, and date before any report is submitted.</p>
              <p>It gives the auditor a clear mission, helps supervisors track pending visits, and keeps the audit trail complete.</p>
              <p>Without a planned audit, there is no valid record to conduct, score, or report against later.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-950">Why actions may be limited</h3>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-amber-900">
              <p>You can act only inside schools that match your active country, province, district, or sector assignment.</p>
              <p>Assignment start and end dates also matter. If the assignment window is inactive, schools and actions will disappear.</p>
              <p>Government auditors can plan audits, submit audit reports, and leave incident feedback. School disciplinary actions stay read-only for oversight users.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {!canAssignAuditor && myScopes.length ? (
        <SectionCard title="Active Scope" subtitle="These assignments determine where you can plan or conduct audits.">
          <div className="grid gap-3">
            {myScopes.map((scope) => (
              <article key={scope.id} className="rounded-2xl border border-brand-100 bg-white p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{scope.label}</p>
                <p className="mt-1">
                  Window: {formatDateLabel(scope.startsAt) ?? 'Immediate'} to {formatDateLabel(scope.endsAt) ?? 'Open-ended'}
                </p>
                {scope.notes ? <p className="mt-2">{scope.notes}</p> : null}
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Audit Form" subtitle="Use the shared audit model so planning stays consistent across auditor workflows.">
        <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-brand-100 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
            <span className="font-medium">Search schools in scope</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by school name or code"
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
            <span className="font-medium">School</span>
            <select
              value={form.schoolId}
              onChange={(event) =>
                setForm((current: GovPlanAuditFormValue) => ({ ...current, schoolId: event.target.value }))
              }
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              required
            >
              <option value="">Select school</option>
              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.displayName} ({school.code})
                </option>
              ))}
            </select>
          </label>

          {canAssignAuditor ? (
            <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
              <span className="font-medium">Assign auditor</span>
              <select
                value={form.auditorUserId}
                onChange={(event) =>
                  setForm((current: GovPlanAuditFormValue) => ({ ...current, auditorUserId: event.target.value }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                required
                disabled={auditorsQuery.isPending || eligibleAuditors.length === 0}
              >
                <option value="">{auditorsQuery.isPending ? 'Loading auditors...' : 'Select auditor'}</option>
                {eligibleAuditors.map((auditor) => (
                  <option key={auditor.id} value={auditor.id}>
                    {auditor.firstName} {auditor.lastName} · {auditor.assignmentLabel}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="grid gap-1 text-sm text-slate-700">
            <span className="font-medium">Audit type</span>
            <select
              value={form.auditType}
              onChange={(event) =>
                setForm((current: GovPlanAuditFormValue) => ({
                  ...current,
                  auditType: event.target.value as GovPlanAuditFormValue['auditType'],
                }))
              }
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            >
              {govAuditTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {formatAuditType(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span className="font-medium">Planned date</span>
            <input
              type="date"
              value={form.plannedDate}
              onChange={(event) =>
                setForm((current: GovPlanAuditFormValue) => ({ ...current, plannedDate: event.target.value }))
              }
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              required
            />
          </label>
        </div>

        {canAssignAuditor ? (
          eligibleAuditors.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No active auditors with assignments are available yet. Create an auditor or add an assignment before
              planning a school audit.
            </div>
          ) : selectedAuditor ? (
            <div className="grid gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Auditor</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {selectedAuditor.firstName} {selectedAuditor.lastName}
                  </p>
                </div>
                <p className="text-sm text-slate-700">{selectedAuditor.email}</p>
                <p className="text-sm text-slate-700">{selectedAuditor.phone || 'No phone number saved'}</p>
                <p className="text-sm text-slate-700">Level: {selectedAuditor.level}</p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active Assignment</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {activeScope?.label ?? selectedAuditor.assignmentLabel}
                  </p>
                </div>
                {activeScope?.assignedBy ? (
                  <p className="text-sm text-slate-700">
                    Assigned by {activeScope.assignedBy.firstName} {activeScope.assignedBy.lastName}
                  </p>
                ) : null}
                {activeScope?.startsAt || activeScope?.endsAt ? (
                  <p className="text-sm text-slate-700">
                    Window: {formatDateLabel(activeScope.startsAt) ?? 'Immediate'} to{' '}
                    {formatDateLabel(activeScope.endsAt) ?? 'Open-ended'}
                  </p>
                ) : null}
                {activeScope?.notes ? <p className="text-sm text-slate-700">{activeScope.notes}</p> : null}
              </div>
            </div>
          ) : null
        ) : null}

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Planning notes</span>
          <textarea
            value={form.planNotes}
            onChange={(event) =>
              setForm((current: GovPlanAuditFormValue) => ({ ...current, planNotes: event.target.value }))
            }
            rows={4}
            placeholder="Optional notes for the audit visit."
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitDisabled}
            className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createMutation.isPending ? 'Planning...' : canAssignAuditor ? 'Plan Audit' : 'Save and Continue'}
          </button>
        </div>
        </form>
      </SectionCard>
    </div>
  );
}
