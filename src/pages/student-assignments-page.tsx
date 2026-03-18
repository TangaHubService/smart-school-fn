import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ClipboardCheck, Loader2 } from 'lucide-react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  type AssignmentItem,
  listMyCoursesApi,
} from '../features/sprint4/lms.api';

const PAGE_SIZE = 50;

type AssignmentWithCourse = AssignmentItem & {
  course: {
    id: string;
    title: string;
    classRoom: { name: string };
    academicYear: { name: string };
    subject?: { name: string } | null;
  };
  mySubmission?: { status: string; gradePoints: number | null } | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'No due date';
  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusBadge(assignment: AssignmentWithCourse) {
  if (assignment.mySubmission?.status === 'GRADED') {
    return (
      <span className="inline-flex rounded-full border border-brand-200 bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
        Graded
      </span>
    );
  }
  if (assignment.mySubmission) {
    return (
      <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
        Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
      Pending
    </span>
  );
}

export function StudentAssignmentsPage() {
  const auth = useAuth();

  const coursesQuery = useInfiniteQuery({
    queryKey: ['lms', 'student-assignments'],
    queryFn: ({ pageParam }) =>
      listMyCoursesApi(auth.accessToken!, {
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const allCourses = coursesQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const assignments: AssignmentWithCourse[] = [];
  for (const course of allCourses) {
    for (const assignment of course.assignments) {
      assignments.push({
        ...assignment,
        course: {
          id: course.id,
          title: course.title,
          classRoom: course.classRoom,
          academicYear: course.academicYear,
          subject: course.subject,
        },
        mySubmission: assignment.mySubmission ?? undefined,
      });
    }
  }

  // Sort by due date (soonest first), then pending before submitted
  const sortedAssignments = [...assignments].sort((a, b) => {
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    const aSubmitted = a.mySubmission ? 1 : 0;
    const bSubmitted = b.mySubmission ? 1 : 0;
    return aSubmitted - bSubmitted;
  });

  if (coursesQuery.isPending && !coursesQuery.data) {
    return (
      <div className="grid gap-4">
        <div className="h-36 animate-pulse rounded-xl bg-slate-200" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (coursesQuery.isError) {
    return (
      <StateView
        title="Could not load assignments"
        message="Retry to load your assignments."
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
        title="My Assignments"
        subtitle="View and submit assignments from your courses."
      >
        {sortedAssignments.length ? (
          <div className="space-y-3">
            {sortedAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                    {getStatusBadge(assignment)}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {assignment.course.title}
                    {assignment.course.subject ? ` · ${assignment.course.subject.name}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {assignment.course.classRoom.name} · {assignment.course.academicYear.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Due {formatDateTime(assignment.dueAt)} · {assignment.maxPoints} pts
                  </p>
                  {assignment.mySubmission?.status === 'GRADED' &&
                    assignment.mySubmission.gradePoints !== null && (
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        Grade: {assignment.mySubmission.gradePoints}/{assignment.maxPoints}
                      </p>
                    )}
                </div>
                <Link
                  to={`/student/courses/${assignment.course.id}/tests/${assignment.id}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-100"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {assignment.mySubmission?.status === 'GRADED' ? 'View' : 'Open'}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No assignments yet"
            message="Assignments from your courses will appear here."
          />
        )}
        {coursesQuery.hasNextPage ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => void coursesQuery.fetchNextPage()}
              disabled={coursesQuery.isFetchingNextPage}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-brand-50 disabled:opacity-50"
            >
              {coursesQuery.isFetchingNextPage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load more assignments'
              )}
            </button>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
