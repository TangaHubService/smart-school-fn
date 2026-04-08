import { SectionCard } from '../components/section-card';
import { useTranslation } from 'react-i18next';

export function PrivacyPage() {
  const { t } = useTranslation('public');
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionCard title={t('legal.privacyTitle')} subtitle={t('legal.privacySubtitle')}>
        <div className="prose prose-slate max-w-none text-sm text-slate-700">
          <p>
            This platform processes account details (name, email, school affiliation), learning activity
            (lessons, assessments, attendance), and operational logs needed to run the service.
          </p>
          <p>
            Passwords are stored using strong hashing. Access is controlled by role-based permissions. Audit
            logs record sensitive administrative actions where enabled.
          </p>
          <p>
            For production, replace this page with counsel-reviewed text including data controller /
            processor contacts, retention, lawful basis, and regional requirements (e.g. Rwanda Data
            Protection Office where applicable).
          </p>
        </div>
      </SectionCard>
    </main>
  );
}
