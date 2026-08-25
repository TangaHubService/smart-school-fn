import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';

import { SectionCard } from '../components/section-card';
import { DrawerForm } from '../components/drawer-form';
import { AppDrawer } from '../components/drawer';
import { useToast } from '../components/toast';
import {
  DataTable,
  DataTableToolbar,
  type DataTableColumn,
} from '../components/ui/data-table';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
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
  type Auditor,
} from '../features/admin-auditors/admin-auditors.api';

const auditorColumns: DataTableColumn<Auditor>[] = [
  {
    key: 'name',
    header: 'Name',
    mobile: 'primary',
    render: (auditor) => (
      <span className="flex items-center gap-3">
        <Avatar name={`${auditor.firstName} ${auditor.lastName}`} size="sm" />
        <span className="font-medium text-slate-900">
          {`${auditor.firstName} ${auditor.lastName}`.trim() || auditor.email}
        </span>
      </span>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    mobile: 'secondary',
    render: (auditor) => <span className="text-slate-600">{auditor.email}</span>,
  },
  {
    key: 'level',
    header: 'Level',
    render: (auditor) => <Badge tone="brand">{auditor.level}</Badge>,
  },
  {
    key: 'scope',
    header: 'Scope',
    render: (auditor) => (
      <span className="text-slate-600">
        {[auditor.province, auditor.district, auditor.sector].filter(Boolean).join(' / ') ||
          'All Rwanda'}
      </span>
    ),
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (auditor) => (
      <Badge tone={auditor.isActive ? 'success' : 'neutral'}>
        {auditor.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

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

  const auditors = auditorsQuery.data?.items ?? [];

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

      <SectionCard>
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.055)]">
          <DataTableToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search by name or email..."
            searchAriaLabel="Search auditors"
            filters={[
              {
                id: 'level',
                label: 'Filter by level',
                value: levelFilter,
                options: [
                  { label: 'All Levels', value: '' },
                  { label: 'National', value: 'NATIONAL' },
                  { label: 'Province', value: 'PROVINCE' },
                  { label: 'District', value: 'DISTRICT' },
                  { label: 'Sector', value: 'SECTOR' },
                ],
                onChange: (value) => {
                  setLevelFilter(value as AuditorLevel | '');
                  setPage(1);
                },
              },
            ]}
            onReset={() => {
              setSearch('');
              setLevelFilter('');
              setPage(1);
            }}
          />

          <div className="p-4">
            <DataTable<Auditor>
              ariaLabel="Government auditors"
              columns={auditorColumns}
              data={auditors}
              rowKey={(auditor) => auditor.id}
              showIndex
              loading={auditorsQuery.isLoading}
              skeletonRows={6}
              error={
                auditorsQuery.isError
                  ? { title: 'Failed to load auditors', message: 'Please try again later.' }
                  : null
              }
              onRetry={() => void auditorsQuery.refetch()}
              emptyTitle="No auditors found"
              emptyDescription="Assign scopes to government auditors to see them here."
              pagination={
                auditorsQuery.data?.pagination
                  ? {
                      page: auditorsQuery.data.pagination.page,
                      pageSize,
                      totalItems: auditorsQuery.data.pagination.total ?? 0,
                      totalPages: auditorsQuery.data.pagination.totalPages,
                      onPageChange: setPage,
                      onPageSizeChange: () => undefined,
                    }
                  : undefined
              }
              rowActions={(auditor) => (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAuditor({
                        id: auditor.id,
                        userId: auditor.userId,
                        name: `${auditor.firstName} ${auditor.lastName}`.trim(),
                        email: auditor.email,
                      });
                      setAssignLevel(auditor.level || 'NATIONAL');
                      setAssignProvince(auditor.province || '');
                      setAssignDistrict(auditor.district || '');
                      setAssignSector(auditor.sector || '');
                      setShowAssignModal(true);
                    }}
                    className="text-sm font-semibold text-brand-600 transition hover:text-brand-700"
                  >
                    Assign
                  </button>
                  {auditor.level !== 'NATIONAL' ? (
                    <button
                      type="button"
                      onClick={() => removeScopeMutation.mutate(auditor.id)}
                      disabled={removeScopeMutation.isPending}
                      className="text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
                    >
                      Remove Scope
                    </button>
                  ) : null}
                </div>
              )}
              minWidth={900}
              className="border-0 shadow-none"
            />
          </div>
        </div>
      </SectionCard>

      <DrawerForm
        open={showAssignModal}
        title={editingAuditor ? `Assign Scope - ${editingAuditor.name}` : 'Add New Auditor'}
        onCancel={() => {
          setShowAssignModal(false);
          resetForm();
        }}
        isLoading={isSavingAuditor}
        submitLabel={submitLabel}
        onSubmit={(e) => {
          e.preventDefault();
          handleAssign();
        }}
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
        </div>
      </DrawerForm>
    </div>
  );
}
