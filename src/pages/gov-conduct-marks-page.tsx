import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { ConductSeverity } from '../features/conduct/conduct.api';
import {
  addGovConductMarkFeedbackApi,
  listGovConductMarksApi,
} from '../features/gov/gov.api';

const severityOptions: Array<{ label: string; value: ConductSeverity | '' }> = [
  { label: 'All severities', value: '' },
  { label: 'Low', value: 'LOW' },
  { label: 'Moderate', value: 'MODERATE' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

export function GovConductMarksPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [termId, setTermId] = useState('');
  const [severity, setSeverity] = useState<ConductSeverity | ''>('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const pageSize = 20;
  const schoolId = searchParams.get('schoolId') ?? '';

  const marksQuery = useQuery({
    queryKey: ['gov-conduct-marks', { schoolId, termId, severity, search, page, pageSize }],
    queryFn: () =>
      listGovConductMarksApi(auth.accessToken!, {
        schoolId: schoolId || undefined,
        termId: termId || undefined,
        severity: severity || undefined,
        q: search.trim() || undefined,
        page,
        pageSize,
      }),
  });

  const feedbackMutation = useMutation({
    mutationFn: (payload: { markId: string; body: string }) =>
      addGovConductMarkFeedbackApi(auth.accessToken!, payload.markId, {
        body: payload.body,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-conduct-marks'] });
      setMessage('Feedback submitted.');
    },
  });

  function handleAddFeedback(markId: string) {
    const body = window.prompt('Feedback');
    if (!body?.trim()) {
      return;
    }
    feedbackMutation.mutate({ markId, body: body.trim() });
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
      title="Government Conduct Marks"
      subtitle="Read scoped conduct marks across schools and leave audit feedback."
      action={
        schoolId ? (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('schoolId');
              setSearchParams(next);
            }}
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Clear school filter
          </button>
        ) : null
      }
    >
      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_1fr_1fr_1.4fr]">
        <input
          type="text"
          value={termId}
          onChange={(event) => {
            setTermId(event.target.value);
            setPage(1);
          }}
          placeholder="Term ID (optional)"
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
        <select
          value={severity}
          onChange={(event) => {
            setSeverity(event.target.value as ConductSeverity | '');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        >
          {severityOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={schoolId}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            if (event.target.value.trim()) {
              next.set('schoolId', event.target.value.trim());
            } else {
              next.delete('schoolId');
            }
            setSearchParams(next);
            setPage(1);
          }}
          placeholder="School tenant ID"
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search school or student"
          className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
        />
      </div>

      {message ? (
        <div className="mb-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      {marksQuery.isPending ? (
        <div className="grid gap-3">
          <div className="h-16 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-16 animate-pulse rounded-xl bg-brand-100" />
          <div className="h-16 animate-pulse rounded-xl bg-brand-100" />
        </div>
      ) : null}

      {marksQuery.isError ? (
        <StateView
          title="Could not load conduct marks in scope"
          message="Retry the request. School scope enforcement remains active on the server."
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

      {!marksQuery.isPending && !marksQuery.isError && !rows.length ? (
        <EmptyState message="No conduct marks found in the current scope and filters." />
      ) : null}

      {!marksQuery.isPending && !marksQuery.isError && rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="min-w-full divide-y divide-brand-100 text-sm">
            <thead className="bg-brand-50/70 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">School</th>
                <th className="px-3 py-2 font-semibold">Student</th>
                <th className="px-3 py-2 font-semibold">Term</th>
                <th className="px-3 py-2 font-semibold">Mark</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Feedback</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 bg-white">
              {rows.map((mark) => (
                <tr key={mark.id}>
                  <td className="px-3 py-2 text-slate-700">
                    {mark.school?.displayName ?? 'Unknown school'}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900">
                      {mark.student.firstName} {mark.student.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{mark.student.studentCode}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{mark.term.name}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {mark.score}/{mark.maxScore}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        mark.isLocked ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {mark.isLocked ? 'LOCKED' : 'OPEN'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{mark.feedback.length}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleAddFeedback(mark.id)}
                      disabled={feedbackMutation.isPending}
                      className="rounded-lg border border-brand-300 bg-brand-500 px-2 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add feedback
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-brand-100 pt-4 text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages} • {pagination.totalItems} marks
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
