import { Menu, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import logo from '../../asset/logo.jpg';
import { useAuth } from '../../features/auth/auth.context';
import { getDefaultLandingPath } from '../../features/auth/auth-helpers';

const publicNav = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/courses', label: 'Programs' },
  { to: '/job-listing', label: 'Jobs' },
  { to: '/contact', label: 'Contact' },
];

function navClass(isActive: boolean) {
  return [
    'group relative text-[13px] uppercase tracking-wider transition-colors',
    isActive ? 'text-brand-600 font-semibold' : 'text-slate-600 hover:text-brand-600',
  ].join(' ');
}

export function PublicHeader() {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const workspaceLink = useMemo(() => {
    if (auth.me) {
      return getDefaultLandingPath(auth.me);
    }

    return '/login';
  }, [auth.me]);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-white/90 shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="SmartSchool logo" className="h-8 w-8 rounded-md border border-brand-100 object-cover" />
          <span className="text-lg font-bold tracking-tight text-brand-600">Smart school</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {publicNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navClass(isActive)}>
              {({ isActive }) => (
                <>
                  {item.label}
                  <span
                    className={[
                      'absolute -bottom-1 left-0 h-[1.5px] w-full origin-left bg-brand-500 transition-transform duration-300',
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                    ].join(' ')}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to={workspaceLink}
            className="rounded-full bg-brand-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-brand-600"
          >
            {auth.isAuthenticated ? 'Open Workspace' : 'Sign in'}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-white p-2 text-brand-600 lg:hidden"
          aria-label="Toggle navigation"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-brand-100 bg-white lg:hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-2 px-4 py-3 sm:px-6">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2 text-sm font-semibold',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-brand-50',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to={workspaceLink}
              onClick={() => setIsOpen(false)}
              className="mt-1 rounded-lg bg-brand-500 px-3 py-2 text-center text-sm font-semibold text-white"
            >
              {auth.isAuthenticated ? 'Open Workspace' : 'Sign in'}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
