import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

import { academyApi, splitCatalogGradesIntoBands } from '../api/academy-api';
import backgroundImage from '../asset/background.jpg';
import { CardGridSkeleton } from '../components/skeleton-loader';

function cardImage(thumbnail: string | null) {
  const value = thumbnail?.trim();
  return value ? value : backgroundImage;
}

export function PublicLevelGroupPage() {
  const { bandKey } = useParams();

  const catalogQuery = useQuery({
    queryKey: ['academy-catalog-tree'],
    queryFn: academyApi.getCatalogTree,
    staleTime: 60_000,
  });

  const academicYears = catalogQuery.data?.academicYears ?? [];
  const activeYear = academicYears.find((year) => year.isCurrent) ?? academicYears[0];
  const bands = useMemo(
    () => splitCatalogGradesIntoBands(activeYear?.gradeLevels ?? []),
    [activeYear]
  );
  const band = bands.find((item) => item.key === bandKey) ?? null;

  return (
    <main className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            <li>
              <Link
                to="/"
                className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">
              /
            </li>
            <li>
              <Link
                to="/programs#academy-levels"
                className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Programs
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">
              /
            </li>
            <li aria-current="page" className="px-1 py-0.5 font-semibold text-slate-900">
              {band?.title ?? 'Level group'}
            </li>
          </ol>
        </nav>

        {catalogQuery.isPending ? (
          <CardGridSkeleton count={6} className="lg:grid-cols-3" />
        ) : catalogQuery.isError || !band ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Level group not found</h1>
            <p className="mx-auto mt-2 max-w-md text-slate-600">
              This level group is not available right now. Back to programs to pick another
              group.
            </p>
            <Link
              to="/programs#academy-levels"
              className="mt-6 inline-block rounded-2xl bg-brand-500 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-brand-600"
            >
              Back to programs
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">
              {band.subtitle}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {band.title}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Pick a level to see its classes. Every card shows how many classes it holds and
              how many students are enrolled.
            </p>

            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3" role="list" aria-label={`Levels in ${band.title}`}>
              {band.grades.map((grade) => {
                const classCount = grade.classRooms.length;
                const courseCount = grade.classRooms.reduce(
                  (sum, room) =>
                    sum + room.subjects.reduce((total, subject) => total + subject.courseCount, 0),
                  0
                );
                const enrolledTotal = grade.classRooms.reduce(
                  (sum, room) => sum + (room.enrolledCount ?? 0),
                  0
                );
                const thumbnail =
                  grade.classRooms.find((room) => room.thumbnail?.trim())?.thumbnail ?? null;
                return (
                  <article
                    key={grade.id}
                    role="listitem"
                    className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={cardImage(thumbnail)}
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
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        {grade.name}
                      </h2>
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
          </>
        )}
      </div>
    </main>
  );
}
