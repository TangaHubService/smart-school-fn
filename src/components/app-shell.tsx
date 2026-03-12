import clsx from 'clsx';
import {
  ArrowLeft,
  Bell,
  Building2,
  ChevronLeft,
  Home,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
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
  const superAdmin = isSuperAdmin(auth.me);

  const headerTitle = superAdmin
    ? 'Super Admin Dashboard'
    : schoolAdmin
      ? 'School Administrator Dashboard'
      : 'Dashboard';

  const userDisplayName =
    `${auth.me?.firstName ?? ''} ${auth.me?.lastName ?? ''}`.trim() ||
    auth.me?.email ||
    'Signed-in user';
  const userDisplayEmail = auth.me?.email ?? 'No email';

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  return (
    <main className="h-screen overflow-hidden bg-content-bg text-slate-900">
      {isMobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-brand-900/45 md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <div className="relative h-full md:flex md:gap-0">
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col overflow-hidden bg-[#173C7F] text-white md:sticky md:top-0 md:h-screen md:w-[240px] md:shrink-0 md:rounded-none',
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
            isDesktopSidebarVisible
              ? 'md:translate-x-0'
              : 'md:hidden',
          )}
          aria-label="Sidebar"
        >
          <div className={'border-b border-white/10 px-6 py-5'}>
            <div className="flex items-center justify-between md:hidden">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Navigation
              </span>
              <button
                type="button"
                onClick={closeMobileNav}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Close
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 md:mt-0">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
                <span className="text-base">🎓</span>
              </div>
              <div>
                <p className="text-base font-bold tracking-tight text-white">
                  Smart<span className="text-amber-400">School</span>
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/80">
                  RWANDA ADMIN OS
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 px-6 py-4">
            <a
              href="/"
              className="flex w-full items-center gap-2 rounded-lg bg-white/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/25"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              Back to Website
            </a>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <RoleNav onNavigate={closeMobileNav} />
          </div>

          <div className="mt-auto shrink-0 px-6 pb-6 pt-6">
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="inline-flex w-full items-center gap-2 rounded-lg bg-white px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-white/95"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              Logout
            </button>
          </div>
        </aside>

        <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-white md:h-screen">
          <header className="sticky top-0 z-20 shrink-0 bg-[#173C7F] px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white md:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setIsDesktopSidebarVisible((current) => !current)}
                className="hidden h-10 min-w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white md:grid"
                aria-label={isDesktopSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
                aria-pressed={isDesktopSidebarVisible}
              >
                {isDesktopSidebarVisible ? (
                  <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
                )}
              </button>

              <Home className="h-4 w-4 shrink-0 text-white" aria-hidden="true" />
              <span className="text-sm font-bold text-white">{headerTitle}</span>

              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-sm font-medium text-white sm:inline">
                  Hello, {superAdmin ? 'Admin' : (auth.me?.firstName ?? 'Admin')}
                </span>
                {!superAdmin ? (
                  <button className="inline-flex items-center gap-2 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-medium text-white">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    {auth.me?.tenant.name ?? 'Tenant'}
                  </button>
                ) : null}
                <button
                  className="relative inline-flex h-9 w-9 items-center justify-center text-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white">
                    3
                  </span>
                </button>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center text-white"
                  aria-label="Messages"
                >
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="hidden min-w-[220px] items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-left sm:flex">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-brand-600">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{userDisplayName}</p>
                    <p className="truncate text-[11px] text-white/75">{userDisplayEmail}</p>
                  </div>
                </div>
                <div
                  className="grid h-10 w-10 place-items-center rounded-lg bg-white text-brand-600 sm:hidden"
                  title={userDisplayName}
                  aria-label={`Logged in as ${userDisplayName}`}
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto bg-content-bg px-5 py-5 md:px-6 md:py-6">
            {schoolAdmin && !setupComplete ? (
              <div
                className="mb-4 rounded-lg border border-accent-100 bg-white px-4 py-3 text-sm text-slate-900"
                role="status"
              >
                Action required: complete the school profile and setup wizard to unlock academics, classes, students, subjects, and staff pages.
              </div>
            ) : null}
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
