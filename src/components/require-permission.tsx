import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { hasRole } from '../features/auth/auth-helpers';

interface RequirePermissionProps {
  permission: string;
}

export function RequirePermission({ permission }: RequirePermissionProps) {
  const auth = useAuth();
  const isSuperAdmin = hasRole(auth.me, 'SUPER_ADMIN');

  if (isSuperAdmin) {
    return <Outlet />;
  }

  const hasPermission = auth.me?.permissions.includes(permission) ?? false;

  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

interface RequireAnyPermissionProps {
  permissions: string[];
}

export function RequireAnyPermission({ permissions }: RequireAnyPermissionProps) {
  const auth = useAuth();
  const isSuperAdmin = hasRole(auth.me, 'SUPER_ADMIN');

  if (isSuperAdmin) {
    return <Outlet />;
  }

  const ok = permissions.some((p) => auth.me?.permissions.includes(p) ?? false);

  if (!ok) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
