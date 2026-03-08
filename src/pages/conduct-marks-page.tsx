import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  listConductMarksApi,
  lockConductMarkApi,
  recalculateConductMarkApi,
  updateConductMarkApi,
} from '../features/conduct/conduct.api';
import { listClassRoomsApi, listTermsApi } from '../features/sprint1/sprint1.api';

interface OptionItem {
  id: string;
  name: string;
}

function formatScore(score: number, maxScore: number) {
  return `${score}/${maxScore}`;
}

export function ConductMarksPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const pageSize = 20;

  const permissions = auth.me?.permissions ?? [];
  const canManageMarks =
    permissions.includes('conduct.marks.manage') || permissions.includes('conduct.manage');
  const canLockMarks =
    permissions.includes('conduct.marks.lock') || permissions.includes('results.lock');

  const termsQuery = useQuery({
    queryKey: ['conduct-terms'],
    queryFn: () => listTermsApi(auth.accessToken!),
  });

  const classesQuery = useQuery({
    queryKey: ['conduct-classes'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const terms = useMemo(
    () => (((termsQuery.data as OptionItem[] | undefined) ?? []).slice()),
    [termsQuery.data],
  );

  const classRooms = useMemo(
    () => (((classesQuery.data as OptionItem[] | undefined) ?? []).slice()),
    [classesQuery.data],
  );

  useEffect(() => {
    if (!termId && terms.length) {
      setTermId(terms[0]!.id);
    }
  }, [termId, terms]);

  const marksQuery = useQuery({
    queryKey: ['conduct-marks', { termId, classId, search, page, pageSize }],
    queryFn: () =>
      listConductMarksApi(auth.accessToken!, {
        termId,
        classId: classId || undefined,
        q: search.trim() || undefined,
        page,
        pageSize,
      }),
    enabled: Boolean(termId),
  });

  const saveMarkMutation = useMutation({
    mutationFn: (payload: { studentId: string; score: number; maxScore: number }) =>
      updateConductMarkApi(auth.accessToken!, payload.studentId, termId, {
        score: payload.score,
        maxScore: payload.maxScore,
        manualOverride: true,
        reason: 'Manual update from conduct sheet',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conduct-marks'] });
      setMessage('Conduct mark saved.');
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: (studentId: string) =>
      recalculateConductMarkApi(auth.accessToken!, studentId, termId, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conduct-marks'] });
      setMessage('Conduct mark recalculated.');
    },
  });

  const lockMutation = useMutation({
    mutationFn: (studentId: string) =>
      lockConductMarkApi(auth.accessToken!, studentId, termId, {
        reason: 'Locked from term conduct sheet',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conduct-marks'] });
      setMessage('Conduct mark locked.');
    },
  });

  function handleSetScore(studentId: string, currentScore: number, maxScore: number) {
    const next = window.prompt(`Set score (0-${maxScore})`, String(currentScore));
    if (next === null) {
      return;
    }

    const score = Number(next);
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      setMessage(`Invalid score. Enter a number between 0 and ${maxScore}.`);
      return;
    }

    saveMarkMutation.mutate({ studentId, score, maxScore });
  }

  const rows = marksQuery.data?.items ?? [];
  const pagination = marksQuery.data?.pagination ?? {
    page,
    pageSize,
    totalItems: 0,
    totalPages: 1,
  };

  return (
    <SectionCard
      title="Term Conduct Sheet"
      subtitle="Manage per-term conduct marks as score/maxScore, with manual updates and deductions recalculation."
    >
      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_1fr_1.3fr]">
        <select
          value={termId}
          onChange={(event) => {
            setTermId(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
          aria-label="Filter by term"
        >
          <option value="">Select term</option>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>

        <select
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
          aria-label="Filter by class"
        >
          <option value="">All classes</option>
          {classRooms.map((classRoom) => (
            <option key={classRoom.id} value={classRoom.id}>
              {classRoom.name}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search student name or code"
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
      </div>

      {message ? (
        <div className="mb-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      {!termId ? (
        <EmptyState message="Select a term to view and manage conduct marks." />
      ) : null}

      {termId && marksQuery.isPending ? (
        <div className="grid gap-3">
          <div className="h-16 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-16 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-16 animate-pulse rounded-xl bg-brand-100" />
        </div>
      ) : null}

      {termId && marksQuery.isError ? (
        <StateView
          title="Could not load term conduct sheet"
          message="Retry the request and verify that this term belongs to the active academic year."
          action={
            <button
              type="button"
              onClick={() => void marksQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {termId && !marksQuery.isPending && !marksQuery.isError && !rows.length ? (
        <EmptyState message="No students found for this term and class filter." />
      ) : null}

      {termId && !marksQuery.isPending && !marksQuery.isError && rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="min-w-full divide-y divide-brand-100 text-sm">
            <thead className="bg-brand-50/70 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Student</th>
                <th className="px-3 py-2 font-semibold">Class</th>
                <th className="px-3 py-2 font-semibold">Deductions</th>
                <th className="px-3 py-2 font-semibold">Mark</th>
                <th className="px-3 py-2 font-semibold">Mode</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 bg-white">
              {rows.map((item) => (
                <tr key={item.student.id}>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900">
                      {item.student.firstName} {item.student.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{item.student.studentCode}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{item.classRoom.name}</td>
                  <td className="px-3 py-2 text-slate-700">{item.deductionPointsTotal}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {formatScore(item.mark.score, item.mark.maxScore)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {item.mark.computedFromIncidents ? 'DEDUCT' : 'MANUAL'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.mark.isLocked
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.mark.isLocked ? 'LOCKED' : 'OPEN'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleSetScore(
                            item.student.id,
                            item.mark.score,
                            item.mark.maxScore,
                          )
                        }
                        disabled={!canManageMarks || item.mark.isLocked || saveMarkMutation.isPending}
                        className="rounded-lg border border-brand-200 bg-white px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Set
                      </button>
                      <button
                        type="button"
                        onClick={() => recalculateMutation.mutate(item.student.id)}
                        disabled={!canManageMarks || item.mark.isLocked || recalculateMutation.isPending}
                        className="rounded-lg border border-brand-200 bg-white px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Recalculate
                      </button>
                      <button
                        type="button"
                        onClick={() => lockMutation.mutate(item.student.id)}
                        disabled={!canLockMarks || item.mark.isLocked || lockMutation.isPending}
                        className="rounded-lg border border-brand-300 bg-brand-500 px-2 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Lock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {termId && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-brand-100 pt-4 text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages} • {pagination.totalItems} students
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
