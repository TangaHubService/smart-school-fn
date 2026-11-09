import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users } from 'lucide-react';

import { academyApi, mergeCatalogYears, splitCatalogGradesIntoBands } from '../api/academy-api';
import { CardGridSkeleton } from '../components/skeleton-loader';
import {
  CatalogMessage,
  CategoryBanner,
  countLabel,
  ProgramCard,
  ProgramGrid,
  type Crumb,
} from '../components/public/program-browse';

export function PublicGradePage() {
  const { gradeId } = useParams();

  const catalogQuery = useQuery({
    queryKey: ['academy-catalog-tree'],
    queryFn: academyApi.getCatalogTree,
    staleTime: 60_000,
  });

  const academicYears = catalogQuery.data?.academicYears;
  const levelGroups = catalogQuery.data?.levelGroups;

  const located = useMemo(() => {
    const grades = mergeCatalogYears(academicYears ?? []);
    const grade = grades.find((item) => item.id === gradeId);
    if (!grade) return null;
    const bands = splitCatalogGradesIntoBands(grades, levelGroups);
    const band = bands.find((item) => item.grades.some((g) => g.id === gradeId)) ?? null;
    return { grade, band };
  }, [academicYears, levelGroups, gradeId]);

  if (located?.grade.classRooms.length === 1) {
    return <Navigate to={`/programs/class/${located.grade.classRooms[0].id}`} replace />;
  }

  const crumbs: Crumb[] = [
    { label: 'All Programs', to: '/programs#academy-levels' },
    ...(located?.band
      ? [{ label: located.band.title, to: `/programs/group/${located.band.key}` }]
      : []),
    { label: located?.grade.name ?? 'Level' },
  ];

  return (
    <main className="min-h-[60vh] bg-slate-50">
      <CategoryBanner
        crumbs={crumbs}
        title={located?.grade.name ?? 'Level'}
        subtitle={located ? 'Open a class to see its subjects and courses, or to enroll.' : undefined}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {catalogQuery.isPending ? (
          <CardGridSkeleton count={3} className="lg:grid-cols-3" />
        ) : catalogQuery.isError || !located ? (
          <CatalogMessage
            title="Level not found"
            message="This level is not available right now. Go back to programs to pick another level."
            action={{ label: 'Back to programs', to: '/programs#academy-levels' }}
          />
        ) : located.grade.classRooms.length ? (
          <ProgramGrid
            count={located.grade.classRooms.length}
            label={`Classes in ${located.grade.name}`}
          >
            {located.grade.classRooms.map((classRoom) => {
              const courseTotal = classRoom.subjects.reduce(
                (sum, subject) => sum + subject.courseCount,
                0
              );
              return (
                <li key={classRoom.id}>
                  <ProgramCard
                    to={`/programs/class/${classRoom.id}`}
                    ariaLabel={`Open class ${classRoom.name} to view subjects or enroll`}
                    title={classRoom.name}
                    subtitle={countLabel(courseTotal, 'course')}
                    thumbnail={classRoom.thumbnail}
                    stats={[
                      { icon: BookOpen, label: countLabel(classRoom.subjects.length, 'subject') },
                      {
                        icon: Users,
                        label: `${(classRoom.enrolledCount ?? 0).toLocaleString()} enrolled`,
                      },
                    ]}
                    footer={
                      <p className="text-sm font-semibold text-slate-900">
                        {classRoom.price.toLocaleString()} RWF
                      </p>
                    }
                  />
                </li>
              );
            })}
          </ProgramGrid>
        ) : (
          <CatalogMessage
            title={`No classes in ${located.grade.name} yet`}
            message="New classes will appear here once they are published."
          />
        )}
      </div>
    </main>
  );
}
