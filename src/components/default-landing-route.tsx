import { Navigate } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';
import { getDefaultLandingPath } from '../features/auth/auth-helpers';

export function DefaultLandingRoute() {
  const auth = useAuth();

  if (!auth.me) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultLandingPath(auth.me)} replace />;
}
