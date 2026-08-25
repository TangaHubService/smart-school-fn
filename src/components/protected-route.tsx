import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { hasRole } from '../features/auth/auth-helpers';
import { PageSkeleton } from './skeleton-loader';

export function ProtectedRoute() {
  const location = useLocation();
  const auth = useAuth();

  if (auth.isLoadingSession) {
    return <PageSkeleton variant="dashboard" fullScreen />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (
    hasRole(auth.me, 'GOV_AUDITOR') &&
    (location.pathname === '/admin' || location.pathname === '/dashboard')
  ) {
    return <Navigate to="/auditor/dashboard" replace />;
  }

  return <Outlet />;
}
