import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyChildrenApi } from '../features/sprint2/sprint2.api';

export function ParentMyChildrenPage() {
  const auth = useAuth();

  const childrenQuery = useQuery({
    queryKey: ['parent', 'my-children'],
    queryFn: () => listMyChildrenApi(auth.accessToken!),
  });

  const parent = childrenQuery.data?.parent;
  const students = childrenQuery.data?.students ?? [];

  return (
    <SectionCard
      title="My Children"
      subtitle="View linked student profiles and current class enrollment."
    >
      {childrenQuery.isPending ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {childrenQuery.isError ? (
        <StateView
          title="Could not load linked students"
          message="Please retry."
          action={
            <button
              type="button"
              onClick={() => void childrenQuery.refetch()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError ? (
        <div className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Parent profile: {parent ? `${parent.firstName} ${parent.lastName}` : 'Not linked yet'}
        </div>
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError && students.length === 0 ? (
        <EmptyState message="No children linked to your account yet. Contact school administration." />
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError && students.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-brand-700">
                <th className="px-2 py-2 font-semibold">Student</th>
                <th className="px-2 py-2 font-semibold">Code</th>
                <th className="px-2 py-2 font-semibold">Relationship</th>
                <th className="px-2 py-2 font-semibold">Class</th>
                <th className="px-2 py-2 font-semibold">Academic Year</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-brand-50">
                  <td className="px-2 py-2 align-middle font-semibold text-brand-800">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-2 py-2 align-middle">{student.studentCode}</td>
                  <td className="px-2 py-2 align-middle">
                    {student.relationship}
                    {student.isPrimary ? ' (Primary)' : ''}
                  </td>
                  <td className="px-2 py-2 align-middle">{student.currentEnrollment?.classRoom.name ?? '-'}</td>
                  <td className="px-2 py-2 align-middle">{student.currentEnrollment?.academicYear.name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}
