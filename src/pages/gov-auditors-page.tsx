import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  assignGovAuditorScopeApi,
  AuditorLevel,
  createGovAuditorApi,
  GovAuditor,
  GovAuditorScope,
  GovScopeLevel,
  listGovAuditorsApi,
  listGovAuditorScopesApi,
  updateGovScopeApi,
} from '../features/gov/gov.api';
import {
  GovAuditorAssignmentFormValue,
  GovAuditorCreateFormValue,
  auditorLevelOptions,
  defaultGovAuditorAssignmentForm,
  defaultGovAuditorCreateForm,
  getFirstFormErrorMessage,
  govAuditorAssignmentFormSchema,
  govAuditorCreateFormSchema,
  resetLocationForLevel,
} from '../features/gov/gov.form-models';
import {
  getRwandaDistricts,
  getRwandaProvinces,
  getRwandaSectors,
} from '../features/location/rwanda-location';

interface AssignmentFieldsValue {
  level: AuditorLevel;
  country: string;
  province: string;
  district: string;
  sector: string;
}

function toScopeLevel(level: AuditorLevel): GovScopeLevel {
  switch (level) {
    case 'NATIONAL':
      return 'COUNTRY';
    case 'PROVINCE':
      return 'PROVINCE';
    case 'DISTRICT':
      return 'DISTRICT';
    default:
      return 'SECTOR';
  }
}

function formatDateInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
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

function AuditorAssignmentFields(props: {
  value: AssignmentFieldsValue;
  onChange: (next: Partial<AssignmentFieldsValue>) => void;
}) {
  const provinceOptions = getRwandaProvinces();
  const districtOptions = props.value.province ? getRwandaDistricts(props.value.province) : [];
  const sectorOptions =
    props.value.province && props.value.district
      ? getRwandaSectors(props.value.province, props.value.district)
      : [];
  const needsProvince = props.value.level !== 'NATIONAL';
  const needsDistrict = props.value.level === 'DISTRICT' || props.value.level === 'SECTOR';
  const needsSector = props.value.level === 'SECTOR';

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1 text-sm text-slate-700">
        <span className="font-medium">Level</span>
        <select
          value={props.value.level}
          onChange={(event) =>
            props.onChange(
              resetLocationForLevel(event.target.value as AuditorLevel, {
                ...props.value,
                level: event.target.value as AuditorLevel,
              })
            )
          }
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          {auditorLevelOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm text-slate-700">
        <span className="font-medium">Country</span>
        <input
          type="text"
          value={props.value.country}
          onChange={(event) => props.onChange({ country: event.target.value })}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
      </label>

      <label className="grid gap-1 text-sm text-slate-700">
        <span className="font-medium">Province</span>
        <select
          value={props.value.province}
          onChange={(event) =>
            props.onChange({ province: event.target.value, district: '', sector: '' })
          }
          disabled={!needsProvince}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{needsProvince ? 'Select province' : 'Not needed for national'}</option>
          {provinceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm text-slate-700">
        <span className="font-medium">District</span>
        <select
          value={props.value.district}
          onChange={(event) => props.onChange({ district: event.target.value, sector: '' })}
          disabled={!needsDistrict || !props.value.province}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{needsDistrict ? 'Select district' : 'Not needed at this level'}</option>
          {districtOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
        <span className="font-medium">Sector</span>
        <select
          value={props.value.sector}
          onChange={(event) => props.onChange({ sector: event.target.value })}
          disabled={!needsSector || !props.value.district}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{needsSector ? 'Select sector' : 'Not needed at this level'}</option>
          {sectorOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ScopeHistoryCard({ scope }: { scope: GovAuditorScope }) {
  return (
    <article className="grid gap-2 rounded-xl border border-brand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{scope.label}</p>
          <p className="text-xs text-slate-500">
            Created {new Date(scope.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            scope.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {scope.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {scope.assignedBy ? (
        <p className="text-sm text-slate-700">
          Assigned by {scope.assignedBy.firstName} {scope.assignedBy.lastName}
        </p>
      ) : null}
      {scope.startsAt || scope.endsAt ? (
        <p className="text-sm text-slate-700">
          Window: {formatDateLabel(scope.startsAt) ?? 'Immediate'} to{' '}
          {formatDateLabel(scope.endsAt) ?? 'Open-ended'}
        </p>
      ) : null}
      {scope.notes ? <p className="text-sm leading-6 text-slate-700">{scope.notes}</p> : null}
    </article>
  );
}

export function GovAuditorsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<GovAuditor | null>(null);
  const [detailAuditor, setDetailAuditor] = useState<GovAuditor | null>(null);
  const [createForm, setCreateForm] = useState<GovAuditorCreateFormValue>(
    () => defaultGovAuditorCreateForm
  );
  const [assignmentForm, setAssignmentForm] = useState<GovAuditorAssignmentFormValue>(
    () => defaultGovAuditorAssignmentForm
  );

  const auditorsQuery = useQuery({
    queryKey: ['gov-auditors', search],
    queryFn: () => listGovAuditorsApi(auth.accessToken!, { q: search.trim() || undefined }),
  });

  const detailScopesQuery = useQuery({
    queryKey: ['gov-auditor-scopes', detailAuditor?.id],
    queryFn: () => listGovAuditorScopesApi(auth.accessToken!, detailAuditor!.id),
    enabled: Boolean(detailAuditor),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createGovAuditorApi(auth.accessToken!, {
        email: createForm.email.trim(),
        password: createForm.password,
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        phone: createForm.phone.trim() || undefined,
        level: createForm.level,
        country: createForm.country.trim() || 'Rwanda',
        province: createForm.province || undefined,
        district: createForm.district || undefined,
        sector: createForm.sector || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-auditors'] });
      setCreateForm(defaultGovAuditorCreateForm);
      setIsCreateOpen(false);
      showToast({ type: 'success', title: 'Auditor created' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create auditor',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignGovAuditorScopeApi(auth.accessToken!, selectedAuditor!.id, {
        scopeLevel: toScopeLevel(assignmentForm.level),
        country: assignmentForm.country.trim() || 'Rwanda',
        province: assignmentForm.province || undefined,
        district: assignmentForm.district || undefined,
        sector: assignmentForm.sector || undefined,
        notes: assignmentForm.notes.trim() || undefined,
        startsAt: assignmentForm.startsAt || undefined,
        endsAt: assignmentForm.endsAt || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gov-auditors'] }),
        queryClient.invalidateQueries({ queryKey: ['gov-auditor-scopes'] }),
      ]);
      setSelectedAuditor(null);
      setAssignmentForm(defaultGovAuditorAssignmentForm);
      showToast({ type: 'success', title: 'Assignment updated' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update assignment',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (scopeId: string) =>
      updateGovScopeApi(auth.accessToken!, scopeId, { isActive: false }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gov-auditors'] }),
        queryClient.invalidateQueries({ queryKey: ['gov-auditor-scopes'] }),
      ]);
      showToast({ type: 'success', title: 'Assignment deactivated' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not deactivate assignment',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const auditors = auditorsQuery.data?.items ?? [];

  const rows = useMemo(
    () =>
      auditors.map((auditor) => ({
        ...auditor,
        activeScope: getActiveScope(auditor),
      })),
    [auditors]
  );

  const detailScopes = detailScopesQuery.data?.items ?? detailAuditor?.scopes ?? [];
  const detailActiveScope = detailScopes.find((scope) => scope.isActive) ?? detailScopes[0] ?? null;

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = govAuditorCreateFormSchema.safeParse(createForm);
    if (!parsed.success) {
      showToast({
        type: 'error',
        title: 'Please review the auditor form',
        message: getFirstFormErrorMessage(parsed.error),
      });
      return;
    }

    void createMutation.mutate();
  }

  function handleAssignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = govAuditorAssignmentFormSchema.safeParse(assignmentForm);
    if (!parsed.success) {
      showToast({
        type: 'error',
        title: 'Please review the assignment form',
        message: getFirstFormErrorMessage(parsed.error),
      });
      return;
    }

    void assignMutation.mutate();
  }

  if (auditorsQuery.isPending) {
    return (
      <SectionCard
        title="Auditor Management"
        subtitle="Create and assign government auditors by Rwanda location."
      >
        <div className="grid gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
        </div>
      </SectionCard>
    );
  }

  if (auditorsQuery.isError) {
    return (
      <SectionCard title="Auditor Management">
        <StateView
          title="Could not load auditors"
          message="Retry the request. Existing location assignments remain unchanged."
          action={
            <button
              type="button"
              onClick={() => void auditorsQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Auditor Management"
      subtitle="Each auditor gets one active assignment level that automatically filters visible schools."
      action={
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Create Auditor
        </button>
      }
    >
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search auditor by name or email"
          className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400 md:max-w-sm"
        />
      </div>

      {!rows.length ? (
        <EmptyState
          title="No auditors yet"
          message="Create the first auditor and assign a Rwanda location to begin school audits."
          centered={false}
          className="min-h-0"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Auditor</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((auditor, index) => (
                <tr key={auditor.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      {auditor.firstName} {auditor.lastName}
                    </p>
                    <p className="text-slate-600">{auditor.email}</p>
                    <p className="text-xs text-slate-500">{auditor.phone || 'No phone provided'}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{auditor.level}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{auditor.activeScope?.label ?? auditor.assignmentLabel}</p>
                    {auditor.activeScope?.assignedBy ? (
                      <p className="text-xs text-slate-500">
                        Assigned by {auditor.activeScope.assignedBy.firstName}{' '}
                        {auditor.activeScope.assignedBy.lastName}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          auditor.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {auditor.status}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          auditor.activeScope
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {auditor.activeScope ? 'Assigned' : 'No active assignment'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailAuditor(auditor)}
                        className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-50"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const activeScope = getActiveScope(auditor);
                          setSelectedAuditor(auditor);
                          setAssignmentForm({
                            level: auditor.level,
                            country: auditor.country || 'Rwanda',
                            province: auditor.province || '',
                            district: auditor.district || '',
                            sector: auditor.sector || '',
                            notes: activeScope?.notes || '',
                            startsAt: formatDateInputValue(activeScope?.startsAt ?? null),
                            endsAt: formatDateInputValue(activeScope?.endsAt ?? null),
                          });
                        }}
                        className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-50"
                      >
                        Reassign
                      </button>
                      {auditor.activeScope ? (
                        <button
                          type="button"
                          onClick={() => void deactivateMutation.mutate(auditor.activeScope!.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          Deactivate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Auditor">
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">First name</span>
              <input
                type="text"
                value={createForm.firstName}
                onChange={(event) =>
                  setCreateForm((current: GovAuditorCreateFormValue) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                required
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Last name</span>
              <input
                type="text"
                value={createForm.lastName}
                onChange={(event) =>
                  setCreateForm((current: GovAuditorCreateFormValue) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                required
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
              <span className="font-medium">Email</span>
              <input
                type="email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current: GovAuditorCreateFormValue) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                required
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Phone</span>
              <input
                type="text"
                value={createForm.phone}
                onChange={(event) =>
                  setCreateForm((current: GovAuditorCreateFormValue) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Temporary password</span>
              <input
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current: GovAuditorCreateFormValue) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                required
              />
            </label>
          </div>

          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Assignment</h3>
            <p className="mb-3 text-xs text-slate-600">
              Choose the highest Rwanda location this auditor should cover.
            </p>
            <AuditorAssignmentFields
              value={createForm}
              onChange={(next) =>
                setCreateForm((current: GovAuditorCreateFormValue) => ({ ...current, ...next }))
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Auditor'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!selectedAuditor}
        onClose={() => {
          setSelectedAuditor(null);
          setAssignmentForm(defaultGovAuditorAssignmentForm);
        }}
        title={
          selectedAuditor
            ? `Reassign ${selectedAuditor.firstName} ${selectedAuditor.lastName}`
            : 'Reassign Auditor'
        }
      >
        <form className="space-y-4" onSubmit={handleAssignSubmit}>
          <AuditorAssignmentFields
            value={assignmentForm}
            onChange={(next) =>
              setAssignmentForm((current: GovAuditorAssignmentFormValue) => ({
                ...current,
                ...next,
              }))
            }
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Starts on</span>
              <input
                type="date"
                value={assignmentForm.startsAt}
                onChange={(event) =>
                  setAssignmentForm((current: GovAuditorAssignmentFormValue) => ({
                    ...current,
                    startsAt: event.target.value,
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Ends on</span>
              <input
                type="date"
                value={assignmentForm.endsAt}
                onChange={(event) =>
                  setAssignmentForm((current: GovAuditorAssignmentFormValue) => ({
                    ...current,
                    endsAt: event.target.value,
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm text-slate-700">
            <span className="font-medium">Assignment notes</span>
            <textarea
              value={assignmentForm.notes}
              onChange={(event) =>
                setAssignmentForm((current: GovAuditorAssignmentFormValue) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={4}
              placeholder="Optional context for the assignment."
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedAuditor(null)}
              className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignMutation.isPending}
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {assignMutation.isPending ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!detailAuditor}
        onClose={() => setDetailAuditor(null)}
        title={
          detailAuditor ? `${detailAuditor.firstName} ${detailAuditor.lastName}` : 'Auditor Details'
        }
      >
        {detailAuditor ? (
          <div className="grid gap-4">
            <div className="grid gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-slate-700">{detailAuditor.email}</p>
                <p className="text-sm text-slate-700">
                  {detailAuditor.phone || 'No phone number saved'}
                </p>
                <p className="text-sm text-slate-700">Level: {detailAuditor.level}</p>
                <p className="text-sm text-slate-700">
                  Account created {new Date(detailAuditor.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  {detailActiveScope?.label ?? detailAuditor.assignmentLabel}
                </p>
                <p className="text-sm text-slate-700">Status: {detailAuditor.status}</p>
                {detailActiveScope?.assignedBy ? (
                  <p className="text-sm text-slate-700">
                    Assigned by {detailActiveScope.assignedBy.firstName}{' '}
                    {detailActiveScope.assignedBy.lastName}
                  </p>
                ) : null}
                {detailActiveScope?.startsAt || detailActiveScope?.endsAt ? (
                  <p className="text-sm text-slate-700">
                    Window: {formatDateLabel(detailActiveScope.startsAt) ?? 'Immediate'} to{' '}
                    {formatDateLabel(detailActiveScope.endsAt) ?? 'Open-ended'}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Assignment History</h3>
                {detailScopesQuery.isPending ? (
                  <p className="text-xs text-slate-500">Refreshing assignments...</p>
                ) : null}
              </div>

              {detailScopesQuery.isError ? (
                <StateView
                  title="Could not load assignment history"
                  message="Retry to refresh this auditor's full assignment timeline."
                  action={
                    <button
                      type="button"
                      onClick={() => void detailScopesQuery.refetch()}
                      className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Retry
                    </button>
                  }
                />
              ) : detailScopes.length ? (
                <div className="grid gap-3">
                  {detailScopes.map((scope) => (
                    <ScopeHistoryCard key={scope.id} scope={scope} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No assignments yet"
                  message="This auditor does not have saved assignment history."
                  centered={false}
                  className="min-h-0"
                />
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </SectionCard>
  );
}
