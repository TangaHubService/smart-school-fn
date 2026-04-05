import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ConductDeductionForm } from '../components/conduct-deduction-form';
import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { hasPermission } from '../features/auth/auth-helpers';
import {
  getStudentConductMarksSummaryApi,
  listStudentConductDeductionsApi,
} from '../features/conduct-marks/conduct-marks.api';
import { listTermsApi } from '../features/sprint1/sprint1.api';
import { getStudentApi } from '../features/sprint2/sprint2.api';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Term conduct marks and deduction history (replaces legacy discipline incidents UI). */
export function StudentConductProfilePage() {
  const { studentId } = useParams();
  const auth = useAuth();
  const [conductModalOpen, setConductModalOpen] = useState(false);
  const [deductTermId, setDeductTermId] = useState('');

  const studentQuery = useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: () => getStudentApi(auth.accessToken!, studentId!),
    enabled: Boolean(studentId && auth.accessToken),
  });

  const academicYearId = studentQuery.data?.currentEnrollment?.academicYear.id;
  const enrollment = studentQuery.data?.currentEnrollment;

  const conductModalTermsQuery = useQuery({
    queryKey: ['terms', 'student-conduct-modal', academicYearId],
    queryFn: () => listTermsApi(auth.accessToken!, { academicYearId: academicYearId! }),
    enabled: Boolean(
      conductModalOpen && academicYearId && auth.accessToken && hasPermission(auth.me, 'conduct.manage'),
    ),
  });

  const conductMarksSummaryQuery = useQuery({
    queryKey: ['student-conduct-marks-summary', studentId, academicYearId],
    queryFn: () => getStudentConductMarksSummaryApi(auth.accessToken!, studentId!, academicYearId!),
    enabled: Boolean(
      studentId &&
        academicYearId &&
        auth.accessToken &&
        (hasPermission(auth.me, 'conduct.read') || hasPermission(auth.me, 'conduct.manage')),
    ),
  });

  const conductDeductionsQuery = useQuery({
    queryKey: ['student-conduct-deductions', studentId],
    queryFn: () => listStudentConductDeductionsApi(auth.accessToken!, studentId!, { page: 1, pageSize: 50 }),
    enabled: Boolean(
      studentId &&
        auth.accessToken &&
        (hasPermission(auth.me, 'conduct.read') || hasPermission(auth.me, 'conduct.manage')),
    ),
  });

  const modalTermsRaw = conductModalTermsQuery.data;
  const modalTerms = Array.isArray(modalTermsRaw) ? modalTermsRaw : [];

  useEffect(() => {
    if (!conductModalOpen || !Array.isArray(modalTermsRaw) || modalTermsRaw.length === 0) {
      return;
    }
    setDeductTermId((prev) =>
      prev && modalTermsRaw.some((t) => t.id === prev) ? prev : modalTermsRaw[0]!.id,
    );
  }, [conductModalOpen, modalTermsRaw]);

  if (!studentId) {
    return <EmptyState title="Student not found" message="A student identifier is required." />;
  }

  if (studentQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-36 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-48 animate-pulse rounded-xl bg-brand-100" />
      </div>
    );
  }

  if (studentQuery.isError || !studentQuery.data) {
    return (
      <StateView
        title="Could not load this student"
        message="Retry the request or verify that the student still exists in this school."
        action={
          <button
            type="button"
            onClick={() => void studentQuery.refetch()}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const student = studentQuery.data;
  const canSeeConduct =
    hasPermission(auth.me, 'conduct.read') || hasPermission(auth.me, 'conduct.manage');
  const canRecordConductDeduction =
    hasPermission(auth.me, 'conduct.manage') &&
    Boolean(enrollment?.academicYear.id && enrollment?.classRoom.id);

  const closeConductModal = () => {
    setConductModalOpen(false);
    setDeductTermId('');
  };

  const singleStudentOption =
    student && enrollment
      ? [
          {
            id: student.id,
            studentCode: student.studentCode,
            firstName: student.firstName,
            lastName: student.lastName,
          },
        ]
      : [];

  return (
    <div className="grid gap-4">
      <SectionCard
        title={`${student.firstName} ${student.lastName}`}
        subtitle={`${student.studentCode} • ${student.currentEnrollment?.classRoom.name ?? 'No active class'}`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canRecordConductDeduction ? (
              <button
                type="button"
                onClick={() => setConductModalOpen(true)}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Record conduct deduction
              </button>
            ) : null}
            <Link
              to="/admin/students"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Back to students
            </Link>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Conduct is tracked as <strong>term marks</strong>: a pool per term minus recorded deductions (with
          reasons). Use <Link to="/admin/class-marks" className="font-semibold text-brand-600 underline">Marks</Link>{' '}
          to record deductions for a class, or{' '}
          <Link to="/admin/conduct-marks" className="font-semibold text-brand-600 underline">
            Conduct marks
          </Link>{' '}
          to set the pool per term.
        </p>
      </SectionCard>

      {canSeeConduct ? (
        <SectionCard
          title="Conduct marks by term"
        >
          {!academicYearId ? (
            <EmptyState message="No current enrollment for this student; conduct marks need an academic year and class context." />
          ) : conductMarksSummaryQuery.isPending ? (
            <div className="h-24 animate-pulse rounded-xl bg-brand-50" />
          ) : conductMarksSummaryQuery.isError ? (
            <p className="text-sm text-red-700">{(conductMarksSummaryQuery.error as Error).message}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-brand-100">
              <table className="w-full min-w-[16rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-200 bg-brand-50">
                    <th className="px-3 py-2 font-semibold text-slate-800">Term</th>
                    <th className="px-3 py-2 font-semibold text-slate-800">Conduct</th>
                  </tr>
                </thead>
                <tbody>
                  {(conductMarksSummaryQuery.data?.terms ?? []).map((t) => (
                    <tr key={t.termId} className="border-b border-brand-50">
                      <td className="px-3 py-2 text-slate-800">{t.termName}</td>
                      <td className="px-3 py-2 font-semibold tabular-nums text-slate-900">{t.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {canSeeConduct ? (
        <SectionCard title="Deduction history">
          {conductDeductionsQuery.isPending ? (
            <div className="h-20 animate-pulse rounded-xl bg-brand-50" />
          ) : conductDeductionsQuery.isError ? (
            <p className="text-sm text-red-700">{(conductDeductionsQuery.error as Error).message}</p>
          ) : (conductDeductionsQuery.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-600">No conduct deductions recorded.</p>
          ) : (
            <ul className="grid gap-2">
              {conductDeductionsQuery.data!.items.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <span className="font-semibold text-brand-700">−{d.pointsDeducted}</span>
                  <span className="text-slate-500"> · {d.term.name}</span>
                  <span className="text-slate-500"> · {d.classRoom.code}</span>
                  <p className="mt-1 text-slate-700">{d.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(d.occurredAt)} · Recorded by {d.recordedBy.firstName}{' '}
                    {d.recordedBy.lastName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Conduct marks">
          <p className="text-sm text-slate-600">You do not have permission to view conduct deductions.</p>
        </SectionCard>
      )}

      {conductModalOpen && auth.accessToken && enrollment && canRecordConductDeduction ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-conduct-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-brand-100 bg-white p-5 shadow-xl">
            <h2 id="student-conduct-modal-title" className="text-lg font-bold text-slate-950">
              Record conduct deduction
            </h2>

            <label className="mt-4 grid gap-1 text-sm font-medium text-slate-800">
              Term
              <select
                value={deductTermId}
                onChange={(e) => setDeductTermId(e.target.value)}
                disabled={conductModalTermsQuery.isPending || modalTerms.length === 0}
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
              >
                {conductModalTermsQuery.isPending ? (
                  <option value="">Loading terms…</option>
                ) : modalTerms.length === 0 ? (
                  <option value="">No terms for this year</option>
                ) : (
                  modalTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            {conductModalTermsQuery.isError ? (
              <p className="mt-3 text-sm text-red-700">{(conductModalTermsQuery.error as Error).message}</p>
            ) : null}

            {!conductModalTermsQuery.isPending && modalTerms.length > 0 && deductTermId ? (
              <ConductDeductionForm
                key={deductTermId}
                accessToken={auth.accessToken}
                lockedContext={{
                  academicYearId: enrollment.academicYear.id,
                  termId: deductTermId,
                  classRoomId: enrollment.classRoom.id,
                }}
                students={singleStudentOption}
                defaultStudentId={student.id}
                showHeading={false}
                className="mt-4"
                showCancel
                onCancel={closeConductModal}
                onSuccess={closeConductModal}
              />
            ) : !conductModalTermsQuery.isPending && modalTerms.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">Add terms for this academic year before recording deductions.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
