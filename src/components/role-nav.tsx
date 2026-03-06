import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import {
  hasPermission,
  hasRole,
  isSchoolSetupComplete,
} from '../features/auth/auth-helpers';

type SetupState = 'ANY' | 'INCOMPLETE' | 'COMPLETE';

interface NavItem {
  key: string;
  label: string;
  to: string;
  roles: string[];
  requiredPermissions: string[];
  setupState: SetupState;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/admin',
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
    requiredPermissions: [],
    setupState: 'ANY',
  },
  {
    key: 'tenants',
    label: 'Tenants',
    to: '/super-admin/tenants',
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
    setupState: 'ANY',
  },
  {
    key: 'setup',
    label: 'Setup Wizard',
    to: '/admin/setup',
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['school.setup.manage'],
    setupState: 'INCOMPLETE',
  },
  {
    key: 'years',
    label: 'Academic Years',
    to: '/admin/academic-years',
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['academic_year.manage'],
    setupState: 'COMPLETE',
  },
  {
    key: 'classes',
    label: 'Classes',
    to: '/admin/classes',
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['class_room.manage'],
    setupState: 'COMPLETE',
  },
  {
    key: 'students',
    label: 'Students',
    to: '/admin/students',
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['students.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'subjects',
    label: 'Subjects',
    to: '/admin/subjects',
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['subject.manage'],
    setupState: 'COMPLETE',
  },
  {
    key: 'parents',
    label: 'Parents',
    to: '/admin/parents',
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['parents.manage'],
    setupState: 'ANY',
  },
  {
    key: 'staff',
    label: 'Staff',
    to: '/admin/staff',
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['staff.invite'],
    setupState: 'ANY',
  },
  {
    key: 'my-children',
    label: 'My Children',
    to: '/parent/my-children',
    roles: ['PARENT'],
    requiredPermissions: ['parents.my_children.read'],
    setupState: 'ANY',
  },
];

interface RoleNavProps {
  onNavigate?: () => void;
}

export function RoleNav({ onNavigate }: RoleNavProps) {
  const auth = useAuth();
  const setupComplete = isSchoolSetupComplete(auth.me);
  const superAdmin = hasRole(auth.me, 'SUPER_ADMIN');

  const items = NAV_ITEMS.filter((item) => {
    if (superAdmin) {
      return true;
    }

    const hasAllowedRole = item.roles.some((role) => hasRole(auth.me, role));
    if (!hasAllowedRole) {
      return false;
    }

    const hasAllPermissions = item.requiredPermissions.every((permission) =>
      hasPermission(auth.me, permission),
    );
    if (!hasAllPermissions) {
      return false;
    }

    if (item.setupState === 'INCOMPLETE' && setupComplete) {
      return false;
    }

    if (item.setupState === 'COMPLETE' && !setupComplete) {
      return false;
    }

    return true;
  });

  return (
    <nav aria-label="Primary" className="grid gap-2">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-base font-semibold transition',
              isActive
                ? 'border-brand-300 bg-brand-500/90 text-white shadow-soft'
                : 'border-transparent bg-transparent text-brand-600 hover:border-brand-100 hover:bg-brand-50 hover:text-brand-800',
            )
          }
        >
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
