import { Award, Clock, Users, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SectionHeading } from './program-browse';

export function PublicCommunityCTA() {
  const { t } = useTranslation('public');
  const audiences = [
    {
      icon: Users,
      title: t('community.staffTitle'),
      desc: t('community.staffDesc'),
      action: t('community.staffAction'),
      to: '/login?mode=staff',
    },
    {
      icon: Award,
      title: t('community.studentTitle'),
      desc: t('community.studentDesc'),
      action: t('community.studentAction'),
      to: '/login?mode=student',
    },
    {
      icon: UserRound,
      title: t('community.parentTitle'),
      desc: t('community.parentDesc'),
      action: t('community.parentAction'),
      to: '/login?mode=staff',
    },
    {
      icon: Clock,
      title: t('community.afterClassTitle'),
      desc: t('community.afterClassDesc'),
      action: t('community.afterClassAction'),
      to: '/programs#enroll',
    },
  ];

  return (
    <section className="bg-slate-50 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t('community.title')} subtitle={t('community.subtitle')} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((item) => (
            <article
              key={item.to + item.title}
              className="flex flex-col rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(15,39,72,0.08),0_8px_24px_rgba(15,39,72,0.06)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.desc}</p>
              <Link
                to={item.to}
                className="mt-5 rounded-lg border-[1.5px] border-brand-500 px-4 py-2 text-center text-sm font-medium text-brand-600 transition hover:bg-brand-500 hover:text-white"
              >
                {item.action}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
