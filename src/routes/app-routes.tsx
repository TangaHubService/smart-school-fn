import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '../components/app-shell';
import { DefaultLandingRoute } from '../components/default-landing-route';
import { ProtectedRoute } from '../components/protected-route';
import { RequirePermission } from '../components/require-permission';
import { RequireSetupComplete } from '../components/require-setup-complete';
import { assessmentsFeatureEnabled } from '../features/assessments/feature';
import { AcademicYearsPage } from '../pages/academic-years-page';
import { AcceptInvitePage } from '../pages/accept-invite-page';
import { AssessmentDetailPage } from '../pages/assessment-detail-page';
import { AssessmentsPage } from '../pages/assessments-page';
import { AttendancePage } from '../pages/attendance-page';
import { AssignmentsPage } from '../pages/assignments-page';
import { ClassesPage } from '../pages/classes-page';
import { CoursesPage } from '../pages/courses-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ExamsPage } from '../pages/exams-page';
import { LoginPage } from '../pages/login-page';
import { ParentMyChildrenPage } from '../pages/parent-my-children-page';
import { ParentReportCardsPage } from '../pages/parent-report-cards-page';
import { ParentsPage } from '../pages/parents-page';
import { ReportCardVerificationPage } from '../pages/report-card-verification-page';
import { SetupWizardPage } from '../pages/setup-wizard-page';
import { StaffPage } from '../pages/staff-page';
import { StudentsPage } from '../pages/students-page';
import { SubjectsPage } from '../pages/subjects-page';
import { StudentAssessmentDetailPage } from '../pages/student-assessment-detail-page';
import { StudentAssessmentAttemptPage } from '../pages/student-assessment-attempt-page';
import { StudentAssessmentsPage } from '../pages/student-assessments-page';
import { TenantCreatePage } from '../pages/tenant-create-page';
import { TenantsPage } from '../pages/tenants-page';
import { UnauthorizedPage } from '../pages/unauthorized-page';
import { UsersPage } from '../pages/users-page';
import { StudentCoursesPage } from '../pages/student-courses-page';
import { StudentReportCardsPage } from '../pages/student-report-cards-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/verify/report-cards/:snapshotId" element={<ReportCardVerificationPage />} />

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
            <Route element={<RequirePermission permission="attendance.read" />}>
              <Route path="/admin/attendance" element={<AttendancePage />} />
            </Route>
            <Route element={<RequirePermission permission="exams.read" />}>
              <Route path="/admin/exams" element={<ExamsPage />} />
            </Route>
            <Route element={<RequirePermission permission="courses.read" />}>
              <Route path="/admin/courses" element={<CoursesPage />} />
            </Route>
            <Route element={<RequirePermission permission="courses.read" />}>
              <Route path="/admin/assignments" element={<AssignmentsPage />} />
            </Route>
            {assessmentsFeatureEnabled ? (
              <Route element={<RequirePermission permission="assessments.read" />}>
                <Route path="/admin/assessments" element={<AssessmentsPage />} />
                <Route path="/admin/assessments/:assessmentId" element={<AssessmentDetailPage />} />
              </Route>
            ) : null}
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
          <Route element={<RequirePermission permission="report_cards.my_read" />}>
            <Route path="/parent/report-cards" element={<ParentReportCardsPage />} />
          </Route>

          <Route element={<RequirePermission permission="students.my_courses.read" />}>
            <Route path="/student/courses" element={<StudentCoursesPage />} />
          </Route>
          <Route element={<RequirePermission permission="report_cards.my_read" />}>
            <Route path="/student/report-cards" element={<StudentReportCardsPage />} />
          </Route>
          {assessmentsFeatureEnabled ? (
            <Route element={<RequirePermission permission="assessments.submit" />}>
              <Route path="/student/assessments" element={<StudentAssessmentsPage />} />
              <Route path="/student/assessments/:assessmentId" element={<StudentAssessmentDetailPage />} />
              <Route
                path="/student/assessments/:assessmentId/attempts/:attemptId"
                element={<StudentAssessmentAttemptPage />}
              />
            </Route>
          ) : null}

          <Route element={<RequirePermission permission="staff.invite" />}>
            <Route path="/admin/staff" element={<StaffPage />} />
          </Route>

          <Route element={<RequirePermission permission="users.read" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="/roles" element={<UsersPage />} />

          <Route path="/setup" element={<Navigate to="/admin/setup" replace />} />
          <Route path="/academics" element={<Navigate to="/admin/academic-years" replace />} />
          <Route path="/attendance" element={<Navigate to="/admin/attendance" replace />} />
          <Route path="/exams" element={<Navigate to="/admin/exams" replace />} />
          <Route path="/courses" element={<Navigate to="/admin/courses" replace />} />
          <Route path="/assignments" element={<Navigate to="/admin/assignments" replace />} />
          {assessmentsFeatureEnabled ? (
            <Route path="/assessments" element={<Navigate to="/admin/assessments" replace />} />
          ) : null}
          <Route path="/students" element={<Navigate to="/admin/students" replace />} />
          <Route path="/student-results" element={<Navigate to="/student/report-cards" replace />} />
          <Route path="/parent-results" element={<Navigate to="/parent/report-cards" replace />} />
          <Route path="/parents" element={<Navigate to="/admin/parents" replace />} />
          <Route path="/staff" element={<Navigate to="/admin/staff" replace />} />
          <Route path="/tenants/new" element={<Navigate to="/super-admin/tenants/new" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
