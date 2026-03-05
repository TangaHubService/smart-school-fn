import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';

const navItems = [
  { label: 'Dashboard', path: '/', permission: null },
  { label: 'Users', path: '/users', permission: 'users.read' },
  { label: 'Roles', path: '/roles', permission: 'roles.read' },
];

export function RoleNav() {
  const auth = useAuth();

  const items = navItems.filter((item) => {
    if (!item.permission) {
      return true;
    }
    return auth.me?.permissions.includes(item.permission) ?? false;
  });

  return (
    <nav aria-label="Primary" className="grid gap-2">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            clsx(
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-brand-600 text-white shadow-soft'
                : 'bg-brand-50 text-brand-700 hover:bg-brand-100',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
