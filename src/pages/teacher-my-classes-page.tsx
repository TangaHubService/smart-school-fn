import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, School } from 'lucide-react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  listCoursesApi,
  type CourseListResponse,
} from '../features/sprint4/lms.api';

type CourseItem = CourseListResponse['items'][number];

export function TeacherMyClassesPage() {
  const auth = useAuth();

  const coursesQuery = useQuery({
    queryKey: ['teacher', 'my-classes'],
    queryFn: () => listCoursesApi(auth.accessToken!, { page: 1, pageSize: 50 }),
  });

  const courses = coursesQuery.data?.items ?? [];
  const byClass = courses.reduce<Record<string, CourseItem[]>>((acc, course) => {
    const key = course.classRoom.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(course);
    return acc;
  }, {});
  const classGroups = Object.entries(byClass).map(([classId, items]) => ({
    classRoom: items[0]!.classRoom,
    academicYear: items[0]!.academicYear,
    courses: items,
  }));

  if (coursesQuery.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (coursesQuery.isError) {
    return (
      <StateView
        title="Could not load your classes"
        message="Retry to load your teaching assignments."
        action={
          <button
            type="button"
            onClick={() => void coursesQuery.refetch()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="My Classes"
        subtitle="Classes and courses you teach."
      >
        {classGroups.length ? (
          <div className="space-y-4">
            {classGroups.map((group) => (
              <div
                key={group.classRoom.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <School className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">{group.classRoom.name}</h3>
                    <p className="text-sm text-slate-600">{group.academicYear.name}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.courses.map((course) => (
                    <Link
                      key={course.id}
                      to="/admin/courses"
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/30"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0 text-slate-500" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{course.title}</p>
                          <p className="text-xs text-slate-500">
                            {course.subject?.name ?? 'General'} · {course.counts.lessons} lessons ·{' '}
                            {course.counts.assignments} assignments
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No classes assigned"
            message="You don't have any teaching assignments yet. Contact your administrator."
          />
        )}
      </SectionCard>
    </div>
  );
}
