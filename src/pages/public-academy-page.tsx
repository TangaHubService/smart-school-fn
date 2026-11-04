import { useMemo } from 'react';
import { BookOpen, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useSearchParams } from 'react-router-dom';

import { academyApi, splitCatalogGradesIntoBands } from '../api/academy-api';
import { CardGridSkeleton } from '../components/skeleton-loader';
import {
  CatalogMessage,
  countLabel,
  ProgramCard,
  ProgramGrid,
  SectionHeading,
} from '../components/public/program-browse';

/** "Explore Our Programs": the catalog's entry grid of level groups. */
export function PublicAcademyPage() {
  const [searchParams] = useSearchParams();

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

  // Older shared links (?level=, ?band=) now have dedicated pages.
  const levelParam = searchParams.get('level');
  const bandParam = searchParams.get('band');
  if (levelParam) return <Navigate to={`/programs/level/${levelParam}`} replace />;
  if (bandParam) return <Navigate to={`/programs/group/${bandParam}`} replace />;

  return (
    <section
      id="academy-levels"
      aria-labelledby="explore-programs-title"
      className="scroll-mt-16 bg-slate-50 py-14 sm:py-20"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="explore-programs-title"
          title="Explore Our Programs"
          subtitle="Choose a level group, pick a level, then open a class to see its subjects and courses."
        />

        {catalogQuery.isPending ? (
          <CardGridSkeleton count={3} className="lg:grid-cols-3" />
        ) : catalogQuery.isError ? (
          <CatalogMessage
            tone="error"
            title="Programs could not load"
            message="Please refresh the page and try again."
          />
        ) : bands.length === 0 ? (
          <CatalogMessage
            title="No programs yet"
            message="Classes with published courses will appear here."
          />
        ) : (
          <ProgramGrid count={bands.length} label="Level groups">
            {bands.map((band) => (
              <li key={band.key}>
                <ProgramCard
                  to={`/programs/group/${band.key}`}
                  ariaLabel={`Open ${band.title}: ${countLabel(band.grades.length, 'level')}, ${countLabel(band.enrolled, 'student')} enrolled`}
                  title={band.title}
                  subtitle={band.subtitle}
                  thumbnail={band.thumbnail}
                  stats={[
                    { icon: BookOpen, label: countLabel(band.grades.length, 'level') },
                    { icon: Users, label: `${band.enrolled.toLocaleString()} enrolled` },
                  ]}
                />
              </li>
            ))}
          </ProgramGrid>
        )}
      </div>
    </section>
  );
}
