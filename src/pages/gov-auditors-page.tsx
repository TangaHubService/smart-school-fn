import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  GovAuditor,
  GovScopeLevel,
  assignGovAuditorScopeApi,
  createGovAuditorApi,
  listGovAuditorsApi,
  updateGovScopeApi,
} from '../features/gov/gov.api';
import {
  getRwandaDistricts,
  getRwandaProvinces,
  getRwandaSectors,
} from '../features/location/rwanda-location';

const scopeLevelOptions: GovScopeLevel[] = ['SECTOR', 'DISTRICT', 'PROVINCE', 'COUNTRY'];

function buildDefaultScopeForm() {
  return {
    scopeLevel: 'SECTOR' as GovScopeLevel,
    country: 'Rwanda',
    province: '',
    district: '',
    sector: '',
    notes: '',
  };
}

function formatScopeLabel(scope: {
  scopeLevel: GovScopeLevel;
  country: string;
  province: string | null;
  district: string | null;
  sector: string | null;
}) {
  if (scope.scopeLevel === 'COUNTRY') {
    return scope.country;
  }

  if (scope.scopeLevel === 'PROVINCE') {
    return `${scope.province ?? 'Unknown province'}, ${scope.country}`;
  }

  if (scope.scopeLevel === 'DISTRICT') {
    return `${scope.district ?? 'Unknown district'}, ${scope.province ?? 'Unknown province'}`;
  }

  return `${scope.sector ?? 'Unknown sector'}, ${scope.district ?? 'Unknown district'}`;
}

export function GovAuditorsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<GovAuditor | null>(null);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [scopeForm, setScopeForm] = useState(buildDefaultScopeForm);

  const auditorsQuery = useQuery({
    queryKey: ['gov-auditors', search],
    queryFn: () =>
      listGovAuditorsApi(auth.accessToken!, {
        q: search.trim() || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createGovAuditorApi(auth.accessToken!, {
        email: createForm.email.trim(),
        password: createForm.password,
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        phone: createForm.phone.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-auditors'] });
      setIsCreateOpen(false);
      setCreateForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
      });
      showToast({
        type: 'success',
        title: 'Auditor created',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create auditor',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const assignScopeMutation = useMutation({
    mutationFn: () =>
      assignGovAuditorScopeApi(auth.accessToken!, selectedAuditor!.id, {
        scopeLevel: scopeForm.scopeLevel,
        country: scopeForm.country.trim() || 'Rwanda',
        province: scopeForm.province.trim() || undefined,
        district: scopeForm.district.trim() || undefined,
        sector: scopeForm.sector.trim() || undefined,
        notes: scopeForm.notes.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-auditors'] });
      setSelectedAuditor(null);
      setScopeForm(buildDefaultScopeForm());
      showToast({
        type: 'success',
        title: 'Scope assigned',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not assign scope',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const deactivateScopeMutation = useMutation({
    mutationFn: (scopeId: string) =>
      updateGovScopeApi(auth.accessToken!, scopeId, {
        isActive: false,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-auditors'] });
      showToast({
        type: 'success',
        title: 'Scope deactivated',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not deactivate scope',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createMutation.mutate();
  }

  function handleAssignScopeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void assignScopeMutation.mutate();
  }

  const auditors = auditorsQuery.data?.items ?? [];
  const requiresProvince =
    scopeForm.scopeLevel === 'PROVINCE' ||
    scopeForm.scopeLevel === 'DISTRICT' ||
    scopeForm.scopeLevel === 'SECTOR';
  const requiresDistrict =
    scopeForm.scopeLevel === 'DISTRICT' || scopeForm.scopeLevel === 'SECTOR';
  const requiresSector = scopeForm.scopeLevel === 'SECTOR';
  const provinceOptions = getRwandaProvinces();
  const districtOptions = getRwandaDistricts(scopeForm.province);
  const sectorOptions = getRwandaSectors(scopeForm.province, scopeForm.district);

  return (
    <>
      <SectionCard
        title="Government Auditors"
        subtitle="Create platform-level auditor accounts and assign sector, district, province, or country scope without changing school tenant workflows."
        action={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Create auditor
          </button>
        }
      >
        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search auditor by name or email"
            className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
          />
        </div>

        {auditorsQuery.isPending ? (
          <div className="grid gap-3">
            <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
            <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
            <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          </div>
        ) : null}

        {auditorsQuery.isError ? (
          <StateView
            title="Could not load auditors"
            message="Retry the request. Existing scope assignments remain unchanged."
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
        ) : null}

        {!auditorsQuery.isPending && !auditorsQuery.isError && !auditors.length ? (
          <EmptyState
            title="No auditors yet"
            message="Create the first government auditor to begin scoped oversight across schools."
          />
        ) : null}

        {!auditorsQuery.isPending && !auditorsQuery.isError && auditors.length ? (
          <div className="grid gap-3">
            {auditors.map((auditor) => (
              <article key={auditor.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      {auditor.firstName} {auditor.lastName}
                    </h3>
                    <p className="text-sm text-slate-700">{auditor.email}</p>
                    <p className="text-xs text-slate-500">{auditor.phone || 'No phone provided'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAuditor(auditor);
                      setScopeForm(buildDefaultScopeForm());
                    }}
                    className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Assign scope
                  </button>
                </div>

                <div className="mt-4 grid gap-2">
                  {auditor.scopes.length ? (
                    auditor.scopes.map((scope) => (
                      <div
                        key={scope.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {scope.scopeLevel.replace('_', ' ')}
                          </p>
                          <p className="text-slate-700">{formatScopeLabel(scope)}</p>
                          <p className="text-xs text-slate-500">
                            {scope.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        {scope.isActive ? (
                          <button
                            type="button"
                            onClick={() => deactivateScopeMutation.mutate(scope.id)}
                            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600"
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <EmptyState message="No scope assignments yet for this auditor." />
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <Modal
        open={isCreateOpen}
        title="Create Government Auditor"
        description="This creates a platform user account and assigns the built-in GOV_AUDITOR role."
        onClose={() => setIsCreateOpen(false)}
      >
        <form className="grid gap-3" onSubmit={handleCreateSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, email: event.target.value }))
              }
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              First name
              <input
                type="text"
                value={createForm.firstName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, firstName: event.target.value }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Last name
              <input
                type="text"
                value={createForm.lastName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, lastName: event.target.value }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Phone
            <input
              type="text"
              value={createForm.phone}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, phone: event.target.value }))
              }
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Temporary password
            <input
              type="password"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, password: event.target.value }))
              }
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating...' : 'Create auditor'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedAuditor)}
        title="Assign Auditor Scope"
        description={
          selectedAuditor
            ? `Assign a new oversight scope to ${selectedAuditor.firstName} ${selectedAuditor.lastName}.`
            : undefined
        }
        onClose={() => {
          setSelectedAuditor(null);
          setScopeForm(buildDefaultScopeForm());
        }}
      >
        <form className="grid gap-3" onSubmit={handleAssignScopeSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Scope level
            <select
              value={scopeForm.scopeLevel}
              onChange={(event) =>
                setScopeForm((current) => ({
                  ...current,
                  scopeLevel: event.target.value as GovScopeLevel,
                  province:
                    event.target.value === 'COUNTRY'
                      ? ''
                      : current.province,
                  district:
                    event.target.value === 'COUNTRY' || event.target.value === 'PROVINCE'
                      ? ''
                      : current.district,
                  sector: event.target.value === 'SECTOR' ? current.sector : '',
                }))
              }
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            >
              {scopeLevelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Country
            <input
              type="text"
              value={scopeForm.country}
              readOnly
              className="h-10 rounded-lg border border-brand-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none"
            />
          </label>
          {requiresProvince ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Province
              <select
                value={scopeForm.province}
                onChange={(event) =>
                  setScopeForm((current) => ({
                    ...current,
                    province: event.target.value,
                    district: '',
                    sector: '',
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              >
                <option value="">Select province</option>
                {provinceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {requiresDistrict ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              District
              <select
                value={scopeForm.district}
                onChange={(event) =>
                  setScopeForm((current) => ({
                    ...current,
                    district: event.target.value,
                    sector: '',
                  }))
                }
                disabled={!scopeForm.province}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Select district</option>
                {districtOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {requiresSector ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Sector
              <select
                value={scopeForm.sector}
                onChange={(event) =>
                  setScopeForm((current) => ({ ...current, sector: event.target.value }))
                }
                disabled={!scopeForm.province || !scopeForm.district}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Select sector</option>
                {sectorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Notes
            <textarea
              rows={3}
              value={scopeForm.notes}
              onChange={(event) =>
                setScopeForm((current) => ({ ...current, notes: event.target.value }))
              }
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={assignScopeMutation.isPending}
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assignScopeMutation.isPending ? 'Assigning...' : 'Assign scope'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
