import clsx from 'clsx';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import {
  hasPermission,
  isSchoolSetupComplete,
  isSuperAdmin,
} from '../features/auth/auth-helpers';
import { RoleNav } from './role-nav';

export function AppShell() {
  const auth = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const setupComplete = isSchoolSetupComplete(auth.me);
  const schoolAdmin = hasPermission(auth.me, 'school.setup.manage') && !isSuperAdmin(auth.me);

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  return (
    <main className="min-h-screen bg-transparent text-brand-900">
      {isMobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-brand-900/45 md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <div className="relative min-h-screen p-2 md:grid md:gap-3 md:p-3 md:grid-cols-[320px_1fr]">
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col overflow-hidden rounded-r-2xl border border-brand-200 bg-white/95 shadow-soft transition-transform md:static md:w-auto md:rounded-2xl md:translate-x-0',
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-label="Sidebar"
        >
          <div className="border-b border-brand-100 p-4">
            <div className="mb-4 flex items-center justify-between md:hidden">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
                Navigation
              </span>
              <button
                type="button"
                onClick={closeMobileNav}
                className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-brand-300 to-brand-500 text-xs font-bold text-white">
                SS
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-brand-900">
                  Smart<span className="text-brand-600">School</span>
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-500">
                  Rwanda Admin OS
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-brand-100 p-3">
            <a
              href="#"
              className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
            >
              <span className="text-brand-600">&lt;</span>
              Back to Website
            </a>
          </div>

          <div className="flex-1 p-3">
            <RoleNav onNavigate={closeMobileNav} />
          </div>

          <div className="mt-auto border-t border-brand-100 p-3">
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white/70 shadow-soft">
          <header className="border-b border-brand-100 p-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 md:hidden"
                aria-label="Open sidebar"
              >
                ≡
              </button>

              <button
                type="button"
                className="hidden h-10 w-10 place-items-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 md:grid"
              >
                &lt;
              </button>

              <div className="min-w-[220px] flex-1">
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm text-brand-900 outline-none placeholder:text-brand-400 focus:border-brand-400"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                  {auth.me?.tenant.name ?? 'Tenant'}
                </button>
                <button className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                  Alerts
                </button>
                <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-500">
                    {auth.me?.roles[0] ?? 'ROLE'}
                  </p>
                  <p className="text-xs font-semibold text-brand-700">{auth.me?.tenant.code}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 text-xs font-bold text-white">
                  {`${auth.me?.firstName?.[0] ?? 'U'}${auth.me?.lastName?.[0] ?? 'S'}`}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-6">
            {schoolAdmin && !setupComplete ? (
              <div
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                role="status"
              >
                Finish setup wizard to unlock academics, classes, students, subjects, and staff pages.
              </div>
            ) : null}
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
