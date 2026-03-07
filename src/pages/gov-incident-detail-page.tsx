import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  addGovIncidentFeedbackApi,
  getGovIncidentDetailApi,
} from '../features/gov/gov.api';

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function GovIncidentDetailPage() {
  const { incidentId } = useParams();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [feedback, setFeedback] = useState('');

  const incidentQuery = useQuery({
    queryKey: ['gov-incident', incidentId],
    queryFn: () => getGovIncidentDetailApi(auth.accessToken!, incidentId!),
    enabled: Boolean(incidentId),
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      addGovIncidentFeedbackApi(auth.accessToken!, incidentId!, {
        body: feedback.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-incident', incidentId] });
      await queryClient.invalidateQueries({ queryKey: ['gov-incidents'] });
      setFeedback('');
      showToast({
        type: 'success',
        title: 'Feedback added',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not add feedback',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void feedbackMutation.mutate();
  }

  if (!incidentId) {
    return <EmptyState title="Incident not found" message="An incident identifier is required." />;
  }

  if (incidentQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-32 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-40 animate-pulse rounded-xl bg-brand-100" />
      </div>
    );
  }

  if (incidentQuery.isError || !incidentQuery.data) {
    return (
      <StateView
        title="Could not load incident"
        message="The incident may be outside the current scope or no longer available."
        action={
          <button
            type="button"
            onClick={() => void incidentQuery.refetch()}
            className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        }
      />
    );
  }

  const incident = incidentQuery.data;

  return (
    <div className="grid gap-4">
      <SectionCard
        title={incident.title}
        subtitle={`${incident.school?.displayName ?? 'Unknown school'} • ${incident.student.firstName} ${incident.student.lastName}`}
        action={
          <div className="flex flex-wrap gap-2">
            {incident.school ? (
              <Link
                to={`/gov/schools/${incident.school.tenantId}`}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                View school
              </Link>
            ) : null}
            <Link
              to="/gov/incidents"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Back to queue
            </Link>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Incident overview
            </p>
            <p>{incident.description}</p>
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-900">Status:</span>{' '}
                {incident.status.replace('_', ' ')}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Severity:</span>{' '}
                {incident.severity}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Category:</span>{' '}
                {incident.category}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Occurred:</span>{' '}
                {formatDateTime(incident.occurredAt)}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Location:</span>{' '}
                {incident.location ?? 'Not captured'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Resolution:</span>{' '}
                {incident.resolutionSummary ?? 'Still open'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Student & school snapshot
            </p>
            <p className="font-semibold text-slate-900">
              {incident.student.firstName} {incident.student.lastName}
            </p>
            <p>{incident.student.studentCode}</p>
            <p>{incident.student.currentEnrollment?.classRoom.name ?? 'No active class'}</p>
            <p>{incident.school?.displayName ?? 'No school profile available'}</p>
            <p>
              {incident.school?.sector ?? 'N/A'} / {incident.school?.district ?? 'N/A'} /{' '}
              {incident.school?.province ?? 'N/A'}
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Follow-up Actions" subtitle="Actions remain read-only in the government oversight workflow.">
          {incident.actions.length ? (
            <div className="grid gap-3">
              {incident.actions.map((action) => (
                <article key={action.id} className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{action.title}</p>
                    <p className="text-xs text-slate-500">{action.type.replace('_', ' ')}</p>
                  </div>
                  <p className="mt-1">{action.description || 'No notes added.'}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(action.actionDate)} • Due {formatDateTime(action.dueDate)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState message="No school follow-up actions have been attached to this incident yet." />
          )}
        </SectionCard>

        <SectionCard title="Feedback Panel" subtitle="Auditors can leave contextual feedback for the school team.">
          <form className="grid gap-3 border-b border-brand-100 pb-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Feedback for the school
              <textarea
                rows={4}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Record observations, compliance concerns, or follow-up requests."
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={feedbackMutation.isPending || !feedback.trim()}
                className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {feedbackMutation.isPending ? 'Posting...' : 'Post feedback'}
              </button>
            </div>
          </form>

          <div className="mt-4 grid gap-3">
            {incident.feedback.length ? (
              incident.feedback.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">
                      {entry.author.firstName} {entry.author.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.authorType.replace('_', ' ')} • {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{entry.body}</p>
                </article>
              ))
            ) : (
              <EmptyState message="No feedback has been posted on this incident yet." />
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
