import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  GraduationCap,
  Plus,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { SummaryCards, type SummaryCardItem } from '../components/dashboard/summary-cards';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { listTenantsApi, type TenantListItem } from '../features/sprint1/sprint1.api';
import {
  getUserApi,
  listUsersApi,
  updateUserStatusApi,
} from '../features/users/users.api';
import { ApiClientError } from '../types/api';

const ROLE_FILTER_OPTIONS = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'TEACHER',
  'STUDENT',
  'PARENT',
  'GOV_AUDITOR',
] as const;

export function UsersPage() {
  const auth = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isSuperAdmin = auth.me?.roles.includes('SUPER_ADMIN');
  const isSystemUsers = location.pathname.includes('super-admin');

  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<'ALL' | string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(1);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ['tenants-for-user-filter'],
    queryFn: () =>
      listTenantsApi(auth.accessToken!, {
        page: 1,
        pageSize: 200,
      }),
    enabled: Boolean(auth.accessToken && isSuperAdmin),
  });

  const schoolOptions = useMemo(() => {
    const items = (tenantsQuery.data as TenantListItem[] | undefined) ?? [];
    return items.map((t) => ({
      id: t.id,
      label: t.school?.displayName ?? t.name,
    }));
  }, [tenantsQuery.data]);

  const usersQuery = useQuery({
    queryKey: [
      'users',
      search,
      schoolFilter,
      roleFilter,
      statusFilter,
      createdFrom,
      createdTo,
      page,
    ],
    queryFn: () =>
      listUsersApi(auth.accessToken!, {
        search: search.trim() || undefined,
        tenantId: schoolFilter === 'ALL' ? undefined : schoolFilter,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter,
        page,
        pageSize: 20,
        createdFrom: createdFrom ? `${createdFrom}T00:00:00.000Z` : undefined,
        createdTo: createdTo ? `${createdTo}T23:59:59.999Z` : undefined,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['users', 'detail', detailUserId],
    queryFn: () => getUserApi(auth.accessToken!, detailUserId!),
    enabled: Boolean(detailUserId && auth.accessToken),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { userId: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      updateUserStatusApi(auth.accessToken!, input.userId, { status: input.status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast({ type: 'success', title: 'Updated', message: 'User status saved.' });
      setDetailUserId(null);
    },
  });

  const rows = useMemo(() => {
    const items = usersQuery.data?.items ?? [];
    const pageSize = 20;
    return items.map((user, index) => ({
      no: (page - 1) * pageSize + index + 1,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      email: user.email,
      phone: user.phone ?? '—',
      school: user.tenant?.name ?? '—',
      role: user.roles.join(', '),
      status: user.status,
      createdAt: user.createdAt,
      raw: user,
    }));
  }, [usersQuery.data, page]);

  const summaryItems: SummaryCardItem[] = [
    {
      key: 'total',
      label: 'Total Users',
      value: usersQuery.data?.metrics.total ?? 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'admins',
      label: 'Admins',
      value: (usersQuery.data?.metrics.superAdmins ?? 0) + (usersQuery.data?.metrics.schoolAdmins ?? 0),
      icon: Shield,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      key: 'teachers',
      label: 'Teachers',
      value: usersQuery.data?.metrics.teachers ?? 0,
      icon: UserCheck,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      key: 'students',
      label: 'Students',
      value: usersQuery.data?.metrics.students ?? 0,
      icon: GraduationCap,
      color: 'bg-green-50 text-green-600',
    },
  ];

  const pagination = usersQuery.data?.pagination;

  if (usersQuery.isError) {
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
      />
    );
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title={isSystemUsers ? 'System Users' : 'User Management'}
        subtitle={
          isSystemUsers
            ? 'All accounts across schools with search, filters, and safe status updates.'
            : 'Manage and monitor platform users across schools.'
        }
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Add New User
          </button>
        }
      />

      <SummaryCards items={summaryItems} isLoading={usersQuery.isPending} />

      <section className="rounded-2xl border border-brand-100 bg-white shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 p-4">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, phone..."
            className="h-10 min-w-[200px] flex-1 rounded-xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-brand-400"
          />
          {isSuperAdmin && (
            <select
              value={schoolFilter}
              onChange={(event) => {
                setSchoolFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 max-w-[220px] rounded-xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-brand-400"
            >
              <option value="ALL">All Schools</option>
              {schoolOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-brand-400"
          >
            <option value="ALL">All Roles</option>
            {ROLE_FILTER_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'active' | 'inactive' | 'all');
              setPage(1);
            }}
            className="h-10 rounded-xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-brand-400"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => {
              setCreatedFrom(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900"
            title="Created from"
          />
          <input
            type="date"
            value={createdTo}
            onChange={(e) => {
              setCreatedTo(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900"
            title="Created to"
          />
        </div>

        {usersQuery.isPending ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        ) : null}

        {!usersQuery.isPending && rows.length === 0 ? (
          <div className="py-12">
            <StateView
              title="No users found"
              message="Try adjusting your filters or search terms."
            />
          </div>
        ) : null}

        {!usersQuery.isPending && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 border-b border-brand-100">#</th>
                  <th className="px-5 py-3 border-b border-brand-100">Name</th>
                  <th className="px-5 py-3 border-b border-brand-100">Email</th>
                  <th className="px-5 py-3 border-b border-brand-100">Phone</th>
                  <th className="px-5 py-3 border-b border-brand-100">Role</th>
                  <th className="px-5 py-3 border-b border-brand-100">School</th>
                  <th className="px-5 py-3 border-b border-brand-100">Status</th>
                  <th className="px-5 py-3 border-b border-brand-100">Created</th>
                  <th className="px-5 py-3 border-b border-brand-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.raw.id}
                    className="group transition-colors hover:bg-brand-50/30"
                  >
                    <td className="px-5 py-4 border-b border-brand-50 text-xs text-slate-400">
                      {row.no}
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50 font-bold text-slate-900">
                      {row.name}
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50 text-slate-600">{row.email}</td>
                    <td className="px-5 py-4 border-b border-brand-50 text-slate-600">{row.phone}</td>
                    <td className="px-5 py-4 border-b border-brand-50 text-xs font-medium text-brand-600">
                      {row.role}
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50 text-sm text-slate-700">{row.school}</td>
                    <td className="px-5 py-4 border-b border-brand-50">
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                          row.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-50 text-slate-600 border border-slate-100',
                        ].join(' ')}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50 text-xs text-slate-500">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailUserId(row.raw.id)}
                        className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-400 hover:bg-slate-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-brand-100 px-4 py-3 text-sm">
            <span className="text-slate-600">
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} users)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-brand-200 px-3 py-1 font-semibold text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-brand-200 px-3 py-1 font-semibold text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(detailUserId)}
        onClose={() => setDetailUserId(null)}
        title="User details"
      >
        {detailQuery.isPending ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : detailQuery.data ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold text-slate-700">Name: </span>
              {detailQuery.data.firstName} {detailQuery.data.lastName}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Email: </span>
              {detailQuery.data.email}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Phone: </span>
              {detailQuery.data.phone ?? '—'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">School: </span>
              {detailQuery.data.tenant?.name ?? '—'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Roles: </span>
              {detailQuery.data.roles.join(', ')}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Status: </span>
              {detailQuery.data.status}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {detailQuery.data.status === 'ACTIVE' ? (
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() =>
                    statusMutation.mutate({ userId: detailQuery.data!.id, status: 'INACTIVE' })
                  }
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() =>
                    statusMutation.mutate({ userId: detailQuery.data!.id, status: 'ACTIVE' })
                  }
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900"
                >
                  Activate
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-600">Could not load user.</p>
        )}
      </Modal>
    </div>
  );
}
