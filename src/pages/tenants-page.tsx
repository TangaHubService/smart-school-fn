import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listTenantsApi, TenantListItem } from '../features/sprint1/sprint1.api';

export function TenantsPage() {
  const auth = useAuth();
  const [search, setSearch] = useState('');

  const tenantsQuery = useQuery({
    queryKey: ['super-admin-tenants', search],
    queryFn: () =>
      listTenantsApi(auth.accessToken!, {
        page: 1,
        pageSize: 50,
        search: search.trim() || undefined,
      }),
  });

  const tenants = useMemo(() => ((tenantsQuery.data as TenantListItem[]) ?? []) as TenantListItem[], [
    tenantsQuery.data,
  ]);

  return (
    <SectionCard
      title="Tenants"
      subtitle="Manage all schools onboarded on the Smart School platform."
      action={
        <Link
          to="/super-admin/tenants/new"
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
        >
          New tenant
        </Link>
      }
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-brand-900 outline-none placeholder:text-brand-400 focus:border-brand-400"
          placeholder="Search by code, school name, or domain"
          aria-label="Search tenants"
        />
        <button
          type="button"
          onClick={() => void tenantsQuery.refetch()}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
        >
          Refresh
        </button>
      </div>

      {tenantsQuery.isPending ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {tenantsQuery.isError ? (
        <StateView
          title="Could not load tenants"
          message="Please retry. If the problem continues, check backend logs."
          action={
            <button
              type="button"
              onClick={() => void tenantsQuery.refetch()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!tenantsQuery.isPending && !tenantsQuery.isError && !tenants.length ? (
        <EmptyState
          title="No tenants yet"
          message="Create your first school tenant to start onboarding schools."
          action={
            <Link
              to="/super-admin/tenants/new"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Create first tenant
            </Link>
          }
        />
      ) : null}

      {!tenantsQuery.isPending && !tenantsQuery.isError && tenants.length ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-brand-50 text-brand-700">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Tenant</th>
                <th className="px-3 py-2 font-semibold">School</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Users</th>
                <th className="px-3 py-2 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, index) => (
                <tr key={tenant.id} className="border-t border-brand-100">
                  <td className="px-3 py-2 align-middle text-brand-600">{index + 1}</td>
                  <td className="px-3 py-2 align-middle font-mono text-xs text-brand-700">{tenant.code}</td>
                  <td className="px-3 py-2 align-middle font-semibold text-brand-900">{tenant.name}</td>
                  <td className="px-3 py-2 align-middle text-brand-700">{tenant.school?.displayName ?? '-'}</td>
                  <td className="px-3 py-2 align-middle">
                    <span
                      className={[
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                        tenant.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700',
                      ].join(' ')}
                    >
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle text-brand-700">{tenant.activeUsers}</td>
                  <td className="px-3 py-2 align-middle text-brand-700">{tenant.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}
