import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/auth.context';

export function ProtectedRoute() {
  const location = useLocation();
  const auth = useAuth();

  if (auth.isLoadingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-soft">
          Loading your session...
        </p>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
