import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import {
  hasPermission,
  isSchoolSetupComplete,
  isSuperAdmin,
} from '../features/auth/auth-helpers';

export function RequireSetupComplete() {
  const auth = useAuth();

  if (!auth.me) {
    return <Navigate to="/login" replace />;
  }

  if (isSuperAdmin(auth.me) || !hasPermission(auth.me, 'school.setup.manage')) {
    return <Outlet />;
  }

  if (!isSchoolSetupComplete(auth.me)) {
    return <Navigate to="/admin/setup" replace />;
  }

  return <Outlet />;
}
