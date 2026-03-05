import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';

interface RequirePermissionProps {
  permission: string;
}

export function RequirePermission({ permission }: RequirePermissionProps) {
  const auth = useAuth();
  const hasPermission = auth.me?.permissions.includes(permission) ?? false;

  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
