import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '../components/empty-state';
import { AppDrawer } from '../components/drawer';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  getMyChildLearningApi,
  listMyChildrenApi,
} from '../features/sprint2/sprint2.api';

interface SelectedStudent {
  id: string;
  fullName: string;
}

export function ParentMyChildrenPage() {
  const { t } = useTranslation('parent');
  const auth = useAuth();
  const [learningStudent, setLearningStudent] = useState<SelectedStudent | null>(null);
  const [detailsStudent, setDetailsStudent] = useState<SelectedStudent | null>(null);

  const childrenQuery = useQuery({
    queryKey: ['parent', 'my-children'],
    queryFn: () => listMyChildrenApi(auth.accessToken!),
  });

  const childLearningQuery = useQuery({
    queryKey: ['parent', 'my-children', 'learning', learningStudent?.id ?? null],
    enabled: Boolean(learningStudent?.id && auth.accessToken),
    queryFn: () => getMyChildLearningApi(auth.accessToken!, learningStudent!.id),
  });

  const parent = childrenQuery.data?.parent;
  const students = childrenQuery.data?.students ?? [];
  const selectedStudentData = detailsStudent
    ? students.find((s) => s.id === detailsStudent.id)
    : null;

  return (
    <SectionCard title={t('children.title')} subtitle={t('children.subtitle')}>
      {childrenQuery.isPending ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {childrenQuery.isError ? (
        <StateView
          title={t('children.errorTitle')}
          message={t('children.errorMessage')}
          action={
            <button
              type="button"
              onClick={() => void childrenQuery.refetch()}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              {t('children.retry')}
            </button>
          }
        />
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError ? (
        <div className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-slate-700">
          {t('children.parentProfile')}:{' '}
          {parent ? `${parent.firstName} ${parent.lastName}` : t('children.notLinkedYet')}
        </div>
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError && students.length === 0 ? (
        <EmptyState message={t('children.emptyMessage')} />
      ) : null}

      {!childrenQuery.isPending && !childrenQuery.isError && students.length > 0 ? (
        <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full min-w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-slate-700">
                <th className="px-2 py-2 font-semibold">{t('children.table.student')}</th>
                <th className="px-2 py-2 font-semibold">{t('children.table.code')}</th>
                <th className="px-2 py-2 font-semibold">{t('children.table.relationship')}</th>
                <th className="px-2 py-2 font-semibold">{t('children.table.class')}</th>
                <th className="px-2 py-2 font-semibold">{t('children.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-brand-50">
                  <td className="px-2 py-2 align-middle font-semibold text-slate-800">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-2 py-2 align-middle">{student.studentCode}</td>
                  <td className="px-2 py-2 align-middle">
                    {student.relationship}
                    {student.isPrimary ? ` (${t('children.primary')})` : ''}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    {student.currentEnrollment?.classRoom.name ?? '-'}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setDetailsStudent({
                            id: student.id,
                            fullName: `${student.firstName} ${student.lastName}`,
                          })
                        }
                        className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLearningStudent({
                            id: student.id,
                            fullName: `${student.firstName} ${student.lastName}`,
                          })
                        }
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        {t('children.learningAction')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <AppDrawer
        open={Boolean(learningStudent)}
        onClose={() => setLearningStudent(null)}
        title="Learning summary"
        description={learningStudent?.fullName}
      >
        {childLearningQuery.isPending ? (
          <div className="grid gap-2" role="status" aria-live="polite">
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          </div>
        ) : null}

        {childLearningQuery.isError ? (
          <StateView
            title="Could not load learning data"
            message="Retry in a moment."
            action={
              <button
                type="button"
                onClick={() => void childLearningQuery.refetch()}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            }
          />
        ) : null}

        {!childLearningQuery.isPending && !childLearningQuery.isError && childLearningQuery.data ? (
          <div className="grid gap-6">
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">Course progress</h3>
              {childLearningQuery.data.courses.length === 0 ? (
                <EmptyState message="No enrolled courses with published lessons yet." />
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                  <table className="w-full min-w-full table-auto text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 text-slate-700">
                        <th className="px-2 py-2 font-semibold">Course</th>
                        <th className="px-2 py-2 font-semibold">Lessons done</th>
                        <th className="px-2 py-2 font-semibold">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {childLearningQuery.data.courses.map((c) => (
                        <tr key={c.courseId} className="border-b border-brand-50">
                          <td className="px-2 py-2 font-medium text-slate-800">{c.title}</td>
                          <td className="px-2 py-2 text-slate-700">
                            {c.completedLessons} / {c.totalPublishedLessons}
                          </td>
                          <td className="px-2 py-2 text-slate-700">{c.progressPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">Recent quiz attempts</h3>
              {childLearningQuery.data.recentAttempts.length === 0 ? (
                <EmptyState message="No submitted tests yet." />
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                  <table className="w-full min-w-full table-auto text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 text-slate-700">
                        <th className="px-2 py-2 font-semibold">Assessment</th>
                        <th className="px-2 py-2 font-semibold">Course</th>
                        <th className="px-2 py-2 font-semibold">Score</th>
                        <th className="px-2 py-2 font-semibold">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {childLearningQuery.data.recentAttempts.map((a) => (
                        <tr key={a.id} className="border-b border-brand-50">
                          <td className="px-2 py-2 font-medium text-slate-800">
                            {a.assessmentTitle}
                          </td>
                          <td className="px-2 py-2 text-slate-700">{a.courseTitle}</td>
                          <td className="px-2 py-2 text-slate-700">
                            {a.maxScore > 0 ? `${a.score} / ${a.maxScore}` : `${a.score}`}
                          </td>
                          <td className="px-2 py-2 text-slate-600">
                            {new Date(a.submittedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </AppDrawer>

      <AppDrawer
        open={Boolean(detailsStudent)}
        onClose={() => setDetailsStudent(null)}
        title="Student Details"
        description={detailsStudent?.fullName}
      >
        {selectedStudentData ? (
          <div className="grid gap-6">
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">Personal Information</h3>
              <div className="rounded-lg border border-brand-100 bg-white p-3">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Student Code:</span>
                    <span className="font-medium text-slate-800">{selectedStudentData.studentCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Full Name:</span>
                    <span className="font-medium text-slate-800">
                      {selectedStudentData.firstName} {selectedStudentData.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gender:</span>
                    <span className="font-medium text-slate-800">{selectedStudentData.gender ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date of Birth:</span>
                    <span className="font-medium text-slate-800">{selectedStudentData.dateOfBirth ?? '-'}</span>
                  </div>
                  {selectedStudentData.currentEnrollment && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Class:</span>
                        <span className="font-medium text-slate-800">
                          {selectedStudentData.currentEnrollment.classRoom.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Academic Year:</span>
                        <span className="font-medium text-slate-800">
                          {selectedStudentData.currentEnrollment.academicYear.name}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {parent && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">Linked Parents</h3>
                <div className="rounded-lg border border-brand-100 bg-white p-3">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Name:</span>
                      <span className="font-medium text-slate-800">
                        {parent.firstName} {parent.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Relationship:</span>
                      <span className="font-medium text-slate-800">
                        {selectedStudentData.relationship}
                        {selectedStudentData.isPrimary ? ' (Primary)' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">Attendance Summary (Last 30 Days)</h3>
              {selectedStudentData.attendanceLast30Days ? (
                <div className="grid gap-2 sm:grid-cols-5">
                  <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-center">
                    <p className="text-xs font-semibold uppercase text-slate-600">Total</p>
                    <p className="text-lg font-bold text-slate-800">
                      {selectedStudentData.attendanceLast30Days.total}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Present</p>
                    <p className="text-lg font-bold text-emerald-800">
                      {selectedStudentData.attendanceLast30Days.present}
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
                    <p className="text-xs font-semibold uppercase text-red-700">Absent</p>
                    <p className="text-lg font-bold text-red-800">
                      {selectedStudentData.attendanceLast30Days.absent}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-center">
                    <p className="text-xs font-semibold uppercase text-amber-700">Late</p>
                    <p className="text-lg font-bold text-amber-800">
                      {selectedStudentData.attendanceLast30Days.late}
                    </p>
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-center">
                    <p className="text-xs font-semibold uppercase text-sky-700">Excused</p>
                    <p className="text-lg font-bold text-sky-800">
                      {selectedStudentData.attendanceLast30Days.excused}
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyState message="No attendance data available" />
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">Conduct History</h3>
              <div className="rounded-lg border border-brand-100 bg-white p-3">
                <p className="text-sm text-slate-600">
                  Conduct history is not available. Please contact the school administrator.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </AppDrawer>
    </SectionCard>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'present' | 'absent' | 'late' | 'excused';
}) {
  const toneClass =
    tone === 'present'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
      : tone === 'absent'
        ? 'border-red-100 bg-red-50 text-red-900'
        : tone === 'late'
          ? 'border-amber-100 bg-amber-50 text-amber-900'
          : tone === 'excused'
            ? 'border-sky-100 bg-sky-50 text-sky-900'
            : 'border-brand-100 bg-brand-50 text-slate-900';

  return (
    <article className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </article>
  );
}
