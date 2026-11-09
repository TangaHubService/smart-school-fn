import { useMemo } from 'react';
import { ArrowRight, BookOpen, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import {
  academyApi,
  mergeCatalogYears,
  splitCatalogGradesIntoBands,
  type AcademyCatalogGradeLevel,
} from '../api/academy-api';
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

  const academicYears = catalogQuery.data?.academicYears;
  const grades = useMemo(() => mergeCatalogYears(academicYears ?? []), [academicYears]);
  const bands = useMemo(() => splitCatalogGradesIntoBands(grades), [grades]);

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

        {catalogQuery.isSuccess ? <AcademyCourseList grades={grades} /> : null}
      </div>
    </section>
  );
}

const COURSES_SHOWN_PER_CLASS = 4;

/**
 * Every public course, grouped by class, so visitors see what they can learn
 * without drilling through level group -> level -> class first.
 */
function AcademyCourseList({ grades }: { grades: AcademyCatalogGradeLevel[] }) {
  const classes = grades.flatMap((grade) =>
    grade.classRooms
      .map((room) => ({
        room,
        gradeName: grade.name,
        courses: room.subjects.flatMap((subject) =>
          (subject.courses ?? []).map((course) => ({ ...course, subjectName: subject.name }))
        ),
        courseTotal: room.subjects.reduce((sum, subject) => sum + subject.courseCount, 0),
      }))
      .filter((item) => item.courseTotal > 0)
  );

  if (!classes.length) return null;

  return (
    <div className="mt-16 sm:mt-20">
      <SectionHeading
        id="academy-courses-title"
        title="Courses in the Academy"
        subtitle="Every published course, by class. Open a class to see all of its courses and enroll."
      />
      <ul aria-labelledby="academy-courses-title" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map(({ room, gradeName, courses, courseTotal }) => {
          const hidden = Math.max(courseTotal - COURSES_SHOWN_PER_CLASS, 0);
          return (
            <li
              key={room.id}
              className="flex flex-col rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(15,39,72,0.08),0_8px_24px_rgba(15,39,72,0.06)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight text-slate-900">{room.name}</h3>
                <span className="shrink-0 text-[13px] text-slate-500">
                  {countLabel(courseTotal, 'course')}
                </span>
              </div>
              {gradeName !== room.name ? (
                <p className="mt-0.5 text-[13px] text-slate-500">{gradeName}</p>
              ) : null}
              <ul className="mt-4 space-y-2.5" aria-label={`Courses in ${room.name}`}>
                {courses.slice(0, COURSES_SHOWN_PER_CLASS).map((course) => (
                  <li key={course.id} className="flex items-start gap-2.5">
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">{course.title}</span>
                      <span className="block text-[13px] text-slate-500">{course.subjectName}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to={`/programs/class/${room.id}`}
                className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {hidden > 0 ? `View all ${courseTotal} courses` : `View ${room.name}`}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
