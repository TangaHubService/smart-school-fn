import { useRef } from 'react';
import { ArrowRight, Award, ChevronLeft, ChevronRight, Clock, Users, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SectionHeading } from './program-browse';

/**
 * "Join Our Community" audience cards.
 * `grid` (default) is the plain four-card grid; `carousel` is the landing-page
 * layout: heading on the right, image-topped cards in a swipeable row.
 */
export function PublicCommunityCTA({ layout = 'grid' }: { layout?: 'grid' | 'carousel' }) {
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

  if (layout === 'carousel') {
    return <CommunityCarousel title={t('community.title')} subtitle={t('community.subtitle')} audiences={audiences} />;
  }

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

function CommunityCarousel({
  title,
  subtitle,
  audiences,
}: {
  title: string;
  subtitle: string;
  audiences: Array<{ icon: typeof Users; title: string; desc: string; action: string; to: string }>;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector('li');
    const step = card ? card.getBoundingClientRect().width + 24 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  // Highlight the last word of the heading, e.g. "Join Our <Community>".
  const splitAt = title.lastIndexOf(' ');
  const lead = splitAt > 0 ? title.slice(0, splitAt) : '';
  const highlight = splitAt > 0 ? title.slice(splitAt + 1) : title;

  return (
    <section className="bg-slate-50 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col-reverse gap-6 sm:mb-12 md:flex-row md:items-end md:justify-between">
          <Link
            to="/programs#enroll"
            className="inline-flex w-fit items-center gap-2 rounded-lg border-[1.5px] border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
          >
            {audiences[3]?.action}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="md:text-right">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {lead ? `${lead} ` : null}
              <span className="text-brand-500">{highlight}</span>
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600 md:ml-auto">
              {subtitle}
            </p>
          </div>
        </div>

        <ul
          ref={trackRef}
          aria-label={title}
          className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {audiences.map((item) => (
            <li key={item.to + item.title} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto">
              <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(15,39,72,0.08),0_8px_24px_rgba(15,39,72,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(15,39,72,0.1),0_18px_36px_rgba(15,39,72,0.12)] motion-reduce:transform-none">
                <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-brand-600 to-brand-400">
                  <item.icon
                    className="h-12 w-12 text-white transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5 text-center">
                  <h3 className="text-base font-semibold tracking-tight text-slate-900">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.desc}</p>
                  <Link
                    to={item.to}
                    className="mt-5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
                  >
                    {item.action}
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-500 hover:text-brand-600"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-500 bg-white text-brand-600 transition hover:bg-brand-50"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
