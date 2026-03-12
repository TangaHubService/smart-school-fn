import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '../components/app-shell';
import { PublicLayout } from '../components/public/public-layout';
import { ProtectedRoute } from '../components/protected-route';
import { RequirePermission } from '../components/require-permission';
import { RequireSetupComplete } from '../components/require-setup-complete';
import { assessmentsFeatureEnabled } from '../features/assessments/feature';
import { conductFeatureEnabled } from '../features/conduct/feature';
import { govAuditingFeatureEnabled } from '../features/gov/feature';
import { AcademicYearsPage } from '../pages/academic-years-page';
import { AcceptInvitePage } from '../pages/accept-invite-page';
import { AssessmentDetailPage } from '../pages/assessment-detail-page';
import { AssessmentsPage } from '../pages/assessments-page';
import { AttendancePage } from '../pages/attendance-page';
import { AssignmentsPage } from '../pages/assignments-page';
import { ClassesPage } from '../pages/classes-page';
import { ConductCreateIncidentPage } from '../pages/conduct-create-incident-page';
import { ConductIncidentDetailPage } from '../pages/conduct-incident-detail-page';
import { ConductIncidentsPage } from '../pages/conduct-incidents-page';
import { CoursesPage } from '../pages/courses-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ExamsPage } from '../pages/exams-page';
import { GovAuditorsPage } from '../pages/gov-auditors-page';
import { GovDashboardPage } from '../pages/gov-dashboard-page';
import { GovIncidentDetailPage } from '../pages/gov-incident-detail-page';
import { GovIncidentsPage } from '../pages/gov-incidents-page';
import { GovSchoolDetailPage } from '../pages/gov-school-detail-page';
import { GovSchoolsPage } from '../pages/gov-schools-page';
import { LoginPage } from '../pages/login-page';
import { ParentMyChildrenPage } from '../pages/parent-my-children-page';
import { ParentReportCardsPage } from '../pages/parent-report-cards-page';
import { ParentsPage } from '../pages/parents-page';
import { ReportCardVerificationPage } from '../pages/report-card-verification-page';
import { SetupWizardPage } from '../pages/setup-wizard-page';
import { StaffPage } from '../pages/staff-page';
import { StudentsPage } from '../pages/students-page';
import { TeacherMyClassesPage } from '../pages/teacher-my-classes-page';
import { SubjectsPage } from '../pages/subjects-page';
import { StudentAssessmentDetailPage } from '../pages/student-assessment-detail-page';
import { StudentAssessmentAttemptPage } from '../pages/student-assessment-attempt-page';
import { StudentAssessmentsPage } from '../pages/student-assessments-page';
import { TenantsPage } from '../pages/tenants-page';
import { TimetablePage } from '../pages/timetable-page';
import { AnnouncementsPage } from '../pages/announcements-page';
import { AnnouncementCreatePage } from '../pages/announcement-create-page';
import { AnnouncementDetailPage } from '../pages/announcement-detail-page';
import { StudentAnnouncementsPage } from '../pages/student-announcements-page';
import { UnauthorizedPage } from '../pages/unauthorized-page';
import { AccessControlPage } from '../pages/access-control-page';
import { AuditLogsPage } from '../pages/audit-logs-page';
import { NotificationsPage } from '../pages/notifications-page';
import { ReportsAnalyticsPage } from '../pages/reports-analytics-page';
import { SupportCenterPage } from '../pages/support-center-page';
import { SystemSettingsPage } from '../pages/system-settings-page';
import { UsersPage } from '../pages/users-page';
import { StudentAssignmentsPage } from '../pages/student-assignments-page';
import { StudentCoursesPage } from '../pages/student-courses-page';
import { StudentReportCardsPage } from '../pages/student-report-cards-page';
import { StudentAcademicYearSelectPage } from '../pages/student-academic-year-select-page';
import { StudentConductPage } from '../pages/student-conduct-page';
import { StudentConductProfilePage } from '../pages/student-conduct-profile-page';
import { StudentDashboardPage } from '../pages/student-dashboard-page';
import { PublicHomePage } from '../pages/public-home-page';
import { PublicAcademyPage } from '../pages/public-academy-page';
import { PublicAboutPage } from '../pages/public-about-page';
import { PublicContactPage } from '../pages/public-contact-page';
import { PublicCoursesPage } from '../pages/public-courses-page';
import { PublicTuitionPage } from '../pages/public-tuition-page';
import { PublicJobsPage } from '../pages/public-jobs-page';
import { PublicJobDetailPage } from '../pages/public-job-detail-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/platform" element={<Navigate to="/courses" replace />} />
        <Route path="/about" element={<PublicAboutPage />} />
        <Route path="/academy" element={<PublicAcademyPage />} />
        <Route path="/courses" element={<PublicCoursesPage />} />
        <Route path="/courses/all" element={<PublicCoursesPage />} />
        <Route path="/courses/categories" element={<PublicCoursesPage />} />
        <Route path="/courses/category/:categoryId" element={<PublicCoursesPage />} />
        <Route path="/tuition" element={<PublicTuitionPage />} />
        <Route path="/job-listing" element={<PublicJobsPage />} />
        <Route path="/job-listing/:slug" element={<PublicJobDetailPage />} />
        <Route path="/contact" element={<PublicContactPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/verify/report-cards/:snapshotId" element={<ReportCardVerificationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route element={<RequirePermission permission="students.my_courses.read" />}>
            <Route path="/student/academic-year" element={<StudentAcademicYearSelectPage />} />
            <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          </Route>

          <Route element={<RequirePermission permission="tenants.read" />}>
            <Route path="/super-admin/schools" element={<TenantsPage />} />
            <Route path="/super-admin/tenants" element={<TenantsPage />} />
            <Route path="/super-admin/reports" element={<ReportsAnalyticsPage />} />
            <Route path="/super-admin/settings" element={<SystemSettingsPage />} />
            <Route path="/super-admin/notifications" element={<NotificationsPage />} />
            <Route path="/super-admin/support" element={<SupportCenterPage />} />
            <Route path="/super-admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/super-admin/access-control" element={<AccessControlPage />} />
          </Route>

          <Route element={<RequirePermission permission="tenants.create" />}>
            <Route path="/super-admin/tenants/new" element={<Navigate to="/super-admin/schools?create=1" replace />} />
            <Route path="/super-admin/schools/new" element={<Navigate to="/super-admin/schools?create=1" replace />} />
          </Route>

          <Route element={<RequirePermission permission="school.setup.manage" />}>
            <Route path="/admin/setup" element={<SetupWizardPage />} />
          </Route>

          {govAuditingFeatureEnabled ? (
            <>
              <Route element={<RequirePermission permission="gov.dashboard.read" />}>
                <Route path="/gov" element={<GovDashboardPage />} />
              </Route>
              <Route element={<RequirePermission permission="gov.schools.read" />}>
                <Route path="/gov/schools" element={<GovSchoolsPage />} />
                <Route path="/gov/schools/:tenantId" element={<GovSchoolDetailPage />} />
              </Route>
              <Route element={<RequirePermission permission="gov.incidents.read" />}>
                <Route path="/gov/incidents" element={<GovIncidentsPage />} />
                <Route path="/gov/incidents/:incidentId" element={<GovIncidentDetailPage />} />
              </Route>
              <Route element={<RequirePermission permission="gov.auditors.manage" />}>
                <Route path="/gov/admin/auditors" element={<GovAuditorsPage />} />
              </Route>
            </>
          ) : null}

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
            <Route element={<RequirePermission permission="timetable.read" />}>
              <Route path="/admin/timetable" element={<TimetablePage />} />
            </Route>
            <Route element={<RequirePermission permission="announcements.manage" />}>
              <Route path="/admin/announcements/new" element={<AnnouncementCreatePage />} />
            </Route>
            <Route element={<RequirePermission permission="announcements.read" />}>
              <Route path="/admin/announcements" element={<AnnouncementsPage />} />
              <Route path="/admin/announcements/:id" element={<AnnouncementDetailPage />} />
            </Route>
            <Route element={<RequirePermission permission="courses.read" />}>
              <Route path="/admin/courses" element={<CoursesPage />} />
              <Route path="/admin/my-classes" element={<TeacherMyClassesPage />} />
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
            {conductFeatureEnabled ? (
              <>
                <Route element={<RequirePermission permission="conduct.read" />}>
                  <Route path="/admin/conduct" element={<ConductIncidentsPage />} />
                  <Route path="/admin/conduct/students/:studentId" element={<StudentConductProfilePage />} />
                  <Route path="/admin/conduct/:incidentId" element={<ConductIncidentDetailPage />} />
                </Route>
                <Route element={<RequirePermission permission="conduct.manage" />}>
                  <Route path="/admin/conduct/new" element={<ConductCreateIncidentPage />} />
                </Route>
              </>
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
            <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
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
          {conductFeatureEnabled ? (
            <Route element={<RequirePermission permission="conduct.my_read" />}>
              <Route path="/student/conduct" element={<StudentConductPage />} />
            </Route>
          ) : null}
          <Route element={<RequirePermission permission="announcements.my_read" />}>
            <Route path="/student/announcements" element={<StudentAnnouncementsPage />} />
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
          <Route path="/attendance" element={<Navigate to="/admin/attendance" replace />} />
          <Route path="/exams" element={<Navigate to="/admin/exams" replace />} />
          <Route path="/assignments" element={<Navigate to="/admin/assignments" replace />} />
          {assessmentsFeatureEnabled ? (
            <Route path="/assessments" element={<Navigate to="/admin/assessments" replace />} />
          ) : null}
          {conductFeatureEnabled ? (
            <Route path="/conduct" element={<Navigate to="/admin/conduct" replace />} />
          ) : null}
          <Route path="/students" element={<Navigate to="/admin/students" replace />} />
          <Route path="/student-results" element={<Navigate to="/student/report-cards" replace />} />
          <Route path="/parent-results" element={<Navigate to="/parent/report-cards" replace />} />
          <Route path="/parents" element={<Navigate to="/admin/parents" replace />} />
          <Route path="/staff" element={<Navigate to="/admin/staff" replace />} />
          <Route path="/tenants/new" element={<Navigate to="/super-admin/schools?create=1" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
