import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  MoreHorizontal,
  PauseCircle,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { SummaryCards, type SummaryCardItem } from '../components/dashboard/summary-cards';
import { AppDrawer } from '../components/drawer';
import { useToast } from '../components/toast';
import { Avatar } from '../components/ui/avatar';
import { RoleBadge, StatusBadge } from '../components/ui/badge';
import {
  DataTable,
  DataTableToolbar,
  type DataTableColumn,
  type DataTableSort,
} from '../components/ui/data-table';
import { useAuth } from '../features/auth/auth.context';
import {
  fetchAllUsers,
  listUsersApi,
  updateUserStatusApi,
  type UserListItem,
} from '../features/users/users.api';
import { getSuperAdminDashboardFiltersApi } from '../features/dashboard/dashboard.api';
import { ApiClientError } from '../types/api';
import { exportToExcel, exportToPDF, type UserRow } from '../utils/export';

const ROLE_FILTER_OPTIONS = [
  { label: 'All Roles', value: 'ALL' },
  { label: 'Parent', value: 'PARENT' },
  { label: 'Student', value: 'STUDENT' },
  { label: 'Teacher', value: 'TEACHER' },
  { label: 'School Admin', value: 'SCHOOL_ADMIN' },
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

function fullName(user: UserListItem): string {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
}

export function UsersPage() {
  const auth = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const isSuperAdmin = auth.me?.roles.includes('SUPER_ADMIN') ?? false;

  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [sort, setSort] = useState<DataTableSort>({ sortBy: 'createdAt', sortOrder: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [managedUserId, setManagedUserId] = useState<string | null>(null);

  const schoolsQuery = useQuery({
    queryKey: ['superAdminSchools'],
    queryFn: () => getSuperAdminDashboardFiltersApi(auth.accessToken!),
    enabled: isSuperAdmin,
  });

  const schoolOptions = useMemo(() => {
    const items = schoolsQuery.data?.schools ?? [];
    return [
      { label: 'All Schools', value: 'ALL' },
      ...items.map((school) => ({ label: school.name, value: school.id })),
    ];
  }, [schoolsQuery.data]);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      tenantId: schoolFilter === 'ALL' ? undefined : schoolFilter,
      role: roleFilter === 'ALL' ? undefined : roleFilter,
      status: statusFilter,
      sortBy: sort.sortBy as 'name' | 'email' | 'status' | 'createdAt',
      sortOrder: sort.sortOrder,
    }),
    [search, schoolFilter, roleFilter, sort, statusFilter]
  );

  const usersQuery = useQuery({
    queryKey: ['users', filters, page, pageSize],
    queryFn: () =>
      listUsersApi(auth.accessToken!, {
        ...filters,
        page,
        pageSize,
      }),
  });

  const rows = usersQuery.data?.items ?? [];
  const paginationMeta = usersQuery.data?.pagination;
  const metrics = usersQuery.data?.metrics;

  const managedUser = useMemo(
    () => rows.find((user) => user.id === managedUserId) ?? null,
    [rows, managedUserId]
  );

  const invalidateUsers = () =>
    queryClient.invalidateQueries({
      queryKey: ['users'],
    });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: 'ACTIVE' | 'INACTIVE';
    }) => updateUserStatusApi(auth.accessToken!, userId, status),
    onSuccess: async (_data, variables) => {
      toast.showToast({
        type: 'success',
        title: variables.status === 'ACTIVE' ? 'User activated' : 'User deactivated',
      });
      await invalidateUsers();
    },
    onError: (error) => {
      const apiError = error instanceof ApiClientError ? error : null;
      toast.showToast({
        type: 'error',
        title: 'Could not update user',
        message: apiError?.message ?? 'Please try again.',
      });
    },
  });

  function handleReset() {
    setSearch('');
    setSchoolFilter('ALL');
    setRoleFilter('ALL');
    setStatusFilter('all');
    setPage(1);
  }

  function handleSortChange(next: DataTableSort) {
    setSort(next);
    setPage(1);
  }

  const handleExport = async (kind: 'excel' | 'pdf') => {
    try {
      setExporting(kind);
      // Exports always cover the full filtered dataset, not just the visible page.
      const allUsers = await fetchAllUsers(auth.accessToken!, {
        search: filters.search,
        tenantId: filters.tenantId,
        role: filters.role,
        status: filters.status,
      });
      const exportData: UserRow[] = allUsers.map((user) => ({
        name: fullName(user),
        email: user.email,
        phone: user.phone || '',
        school: user.tenant?.name ?? '—',
        roles: user.roles.join(', '),
        status: user.status,
      }));
      if (kind === 'excel') {
        await exportToExcel(exportData, 'users-list.xlsx');
      } else {
        await exportToPDF(exportData, 'users-list.pdf');
      }
    } catch (err) {
      console.error(`Export ${kind.toUpperCase()} failed:`, err);
      toast.showToast({ type: 'error', title: 'Export failed', message: 'Please try again.' });
    } finally {
      setExporting(null);
    }
  };

  const summaryItems: SummaryCardItem[] = [
    {
      key: 'total',
      label: 'Total Users',
      value: metrics?.total ?? 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'admins',
      label: 'Admins',
      value: (metrics?.superAdmins ?? 0) + (metrics?.schoolAdmins ?? 0),
      icon: Shield,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      key: 'teachers',
      label: 'Teachers',
      value: metrics?.teachers ?? 0,
      icon: UserCheck,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      key: 'students',
      label: 'Students',
      value: metrics?.students ?? 0,
      icon: GraduationCap,
      color: 'bg-green-50 text-green-600',
    },
  ];

  const columns: DataTableColumn<UserListItem>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        mobile: 'primary',
        render: (user) => (
          <span className="flex items-center gap-3">
            <Avatar name={fullName(user)} size="sm" />
            <span className="font-semibold text-slate-900">{fullName(user)}</span>
          </span>
        ),
      },
      {
        key: 'email',
        header: 'Contacts',
        sortable: true,
        mobile: 'secondary',
        render: (user) => (
          <span className="block max-w-56">
            <span className="block truncate text-xs text-slate-600">{user.email}</span>
            {user.phone ? (
              <span className="block truncate text-xs text-slate-400">{user.phone}</span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'school',
        header: 'School',
        render: (user) => (
          <span className="text-sm font-medium text-slate-700">{user.tenant?.name ?? '—'}</span>
        ),
      },
      {
        key: 'roles',
        header: 'Role',
        render: (user) => (
          <span className="flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (user) => <StatusBadge status={user.status} />,
      },
      {
        key: 'createdAt',
        header: 'Joined',
        sortable: true,
        render: (user) => (
          <span className="text-xs text-slate-500">
            {user.createdAt
              ? new Intl.DateTimeFormat('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }).format(new Date(user.createdAt))
              : '—'}
          </span>
        ),
      },
    ],
    []
  );

  if (usersQuery.isError && rows.length === 0) {
    const error = usersQuery.error as unknown;
    const apiError = error instanceof ApiClientError ? error : null;

    return (
      <StateView
        title="Could not load users"
        message={
          apiError
            ? `Error ${apiError.status} (${apiError.code}): ${apiError.message}`
            : 'Please retry in a moment.'
        }
        action={
          <button
            type="button"
            onClick={() => void usersQuery.refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="User Management"
        subtitle="Manage and monitor platform users across schools."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExport('excel')}
              disabled={!!exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-soft hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting === 'excel' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => void handleExport('pdf')}
              disabled={!!exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-soft hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting === 'pdf' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Export PDF
            </button>
          </div>
        }
      />

      <SummaryCards items={summaryItems} isLoading={usersQuery.isPending && !metrics} />

      <section className="rounded-2xl border border-brand-100 bg-white shadow-soft">
        <DataTableToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Search by name, email, phone..."
          searchAriaLabel="Search users by name, email or phone"
          filters={[
            ...(isSuperAdmin
              ? [
                  {
                    id: 'school',
                    label: 'Filter by school',
                    value: schoolFilter,
                    options: schoolOptions,
                    onChange: (value: string) => {
                      setSchoolFilter(value);
                      setPage(1);
                    },
                  },
                ]
              : []),
            {
              id: 'role',
              label: 'Filter by role',
              value: roleFilter,
              options: ROLE_FILTER_OPTIONS,
              onChange: (value) => {
                setRoleFilter(value);
                setPage(1);
              },
            },
            {
              id: 'status',
              label: 'Filter by status',
              value: statusFilter,
              options: STATUS_FILTER_OPTIONS,
              onChange: (value) => {
                setStatusFilter(value as 'active' | 'inactive' | 'all');
                setPage(1);
              },
            },
          ]}
          onReset={handleReset}
        />

        <div className="p-4">
          <DataTable<UserListItem>
            ariaLabel="Platform users"
            columns={columns}
            data={rows}
            rowKey={(user) => user.id}
            showIndex
            loading={usersQuery.isPending}
            skeletonRows={5}
            error={
              usersQuery.isError
                ? {
                    title: 'Failed to load users',
                    message: 'Please try again later.',
                  }
                : null
            }
            onRetry={() => void usersQuery.refetch()}
            emptyTitle="No users found"
            emptyDescription="Try adjusting your search or filters."
            sort={sort}
            onSortChange={handleSortChange}
            pagination={
              paginationMeta
                ? {
                    page: paginationMeta.page,
                    pageSize: paginationMeta.pageSize,
                    totalItems: paginationMeta.totalItems,
                    totalPages: paginationMeta.totalPages,
                    onPageChange: setPage,
                    onPageSizeChange: (size) => {
                      setPageSize(size);
                      setPage(1);
                    },
                    pageSizeOptions: [10, 25, 50, 100],
                  }
                : undefined
            }
            rowActions={(user) => (
              <RowActions
                user={user}
                isSelf={user.id === auth.me?.id}
                disabled={statusMutation.isPending}
                onManage={() => setManagedUserId(user.id)}
                onSetStatus={(status) =>
                  statusMutation.mutate({ userId: user.id, status })
                }
              />
            )}
            minWidth={980}
            className="border-0 shadow-none"
          />
        </div>
      </section>

      <AppDrawer
        open={Boolean(managedUserId)}
        onClose={() => setManagedUserId(null)}
        title="Manage user"
        description="Review account details and update access."
      >
        {managedUser ? (
          <ManagedUserPanel
            user={managedUser}
            isSelf={managedUser.id === auth.me?.id}
            pending={statusMutation.isPending}
            onSetStatus={(status) =>
              statusMutation.mutate({ userId: managedUser.id, status })
            }
          />
        ) : (
          <StateView
            title="User not on this page"
            message="Reopen manage from the user's row to load their details."
          />
        )}
      </AppDrawer>
    </div>
  );
}

function RowActions({
  user,
  isSelf,
  disabled,
  onManage,
  onSetStatus,
}: {
  user: UserListItem;
  isSelf: boolean;
  disabled: boolean;
  onManage: () => void;
  onSetStatus: (status: 'ACTIVE' | 'INACTIVE') => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={onManage}
        aria-label={`Manage ${fullName(user)}`}
        className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        Manage
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={`More actions for ${fullName(user)}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>

        {menuOpen ? (
          <>
            <div
              className="fixed inset-0 z-20"
              aria-hidden="true"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              aria-label={`Actions for ${fullName(user)}`}
              className="absolute right-0 z-30 mt-1 w-44 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onManage();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-brand-50"
              >
                View & edit
              </button>
              {!isSelf ? (
                user.status === 'ACTIVE' ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled}
                    onClick={() => {
                      setMenuOpen(false);
                      onSetStatus('INACTIVE');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                  >
                    <PauseCircle className="h-4 w-4" aria-hidden="true" />
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled}
                    onClick={() => {
                      setMenuOpen(false);
                      onSetStatus('ACTIVE');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Activate
                  </button>
                )
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function ManagedUserPanel({
  user,
  isSelf,
  pending,
  onSetStatus,
}: {
  user: UserListItem;
  isSelf: boolean;
  pending: boolean;
  onSetStatus: (status: 'ACTIVE' | 'INACTIVE') => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <Avatar name={fullName(user)} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{fullName(user)}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {user.roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
            <StatusBadge status={user.status} />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Detail label="Phone" value={user.phone ?? '—'} />
        <Detail label="School" value={user.tenant?.name ?? '—'} />
        <Detail
          label="Joined"
          value={
            user.createdAt
              ? new Date(user.createdAt).toLocaleDateString(undefined, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'
          }
        />
        <Detail label="User ID" value={user.id} mono />
      </dl>

      {!isSelf ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Account status
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.status === 'ACTIVE' ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onSetStatus('INACTIVE')}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
              >
                <PauseCircle className="h-4 w-4" aria-hidden="true" />
                Deactivate account
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => onSetStatus('ACTIVE')}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Activate account
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">
            Status changes take effect immediately and are enforced by the server.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-700">
          This is your own account — it cannot be deactivated.
        </p>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd
        className={`mt-1 truncate text-sm font-medium text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
