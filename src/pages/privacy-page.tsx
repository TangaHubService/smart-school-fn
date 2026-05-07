import { SectionCard } from '../components/section-card';

export function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionCard title="Privacy Policy" subtitle="Effective Date: May 2026">
        <div className="prose prose-slate max-w-none text-sm text-slate-700 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-slate-900">Introduction</h2>
            <p>
              The Rwanda Education Platform is committed to protecting the privacy, security, and
              confidentiality of all users who access and use the system. This platform supports
              schools, teachers, students, parents, administrators, auditors, and education
              authorities across Rwanda by providing secure education management services. By
              accessing or using the platform, users agree to the collection, use, storage, and
              protection of their information as described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Information We Collect</h2>
            <p>
              The platform may collect personal information including full names, email addresses,
              phone numbers, profile photos, school information, user role details, login
              credentials, addresses, and parent or guardian information where applicable.
              Educational information such as attendance records, examination results, assignments,
              assessments, timetables, academic reports, performance analytics, teacher records, and
              learning progress may also be processed to support educational operations and improve
              learning experiences.
            </p>
            <p className="mt-2">
              In addition to educational and personal information, the platform may automatically
              collect technical information such as IP addresses, browser type, device information,
              login timestamps, operating systems, activity logs, session records, and security audit
              logs. This information helps improve platform performance, maintain security, detect
              unauthorized access, and support troubleshooting.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">How Information Is Used</h2>
            <p>
              The collected information is used to provide educational services, manage schools and
              academic records, authenticate users securely, enable role-based access control, send
              notifications and OTP verification emails, generate reports and analytics, improve
              platform functionality, detect fraud, and comply with legal or educational
              requirements in Rwanda.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">User Roles and Access Control</h2>
            <p>
              Access to information depends on the role assigned to each user. Students may access
              their profiles, attendance records, timetables, learning materials, and academic
              performance. Teachers may access assigned classes, assessments, attendance systems, and
              course management tools. School administrators may manage student records, teacher
              accounts, reports, timetables, and school operations. Auditors and authorized education
              authorities may access school performance reports, educational analytics, audit records,
              and compliance information relevant to their responsibilities.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Data Security</h2>
            <p>
              The Rwanda Education Platform implements industry-standard security measures including
              encrypted communication, JWT authentication, two-factor authentication (2FA), OTP
              verification, password hashing, session monitoring, security logging, role-based
              permissions, rate limiting, and secure database protection. While strong measures are
              implemented to protect user data, no digital system can guarantee complete security.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Data Retention</h2>
            <p>
              Educational and account records are retained only for as long as necessary to support
              educational operations, legal compliance, reporting obligations, security monitoring,
              and academic history preservation. Expired or unnecessary information may be securely
              deleted according to platform policies and legal requirements.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Sharing of Information</h2>
            <p>
              The platform does not sell personal information to third parties. Information may only
              be shared with authorized educational institutions, government education authorities
              where legally required, trusted service providers supporting the platform, or during
              investigations involving security or legal compliance. All authorized third parties are
              required to maintain strict confidentiality and data protection standards.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Children's Privacy</h2>
            <p>
              Student and children's information is handled with special care and confidentiality.
              Schools and guardians are responsible for ensuring lawful consent where required, and
              the platform prioritizes the protection of educational and student data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">User Rights</h2>
            <p>
              Users have the right to access their personal information, request corrections, update
              account details, report security concerns, and request deletion where legally
              applicable. Certain educational or legal obligations may require retention of some
              records.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Cookies and Tracking Technologies</h2>
            <p>
              The platform uses cookies and related technologies to maintain secure sessions,
              improve performance, remember preferences, enhance user experience, and support
              security monitoring. Additional information regarding cookies is available in the
              Cookies Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Policy Updates</h2>
            <p>
              This Privacy Policy may be updated periodically to reflect legal, technical, or
              operational changes. Continued use of the platform after updates indicates acceptance
              of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Contact Information</h2>
            <p>
              For privacy or security concerns, users may contact the Rwanda Education Platform
              Support Team through{' '}
              <a href="mailto:smartschoolrwanda@gmail.com" className="text-blue-600 hover:underline">
                smartschoolrwanda@gmail.com
              </a>{' '}
              or the official support channels.
            </p>
          </section>
        </div>
      </SectionCard>
    </main>
  );
}