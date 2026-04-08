import clsx from 'clsx';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  ClipboardCheck,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutTemplate,
  School,
  Sparkles,
  Settings,
  Shapes,
  ShieldCheck,
  Users,
  UserSquare2,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../features/auth/auth.context';
import { assessmentsFeatureEnabled } from '../features/assessments/feature';
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
  requiredPermissionsOr?: string[];
  setupState: SetupState;
}

const SUPER_ADMIN_NAV_OVERRIDES: Record<string, string> = {
  dashboard: 'Dashboard',
  tenants: 'School Management',
  users: 'Users',
  'gov-auditors': 'Auditor Management',
  announcements: 'Announcements',
  'audit-logs': 'Activity Logs',
};

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/admin',
    icon: Home,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: [],
    setupState: 'ANY',
  },
  {
    key: 'users',
    label: 'Users',
    to: '/users',
    icon: Users,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
    requiredPermissions: ['users.read'],
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
    label: 'Schools Management',
    to: '/admin/setup',
    icon: LayoutTemplate,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissions: ['school.setup.manage'],
    setupState: 'INCOMPLETE',
  },
  {
    key: 'system-settings',
    label: 'System Settings',
    to: '/super-admin/settings',
    icon: Settings,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
    setupState: 'ANY',
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
    key: 'class-management',
    label: 'Class Management',
    to: '/admin/classes',
    icon: School,
    roles: ['SCHOOL_ADMIN'],
    requiredPermissionsOr: ['class_room.manage', 'students.read'],
    requiredPermissions: [],
    setupState: 'COMPLETE',
  },
  {
    key: 'students',
    label: 'Students',
    to: '/admin/students',
    icon: Users,
    roles: ['SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['students.read'],
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
    icon: GraduationCap,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissionsOr: ['courses.read', 'subject.manage'],
    requiredPermissions: [],
    setupState: 'COMPLETE',
  },
  {
    key: 'learning-content',
    label: 'Course Management',
    to: '/admin/courses',
    icon: BookOpen,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissionsOr: ['courses.read', 'subject.manage'],
    requiredPermissions: [],
    setupState: 'COMPLETE',
  },
  {
    key: 'learning-insights',
    label: 'Learning insights',
    to: '/admin/learning-insights',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissionsOr: ['courses.read', 'subject.manage'],
    requiredPermissions: [],
    setupState: 'COMPLETE',
  },
  {
    key: 'academy-programs',
    label: 'Academy programs',
    to: '/admin/academy-programs',
    icon: Sparkles,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissionsOr: ['courses.read', 'subject.manage'],
    requiredPermissions: [],
    setupState: 'COMPLETE',
  },
  {
    key: 'continuous-assessment',
    label: 'Continuous Assessment Test',
    to: '/admin/assessments',
    icon: BadgeCheck,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissionsOr: ['assessments.read', 'courses.read'],
    requiredPermissions: [],
    setupState: 'COMPLETE',
  },
  {
    key: 'exams',
    label: 'Examination Portal',
    to: '/admin/exams',
    icon: FileBarChart2,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['exams.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'class-marks',
    label: 'Marks',
    to: '/admin/class-marks',
    icon: FileBarChart2,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['exams.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'conduct-marks-settings',
    label: 'Conduct marks',
    to: '/admin/conduct-marks',
    icon: FileBarChart2,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissionsOr: ['term.manage', 'academic_year.manage', 'conduct.manage'],
    requiredPermissions: [],
    setupState: 'COMPLETE',
  },
  {
    key: 'report-cards',
    label: 'Report cards',
    to: '/admin/report-cards',
    icon: FileBarChart2,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['report_cards.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'timetable',
    label: 'Timetable',
    to: '/admin/timetable',
    icon: CalendarDays,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['timetable.read'],
    setupState: 'COMPLETE',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    to: '/admin/announcements',
    icon: Bell,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
    requiredPermissions: ['announcements.read'],
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
    key: 'access-control',
    label: 'Access Control',
    to: '/super-admin/access-control',
    icon: ShieldCheck,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
    setupState: 'ANY',
  },
  {
    key: 'reports-analytics',
    label: 'Reports & Analytics',
    to: '/super-admin/reports',
    icon: FileBarChart2,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
    setupState: 'ANY',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    to: '/super-admin/notifications',
    icon: Bell,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
    setupState: 'ANY',
  },
  {
    key: 'support-center',
    label: 'Support Center',
    to: '/super-admin/support',
    icon: HelpCircle,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
    setupState: 'ANY',
  },
  {
    key: 'audit-logs',
    label: 'Audit Logs',
    to: '/super-admin/audit-logs',
    icon: ClipboardList,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
    setupState: 'ANY',
  },
  {
    key: 'subscriptions',
    label: 'Subscription Management',
    to: '/super-admin/subscriptions',
    icon: Shapes,
    roles: ['SUPER_ADMIN'],
    requiredPermissions: ['tenants.read'],
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
    key: 'student-dashboard',
    label: 'Dashboard',
    to: '/student/dashboard',
    icon: Home,
    roles: ['STUDENT'],
    requiredPermissions: ['students.my_courses.read'],
    setupState: 'ANY',
  },
  {
    key: 'student-my-learning',
    label: 'My Learning',
    to: '/student/my-learning',
    icon: GraduationCap,
    roles: ['STUDENT'],
    requiredPermissions: ['students.my_courses.read'],
    setupState: 'ANY',
  },
  {
    key: 'student-courses',
    label: 'Course Curriculum',
    to: '/student/courses',
    icon: BookOpen,
    roles: ['STUDENT'],
    requiredPermissions: ['students.my_courses.read'],
    setupState: 'ANY',
  },
  {
    key: 'student-assignments',
    label: 'Assignments',
    to: '/student/assignments',
    icon: ClipboardCheck,
    roles: ['STUDENT'],
    requiredPermissions: ['students.my_courses.read'],
    setupState: 'ANY',
  },
  {
    key: 'student-report-cards',
    label: 'Report Cards',
    to: '/student/report-cards',
    icon: FileBarChart2,
    roles: ['STUDENT'],
    requiredPermissions: ['report_cards.my_read'],
    setupState: 'ANY',
  },
  {
    key: 'student-assessments',
    label: 'Tests',
    to: '/student/assessments',
    icon: BadgeCheck,
    roles: ['STUDENT'],
    requiredPermissions: ['assessments.submit'],
    setupState: 'ANY',
  },
  {
    key: 'student-announcements',
    label: 'Announcements',
    to: '/student/announcements',
    icon: Bell,
    roles: ['STUDENT'],
    requiredPermissions: ['announcements.my_read'],
    setupState: 'ANY',
  },
];

interface RoleNavProps {
  onNavigate?: () => void;
}

export function RoleNav({ onNavigate }: RoleNavProps) {
  const { t } = useTranslation('common');
  const auth = useAuth();
  const setupComplete = isSchoolSetupComplete(auth.me);
  const superAdmin = hasRole(auth.me, 'SUPER_ADMIN');
  const schoolAdmin = hasPermission(auth.me, 'school.setup.manage') && !superAdmin;

  const getDashboardLabel = () => {
    if (superAdmin) return t('headerTitle.superAdmin');
    if (schoolAdmin) return t('headerTitle.dashboard');
    return t('headerTitle.dashboard');
  };

  const SUPER_ADMIN_KEYS = new Set([
    'dashboard',
    'tenants',
    'users',
    'gov-auditors',
    'announcements',
    'audit-logs',
    'subscriptions',
  ]);

  const items = NAV_ITEMS.filter((item) => {
    if (!assessmentsFeatureEnabled && ['assessments', 'continuous-assessment', 'student-assessments'].includes(item.key)) {
      return false;
    }

    if (!govAuditingFeatureEnabled && item.key.startsWith('gov-')) {
      return false;
    }

    // Hide academy programs for non-academy schools.
    if (item.key === 'academy-programs' && !auth.me?.tenant?.isAcademyCatalog) {
      return false;
    }

    if (superAdmin) {
      return SUPER_ADMIN_KEYS.has(item.key);
    }

    const hasAllowedRole = item.roles.some((role) => hasRole(auth.me, role));
    if (!hasAllowedRole) {
      return false;
    }

    if (item.requiredPermissionsOr?.length) {
      const hasAnyPermission = item.requiredPermissionsOr.some((p) => hasPermission(auth.me, p));
      if (!hasAnyPermission) return false;
    } else if (item.requiredPermissions.length) {
      const hasAllPermissions = item.requiredPermissions.every((p) => hasPermission(auth.me, p));
      if (!hasAllPermissions) return false;
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
    <nav aria-label="Primary" className="grid w-max gap-0.5">
      {items.map((item) => {
        const label =
          item.key === 'dashboard' || item.key === 'student-dashboard'
            ? item.key === 'student-dashboard'
              ? t('headerTitle.dashboard')
              : superAdmin
                ? t('headerTitle.dashboard')
                : getDashboardLabel()
            : superAdmin && SUPER_ADMIN_NAV_OVERRIDES[item.key]
              ? t(`nav.${item.key}`, { defaultValue: SUPER_ADMIN_NAV_OVERRIDES[item.key] })
              : t(`nav.${item.key}`, { defaultValue: item.label });
        return (
          <div key={item.key}>
            <NavLink
              to={item.to}
              end={item.key === 'dashboard' || item.key === 'student-dashboard'}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'group flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition duration-150',
                  isActive
                    ? 'bg-white text-[#173C7F] shadow-sm ring-1 ring-brand-200'
                    : 'text-white/90 hover:bg-white/20 hover:text-white',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          </div>
        );
      })}
    </nav>
  );
}
