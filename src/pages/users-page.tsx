import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listUsersApi, type UserListItem } from '../features/users/users.api';
import { ApiClientError } from '../types/api';

export function UsersPage() {
  const auth = useAuth();
  const isSchoolAdminOnly =
    auth.me?.roles.includes('SCHOOL_ADMIN') && !auth.me?.roles.includes('SUPER_ADMIN');

  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<'ALL' | string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | string>('ALL');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsersApi(auth.accessToken!),
  });

  const rows = useMemo(() => {
    const items = (usersQuery.data?.items ?? []) as UserListItem[];
    const searchValue = search.trim().toLowerCase();

    return items
      .filter((user) => {
        if (schoolFilter !== 'ALL' && user.tenant?.name !== schoolFilter) {
          return false;
        }
        if (roleFilter !== 'ALL' && !user.roles.includes(roleFilter)) {
          return false;
        }
        if (!searchValue) return true;

        const haystack = [
          user.firstName,
          user.lastName,
          user.email,
          user.phone,
          user.tenant?.name,
          user.roles.join(','),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchValue);
      })
      .map((user, index) => ({
        no: index + 1,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
        contact: user.phone || user.email,
        school: user.tenant?.name ?? '—',
        role: user.roles.join(', '),
        raw: user,
      }));
  }, [roleFilter, schoolFilter, search, usersQuery.data]);

  const schoolOptions = useMemo(() => {
    const items = (usersQuery.data?.items ?? []) as UserListItem[];
    const names = new Set<string>();
    items.forEach((user) => {
      if (user.tenant?.name) {
        names.add(user.tenant.name);
      }
    });
    return Array.from(names).sort();
  }, [usersQuery.data]);

  const roleOptions = useMemo(() => {
    const items = (usersQuery.data?.items ?? []) as UserListItem[];
    const roles = new Set<string>();
    items.forEach((user) => {
      user.roles.forEach((r) => roles.add(r));
    });
    return Array.from(roles).sort();
  }, [usersQuery.data]);

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
    <SectionCard
      title="Users"
      subtitle="All platform users across schools."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, phone, school, or role"
          className="h-9 min-w-[220px] flex-1 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
        <select
          value={schoolFilter}
          onChange={(event) => setSchoolFilter(event.target.value as typeof schoolFilter)}
          className="h-9 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          <option value="ALL">All schools</option>
          {schoolOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
          className="h-9 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          <option value="ALL">All roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {usersQuery.isPending ? (
        <div className="grid gap-2">
          <div className="h-14 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-14 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-14 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {!usersQuery.isPending && rows.length === 0 ? (
        <StateView
          title="No users found"
          message="Users will appear here once they are invited or created."
        />
      ) : null}

      {!usersQuery.isPending && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Role</th>
                {isSchoolAdminOnly ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.raw.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {row.no}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 text-slate-700">{row.contact}</td>
                  <td className="px-4 py-3 text-slate-700">{row.school}</td>
                  <td className="px-4 py-3 text-slate-700">{row.role}</td>
                  {isSchoolAdminOnly ? (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        Manage
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}
