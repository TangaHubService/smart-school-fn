import { SectionCard } from '../components/section-card';

export function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionCard title="Cookies Policy" subtitle="Effective Date: May 2026">
        <div className="prose prose-slate max-w-none text-sm text-slate-700 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-slate-900">Introduction</h2>
            <p>
              This Cookies Policy explains how the Rwanda Education Platform uses cookies and related
              technologies to improve security, functionality, and user experience. Cookies are small
              text files stored on a user's device when accessing websites or applications. These
              technologies help maintain secure sessions, remember user preferences, improve
              performance, and support system security.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Essential Cookies</h2>
            <p>
              The platform uses essential cookies that are necessary for authentication, session
              management, role verification, secure navigation, and core platform functionality.
              Without these cookies, important features of the platform may not function correctly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Performance and Functional Cookies</h2>
            <p>
              Performance cookies may also be used to monitor platform usage, analyze traffic
              patterns, identify technical issues, and improve system reliability and user
              experience. Functional cookies help remember user settings such as language
              preferences, dashboard preferences, and school selection options.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Security Cookies</h2>
            <p>
              Security-related cookies are used to detect suspicious login attempts, prevent
              unauthorized access, support two-factor authentication processes, protect active user
              sessions, and improve fraud detection mechanisms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">How Cookies Are Used</h2>
            <p>
              Cookies may also support OTP verification sessions, maintain secure login states,
              enhance navigation experiences, and assist with platform analytics. Some integrated
              third-party services such as analytics tools, cloud infrastructure providers, security
              monitoring systems, and email services may also use cookies or related technologies as
              part of their operations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Managing Cookies</h2>
            <p>
              Users may manage or disable cookies through browser settings; however, disabling certain
              cookies may negatively affect platform functionality, authentication processes, and
              overall user experience.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Data Protection and Security</h2>
            <p>
              The Rwanda Education Platform manages cookies securely and does not use cookies to store
              sensitive information such as passwords directly. All cookie-related technologies are
              implemented with security and privacy considerations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Policy Updates</h2>
            <p>
              This Cookies Policy may be updated periodically to reflect legal, operational, or
              technical changes. Continued use of the platform after updates indicates acceptance of
              the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Contact Information</h2>
            <p>
              For questions regarding cookies or privacy practices, users may contact the Rwanda
              Education Platform Support Team through official support channels.
            </p>
          </section>
        </div>
      </SectionCard>
    </main>
  );
}