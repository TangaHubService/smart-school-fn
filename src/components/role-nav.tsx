import clsx from 'clsx';
import {
  BadgeCheck,
  ClipboardCheck,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  Home,
  LayoutTemplate,
  School,
  Shapes,
  ShieldCheck,
  Users,
  UserSquare2,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { assessmentsFeatureEnabled } from '../features/assessments/feature';
import { conductFeatureEnabled } from '../features/conduct/feature';
import { govAuditingFeatureEnabled } from '../features/gov/feature';
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
  icon: LucideIcon;
  roles: string[];
  requiredPermissions: string[];
  setupState: SetupState;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/admin',
    icon: Home,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
    requiredPermissions: [],
    setupState: 'ANY',
  },
  {
    key: 'tenants',
    label: 'Schools',
    to: '/super-admin/schools',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
    setupState: 'ANY',
  },
  {
    key: 'setup',
    label: 'School Profile',
    to: '/admin/setup',
    icon: LayoutTemplate,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['school.setup.manage'],
    setupState: 'INCOMPLETE',
  },
  {
    key: 'years',
    label: 'Academic Years',
    to: '/admin/academic-years',
    icon: CalendarDays,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['academic_year.manage'],
    setupState: 'COMPLETE',
  },
  {
    key: 'classes',
    label: 'Classes',
    to: '/admin/classes',
    icon: School,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['class_room.manage'],
    setupState: 'COMPLETE',
  },
  {
    key: 'students',
    label: 'Students',
    to: '/admin/students',
    icon: GraduationCap,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['students.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'conduct',
    label: 'Discipline / Conduct',
    to: '/admin/conduct',
    icon: ClipboardList,
    roles: ['SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['conduct.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'attendance',
    label: 'Attendance',
    to: '/admin/attendance',
    icon: ClipboardList,
    roles: ['SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['attendance.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'subjects',
    label: 'Subjects',
    to: '/admin/subjects',
    icon: Shapes,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['subject.manage'],
    setupState: 'COMPLETE',
  },
  {
    key: 'courses',
    label: 'Courses',
    to: '/admin/courses',
    icon: BookOpen,
    roles: ['SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['courses.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'assessments',
    label: 'Assessments',
    to: '/admin/assessments',
    icon: BadgeCheck,
    roles: ['SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['assessments.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'assignments',
    label: 'Assignments',
    to: '/admin/assignments',
    icon: ClipboardCheck,
    roles: ['SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['courses.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'exams',
    label: 'Exams',
    to: '/admin/exams',
    icon: FileBarChart2,
    roles: ['SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['exams.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'parents',
    label: 'Parents',
    to: '/admin/parents',
    icon: Users,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['parents.manage'],
    setupState: 'ANY',
  },
  {
    key: 'staff',
    label: 'Staff',
    to: '/admin/staff',
    icon: ShieldCheck,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['staff.invite'],
    setupState: 'ANY',
  },
  {
    key: 'my-children',
    label: 'My Children',
    to: '/parent/my-children',
    icon: Users,
    roles: ['PARENT'],
    requiredPermissions: ['parents.my_children.read'],
    setupState: 'ANY',
  },
  {
    key: 'parent-report-cards',
    label: 'Report Cards',
    to: '/parent/report-cards',
    icon: FileBarChart2,
    roles: ['PARENT'],
    requiredPermissions: ['report_cards.my_read'],
    setupState: 'ANY',
  },
  {
    key: 'gov-dashboard',
    label: 'Gov Dashboard',
    to: '/gov',
    icon: Home,
    roles: ['GOV_AUDITOR', 'SUPER_ADMIN'],
    requiredPermissions: ['gov.dashboard.read'],
    setupState: 'ANY',
  },
  {
    key: 'gov-schools',
    label: 'Gov Schools',
    to: '/gov/schools',
    icon: Building2,
    roles: ['GOV_AUDITOR', 'SUPER_ADMIN'],
    requiredPermissions: ['gov.schools.read'],
    setupState: 'ANY',
  },
  {
    key: 'gov-incidents',
    label: 'Gov Incidents',
    to: '/gov/incidents',
    icon: FileBarChart2,
    roles: ['GOV_AUDITOR', 'SUPER_ADMIN'],
    requiredPermissions: ['gov.incidents.read'],
    setupState: 'ANY',
  },
  {
    key: 'gov-auditors',
    label: 'Auditor Admin',
    to: '/gov/admin/auditors',
    icon: ShieldCheck,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['gov.auditors.manage'],
    setupState: 'ANY',
  },
  {
    key: 'student-courses',
    label: 'My Courses',
    to: '/student/courses',
    icon: UserSquare2,
    roles: ['STUDENT'],
    requiredPermissions: ['students.my_courses.read'],
    setupState: 'ANY',
  },
  {
    key: 'student-report-cards',
    label: 'My Report Cards',
    to: '/student/report-cards',
    icon: FileBarChart2,
    roles: ['STUDENT'],
    requiredPermissions: ['report_cards.my_read'],
    setupState: 'ANY',
  },
  {
    key: 'student-assessments',
    label: 'My Tests',
    to: '/student/assessments',
    icon: BadgeCheck,
    roles: ['STUDENT'],
    requiredPermissions: ['assessments.submit'],
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
    if (!assessmentsFeatureEnabled && ['assessments', 'student-assessments'].includes(item.key)) {
      return false;
    }

    if (!conductFeatureEnabled && item.key === 'conduct') {
      return false;
    }

    if (!govAuditingFeatureEnabled && item.key.startsWith('gov-')) {
      return false;
    }

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
    <nav aria-label="Primary" className="grid gap-1.5">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          end={item.key === 'dashboard'}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition',
              isActive
                ? 'bg-white text-brand-600 shadow-soft'
                : 'text-white/80 hover:bg-white/10 hover:text-white',
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
