import { Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { academyApi, splitCatalogGradesIntoBands } from '../api/academy-api';
import { CardGridSkeleton } from '../components/skeleton-loader';
import backgroundImage from '../asset/background.jpg';

function cardImage(item: { thumbnail?: string | null }) {
  const thumbnail = item.thumbnail?.trim();
  return thumbnail ? thumbnail : backgroundImage;
}

export function PublicAcademyPage({ hideHero = false }: { hideHero?: boolean } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  // Filters mirror the URL (?band=<lower|upper>&level=<gradeId>) so bands and
  // levels are deep-linkable and shareable. State stays the source of truth.
  const [levelFilter, setLevelFilter] = useState(searchParams.get('level') ?? 'ALL');
  const [selectedBand, setSelectedBand] = useState(searchParams.get('band') ?? '');

  const catalogQuery = useQuery({
    queryKey: ['academy-catalog-tree'],
    queryFn: academyApi.getCatalogTree,
  });

  const academicYears = catalogQuery.data?.academicYears ?? [];

  useEffect(() => {
    if (!selectedYearId && academicYears.length) {
      setSelectedYearId(academicYears[0].id);
    }
  }, [academicYears, selectedYearId]);

  const activeYear = academicYears.find((year) => year.id === selectedYearId) ?? academicYears[0];

  // Level bands (e.g. Lower/Upper Primary): shared helper, same logic as the
  // dedicated band/level pages so navigation stays consistent page to page.
  const levelBands = useMemo(
    () => splitCatalogGradesIntoBands(activeYear?.gradeLevels ?? []),
    [activeYear]
  );

  const activeBand = levelBands.find((band) => band.key === selectedBand) ?? null;
  const gradeBand =
    levelBands.find((band) => band.grades.some((grade) => grade.id === levelFilter)) ?? null;
  const shownBand = activeBand ?? gradeBand;
  const shownGrades = shownBand ? shownBand.grades : [];
  const showBands = !shownBand;
  function clearLevelToBand() {
    if (!shownBand) return;
    setLevelFilter('ALL');
    navigate(buildCatalogUrl(shownBand.key, null, null, 'academy-levels'));
    scrollToId('academy-levels');
  }

  // Shared band/level links (?band=&level=<gradeId>): jump to the matching
  // section once the catalog has loaded.
  useEffect(() => {
    if (catalogQuery.isPending || !activeYear) {
      return;
    }
    const levelId = searchParams.get('level');
    const bandId = searchParams.get('band');
    const target = levelId ? 'academy-levels' : bandId ? 'academy-levels' : null;
    if (!target) {
      return;
    }
    const timer = window.setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [catalogQuery.isPending, activeYear, searchParams]);

  // Keep filters in sync when the URL changes (back/forward, shared links).
  useEffect(() => {
    const nextBand = searchParams.get('band') ?? '';
    setSelectedBand((prev) => (prev === nextBand ? prev : nextBand));
    const nextLevel = searchParams.get('level') ?? 'ALL';
    setLevelFilter((prev) => (prev === nextLevel ? prev : nextLevel));
  }, [searchParams]);

  function buildCatalogUrl(
    band: string | null,
    level: string | null,
    classId: string | null,
    hash: string
  ) {
    const params = new URLSearchParams();
    if (band) params.set('band', band);
    if (level && level !== 'ALL') params.set('level', level);
    if (classId) params.set('class', classId);
    const query = params.toString();
    return `${location.pathname}${query ? `?${query}` : ''}#${hash}`;
  }

  function scrollToId(id: string) {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function selectBand(band: string | null) {
    setSelectedBand(band ?? '');
    setLevelFilter('ALL');
    navigate(buildCatalogUrl(band, null, null, 'academy-levels'));
    scrollToId('academy-levels');
  }

  return (
    <main className="bg-white">
      {hideHero ? null : (
        <section
          className="relative flex min-h-[58vh] items-center justify-center bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-brand-950/70" />
          <div className="relative mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-brand-200 ring-1 ring-brand-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              Plan-based access
            </div>
            <h1 className="text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">
              Smart School <span className="text-brand-400">Programs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg font-medium text-gray-100">
              Activate a plan, then enroll in up to 3 classes and unlock every subject, course,
              and lesson within each enrolled class.
            </p>
          </div>
        </section>
      )}

      <section id="academy-levels" className="border-t border-slate-100 bg-white py-20 scroll-mt-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {shownBand ? (
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex flex-wrap items-center gap-1 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => selectBand(null)}
                    className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
                  >
                    Levels
                  </button>
                </li>
                <li aria-hidden="true" className="text-slate-400">
                  /
                </li>
                {levelFilter !== 'ALL' ? (
                  <>
                    <li>
                      <button
                        type="button"
                        onClick={clearLevelToBand}
                        className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
                      >
                        {shownBand.title}
                      </button>
                    </li>
                    <li aria-hidden="true" className="text-slate-400">
                      /
                    </li>
                    <li aria-current="page" className="px-1 py-0.5 font-semibold text-slate-900">
                      {shownBand.grades.find((grade) => grade.id === levelFilter)?.name ??
                        'Level'}
                    </li>
                  </>
                ) : (
                  <li aria-current="page" className="px-1 py-0.5 font-semibold text-slate-900">
                    {shownBand.title}
                  </li>
                )}
              </ol>
            </nav>
          ) : null}
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">
                Start here
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {showBands ? 'Choose your level group' : (shownBand?.title ?? 'Choose a level')}
              </h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                {showBands
                  ? 'Start with a level group, then pick a level to see its classes. Every card shows its levels, classes, and enrolled students.'
                  : `${shownBand?.subtitle ?? ''}. Pick a level to see its classes — every card shows how many classes it holds and how many students are enrolled.`}
              </p>
            </div>
          </div>

          {catalogQuery.isPending ? (
            <CardGridSkeleton count={6} className="lg:grid-cols-3" />
          ) : catalogQuery.isError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-12 text-center text-rose-700 shadow-sm">
              We could not load levels right now. Please refresh the page and try again.
            </div>
          ) : academicYears.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-600 shadow-sm">
              No levels are ready yet. Programs linked to classes will appear here.
            </div>
          ) : showBands ? (
            <div className="grid gap-8 md:grid-cols-2" role="list" aria-label="Level groups">
              {levelBands.map((band) => (
                <article
                  key={band.key}
                  role="listitem"
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={cardImage({ thumbnail: band.thumbnail })}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-700 shadow-sm">
                      {band.grades.length} {band.grades.length === 1 ? 'level' : 'levels'} ·{' '}
                      {band.classes} {band.classes === 1 ? 'class' : 'classes'}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                      {band.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">{band.subtitle}</p>
                    <p className="mt-4 flex flex-1 items-center gap-2 text-[15px] leading-relaxed text-slate-600">
                      <Users className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                      Enrolled students: {band.enrolled.toLocaleString()}
                    </p>
                      <Link
                        to={`/programs/group/${band.key}`}
                        aria-label={`View levels in ${band.title}`}
                        className="mt-6 block w-full rounded-2xl bg-brand-500 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-brand-600"
                      >
                        View levels
                      </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Levels">
              {shownGrades.map((grade, gradeIndex) => {
                const classCount = grade.classRooms.length;
                const courseCount = grade.classRooms.reduce(
                  (sum, room) =>
                    sum + room.subjects.reduce((inner, subject) => inner + subject.courseCount, 0),
                  0
                );
                const enrolledTotal = grade.classRooms.reduce(
                  (sum, room) => sum + (room.enrolledCount ?? 0),
                  0
                );
                const gradeThumbnail =
                  grade.classRooms.find((room) => room.thumbnail?.trim())?.thumbnail ?? null;
                const isActive = levelFilter === grade.id;
                return (
                  <article
                    key={grade.id}
                    role="listitem"
                    className={[
                      'group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition',
                      isActive
                        ? 'border-brand-500 ring-2 ring-brand-400/30'
                        : 'border-slate-200 hover:border-brand-200',
                    ].join(' ')}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={cardImage({ thumbnail: gradeThumbnail })}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-700 shadow-sm">
                        {classCount} {classCount === 1 ? 'class' : 'classes'} · {courseCount}{' '}
                        {courseCount === 1 ? 'course' : 'courses'}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                        {grade.name}
                      </h3>
                      <p className="mt-4 flex flex-1 items-center gap-2 text-[15px] leading-relaxed text-slate-600">
                        <Users className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                        Enrolled students: {enrolledTotal.toLocaleString()}
                      </p>
                      <Link
                        to={`/programs/level/${grade.id}`}
                        aria-label={`View classes in level ${grade.name}`}
                        className="mt-6 block w-full rounded-2xl bg-brand-500 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-brand-600"
                      >
                        View classes
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>




    </main>
  );
}
