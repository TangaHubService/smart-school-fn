import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '../components/app-shell';
import { DefaultLandingRoute } from '../components/default-landing-route';
import { ProtectedRoute } from '../components/protected-route';
import { RequirePermission } from '../components/require-permission';
import { RequireSetupComplete } from '../components/require-setup-complete';
import { AcademicYearsPage } from '../pages/academic-years-page';
import { AcceptInvitePage } from '../pages/accept-invite-page';
import { ClassesPage } from '../pages/classes-page';
import { DashboardPage } from '../pages/dashboard-page';
import { LoginPage } from '../pages/login-page';
import { ParentMyChildrenPage } from '../pages/parent-my-children-page';
import { ParentsPage } from '../pages/parents-page';
import { SetupWizardPage } from '../pages/setup-wizard-page';
import { StaffPage } from '../pages/staff-page';
import { StudentsPage } from '../pages/students-page';
import { SubjectsPage } from '../pages/subjects-page';
import { TenantCreatePage } from '../pages/tenant-create-page';
import { TenantsPage } from '../pages/tenants-page';
import { UnauthorizedPage } from '../pages/unauthorized-page';
import { UsersPage } from '../pages/users-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DefaultLandingRoute />} />
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route element={<RequirePermission permission="tenants.read" />}>
            <Route path="/super-admin/tenants" element={<TenantsPage />} />
          </Route>

          <Route element={<RequirePermission permission="tenants.create" />}>
            <Route path="/super-admin/tenants/new" element={<TenantCreatePage />} />
          </Route>

          <Route element={<RequirePermission permission="school.setup.manage" />}>
            <Route path="/admin/setup" element={<SetupWizardPage />} />
          </Route>

          <Route element={<RequireSetupComplete />}>
            <Route element={<RequirePermission permission="academic_year.manage" />}>
              <Route path="/admin/academic-years" element={<AcademicYearsPage />} />
            </Route>
            <Route element={<RequirePermission permission="class_room.manage" />}>
              <Route path="/admin/classes" element={<ClassesPage />} />
            </Route>
            <Route element={<RequirePermission permission="students.read" />}>
              <Route path="/admin/students" element={<StudentsPage />} />
            </Route>
            <Route element={<RequirePermission permission="subject.manage" />}>
              <Route path="/admin/subjects" element={<SubjectsPage />} />
            </Route>
          </Route>

          <Route element={<RequirePermission permission="parents.manage" />}>
            <Route path="/admin/parents" element={<ParentsPage />} />
          </Route>

          <Route element={<RequirePermission permission="parents.my_children.read" />}>
            <Route path="/parent/my-children" element={<ParentMyChildrenPage />} />
          </Route>

          <Route element={<RequirePermission permission="staff.invite" />}>
            <Route path="/admin/staff" element={<StaffPage />} />
          </Route>

          <Route element={<RequirePermission permission="users.read" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="/roles" element={<UsersPage />} />

          <Route path="/setup" element={<Navigate to="/admin/setup" replace />} />
          <Route path="/academics" element={<Navigate to="/admin/academic-years" replace />} />
          <Route path="/students" element={<Navigate to="/admin/students" replace />} />
          <Route path="/parents" element={<Navigate to="/admin/parents" replace />} />
          <Route path="/staff" element={<Navigate to="/admin/staff" replace />} />
          <Route path="/tenants/new" element={<Navigate to="/super-admin/tenants/new" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
