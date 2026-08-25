import type { ComponentType } from 'react';

import { hasPermission, hasRole, isSuperAdmin } from '../auth/auth-helpers';
import type { MeResponse } from '../auth/auth.schema';

export type DashboardId = 'super-admin' | 'teacher' | 'school-admin' | 'generic';

export interface DashboardRouteConfig {
  id: DashboardId;
  description: string;
  matches: (me: MeResponse | null | undefined) => boolean;
}

/**
 * Role-based dashboard registry. The first matching entry wins, so order
 * encodes precedence (e.g. a SUPER_ADMIN with school permissions still gets
 * the platform dashboard). Business authorization remains enforced by the
 * backend APIs each dashboard calls — this only selects which view renders.
 */
export const DASHBOARD_REGISTRY: DashboardRouteConfig[] = [
  {
    id: 'super-admin',
    description: 'Platform health, schools, users and revenue.',
    matches: (me) => isSuperAdmin(me),
  },
  {
    id: 'teacher',
    description: 'Teaching, classes, attendance and lessons for today.',
    matches: (me) =>
      hasRole(me, 'TEACHER') && !hasRole(me, 'SCHOOL_ADMIN') && !isSuperAdmin(me),
  },
  {
    id: 'school-admin',
    description: 'School operations, students, teachers and academic performance.',
    matches: (me) =>
      !isSuperAdmin(me) &&
      (hasPermission(me, 'school.setup.manage') ||
        hasPermission(me, 'students.read') ||
        hasPermission(me, 'attendance.read')),
  },
];

/** Resolve which registered dashboard should render for the given user. */
export function resolveDashboardId(
  me: MeResponse | null | undefined
): DashboardId {
  return DASHBOARD_REGISTRY.find((entry) => entry.matches(me))?.id ?? 'generic';
}

export type DashboardComponent = ComponentType;
