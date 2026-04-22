import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useRef } from 'react';
import {
  GraduationCap,
  Plus,
  Shield,
  UserCheck,
  Users,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { Pagination } from '../components/pagination';
import { SummaryCards, type SummaryCardItem } from '../components/dashboard/summary-cards';
import { useAuth } from '../features/auth/auth.context';
import { listUsersApi } from '../features/users/users.api';
import { getSuperAdminDashboardFiltersApi } from '../features/dashboard/dashboard.api';
import { ApiClientError } from '../types/api';
import { exportToExcel, exportToPDF, type UserRow } from '../utils/export';

export function UsersPage() {
  const auth = useAuth();
  const isSuperAdmin = auth.me?.roles.includes('SUPER_ADMIN');
  const isSchoolAdminOnly =
    auth.me?.roles.includes('SCHOOL_ADMIN') && !isSuperAdmin;

  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<'ALL' | string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const schoolsQuery = useQuery({
    queryKey: ['superAdminSchools'],
    queryFn: () => getSuperAdminDashboardFiltersApi(auth.accessToken!),
    enabled: isSuperAdmin,
  });

  const schoolOptions = useMemo(() => {
    const items = schoolsQuery.data?.schools ?? [];
    return items.map((school) => ({
      label: school.name,
      value: school.id,
    }));
  }, [schoolsQuery.data]);

  const usersQuery = useQuery({
    queryKey: ['users', search, schoolFilter, roleFilter, statusFilter, page, pageSize],
    queryFn: () =>
      listUsersApi(auth.accessToken!, {
        search: search.trim() || undefined,
        tenantId: schoolFilter === 'ALL' ? undefined : schoolFilter,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter,
        page,
        pageSize,
      }),
  });

  const rows = useMemo(() => {
    const items = usersQuery.data?.items ?? [];

    return items.map((user, index) => ({
      no: index + 1,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      contact: user.phone || user.email,
      school: user.tenant?.name ?? '—',
      role: user.roles.join(', '),
      status: user.status,
      raw: user,
    }));
  }, [usersQuery.data]);

  const handleExportExcel = () => {
    try {
      setExporting('excel');
      const exportData: UserRow[] = (usersQuery.data?.items ?? []).map(user => ({
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
        email: user.email,
        phone: user.phone || '',
        school: user.tenant?.name ?? '—',
        roles: user.roles.join(', '),
        status: user.status,
      }));
      exportToExcel(exportData, 'users-list.xlsx');
    } catch (err) {
      console.error('Export Excel failed:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = () => {
    try {
      setExporting('pdf');
      const exportData: UserRow[] = (usersQuery.data?.items ?? []).map(user => ({
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
        email: user.email,
        phone: user.phone || '',
        school: user.tenant?.name ?? '—',
        roles: user.roles.join(', '),
        status: user.status,
      }));
      exportToPDF(exportData, 'users-list.pdf');
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setExporting(null);
    }
  };

  const roleOptions = useMemo(() => {
    const items = usersQuery.data?.items ?? [];
    const roles = new Set<string>();
    items.forEach((user) => {
      user.roles.forEach((r) => roles.add(r));
    });
    return Array.from(roles).sort();
  }, [usersQuery.data]);

  const currentPagination = usersQuery.data?.pagination;
  const totalPages = currentPagination?.totalPages ?? 1;
  const currentPage = currentPagination?.page ?? page;

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
        title="User Management"
        subtitle="Manage and monitor platform users across schools."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!!exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-soft hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting === 'excel' ? (
                <span className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {exporting === 'excel' ? 'Exporting...' : 'Excel'}
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={!!exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-soft hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting === 'pdf' ? (
                <span className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Add New User
            </button>
          </div>
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
            className="h-10 min-w-[240px] flex-1 rounded-xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-brand-400"
          />
          {isSuperAdmin && (
            <select
              value={schoolFilter}
              onChange={(event) => {
                setSchoolFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 max-h-60 overflow-y-auto rounded-xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-brand-400"
            >
              <option value="ALL">All Schools</option>
              {schoolOptions.map((school) => (
                <option key={school.value} value={school.value}>
                  {school.label}
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
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as any);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-brand-400"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 border-b border-brand-100">No</th>
                  <th className="px-5 py-3 border-b border-brand-100">Name</th>
                  <th className="px-5 py-3 border-b border-brand-100">Contacts</th>
                  <th className="px-5 py-3 border-b border-brand-100">School</th>
                  <th className="px-5 py-3 border-b border-brand-100"> Role</th>
                  <th className="px-5 py-3 border-b border-brand-100">Status</th>
                  {isSchoolAdminOnly && (
                    <th className="px-5 py-3 border-b border-brand-100 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.raw.id}
                    className="group transition-colors hover:bg-brand-50/30"
                  >
                    <td className="px-5 py-4 border-b border-brand-50 text-xs text-slate-400">
                      # {((currentPage - 1) * pageSize) + index + 1}
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50">
                      <div className="font-bold text-slate-900">{row.name}</div>
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50">
                      <div className="text-xs text-slate-500">{row.contact}</div>
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50">
                      <div className="text-sm font-semibold text-slate-700">{row.school}</div>
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50">
                      <div className="text-xs text-brand-600 font-medium">{row.role}</div>
                    </td>
                    <td className="px-5 py-4 border-b border-brand-50">
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                          row.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-50 text-slate-600 border border-slate-100',
                        ].join(' ')}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {row.status}
                      </span>
                    </td>
                    {isSchoolAdminOnly && (
                      <td className="px-5 py-4 border-b border-brand-50 text-right">
                        <button
                          type="button"
                          className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-400 hover:bg-slate-50"
                        >
                          Manage
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={currentPagination?.totalItems ?? 0}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
