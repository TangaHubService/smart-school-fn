import { SectionCard } from '../components/section-card';

export function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionCard title="Terms and Conditions" subtitle="Effective Date: May 2026">
        <div className="prose prose-slate max-w-none text-sm text-slate-700 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-slate-900">Introduction</h2>
            <p>
              These Terms and Conditions govern access to and use of the Rwanda Education Platform.
              By accessing or using the platform, users agree to comply with these terms and all
              applicable laws and educational policies. The platform is designed to support school
              management, attendance monitoring, examination management, learning analytics,
              timetable management, course administration, reporting, and auditing across educational
              institutions in Rwanda.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Eligibility and Authorized Access</h2>
            <p>
              Users must be authorized by a school, educational institution, or relevant education
              authority to access the platform. All users are required to provide accurate
              information, maintain the confidentiality of their accounts, and comply with school
              policies and national education regulations. Unauthorized access to the platform or
              misuse of educational data is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Account Security</h2>
            <p>
              Users are responsible for protecting their login credentials and ensuring that their
              accounts are not accessed by unauthorized individuals. The platform may require strong
              passwords, email verification, OTP verification, and two-factor authentication to
              improve account security. Suspicious activities may result in temporary restrictions,
              additional verification requirements, or account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Role-Based Permissions</h2>
            <p>
              Different user roles have different access permissions within the platform. Students,
              teachers, administrators, auditors, and education authorities may only access
              information relevant to their authorized responsibilities. Users must not attempt to
              bypass permissions, access restricted information, modify unauthorized records, or
              interfere with security mechanisms implemented within the platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Intellectual Property</h2>
            <p>
              All software, branding, logos, system designs, educational structures, and platform
              documentation remain the intellectual property of the Rwanda Education Platform unless
              otherwise stated. Users may not reproduce, distribute, modify, or exploit platform
              materials without proper authorization.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Data Accuracy and Responsibility</h2>
            <p>
              Schools and authorized users are responsible for ensuring the accuracy of information
              entered into the platform, including attendance records, assessments, student
              information, reports, and timetables. The platform is not responsible for
              inaccuracies resulting from incorrect data entered by users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">System Availability</h2>
            <p>
              While the platform aims to provide reliable and uninterrupted services, there may be
              periods of downtime due to maintenance, updates, technical failures, or external
              service interruptions. The platform does not guarantee uninterrupted availability at all
              times.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Prohibited Activities</h2>
            <p>
              Users are prohibited from engaging in activities such as hacking, uploading malware,
              abusing APIs, conducting fraudulent activities, creating fake accounts, unlawfully
              sharing confidential information, or attempting unauthorized access to systems or
              data. Such actions may result in immediate account suspension, legal action, or
              reporting to relevant authorities.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Suspension and Termination</h2>
            <p>
              The Rwanda Education Platform reserves the right to suspend or terminate accounts that
              violate platform policies, engage in illegal activities, abuse educational systems,
              misuse student data, or create security threats.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, the platform shall not be liable for losses
              resulting from user-entered errors, unauthorized user activities, temporary outages,
              cyberattacks, or third-party service failures.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Governing Law</h2>
            <p>
              These Terms and Conditions are governed by the laws of the Republic of Rwanda, and any
              disputes arising from platform use shall be handled in accordance with applicable
              Rwandan laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Updates to Terms</h2>
            <p>
              The platform may update these Terms and Conditions periodically. Continued use of the
              platform after updates indicates acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Contact Information</h2>
            <p>
              For support or legal inquiries, users may contact the Rwanda Education Platform Support
              Team through official communication channels.
            </p>
          </section>
        </div>
      </SectionCard>
    </main>
  );
}