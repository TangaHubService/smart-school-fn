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
  if (scope.scopeLevel === 'COUNTRY') return scope.country;
  if (scope.scopeLevel === 'PROVINCE') return `${scope.province ?? 'Unknown province'}, ${scope.country}`;
  if (scope.scopeLevel === 'DISTRICT') return `${scope.district ?? 'Unknown district'}, ${scope.province ?? 'Unknown province'}`;
  return `${scope.sector ?? 'Unknown sector'}, ${scope.district ?? 'Unknown district'}`;
}

export function GovAuditorsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<GovAuditor | null>(null);
  const [selectedAuditorForView, setSelectedAuditorForView] = useState<GovAuditor | null>(null);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [scopeForm, setScopeForm] = useState(buildDefaultScopeForm);

  const requiresProvince = scopeForm.scopeLevel !== 'COUNTRY';
  const requiresDistrict = scopeForm.scopeLevel === 'SECTOR' || scopeForm.scopeLevel === 'DISTRICT';
  const requiresSector = scopeForm.scopeLevel === 'SECTOR';

  const provinceOptions = getRwandaProvinces();
  const districtOptions = scopeForm.province ? getRwandaDistricts(scopeForm.province) : [];
  const sectorOptions = scopeForm.district ? getRwandaSectors(scopeForm.province, scopeForm.district) : [];

  const auditorsQuery = useQuery({
    queryKey: ['gov-auditors', search],
    queryFn: () => listGovAuditorsApi(auth.accessToken!, { q: search.trim() || undefined }),
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
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', phone: '' });
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

  const assignScopeMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        scopeLevel: scopeForm.scopeLevel,
        country: scopeForm.country.trim() || 'Rwanda',
      };
      if (scopeForm.scopeLevel !== 'COUNTRY') {
        payload.province = scopeForm.province.trim() || undefined;
      }
      if (scopeForm.scopeLevel === 'DISTRICT' || scopeForm.scopeLevel === 'SECTOR') {
        payload.district = scopeForm.district.trim() || undefined;
      }
      if (scopeForm.scopeLevel === 'SECTOR') {
        payload.sector = scopeForm.sector.trim() || undefined;
      }
      if (scopeForm.notes.trim()) {
        payload.notes = scopeForm.notes.trim();
      }
      return assignGovAuditorScopeApi(auth.accessToken!, selectedAuditor!.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-auditors'] });
      setSelectedAuditor(null);
      setScopeForm(buildDefaultScopeForm());
      showToast({ type: 'success', title: 'Scope assigned' });
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
    mutationFn: (scopeId: string) => updateGovScopeApi(auth.accessToken!, scopeId, { isActive: false }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-auditors'] });
      showToast({ type: 'success', title: 'Scope deactivated' });
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

  if (auditorsQuery.isPending) {
    return (
      <SectionCard title="Government Auditors">
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
      <SectionCard title="Government Auditors">
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
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Government Auditors"
      action={
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + Create Auditor
        </button>
      }
    >
      {!auditors.length ? (
        <EmptyState title="No auditors yet" message="Create the first government auditor to begin scoped oversight across schools." />
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-brand-100 bg-white">
          <table className="w-full min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {auditors.map((auditor, index) => (
                <tr
                  key={auditor.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {auditor.firstName} {auditor.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{auditor.email}</td>
                  <td className="px-4 py-3 text-slate-700">{auditor.phone || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {auditor.scopes.filter(s => s.isActive).length > 0
                      ? formatScopeLabel(auditor.scopes.filter(s => s.isActive)[0])
                      : 'No scope assigned'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (auditor.scopes.length) {
                            const activeScope = auditor.scopes.find(s => s.isActive);
                            if (activeScope) {
                              void deactivateScopeMutation.mutate(activeScope.id);
                            }
                          }
                        }}
                        className="inline-flex items-center rounded-lg border border-red-400 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                      >
                        Deactivate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAuditor(auditor);
                          setScopeForm(buildDefaultScopeForm());
                        }}
                        className="ml-2 inline-flex items-center rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAuditor(auditor);
                          setScopeForm(buildDefaultScopeForm());
                        }}
                        className="ml-2 inline-flex items-center rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        Assign Scope
                      </button>
                    </>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Auditor Modal */}
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
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))}
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              First name
              <input
                type="text"
                required
                value={createForm.firstName}
                onChange={(e) => setCreateForm((c) => ({ ...c, firstName: e.target.value }))}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Last name
              <input
                type="text"
                required
                value={createForm.lastName}
                onChange={(e) => setCreateForm((c) => ({ ...c, lastName: e.target.value }))}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Phone
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm((c) => ({ ...c, phone: e.target.value }))}
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Temporary password
            <input
              type="password"
              required
              value={createForm.password}
              onChange={(e) => setCreateForm((c) => ({ ...c, password: e.target.value }))}
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Auditor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Scope Modal */}
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
            Scope Level
            <select
              value={scopeForm.scopeLevel}
              onChange={(e) =>
                setScopeForm((c) => ({
                  ...c,
                  scopeLevel: e.target.value as GovScopeLevel,
                  province: e.target.value === 'COUNTRY' ? '' : c.province,
                  district: e.target.value === 'COUNTRY' || e.target.value === 'PROVINCE' ? '' : c.district,
                  sector: e.target.value === 'SECTOR' ? c.sector : '',
                }))
              }
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            >
              {scopeLevelOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
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

          {requiresProvince && (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Province
              <select
                value={scopeForm.province}
                onChange={(e) => setScopeForm((c) => ({ ...c, province: e.target.value, district: '', sector: '' }))}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              >
                <option value="">Select province</option>
                {provinceOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          )}

          {requiresDistrict && (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              District
              <select
                value={scopeForm.district}
                onChange={(e) => setScopeForm((c) => ({ ...c, district: e.target.value, sector: '' }))}
                disabled={!scopeForm.province}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Select district</option>
                {districtOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          )}

          {requiresSector && (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Sector
              <select
                value={scopeForm.sector}
                onChange={(e) => setScopeForm((c) => ({ ...c, sector: e.target.value }))}
                disabled={!scopeForm.province || !scopeForm.district}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Select sector</option>
                {sectorOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          )}

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Notes
            <textarea
              rows={3}
              value={scopeForm.notes}
              onChange={(e) => setScopeForm((c) => ({ ...c, notes: e.target.value }))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              placeholder="Optional notes about this scope assignment..."
            />
          </label>

          <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAuditor(null);
                        setScopeForm(buildDefaultScopeForm());
                      }}
                      className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                    >
                      Cancel
                    </button>
            <button
              type="submit"
              disabled={assignScopeMutation.isPending}
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assignScopeMutation.isPending ? 'Assigning...' : 'Assign Scope'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}
