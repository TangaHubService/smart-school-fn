import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { UserPlus, Search, X, Loader2 } from 'lucide-react';

import { SectionCard } from '../components/section-card';
import { Modal } from '../components/modal';
import { useToast } from '../components/toast';
import {
  listAuditorsApi,
  getLocationsApi,
  searchUsersApi,
  assignAuditorApi,
  createAuditorUserApi,
  removeAuditorScopeApi,
  type AssignAuditorRequest,
  type CreateAuditorUserInput,
  type AuditorLevel,
} from '../features/admin-auditors/admin-auditors.api';

export function AdminAuditorsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<AuditorLevel | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAuditor, setEditingAuditor] = useState<{
    id: string;
    userId: string;
    name: string;
    email: string;
  } | null>(null);
  const [auditorMode, setAuditorMode] = useState<'new' | 'existing'>('new');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [assignLevel, setAssignLevel] = useState<AuditorLevel>('NATIONAL');
  const [assignProvince, setAssignProvince] = useState('');
  const [assignDistrict, setAssignDistrict] = useState('');
  const [assignSector, setAssignSector] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [formError, setFormError] = useState('');

  const auditorsQuery = useQuery({
    queryKey: ['admin-auditors', search, levelFilter, page, pageSize],
    queryFn: () =>
      listAuditorsApi({
        search: search.trim() || undefined,
        level: levelFilter || undefined,
        page,
        pageSize,
      }),
  });

  const locationsQuery = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => getLocationsApi(),
  });

  const districtsQuery = useQuery({
    queryKey: ['admin-locations', 'districts', assignProvince],
    queryFn: () => getLocationsApi({ province: assignProvince }),
    enabled: !!assignProvince,
  });

  const sectorsQuery = useQuery({
    queryKey: ['admin-locations', 'sectors', assignProvince, assignDistrict],
    queryFn: () => getLocationsApi({ province: assignProvince, district: assignDistrict }),
    enabled: !!assignProvince && !!assignDistrict,
  });

  const userSearchQuery = useQuery({
    queryKey: ['admin-user-search', userSearch],
    queryFn: () => searchUsersApi(userSearch.trim()),
    enabled: auditorMode === 'existing' && !editingAuditor && userSearch.trim().length >= 2,
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AssignAuditorRequest }) =>
      assignAuditorApi(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auditors'] });
      setShowAssignModal(false);
      resetForm();
      showToast({ type: 'success', title: 'Auditor scope saved' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not save auditor scope',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const createAuditorMutation = useMutation({
    mutationFn: (input: CreateAuditorUserInput) => createAuditorUserApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auditors'] });
      setShowAssignModal(false);
      resetForm();
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

  const removeScopeMutation = useMutation({
    mutationFn: (auditorId: string) => removeAuditorScopeApi(auditorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auditors'] });
      showToast({ type: 'success', title: 'Auditor scope removed' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not remove auditor scope',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  function resetForm() {
    setAuditorMode('new');
    setSelectedUser(null);
    setUserSearch('');
    setAssignLevel('NATIONAL');
    setAssignProvince('');
    setAssignDistrict('');
    setAssignSector('');
    setEditingAuditor(null);
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserPassword('');
    setFormError('');
  }

  function getScopePayload(): AssignAuditorRequest {
    const data: AssignAuditorRequest = { level: assignLevel };
    if (assignLevel !== 'NATIONAL') data.province = assignProvince;
    if (assignLevel === 'DISTRICT' || assignLevel === 'SECTOR') data.district = assignDistrict;
    if (assignLevel === 'SECTOR') data.sector = assignSector;
    return data;
  }

  function hasRequiredScope() {
    if (assignLevel === 'NATIONAL') return true;
    if (assignLevel === 'PROVINCE') return Boolean(assignProvince);
    if (assignLevel === 'DISTRICT') return Boolean(assignProvince && assignDistrict);
    return Boolean(assignProvince && assignDistrict && assignSector);
  }

  function validateScope() {
    if (hasRequiredScope()) return true;
    if (assignLevel === 'PROVINCE') setFormError('Province is required for province auditors.');
    if (assignLevel === 'DISTRICT')
      setFormError('Province and district are required for district auditors.');
    if (assignLevel === 'SECTOR')
      setFormError('Province, district, and sector are required for sector auditors.');
    return false;
  }

  function validateNewAuditor() {
    if (!newUserFirstName.trim() || !newUserLastName.trim()) {
      setFormError('First name and last name are required.');
      return false;
    }

    if (!newUserEmail.trim()) {
      setFormError('Email is required.');
      return false;
    }

    if (newUserPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return false;
    }

    return true;
  }

  function handleAssign() {
    setFormError('');
    if (!validateScope()) return;

    const data = getScopePayload();

    if (editingAuditor) {
      assignMutation.mutate({ userId: editingAuditor.userId, data });
      return;
    }

    if (auditorMode === 'existing') {
      if (!selectedUser) {
        setFormError('Select an existing platform user first.');
        return;
      }
      assignMutation.mutate({ userId: selectedUser.id, data });
      return;
    }

    if (!validateNewAuditor()) return;

    createAuditorMutation.mutate({
      firstName: newUserFirstName.trim(),
      lastName: newUserLastName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim() || undefined,
      password: newUserPassword,
      ...data,
    });
  }

  const rows = useMemo(() => {
    const items = auditorsQuery.data?.items ?? [];
    return items.map((auditor, index) => ({
      no: (page - 1) * pageSize + index + 1,
      name: `${auditor.firstName} ${auditor.lastName}`.trim(),
      email: auditor.email,
      level: auditor.level,
      scope:
        [auditor.province, auditor.district, auditor.sector].filter(Boolean).join(' / ') ||
        'All Rwanda',
      status: auditor.isActive ? 'Active' : 'Inactive',
      raw: auditor,
    }));
  }, [auditorsQuery.data, page, pageSize]);

  const isSavingAuditor = assignMutation.isPending || createAuditorMutation.isPending;
  const canCreateNewAuditor = Boolean(
    newUserFirstName.trim() &&
    newUserLastName.trim() &&
    newUserEmail.trim() &&
    newUserPassword.length >= 6 &&
    hasRequiredScope()
  );
  const submitDisabled =
    isSavingAuditor ||
    (editingAuditor
      ? !hasRequiredScope()
      : auditorMode === 'existing'
        ? !selectedUser || !hasRequiredScope()
        : !canCreateNewAuditor);
  const submitLabel = editingAuditor
    ? 'Update Scope'
    : auditorMode === 'existing'
      ? 'Assign Auditor'
      : 'Create Auditor';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auditor Management</h1>
          <p className="text-sm text-slate-500">Assign location scopes to government auditors</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Add New Auditor
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 pl-10 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setLevelFilter(e.target.value as AuditorLevel | '')
          }
          className="w-40 rounded-md border border-slate-300 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Levels</option>
          <option value="NATIONAL">National</option>
          <option value="PROVINCE">Province</option>
          <option value="DISTRICT">District</option>
          <option value="SECTOR">Sector</option>
        </select>
      </div>

      <SectionCard>
        {auditorsQuery.isLoading ? (
          <div className="py-8 text-center text-slate-500">Loading auditors...</div>
        ) : auditorsQuery.isError ? (
          <div className="py-8 text-center text-red-500">Failed to load auditors</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b bg-slate-50 text-left text-sm font-medium text-slate-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.raw.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{row.no}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {row.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.scope}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setEditingAuditor({
                              id: row.raw.id,
                              userId: row.raw.userId,
                              name: row.name,
                              email: row.email,
                            });
                            setAssignLevel(row.raw.level || 'NATIONAL');
                            setAssignProvince(row.raw.province || '');
                            setAssignDistrict(row.raw.district || '');
                            setAssignSector(row.raw.sector || '');
                            setShowAssignModal(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Assign
                        </button>
                        {row.raw.level !== 'NATIONAL' && (
                          <button
                            onClick={() => removeScopeMutation.mutate(row.raw.id)}
                            disabled={removeScopeMutation.isPending}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Remove Scope
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {auditorsQuery.data?.pagination && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  Page {auditorsQuery.data.pagination.page} of{' '}
                  {auditorsQuery.data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= auditorsQuery.data.pagination.totalPages}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <Modal
        open={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          resetForm();
        }}
        title={editingAuditor ? `Assign Scope - ${editingAuditor.name}` : 'Add New Auditor'}
      >
        <div className="space-y-4">
          {!editingAuditor && (
            <>
              <div>
                <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setAuditorMode('new');
                      setSelectedUser(null);
                      setUserSearch('');
                      setFormError('');
                    }}
                    className={`rounded px-3 py-2 font-medium ${auditorMode === 'new' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    New account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditorMode('existing');
                      setFormError('');
                    }}
                    className={`rounded px-3 py-2 font-medium ${auditorMode === 'existing' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Existing user
                  </button>
                </div>
              </div>

              {auditorMode === 'new' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">First Name</label>
                    <input
                      type="text"
                      required
                      value={newUserFirstName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserFirstName(e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Last Name</label>
                    <input
                      type="text"
                      required
                      value={newUserLastName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserLastName(e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserEmail(e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Phone</label>
                    <input
                      type="tel"
                      value={newUserPhone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserPhone(e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newUserPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserPassword(e.target.value)
                      }
                      autoComplete="new-password"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Search User</label>
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserSearch(e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    {userSearchQuery.data && userSearchQuery.data.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-auto rounded border">
                        {userSearchQuery.data.map((user) => (
                          <button
                            type="button"
                            key={user.id}
                            className="block w-full px-3 py-2 text-left hover:bg-slate-100"
                            onClick={() => {
                              setSelectedUser({
                                id: user.id,
                                name: `${user.firstName} ${user.lastName}`,
                                email: user.email,
                              });
                              setUserSearch('');
                              setFormError('');
                            }}
                          >
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedUser && (
                    <div className="rounded bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{selectedUser.name}</div>
                          <div className="text-sm text-slate-500">{selectedUser.email}</div>
                        </div>
                        <button type="button" onClick={() => setSelectedUser(null)}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {editingAuditor && (
            <div className="rounded bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{editingAuditor.name}</div>
                  <div className="text-sm text-slate-500">{editingAuditor.email}</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Audit Level</label>
            <select
              value={assignLevel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setAssignLevel(e.target.value as AuditorLevel);
                setFormError('');
              }}
              className="w-full rounded-md border border-slate-300 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="NATIONAL">National (All Rwanda)</option>
              <option value="PROVINCE">Province</option>
              <option value="DISTRICT">District</option>
              <option value="SECTOR">Sector</option>
            </select>
          </div>

          {assignLevel !== 'NATIONAL' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Province</label>
                <select
                  value={assignProvince}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setAssignProvince(e.target.value);
                    setAssignDistrict('');
                    setAssignSector('');
                    setFormError('');
                  }}
                  className="w-full rounded-md border border-slate-300 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select Province</option>
                  {locationsQuery.data?.provinces?.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {(assignLevel === 'DISTRICT' || assignLevel === 'SECTOR') && assignProvince && (
                <div>
                  <label className="mb-1 block text-sm font-medium">District</label>
                  <select
                    value={assignDistrict}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setAssignDistrict(e.target.value);
                      setAssignSector('');
                      setFormError('');
                    }}
                    className="w-full rounded-md border border-slate-300 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select District</option>
                    {districtsQuery.data?.districts?.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {assignLevel === 'SECTOR' && assignDistrict && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Sector</label>
                  <select
                    value={assignSector}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setAssignSector(e.target.value);
                      setFormError('');
                    }}
                    className="w-full rounded-md border border-slate-300 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Sector</option>
                    {sectorsQuery.data?.sectors?.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAssignModal(false);
                resetForm();
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={submitDisabled}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSavingAuditor && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
