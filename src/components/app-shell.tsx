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
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/auth.context';
import {
  hasPermission,
  hasRole,
  isSchoolSetupComplete,
  isSuperAdmin,
} from '../features/auth/auth-helpers';
import { getMySubscriptionInvoiceApi } from '../features/billing/billing.api';
import { SetStudentHeaderActionsContext } from '../contexts/student-header-actions.context';
import { AcademicYearSelector } from './academic-year-selector';
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
  const [studentHeaderActions, setStudentHeaderActions] = useState<ReactNode | null>(null);

  const setupComplete = isSchoolSetupComplete(auth.me);
  const schoolAdmin = hasPermission(auth.me, 'school.setup.manage') && !isSuperAdmin(auth.me);
  const superAdmin = isSuperAdmin(auth.me);

  // Real subscription status for the sidebar school card (school admins only).
  const canReadBilling = hasPermission(auth.me, 'billing.read');
  const subscriptionQuery = useQuery({
    queryKey: ['billing', 'invoice', 'sidebar'],
    enabled: Boolean(auth.accessToken && schoolAdmin && canReadBilling),
    queryFn: () => getMySubscriptionInvoiceApi(auth.accessToken!),
    staleTime: 5 * 60_000,
  });
  const invoiceStatus = schoolAdmin ? subscriptionQuery.data?.invoice.status : undefined;

  const isStudent = hasRole(auth.me, 'STUDENT') || hasRole(auth.me, 'PUBLIC_LEARNER');
  const isParent = hasRole(auth.me, 'PARENT');
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
          : isParent
            ? t('headerTitle.parentPortal')
            : t('headerTitle.dashboard');

  const userDisplayName =
    `${auth.me?.firstName ?? ''} ${auth.me?.lastName ?? ''}`.trim() || auth.me?.email || 'User';
  const userDisplayEmail = auth.me?.email ?? '-';
  const studentHeaderNavItems = [
    { to: '/student/dashboard', label: t('studentHeader.dashboard') },
    { to: '/student/courses', label: t('studentHeader.courses') },
    { to: '/student/my-learning', label: t('studentHeader.progress') },
    hasPermission(auth.me, 'report_cards.my_read')
      ? {
          to: '/student/report-cards',
          label: t('studentHeader.reports'),
          title: t('studentHeader.reportCards'),
        }
      : null,
    hasPermission(auth.me, 'assessments.submit')
      ? { to: '/student/assessments', label: t('studentHeader.tests') }
      : null,
    hasPermission(auth.me, 'announcements.my_read')
      ? {
          to: '/student/announcements',
          label: t('studentHeader.news'),
          title: t('studentHeader.announcements'),
        }
      : null,
    hasPermission(auth.me, 'chat.read')
      ? { to: '/student/chat', label: t('studentHeader.chat') }
      : null,
  ].filter(Boolean) as Array<{ to: string; label: string; title?: string }>;

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  useEffect(() => {
    if (isStudent) {
      setStudentHeaderActions(null);
    }
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
              'fixed inset-y-0 left-0 z-40 flex w-max max-w-[100vw] flex-col overflow-x-hidden overflow-y-hidden text-white md:sticky md:top-0 md:h-screen md:shrink-0 md:rounded-none',
              schoolAdmin
                ? 'bg-gradient-to-b from-[#06245a] via-[#073a7c] to-[#052f68]'
                : 'bg-[#173C7F]',
              isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
              isDesktopSidebarVisible ? 'md:translate-x-0' : 'md:hidden'
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
                    {isStudent
                      ? t('headerTitle.studentPortal')
                      : isTeacher
                        ? t('headerTitle.teacherPortal')
                        : isParent
                          ? t('headerTitle.parentPortal')
                          : 'RWANDA ADMIN OS'}
                  </p>
                </div>
              </div>
              {schoolAdmin && auth.me?.school ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/10 p-3 shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#173C7F]">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-40 truncate text-xs font-semibold text-white">
                        {auth.me.school.displayName}
                      </p>
                      <p className="mt-0.5 max-w-40 truncate text-[10px] text-white/65">
                        {auth.me.tenant.code}
                      </p>
                    </div>
                  </div>
                  {canReadBilling ? (
                    <p
                      className={clsx(
                        'mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        invoiceStatus === undefined
                          ? 'bg-white/10 text-white/70'
                          : invoiceStatus === 'PAID'
                            ? 'bg-emerald-400/20 text-emerald-200'
                            : 'bg-amber-400/20 text-amber-200'
                      )}
                    >
                      <span
                        className={clsx(
                          'h-1.5 w-1.5 rounded-full',
                          invoiceStatus === 'PAID' ? 'bg-emerald-300' : 'bg-amber-300'
                        )}
                        aria-hidden="true"
                      />
                      {invoiceStatus === undefined
                        ? t('shell.checkingSubscription')
                        : invoiceStatus === 'PAID'
                          ? t('shell.activeSubscription')
                          : t('shell.paymentDue')}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-6">
              <RoleNav onNavigate={closeMobileNav} />
            </div>

            <div className="mt-auto shrink-0 px-6 pb-6 pt-6">
              <button
                type="button"
                onClick={() => void auth.logout()}
                className={clsx(
                  'inline-flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-4 py-3 text-left text-sm font-semibold transition',
                  schoolAdmin
                    ? 'border border-white/15 bg-white/5 text-red-300 hover:bg-white/10 hover:text-red-200'
                    : 'bg-white text-red-600 hover:bg-white/95'
                )}
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
                'sticky top-0 z-30 shrink-0 px-5 transition-[padding] duration-200',
                schoolAdmin
                  ? 'border-b border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]'
                  : 'bg-[#173C7F]',
                'py-3',
                isStudent && 'shadow-[0_6px_18px_rgba(15,23,42,0.14)]'
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {!isStudent ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsMobileNavOpen(true)}
                      className={clsx(
                        'grid h-10 w-10 place-items-center rounded-lg border md:hidden',
                        schoolAdmin
                          ? 'border-slate-200 bg-slate-50 text-slate-700'
                          : 'border-white/20 bg-white/10 text-white'
                      )}
                      aria-label={t('shell.openSidebar')}
                    >
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDesktopSidebarVisible((current) => !current)}
                      className={clsx(
                        'hidden h-10 min-w-10 place-items-center rounded-lg border md:grid',
                        schoolAdmin
                          ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          : 'border-white/20 bg-white/10 text-white'
                      )}
                      aria-label={
                        isDesktopSidebarVisible ? t('shell.hideSidebar') : t('shell.showSidebar')
                      }
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
                  </a>
                )}

                <Home
                  className={clsx('h-4 w-4 shrink-0', schoolAdmin ? 'text-blue-600' : 'text-white')}
                  aria-hidden="true"
                />
                <span
                  className={clsx(
                    'text-sm font-bold',
                    schoolAdmin ? 'text-slate-900' : 'text-white'
                  )}
                >
                  {headerTitle}
                </span>

                <div className="ml-auto flex items-center gap-2">
                  <AcademicYearSelector />
                  <div className="hidden items-center gap-2 lg:flex">
                    <LowBandwidthToggle />
                    <LanguageSwitcher
                      className={
                        schoolAdmin
                          ? '[&_span]:text-slate-600 [&_select]:border-slate-200 [&_select]:bg-white [&_select]:text-slate-700'
                          : '[&_span]:text-white/85 [&_select]:border-white/25 [&_select]:bg-white/10 [&_select]:text-white'
                      }
                    />
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="hidden min-w-[220px] items-center gap-2 rounded-lg   text-left transition sm:flex"
                    >
                      <div
                        className={clsx(
                          'grid h-8 w-8 place-items-center rounded-full',
                          schoolAdmin ? 'bg-amber-400 text-white' : 'bg-white text-brand-600'
                        )}
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={clsx(
                            'truncate text-xs font-semibold',
                            schoolAdmin ? 'text-slate-900' : 'text-white'
                          )}
                        >
                          {userDisplayName}
                        </p>
                        <p
                          className={clsx(
                            'truncate text-[11px]',
                            schoolAdmin ? 'text-slate-500' : 'text-white/75'
                          )}
                        >
                          {userDisplayEmail}
                        </p>
                      </div>
                      <ChevronDown
                        className={clsx(
                          'h-4 w-4 transition-transform duration-200',
                          schoolAdmin ? 'text-slate-500' : 'text-white',
                          isProfileMenuOpen && 'rotate-180'
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className={clsx(
                        'grid h-10 w-10 place-items-center rounded-lg transition sm:hidden',
                        schoolAdmin
                          ? 'bg-amber-400 text-white hover:bg-amber-500'
                          : 'bg-white text-brand-600 hover:bg-white/90'
                      )}
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
                            <p className="truncate text-xs font-bold text-slate-900">
                              {userDisplayName}
                            </p>
                            <p className="truncate text-[10px] text-slate-500">
                              {userDisplayEmail}
                            </p>
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
                  className={clsx('mt-3 overflow-hidden border-t border-white/10 pt-3 opacity-100')}
                >
                  <div className="grid w-full gap-2">
                    <nav className="flex min-w-0 w-full items-center gap-1.5 overflow-x-auto pb-0.5 text-sm sm:gap-2">
                      {studentHeaderNavItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          title={item.title ?? item.label}
                          className={({ isActive }) =>
                            clsx(
                              'shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm',
                              isActive
                                ? 'bg-white text-[#173C7F] shadow-sm'
                                : 'text-white/85 hover:text-white'
                            )
                          }
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </nav>
                    {studentHeaderActions ? (
                      <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 sm:justify-end sm:gap-2">
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
      {isStudent ? (
        <Link
          to="/student/chat"
          className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 active:scale-95"
          aria-label={t('studentHeader.chat')}
        >
          <MessageCircle className="h-6 w-6" />
        </Link>
      ) : null}
      <ConnectionStatusBanner />
    </main>
  );
}
