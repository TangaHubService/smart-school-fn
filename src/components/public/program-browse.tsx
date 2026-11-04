import type { ReactNode } from 'react';
import { ChevronRight, FolderOpen, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { AcademyCatalogGradeLevel } from '../../api/academy-api';
import backgroundImage from '../../asset/background.jpg';

/* Shared building blocks for the public programs journey:
   Programs -> level group -> level -> class. */

export function gradeTotals(grade: AcademyCatalogGradeLevel) {
  return {
    classes: grade.classRooms.length,
    courses: grade.classRooms.reduce(
      (sum, room) => sum + room.subjects.reduce((inner, subject) => inner + subject.courseCount, 0),
      0
    ),
    enrolled: grade.classRooms.reduce((sum, room) => sum + (room.enrolledCount ?? 0), 0),
    thumbnail: grade.classRooms.find((room) => room.thumbnail?.trim())?.thumbnail ?? null,
  };
}

export function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export function SectionHeading({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div className="mb-10 text-center sm:mb-12">
      <h2 id={id} className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export interface ProgramCardStat {
  icon: LucideIcon;
  label: string;
}

export function ProgramCard({
  to,
  title,
  subtitle,
  thumbnail,
  stats,
  ariaLabel,
  footer,
}: {
  to: string;
  title: string;
  subtitle?: string;
  thumbnail?: string | null;
  stats: ProgramCardStat[];
  ariaLabel: string;
  footer?: ReactNode;
}) {
  const image = thumbnail?.trim();
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(15,39,72,0.08),0_8px_24px_rgba(15,39,72,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(15,39,72,0.1),0_18px_36px_rgba(15,39,72,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transform-none"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-600 to-brand-400">
            <FolderOpen
              className="h-11 w-11 text-white transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none"
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-brand-600">
          {title}
        </h3>
        {subtitle ? <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-5 text-[13px] text-slate-600">
          {stats.map((stat) => (
            <span key={stat.label} className="inline-flex items-center gap-1.5">
              <stat.icon className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              {stat.label}
            </span>
          ))}
        </div>
        {footer ? <div className="mt-4 border-t border-slate-100 pt-4">{footer}</div> : null}
      </div>
    </Link>
  );
}

/** Three columns like a full catalog; short lists stay centred instead of leaving a hole. */
export function ProgramGrid({
  count,
  label,
  children,
}: {
  count: number;
  label: string;
  children: ReactNode;
}) {
  const layout =
    count === 1
      ? 'mx-auto max-w-sm'
      : count === 2
        ? 'mx-auto max-w-4xl sm:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <ul aria-label={label} className={`grid gap-6 lg:gap-7 ${layout}`}>
      {children}
    </ul>
  );
}

export interface Crumb {
  label: string;
  to?: string;
}

/** Dark page banner: breadcrumb trail above the current category's title. */
export function CategoryBanner({
  crumbs,
  title,
  subtitle,
}: {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
}) {
  return (
    <section
      className="relative bg-brand-950 bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-950/85 to-brand-900/75" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-white/75">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-white/50" aria-hidden /> : null}
                {crumb.to ? (
                  <Link to={crumb.to} className="rounded transition hover:text-white hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-medium text-white">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-[15px]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function CatalogMessage({
  title,
  message,
  action,
  tone = 'neutral',
}: {
  title: string;
  message: string;
  action?: { label: string; to: string };
  tone?: 'neutral' | 'error';
}) {
  return (
    <div
      className={[
        'mx-auto max-w-xl rounded-xl border bg-white px-6 py-12 text-center',
        tone === 'error' ? 'border-rose-200' : 'border-slate-200',
      ].join(' ')}
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
      {action ? (
        <Link
          to={action.to}
          className="mt-6 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Split hero: copy on the left, organic photo shape with a small inset on the right. */
export function PublicHero({
  title,
  description,
  image,
  insetImage,
  children,
}: {
  title: string;
  description: string;
  image: string;
  insetImage: string;
  children: ReactNode;
}) {
  const dots = {
    backgroundImage: 'radial-gradient(#93B4DF 1.5px, transparent 1.5px)',
    backgroundSize: '12px 12px',
  };
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute left-6 top-4 hidden h-16 w-16 opacity-60 lg:block"
        style={dots}
        aria-hidden="true"
      />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8 lg:py-16">
        <div className="relative">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-600 sm:text-base">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div
            className="pointer-events-none absolute -right-6 -top-5 h-24 w-24 opacity-70"
            style={dots}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-10 right-4 h-44 w-44 rounded-full bg-accent-100/70"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-4 top-6 h-24 w-24 rounded-full bg-brand-100"
            aria-hidden="true"
          />
          <img
            src={image}
            alt=""
            className="relative aspect-[4/3] w-full rounded-[56%_44%_48%_52%/52%_46%_54%_48%] object-cover shadow-[0_24px_60px_rgba(15,39,72,0.18)]"
          />
          <img
            src={insetImage}
            alt=""
            loading="lazy"
            className="absolute bottom-[6%] left-[2%] h-[26%] w-auto aspect-square rounded-full border-4 border-white object-cover shadow-[0_12px_28px_rgba(15,39,72,0.25)]"
          />
        </div>
      </div>
    </section>
  );
}
