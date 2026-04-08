import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGS = ['en', 'rw', 'fr'] as const;

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n, t } = useTranslation('common');

  return (
    <label className={`flex items-center gap-2 text-sm ${className}`} title={t('language.label')}>
      <Languages className="h-4 w-4" aria-hidden />
      <select
        value={i18n.language.startsWith('rw') ? 'rw' : i18n.language.startsWith('fr') ? 'fr' : 'en'}
        onChange={(e) => {
          const lng = e.target.value as (typeof LANGS)[number];
          void i18n.changeLanguage(lng);
          try {
            localStorage.setItem('ss_lang', lng);
          } catch {
            // ignore
          }
        }}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
      >
        <option value="en">{t('language.en')}</option>
        <option value="rw">{t('language.rw')}</option>
        <option value="fr">{t('language.fr')}</option>
      </select>
    </label>
  );
}
