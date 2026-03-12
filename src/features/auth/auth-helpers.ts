import { MeResponse } from './auth.schema';

export function hasPermission(me: MeResponse | null | undefined, permission: string): boolean {
  return me?.permissions.includes(permission) ?? false;
}

export function hasRole(me: MeResponse | null | undefined, role: string): boolean {
  return me?.roles.includes(role) ?? false;
}

export function isSuperAdmin(me: MeResponse | null | undefined): boolean {
  return hasRole(me, 'SUPER_ADMIN') || hasPermission(me, 'tenants.read');
}

export function isSchoolSetupComplete(me: MeResponse | null | undefined): boolean {
  return Boolean(me?.school?.setupCompletedAt);
}

export function getDefaultLandingPath(me: MeResponse | null | undefined): string {
  if (!me) {
    return '/login';
  }

  if (isSuperAdmin(me)) {
    return '/admin';
  }

  if (hasPermission(me, 'gov.dashboard.read')) {
    return '/gov';
  }

  if (hasPermission(me, 'school.setup.manage')) {
    return isSchoolSetupComplete(me) ? '/admin' : '/admin/setup';
  }

  if (hasPermission(me, 'students.my_courses.read')) {
    return '/student/academic-year';
  }

  if (hasRole(me, 'TEACHER') && hasPermission(me, 'courses.read')) {
    return '/admin';
  }

  if (hasPermission(me, 'attendance.read')) {
    return '/admin';
  }

  if (hasPermission(me, 'parents.my_children.read')) {
    return '/parent/my-children';
  }

  if (hasPermission(me, 'users.read')) {
    return '/users';
  }

  return '/unauthorized';
}
