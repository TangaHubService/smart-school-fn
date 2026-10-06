import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { academyApi, type Program } from '../api/academy-api';
import { PublicCommunityCTA } from '../components/public/public-community-cta';
import { PublicAcademyProgramsShowcase } from '../components/public/public-academy-showcase';
import backgroundImage from '../asset/background.jpg';
import { getLowBandwidthPreferred } from '../utils/low-bandwidth-preference';

export function PublicCoursesPage() {
  const lowBandwidth = getLowBandwidthPreferred();
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const programsQuery = useQuery({
    queryKey: ['academy-programs', 'public-catalog'],
    queryFn: academyApi.getPrograms,
    staleTime: 60_000,
  });

  // Live Level → Class → Subjects tree: drives the Class and Subject dropdowns.
  const treeQuery = useQuery({
    queryKey: ['academy-catalog-tree'],
    queryFn: academyApi.getCatalogTree,
    staleTime: 60_000,
  });

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const year of treeQuery.data?.academicYears ?? []) {
      for (const grade of year.gradeLevels) {
        for (const room of grade.classRooms) {
          if (!map.has(room.id)) {
            map.set(room.id, `${grade.name} — ${room.name}`);
          }
        }
      }
    }
    // Fallback to the flat program list when the tree is unavailable.
    if (map.size === 0) {
      for (const program of programsQuery.data ?? []) {
        if (program.classRoomId && program.className && !map.has(program.classRoomId)) {
          map.set(
            program.classRoomId,
            program.gradeLevelName
              ? `${program.gradeLevelName} — ${program.className}`
              : program.className
          );
        }
      }
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [treeQuery.data, programsQuery.data]);

  const classSubjects = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const year of treeQuery.data?.academicYears ?? []) {
      for (const grade of year.gradeLevels) {
        for (const room of grade.classRooms) {
          const set = map.get(room.id) ?? new Set<string>();
          for (const subject of room.subjects) {
            set.add(subject.name);
          }
          map.set(room.id, set);
        }
      }
    }
    return map;
  }, [treeQuery.data]);

  const subjectOptions = useMemo(() => {
    if (classFilter) {
      return [...(classSubjects.get(classFilter) ?? [])].sort((a, b) => a.localeCompare(b));
    }
    const all = new Set<string>();
    for (const set of classSubjects.values()) {
      for (const name of set) {
        all.add(name);
      }
    }
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [classSubjects, classFilter]);

  const filteredPrograms = useMemo(
    () =>
      (programsQuery.data ?? []).filter((program: Program) => {
        if (classFilter && program.classRoomId !== classFilter) {
          return false;
        }
        if (
          subjectFilter &&
          !(program.classRoomId && classSubjects.get(program.classRoomId)?.has(subjectFilter))
        ) {
          return false;
        }
        return true;
      }),
    [programsQuery.data, classFilter, subjectFilter, classSubjects]
  );

  const hasActiveFilters = Boolean(classFilter || subjectFilter);

  function handleClassChange(value: string) {
    setClassFilter(value);
    // Drop the subject if the newly selected class does not offer it.
    if (value && subjectFilter) {
      const offered = classSubjects.get(value);
      if (offered && !offered.has(subjectFilter)) {
        setSubjectFilter('');
      }
    }
  }

  function resetFilters() {
    setClassFilter('');
    setSubjectFilter('');
  }

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
          {/* <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">Our Programs</p> */}
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">
            Welcome to Smart School Rwanda After Class Programs
          </h1>
          <p className="mx-auto mt-6 hidden max-w-3xl text-lg font-medium text-gray-100 md:block">
            Explore academy programs by class or subject, then activate a plan on the academy page
            and choose the 3 subjects you want to access.
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

      <PublicAcademyProgramsShowcase
        limit={null}
        programs={filteredPrograms}
        programsLoading={programsQuery.isPending}
        programsError={programsQuery.isError}
        emptyMessage={
          hasActiveFilters ? 'No programs match the selected class or subject filters.' : undefined
        }
        filterBar={
          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-1 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
              Class
              <select
                value={classFilter}
                onChange={(e) => handleClassChange(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium normal-case text-slate-900"
                aria-label="Filter programs by class"
              >
                <option value="">All classes</option>
                {classOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
              Subject
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium normal-case text-slate-900 disabled:opacity-60"
                aria-label="Filter programs by subject"
                disabled={subjectOptions.length === 0}
              >
                <option value="">All subjects</option>
                {subjectOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
            <p className="text-sm text-slate-500 sm:col-span-3" aria-live="polite">
              {programsQuery.isPending
                ? 'Loading programs…'
                : programsQuery.isError
                  ? 'Program list unavailable right now.'
                  : `${filteredPrograms.length} program${filteredPrograms.length === 1 ? '' : 's'} shown.`}
            </p>
          </div>
        }
      />

      <PublicCommunityCTA />
    </main>
  );
}
