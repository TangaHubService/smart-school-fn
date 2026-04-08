import { SectionCard } from '../components/section-card';
import { useTranslation } from 'react-i18next';

export function CookiesPage() {
  const { t } = useTranslation('public');
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionCard title={t('legal.cookiesTitle')} subtitle={t('legal.cookiesSubtitle')}>
        <div className="prose prose-slate max-w-none text-sm text-slate-700">
          <p>
            We use cookies or local storage for session tokens (when you stay signed in), language choice,
            and optional low-data preferences. Assessment drafts may be cached locally when you are
            offline.
          </p>
        </div>
      </SectionCard>
    </main>
  );
}
