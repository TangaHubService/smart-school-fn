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
    return '/super-admin/schools';
  }

  if (hasPermission(me, 'school.setup.manage')) {
    return isSchoolSetupComplete(me) ? '/admin/academic-years' : '/admin/setup';
  }

  if (hasPermission(me, 'students.my_courses.read')) {
    return '/student/courses';
  }

  if (hasRole(me, 'TEACHER') && hasPermission(me, 'courses.read')) {
    return '/admin/courses';
  }

  if (hasPermission(me, 'attendance.read')) {
    return '/admin/attendance';
  }

  if (hasPermission(me, 'parents.my_children.read')) {
    return '/parent/my-children';
  }

  if (hasPermission(me, 'users.read')) {
    return '/users';
  }

  return '/unauthorized';
}
