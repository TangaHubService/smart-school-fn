import { Link } from 'react-router-dom';

import { SectionCard } from '../components/section-card';
import { useAuth } from '../features/auth/auth.context';
import {
  hasPermission,
  hasRole,
  isSchoolSetupComplete,
} from '../features/auth/auth-helpers';

export function DashboardPage() {
  const auth = useAuth();

  const superAdmin = hasRole(auth.me, 'SUPER_ADMIN');
  const canSetup = hasPermission(auth.me, 'school.setup.manage');
  const setupComplete = isSchoolSetupComplete(auth.me);

  return (
    <section className="space-y-4">
      <SectionCard
        title="Dashboard"
        subtitle={`Welcome ${auth.me?.firstName ?? ''}. ${superAdmin ? 'Platform administration' : 'School administration'}`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoTile label="Role" value={auth.me?.roles.join(', ') ?? '-'} />
          <InfoTile label="Tenant" value={auth.me?.tenant.name ?? '-'} />
          <InfoTile
            label="School Setup"
            value={superAdmin ? 'N/A (platform account)' : setupComplete ? 'Completed' : 'Incomplete'}
          />
        </div>
      </SectionCard>

      {superAdmin ? (
        <SectionCard title="SuperAdmin Actions" subtitle="Manage schools from one place.">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/super-admin/tenants"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Open tenants
            </Link>
          </div>
        </SectionCard>
      ) : null}

      {!superAdmin && canSetup ? (
        <SectionCard title="School Actions" subtitle="Complete setup and manage academics.">
          <div className="flex flex-wrap gap-2">
            {!setupComplete ? (
              <Link
                to="/admin/setup"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Continue setup wizard
              </Link>
            ) : (
              <>
                <Link
                  to="/admin/academic-years"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Academic years
                </Link>
                <Link
                  to="/admin/classes"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Classes
                </Link>
                <Link
                  to="/admin/subjects"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Subjects
                </Link>
                <Link
                  to="/admin/staff"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Staff
                </Link>
              </>
            )}
          </div>
        </SectionCard>
      ) : null}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-brand-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-500">{label}</p>
      <p className="mt-2 text-base font-bold text-brand-900">{value}</p>
    </article>
  );
}
