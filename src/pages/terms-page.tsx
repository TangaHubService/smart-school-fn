import { SectionCard } from '../components/section-card';
import { useTranslation } from 'react-i18next';

export function TermsPage() {
  const { t } = useTranslation('public');
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionCard title={t('legal.termsTitle')} subtitle={t('legal.termsSubtitle')}>
        <div className="prose prose-slate max-w-none text-sm text-slate-700">
          <p>
            By using this application you agree to use it only for lawful educational purposes, not to
            attempt unauthorized access, and to respect intellectual property of uploaded materials.
          </p>
          <p>The service is provided as-is for demonstration; uptime and support terms belong in a final legal agreement.</p>
        </div>
      </SectionCard>
    </main>
  );
}
