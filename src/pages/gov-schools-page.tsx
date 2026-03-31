import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listGovSchoolsApi } from '../features/gov/gov.api';
import {
  getRwandaDistricts,
  getRwandaProvinces,
  getRwandaSectors,
} from '../features/location/rwanda-location';

export function GovSchoolsPage() {
  const auth = useAuth();
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const provinceOptions = getRwandaProvinces();
  const districtOptions = getRwandaDistricts(province);
  const sectorOptions = getRwandaSectors(province, district);

  const schoolsQuery = useQuery({
    queryKey: ['gov-schools', { search, province, district, sector, page, pageSize }],
    queryFn: () =>
      listGovSchoolsApi(auth.accessToken!, {
        q: search.trim() || undefined,
        province: province || undefined,
        district: district || undefined,
        sector: sector || undefined,
        page,
        pageSize,
      }),
  });

  const schools = schoolsQuery.data?.items ?? [];
  const pagination = schoolsQuery.data?.pagination ?? {
    page,
    pageSize,
    totalItems: 0,
    totalPages: 1,
  };

  return (
    <SectionCard
      title="Schools In Scope"
      subtitle="Sector, district, province, or country assignments automatically limit which schools appear here."
    >
      <div className="mb-4 grid gap-2 md:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search school or tenant code"
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
        <select
          value={province}
          onChange={(event) => {
            setProvince(event.target.value);
            setDistrict('');
            setSector('');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
          aria-label="Filter by province"
        >
          <option value="">All provinces</option>
          {provinceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={district}
          onChange={(event) => {
            setDistrict(event.target.value);
            setSector('');
            setPage(1);
          }}
          disabled={!province}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
          aria-label="Filter by district"
        >
          <option value="">All districts</option>
          {districtOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={sector}
          onChange={(event) => {
            setSector(event.target.value);
            setPage(1);
          }}
          disabled={!province || !district}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
          aria-label="Filter by sector"
        >
          <option value="">All sectors</option>
          {sectorOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {schoolsQuery.isPending ? (
        <div className="grid gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
        </div>
      ) : null}

      {schoolsQuery.isError ? (
        <StateView
          title="Could not load scoped schools"
          message="Retry the request. The current scope assignment is still enforced on the backend."
          action={
            <button
              type="button"
              onClick={() => void schoolsQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!schoolsQuery.isPending && !schoolsQuery.isError && !schools.length ? (
        <EmptyState
          title="No schools in the current scope"
          message="This auditor may not have an active assignment yet, or the search filters are too narrow."
        />
      ) : null}

      {!schoolsQuery.isPending && !schoolsQuery.isError && schools.length ? (
        <div className="grid gap-3">
          {schools.map((school) => (
            <article key={school.tenantId} className="rounded-2xl border border-brand-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950">{school.displayName}</h3>
                  <p className="text-sm text-slate-700">
                    {school.code} • {school.sector ?? 'N/A'} / {school.district ?? 'N/A'} /{' '}
                    {school.province ?? 'N/A'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Setup {school.setupCompletedAt ? 'completed' : 'pending'} •{' '}
                    {school.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Link
                  to={`/gov/schools/${school.tenantId}`}
                  className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  View school
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-brand-100 pt-4 text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages} • {pagination.totalItems} schools
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPage((current) => Math.min(pagination.totalPages, current + 1))
              }
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
