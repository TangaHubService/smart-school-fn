import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users } from 'lucide-react';

import { academyApi, mergeCatalogYears, splitCatalogGradesIntoBands } from '../api/academy-api';
import { CardGridSkeleton } from '../components/skeleton-loader';
import {
  CatalogMessage,
  CategoryBanner,
  countLabel,
  gradeTotals,
  ProgramCard,
  ProgramGrid,
} from '../components/public/program-browse';

export function PublicLevelGroupPage() {
  const { bandKey } = useParams();

  const catalogQuery = useQuery({
    queryKey: ['academy-catalog-tree'],
    queryFn: academyApi.getCatalogTree,
    staleTime: 60_000,
  });

  const academicYears = catalogQuery.data?.academicYears;
  const levelGroups = catalogQuery.data?.levelGroups;
  const bands = useMemo(
    () => splitCatalogGradesIntoBands(mergeCatalogYears(academicYears ?? []), levelGroups),
    [academicYears, levelGroups]
  );
  const band = bands.find((item) => item.key === bandKey) ?? null;

  return (
    <main className="min-h-[60vh] bg-slate-50">
      <CategoryBanner
        crumbs={[{ label: 'All Programs', to: '/programs#academy-levels' }, { label: band?.title ?? 'Level group' }]}
        title={band?.title ?? 'Level group'}
        subtitle={band ? 'Pick a level to see its courses.' : undefined}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {catalogQuery.isPending ? (
          <CardGridSkeleton count={3} className="lg:grid-cols-3" />
        ) : catalogQuery.isError || !band ? (
          <CatalogMessage
            title="Level group not found"
            message="This level group is not available right now. Go back to programs to pick another group."
            action={{ label: 'Back to programs', to: '/programs#academy-levels' }}
          />
        ) : band.grades.length === 0 ? (
          <CatalogMessage
            title="No levels yet"
            message="Levels in this group will appear here soon."
            action={{ label: 'Back to programs', to: '/programs#academy-levels' }}
          />
        ) : (
          <ProgramGrid count={band.grades.length} label={`Levels in ${band.title}`}>
            {band.grades.map((grade) => {
              const totals = gradeTotals(grade);
              // A level holding one class has nothing to choose: go straight to its courses.
              const onlyClass = grade.classRooms.length === 1 ? grade.classRooms[0] : null;
              const to = onlyClass ? `/programs/class/${onlyClass.id}` : `/programs/level/${grade.id}`;
              return (
                <li key={grade.id}>
                  <ProgramCard
                    to={to}
                    ariaLabel={`Open ${grade.name}: ${
                      onlyClass
                        ? countLabel(totals.courses, 'course')
                        : countLabel(totals.classes, 'class', 'classes')
                    }, ${countLabel(totals.enrolled, 'student')} enrolled`}
                    title={grade.name}
                    thumbnail={totals.thumbnail}
                    stats={[
                      {
                        icon: BookOpen,
                        label: onlyClass
                          ? countLabel(totals.courses, 'course')
                          : countLabel(totals.classes, 'class', 'classes'),
                      },
                      { icon: Users, label: `${totals.enrolled.toLocaleString()} enrolled` },
                    ]}
                  />
                </li>
              );
            })}
          </ProgramGrid>
        )}
      </div>
    </main>
  );
}
