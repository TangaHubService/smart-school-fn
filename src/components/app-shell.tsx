import clsx from 'clsx';
import {
  ArrowLeft,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  Home,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/auth.context';
import {
  hasPermission,
  hasRole,
  isSchoolSetupComplete,
  isSuperAdmin,
} from '../features/auth/auth-helpers';
import { SetStudentHeaderActionsContext } from '../contexts/student-header-actions.context';
import { ConnectionStatusBanner } from './connection-status-banner';
import { LanguageSwitcher } from './language-switcher';
import { LowBandwidthToggle } from './low-bandwidth-toggle';
import { RoleNav } from './role-nav';

export function AppShell() {
  const { t } = useTranslation('common');
  const auth = useAuth();
  const location = useLocation();
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [studentNavExpanded, setStudentNavExpanded] = useState(true);
  const [studentHeaderActions, setStudentHeaderActions] = useState<ReactNode | null>(null);

  const setupComplete = isSchoolSetupComplete(auth.me);
  const schoolAdmin = hasPermission(auth.me, 'school.setup.manage') && !isSuperAdmin(auth.me);
  const superAdmin = isSuperAdmin(auth.me);

  const isStudent = hasRole(auth.me, 'STUDENT');
  const isTeacher =
    hasRole(auth.me, 'TEACHER') &&
    !hasRole(auth.me, 'SCHOOL_ADMIN') &&
    !hasRole(auth.me, 'SUPER_ADMIN');
  const headerTitle = superAdmin
    ? t('headerTitle.superAdmin')
    : schoolAdmin
      ? t('headerTitle.dashboard')
      : isStudent
        ? t('headerTitle.studentPortal')
        : isTeacher
          ? t('headerTitle.teacherPortal')
          : t('headerTitle.dashboard');

  const userDisplayName =
    `${auth.me?.firstName ?? ''} ${auth.me?.lastName ?? ''}`.trim() ||
    auth.me?.email ||
    'User';
  const userDisplayEmail = auth.me?.email ?? '-';

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  useEffect(() => {
    setStudentNavExpanded(true);
  }, [location.pathname]);

  useEffect(() => {
    if (isStudent) {
      setStudentHeaderActions(null);
    }
  }, [isStudent, location.pathname]);

  useEffect(() => {
    if (!isStudent) {
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanups: Array<() => void> = [];
    const bound = new Set<HTMLElement>();
    const scrollStates = new Map<Element, number>();
    let mo: MutationObserver | null = null;

    const getScrollRoots = (): HTMLElement[] => {
      const shell = contentScrollRef.current;
      if (!shell) {
        return [];
      }
      const out: HTMLElement[] = [shell];
      shell.querySelectorAll<HTMLElement>('[data-student-scroll-root]').forEach((el) => {
        if (!out.includes(el)) {
          out.push(el);
        }
      });
      return out;
    };

    const applyScrollDelta = (root: HTMLElement) => {
      const st = root.scrollTop;
      const prev = scrollStates.get(root) ?? 0;
      scrollStates.set(root, st);

      const roots = getScrollRoots();
      const allNearTop = roots.length > 0 && roots.every((r) => r.scrollTop < 28);

      if (allNearTop) {
        setStudentNavExpanded(true);
        return;
      }

      if (st > prev + 10) {
        setStudentNavExpanded(false);
      } else if (st < prev - 10) {
        setStudentNavExpanded(true);
      }
    };

    const bindRoot = (root: HTMLElement) => {
      if (bound.has(root)) {
        return;
      }
      bound.add(root);
      const onScroll = () => applyScrollDelta(root);
      root.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => {
        root.removeEventListener('scroll', onScroll);
        bound.delete(root);
        scrollStates.delete(root);
      });
    };

    const discover = () => {
      const shell = contentScrollRef.current;
      if (!shell || cancelled) {
        return;
      }
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
      bound.clear();
      scrollStates.clear();

      bindRoot(shell);
      shell.querySelectorAll<HTMLElement>('[data-student-scroll-root]').forEach((el) => {
        if (el !== shell) {
          bindRoot(el);
        }
      });
    };

    const start = () => {
      requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        discover();
        const shell = contentScrollRef.current;
        if (!shell || cancelled) {
          return;
        }
        if (!mo) {
          mo = new MutationObserver(() => {
            window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
              if (!cancelled) {
                discover();
              }
            }, 80);
          });
          mo.observe(shell, { childList: true, subtree: true });
        }
      });
    };

    start();

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
      mo?.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, [isStudent, location.pathname]);

  return (
    <main className="h-screen overflow-hidden bg-content-bg text-slate-900">
      {isMobileNavOpen ? (
        <button
          type="button"
          aria-label={t('shell.close')}
          className="fixed inset-0 z-30 bg-brand-900/45 md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <div className="relative h-full md:flex md:gap-0">
        {isStudent ? null : (
          <aside
            className={clsx(
              'fixed inset-y-0 left-0 z-40 flex w-max max-w-[100vw] flex-col overflow-x-hidden overflow-y-hidden bg-[#173C7F] text-white md:sticky md:top-0 md:h-screen md:shrink-0 md:rounded-none',
              isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
              isDesktopSidebarVisible ? 'md:translate-x-0' : 'md:hidden',
            )}
            aria-label="Sidebar"
          >
          <div className={'border-b border-white/10 px-6 py-5'}>
            <div className="flex items-center justify-between md:hidden">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                {t('shell.navigation')}
              </span>
              <button
                type="button"
                onClick={closeMobileNav}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                {t('shell.close')}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 md:mt-0">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
                <span className="text-base">🎓</span>
              </div>
              <div>
                <p className="whitespace-nowrap text-base font-bold tracking-tight text-white">
                  Smart<span className="text-amber-400">School</span>
                </p>
                <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-white/80">
                  {isStudent ? t('headerTitle.studentPortal') : isTeacher ? t('headerTitle.teacherPortal') : 'RWANDA ADMIN OS'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 px-6 py-4">
            <a
              href="/"
              className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg bg-white/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/25"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('shell.backToWebsite')}
            </a>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-6">
            <RoleNav onNavigate={closeMobileNav} />
          </div>

          <div className="mt-auto shrink-0 px-6 pb-6 pt-6">
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="inline-flex w-full items-center gap-2 whitespace-nowrap rounded-lg bg-white px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-white/95"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('shell.logout')}
            </button>
          </div>
        </aside>
      )}

        <SetStudentHeaderActionsContext.Provider value={setStudentHeaderActions}>
        <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-white md:h-screen">
          <header
            className={clsx(
              'sticky top-0 z-20 shrink-0 bg-[#173C7F] px-5 transition-[padding] duration-200',
              isStudent && !studentNavExpanded ? 'py-2' : 'py-3',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {!isStudent ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsMobileNavOpen(true)}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white md:hidden"
                    aria-label={t('shell.openSidebar')}
                  >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDesktopSidebarVisible((current) => !current)}
                    className="hidden h-10 min-w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white md:grid"
                    aria-label={isDesktopSidebarVisible ? t('shell.hideSidebar') : t('shell.showSidebar')}
                    aria-pressed={isDesktopSidebarVisible}
                  >
                    {isDesktopSidebarVisible ? (
                      <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </>
              ) : (
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-[#173C7F] shadow-sm transition hover:bg-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t('shell.backToWebsite')}
                </a>
              )}

              <Home className="h-4 w-4 shrink-0 text-white" aria-hidden="true" />
              <span className="text-sm font-bold text-white">{headerTitle}</span>

              {isStudent && !studentNavExpanded ? (
                <button
                  type="button"
                  onClick={() => setStudentNavExpanded(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/20"
                  aria-expanded={false}
                  aria-controls="student-header-nav"
                >
                  <Menu className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('shell.links')}
                </button>
              ) : null}

              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-sm font-medium text-white sm:inline">
                  {t('shell.hello', { name: superAdmin ? 'Admin' : (auth.me?.firstName ?? 'Admin') })}
                </span>
                {!superAdmin ? (
                  <button className="inline-flex items-center gap-2 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-medium text-white">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    {auth.me?.tenant.name ?? t('shell.tenant')}
                  </button>
                ) : null}
                <div className="hidden items-center gap-2 lg:flex">
                  <LowBandwidthToggle />
                  <LanguageSwitcher className="[&_span]:text-white/85 [&_select]:border-white/25 [&_select]:bg-white/10 [&_select]:text-white" />
                </div>
                <button
                  className="relative inline-flex h-9 w-9 items-center justify-center text-white"
                  aria-label={t('shell.notifications')}
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white">
                    3
                  </span>
                </button>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center text-white"
                  aria-label={t('shell.messages')}
                >
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="hidden min-w-[220px] items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-left transition hover:bg-white/20 sm:flex"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-brand-600">
                      <User className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{userDisplayName}</p>
                      <p className="truncate text-[11px] text-white/75">{userDisplayEmail}</p>
                    </div>
                    <ChevronDown
                      className={clsx(
                        'h-4 w-4 text-white transition-transform duration-200',
                        isProfileMenuOpen && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="grid h-10 w-10 place-items-center rounded-lg bg-white text-brand-600 transition hover:bg-white/90 sm:hidden"
                    title={userDisplayName}
                    aria-label={t('shell.loggedInAs', { name: userDisplayName })}
                    aria-pressed={isProfileMenuOpen}
                  >
                    <User className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {isProfileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 z-20 w-48 origin-top-right rounded-xl border border-white/10 bg-white p-1 shadow-xl ring-1 ring-black/5 backdrop-blur-lg">
                        <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                          <p className="truncate text-xs font-bold text-slate-900">{userDisplayName}</p>
                          <p className="truncate text-[10px] text-slate-500">{userDisplayEmail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            void auth.logout();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        >
                          <LogOut className="h-4 w-4" />
                          {t('shell.logout')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {isStudent ? (
              <div
                id="student-header-nav"
                aria-hidden={!studentNavExpanded}
                className={clsx(
                  'overflow-hidden transition-[max-height,opacity,margin,padding] duration-200 ease-out',
                  studentNavExpanded
                    ? 'mt-3 max-h-80 border-t border-white/10 pt-3 opacity-100 sm:max-h-96'
                    : 'pointer-events-none max-h-0 border-0 opacity-0',
                )}
              >
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <nav
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5 text-sm sm:gap-2"
                    aria-hidden={!studentNavExpanded}
                  >
                {[
                  { to: '/student/dashboard', label: t('studentHeader.dashboard') },
                      { to: '/student/courses', label: t('studentHeader.courses') },
                      { to: '/student/my-learning', label: t('studentHeader.progress') },
                      { to: '/student/report-cards', label: t('studentHeader.reports'), title: t('studentHeader.reportCards') },
                  { to: '/student/assessments', label: t('studentHeader.tests') },
                      { to: '/student/announcements', label: t('studentHeader.news'), title: t('studentHeader.announcements') },
                ].map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                        title={item.title ?? item.label}
                    className={({ isActive }) =>
                      clsx(
                            'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm',
                        isActive
                          ? 'bg-white text-[#173C7F] shadow-sm'
                          : 'text-white/85 hover:text-white',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
                  {studentHeaderActions ? (
                    <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                      {studentHeaderActions}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </header>

          <div
            ref={contentScrollRef}
            className="min-h-0 flex-1 overflow-auto bg-content-bg px-5 py-5 md:px-6 md:py-6"
          >
            {schoolAdmin && !setupComplete ? (
              <div
                className="mb-4 rounded-lg border border-accent-100 bg-white px-4 py-3 text-sm text-slate-900"
                role="status"
              >
                {t('shell.actionRequired')}
              </div>
            ) : null}
            <Outlet />
          </div>
        </section>
        </SetStudentHeaderActionsContext.Provider>
      </div>
      <ConnectionStatusBanner />
    </main>
  );
}
