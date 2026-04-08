import { Award, Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function PublicCommunityCTA() {
  const { t } = useTranslation('public');
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">{t('community.title')}</h2>
          <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-brand-500" />
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
            {t('community.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* For Staff */}
          <div className="flex flex-col rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:shadow-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('community.staffTitle')}</h3>
            <p className="mt-4 flex-grow text-[15px] leading-relaxed text-slate-600">
              {t('community.staffDesc')}
            </p>
            <Link
              to="/login?mode=staff"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-brand-600"
            >
              {t('community.staffAction')}
            </Link>
          </div>

          {/* For Students */}
          <div className="flex flex-col rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:shadow-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('community.studentTitle')}</h3>
            <p className="mt-4 flex-grow text-[15px] leading-relaxed text-slate-600">
              {t('community.studentDesc')}
            </p>
            <Link
              to="/login?mode=student"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-emerald-700"
            >
              {t('community.studentAction')}
            </Link>
          </div>

          {/* For Parent */}
          <div className="flex flex-col rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:shadow-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('community.parentTitle')}</h3>
            <p className="mt-4 flex-grow text-[15px] leading-relaxed text-slate-600">
              {t('community.parentDesc')}
            </p>
            <Link
              to="/login?mode=staff"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-blue-700"
            >
              {t('community.parentAction')}
            </Link>
          </div>

          {/* For After Class */}
          <div className="flex flex-col rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:shadow-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('community.afterClassTitle')}</h3>
            <p className="mt-4 flex-grow text-[15px] leading-relaxed text-slate-600">
              {t('community.afterClassDesc')}
            </p>
            <Link
              to="/courses"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-amber-600"
            >
              {t('community.afterClassAction')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
