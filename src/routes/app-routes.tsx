import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '../components/app-shell';
import { ProtectedRoute } from '../components/protected-route';
import { RequirePermission } from '../components/require-permission';
import { DashboardPage } from '../pages/dashboard-page';
import { LoginPage } from '../pages/login-page';
import { UnauthorizedPage } from '../pages/unauthorized-page';
import { UsersPage } from '../pages/users-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route element={<RequirePermission permission="users.read" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="/roles" element={<UsersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
