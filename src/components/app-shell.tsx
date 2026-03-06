import clsx from 'clsx';
import {
  ArrowLeft,
  Bell,
  Building2,
  ChevronLeft,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react';
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
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);

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

      <div
        className={clsx(
          'relative min-h-screen p-2 md:grid md:gap-3 md:p-3',
          isDesktopSidebarVisible ? 'md:grid-cols-[320px_1fr]' : 'md:grid-cols-[1fr]',
        )}
      >
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col overflow-hidden rounded-r-2xl border border-brand-200 bg-white/95 shadow-soft transition-transform md:sticky md:top-3 md:h-[calc(100vh-1.5rem)] md:w-auto md:rounded-2xl',
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
            isDesktopSidebarVisible ? 'md:flex md:translate-x-0' : 'md:hidden',
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
                className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
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
              <ArrowLeft className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Back to Website
            </a>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <RoleNav onNavigate={closeMobileNav} />
          </div>

          <div className="mt-auto shrink-0 border-t border-brand-100 bg-white/95 p-3 backdrop-blur">
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="inline-flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
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
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setIsDesktopSidebarVisible((current) => !current)}
                className="hidden h-10 min-w-10 place-items-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 md:grid"
                aria-label={isDesktopSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
                aria-pressed={isDesktopSidebarVisible}
              >
                {isDesktopSidebarVisible ? (
                  <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
                )}
              </button>

              <div className="relative min-w-[220px] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-10 w-full rounded-lg border border-brand-200 bg-white pl-9 pr-3 text-sm text-brand-900 outline-none placeholder:text-brand-400 focus:border-brand-400"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  {auth.me?.tenant.name ?? 'Tenant'}
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                  <Bell className="h-4 w-4" aria-hidden="true" />
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
