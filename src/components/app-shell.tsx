import { Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { RoleNav } from './role-nav';

export function AppShell() {
  const auth = useAuth();

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-5 p-4 md:grid-cols-[220px_1fr] md:p-6">
      <aside className="rounded-2xl border border-brand-100 bg-white/90 p-4 shadow-soft">
        <h1 className="text-lg font-bold text-brand-900">Smart School RW</h1>
        <p className="mt-1 text-xs text-brand-700">{auth.me?.tenant.name ?? 'School'}</p>
        <div className="mt-5">
          <RoleNav />
        </div>
      </aside>

      <section className="space-y-4">
        <header className="rounded-2xl border border-brand-100 bg-white/90 p-4 shadow-soft">
          <p className="text-sm text-brand-700">Signed in as</p>
          <p className="text-base font-semibold text-brand-900">
            {auth.me?.firstName} {auth.me?.lastName}
          </p>
        </header>
        <Outlet />
      </section>
    </main>
  );
}
