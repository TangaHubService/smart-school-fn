import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';

import { academyApi, Program } from '../../api/academy-api';
import heroBackdrop from '../../asset/background.jpg';

function programImage(program: Program) {
  const t = program.thumbnail?.trim();
  return t ? t : heroBackdrop;
}

function ProgramAdvertCard({ program }: { program: Program }) {
  const desc = program.description?.trim() || 'Open enrollment — start anytime.';
  return (
    <article className="group flex min-w-[280px] max-w-sm flex-shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_28px_60px_rgba(30,90,168,0.12)] sm:min-w-0 sm:max-w-none">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        <img
          src={programImage(program)}
          alt={program.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-700 shadow-sm">
          From {Number(program.price).toLocaleString()} RWF
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">{program.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{desc}</p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{program.durationDays} days access</span>
          <Link
            to={`/academy`}
            state={{ highlightProgramId: program.id }}
            className="inline-flex items-center gap-1 font-black uppercase tracking-wider text-brand-600 hover:text-brand-700"
          >
            Enroll
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

type PublicAcademyProgramsShowcaseProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Omit or pass a number to cap. Pass `null` to show every program from the API. */
  limit?: number | null;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
};

export function PublicAcademyProgramsShowcase({
  eyebrow = 'Public catalog',
  title,
  subtitle,
  limit,
  ctaHref = '/academy',
  ctaLabel = 'View full catalog',
  className = '',
}: PublicAcademyProgramsShowcaseProps) {
  const { data: programs, isLoading, isError } = useQuery({
    queryKey: ['academy-programs'],
    queryFn: academyApi.getPrograms,
    staleTime: 60_000,
  });

  const raw = programs ?? [];
  const slice = limit === null ? raw : raw.slice(0, limit ?? 6);

  if (!isLoading && !isError && slice.length === 0) {
    return (
      <section className={`bg-gradient-to-b from-slate-900 via-slate-900 to-brand-950 py-16 text-white ${className}`}>
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center backdrop-blur-sm">
            <p className="text-sm text-white/80">Programs from your academy catalog will appear here for visitors.</p>
            <Link
              to={ctaHref}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-brand-400"
            >
              Open academy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-brand-50/40 py-20 ${className}`}>
      <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-brand-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-48 w-48 rounded-full bg-brand-600/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-4 text-center sm:mb-14 sm:text-left md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-700 ring-1 ring-brand-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
            {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 md:mx-0">{subtitle}</p> : null}
          </div>
          <Link
            to={ctaHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-center rounded-2xl border border-brand-200 bg-white px-6 py-3.5 text-xs font-black uppercase tracking-widest text-brand-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 md:self-auto"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-slate-600">Could not load programs. Try again later.</p>
        ) : (
          <>
            <div className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              {slice.map((program) => (
                <ProgramAdvertCard key={program.id} program={program} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
