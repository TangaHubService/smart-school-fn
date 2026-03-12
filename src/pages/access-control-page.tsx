import { Shield, ShieldCheck, UserPlus } from 'lucide-react';

import { SectionCard } from '../components/section-card';

// TODO: Replace with API call when backend is ready
// import { useQuery } from '@tanstack/react-query';
// import { listPlatformRolesApi, listAccessPoliciesApi } from '../features/access/access.api';

const DUMMY_ROLES = [
  { id: '1', name: 'Super Admin', description: 'Full platform access', users: 2 },
  { id: '2', name: 'School Admin', description: 'School-level administration', users: 45 },
  { id: '3', name: 'Teacher', description: 'Teaching and grading', users: 320 },
  { id: '4', name: 'Auditor', description: 'Read-only audit access', users: 5 },
];

export function AccessControlPage() {
  // TODO: Integrate with backend when API is available
  // const { data } = useQuery({
  //   queryKey: ['access-control'],
  //   queryFn: () => listPlatformRolesApi(accessToken),
  // });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Access Control</h1>
        <p className="mt-1 text-sm text-slate-600">
          Platform roles and permissions. Ready for backend integration.
        </p>
      </div>

      <SectionCard title="Platform Roles" subtitle="Manage role-based access">
        <div className="grid gap-4 sm:grid-cols-2">
          {DUMMY_ROLES.map((role) => (
            <div
              key={role.id}
              className="flex items-start gap-3 rounded-lg border border-brand-100 bg-white p-4"
            >
              <div className="rounded-lg bg-brand-100 p-2">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{role.name}</p>
                <p className="mt-0.5 text-sm text-slate-600">{role.description}</p>
                <p className="mt-2 text-xs text-slate-500">{role.users} users</p>
              </div>
              <button
                type="button"
                className="rounded border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Quick Actions" subtitle="Common access tasks">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50"
          >
            <UserPlus className="h-4 w-4" />
            Invite Admin
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50"
          >
            <Shield className="h-4 w-4" />
            Manage Permissions
          </button>
        </div>
      </SectionCard>
    </section>
  );
}
