import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { academyApi, type Program } from '../api/academy-api';
import { PublicCommunityCTA } from '../components/public/public-community-cta';
import { PublicAcademyProgramsShowcase } from '../components/public/public-academy-showcase';
import backgroundImage from '../asset/background.jpg';
import { getLowBandwidthPreferred } from '../utils/low-bandwidth-preference';

const CATALOG_FILTERS = [
  { id: 'all', label: 'All', keywords: [] as readonly string[] },
  {
    id: 'governance',
    label: 'Governance & admin',
    keywords: ['governance', 'administration', 'policy', 'accounting', 'hr', 'procurement'],
  },
  {
    id: 'education',
    label: 'Education',
    keywords: ['education', 'research', 'training', 'teaching', 'curriculum'],
  },
  {
    id: 'health',
    label: 'Health & social',
    keywords: ['health', 'social', 'welfare', 'care'],
  },
  {
    id: 'ict',
    label: 'ICT & technology',
    keywords: ['ict', 'technology', 'innovation', 'software', 'digital'],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    keywords: ['infrastructure', 'manufacturing', 'construction', 'production'],
  },
  {
    id: 'business',
    label: 'Business & finance',
    keywords: ['business', 'finance', 'trade', 'hospitality', 'sales'],
  },
] as const;

function matchesCatalogFilter(program: Program, filterId: string): boolean {
  if (filterId === 'all') {
    return true;
  }
  const entry = CATALOG_FILTERS.find((item) => item.id === filterId);
  if (!entry || entry.keywords.length === 0) {
    return true;
  }
  const haystack = `${program.title} ${program.description ?? ''}`.toLowerCase();
  return entry.keywords.some((keyword) => haystack.includes(keyword));
}

export function PublicCoursesPage() {
  const lowBandwidth = getLowBandwidthPreferred();
  const programsQuery = useQuery({
    queryKey: ['academy-programs', 'public-catalog'],
    queryFn: academyApi.getPrograms,
    staleTime: 60_000,
  });

  const filteredPrograms = useMemo(
    () => (programsQuery.data ?? []).filter((program) => matchesCatalogFilter(program, 'all')),
    [programsQuery.data],
  );

  return (
    <main className="bg-white">
      <section
        className="relative flex min-h-[62vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={
          lowBandwidth
            ? { backgroundColor: '#0f172a' }
            : { backgroundImage: `url(${backgroundImage})` }
        }
      >
        <div className={`absolute inset-0 ${lowBandwidth ? 'bg-black/40' : 'bg-black/65'}`} />
        <div className="relative mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">Our Programs</p>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">
            Welcome to Smart School Rwanda After Class Programs
          </h1>
          <p className="mx-auto mt-6 hidden max-w-3xl text-lg font-medium text-gray-100 md:block">
            Explore the live academy catalog, compare program themes, then activate a plan on the academy page and choose the 3 courses you want to access.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/academy"
              className="group flex items-center gap-2 rounded-2xl bg-brand-500 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600"
            >
              Academy plans
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login?tab=register&returnTo=/academy"
              className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Create learner account
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-slate-50 py-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">Live catalog</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Academy programs from the API</h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            {programsQuery.isPending
              ? 'Loading programs…'
              : programsQuery.isError
                ? 'Program list unavailable right now.'
                : `${filteredPrograms.length} program${filteredPrograms.length === 1 ? '' : 's'} available for plan-based access.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {CATALOG_FILTERS.map((filter) => (
              <span
                key={filter.id}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                {filter.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <PublicAcademyProgramsShowcase
        eyebrow="Live academy catalog"
        title="Browse available programs"
        subtitle="Choose a plan on the academy page, then add up to 3 linked courses from the live catalog."
        limit={null}
        programs={filteredPrograms}
        programsLoading={programsQuery.isPending}
        programsError={programsQuery.isError}
        ctaHref="/academy"
        ctaLabel="Open academy plans"
      />

      <PublicCommunityCTA />
    </main>
  );
}
