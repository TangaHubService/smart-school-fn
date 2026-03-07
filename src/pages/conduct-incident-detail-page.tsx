import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  ConductActionType,
  ConductSeverity,
  addConductActionApi,
  getConductIncidentApi,
  resolveConductIncidentApi,
  updateConductIncidentApi,
} from '../features/conduct/conduct.api';

const severityOptions: ConductSeverity[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
const actionTypeOptions: ConductActionType[] = [
  'WARNING',
  'COUNSELING',
  'PARENT_MEETING',
  'COMMUNITY_SERVICE',
  'DETENTION',
  'SUSPENSION',
  'OTHER',
];

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function ConductIncidentDetailPage() {
  const { incidentId } = useParams();
  const auth = useAuth();
  const canManage = auth.me?.permissions.includes('conduct.manage') ?? false;
  const canResolveIncident = auth.me?.permissions.includes('conduct.resolve') ?? false;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const incidentQuery = useQuery({
    queryKey: ['conduct-incident', incidentId],
    queryFn: () => getConductIncidentApi(auth.accessToken!, incidentId!),
    enabled: Boolean(incidentId),
  });

  const [editForm, setEditForm] = useState({
    category: '',
    title: '',
    description: '',
    severity: 'MODERATE' as ConductSeverity,
    status: 'OPEN' as 'OPEN' | 'UNDER_REVIEW',
    location: '',
    reporterNotes: '',
  });

  const [actionForm, setActionForm] = useState({
    type: 'COUNSELING' as ConductActionType,
    title: '',
    description: '',
    actionDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
  });

  const [resolutionSummary, setResolutionSummary] = useState('');

  useEffect(() => {
    if (!incidentQuery.data) {
      return;
    }

    setEditForm({
      category: incidentQuery.data.category,
      title: incidentQuery.data.title,
      description: incidentQuery.data.description,
      severity: incidentQuery.data.severity,
      status:
        incidentQuery.data.status === 'RESOLVED'
          ? 'UNDER_REVIEW'
          : incidentQuery.data.status,
      location: incidentQuery.data.location ?? '',
      reporterNotes: incidentQuery.data.reporterNotes ?? '',
    });
    setResolutionSummary(incidentQuery.data.resolutionSummary ?? '');
  }, [incidentQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateConductIncidentApi(auth.accessToken!, incidentId!, {
        category: editForm.category.trim(),
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        severity: editForm.severity,
        status: editForm.status,
        location: editForm.location.trim() || null,
        reporterNotes: editForm.reporterNotes.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conduct-incident', incidentId] });
      await queryClient.invalidateQueries({ queryKey: ['conduct-incidents'] });
      showToast({
        type: 'success',
        title: 'Incident updated',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update incident',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const addActionMutation = useMutation({
    mutationFn: () =>
      addConductActionApi(auth.accessToken!, incidentId!, {
        type: actionForm.type,
        title: actionForm.title.trim(),
        description: actionForm.description.trim() || undefined,
        actionDate: actionForm.actionDate,
        dueDate: actionForm.dueDate || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conduct-incident', incidentId] });
      await queryClient.invalidateQueries({ queryKey: ['conduct-incidents'] });
      setActionForm({
        type: 'COUNSELING',
        title: '',
        description: '',
        actionDate: new Date().toISOString().slice(0, 10),
        dueDate: '',
      });
      showToast({
        type: 'success',
        title: 'Action added',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not add action',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () =>
      resolveConductIncidentApi(auth.accessToken!, incidentId!, {
        resolutionSummary: resolutionSummary.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conduct-incident', incidentId] });
      await queryClient.invalidateQueries({ queryKey: ['conduct-incidents'] });
      showToast({
        type: 'success',
        title: 'Incident resolved',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not resolve incident',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void updateMutation.mutate();
  }

  function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void addActionMutation.mutate();
  }

  function handleResolveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolveMutation.mutate();
  }

  if (!incidentId) {
    return (
      <EmptyState
        title="Incident not found"
        message="The requested conduct incident identifier is missing."
      />
    );
  }

  if (incidentQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-40 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-56 animate-pulse rounded-xl bg-brand-100" />
      </div>
    );
  }

  if (incidentQuery.isError || !incidentQuery.data) {
    return (
      <StateView
        title="Could not load incident"
        message="The incident may have been removed or you may no longer have access."
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
  const canResolve = incident.status !== 'RESOLVED' && canResolveIncident;

  return (
    <div className="grid gap-4">
      <SectionCard
        title={incident.title}
        subtitle={`${incident.student.firstName} ${incident.student.lastName} • ${incident.student.studentCode}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/admin/conduct/students/${incident.student.id}`}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Student profile
            </Link>
            <Link
              to="/admin/conduct"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Back to incidents
            </Link>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-slate-700">
            <div className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Incident overview
              </p>
              <p>{incident.description}</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-900">Occurred:</span>{' '}
                {formatDateTime(incident.occurredAt)}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Category:</span>{' '}
                {incident.category}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Severity:</span>{' '}
                {incident.severity}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Status:</span>{' '}
                {incident.status.replace('_', ' ')}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Location:</span>{' '}
                {incident.location ?? 'Not captured'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Reported by:</span>{' '}
                {incident.reportedBy
                  ? `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}`
                  : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Reporter notes</p>
              <p className="mt-1">{incident.reporterNotes || 'No internal notes added yet.'}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-white p-4 text-sm text-slate-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Student snapshot
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {incident.student.firstName} {incident.student.lastName}
              </p>
              <p>{incident.student.currentEnrollment?.classRoom.name ?? 'No active class'}</p>
              <p>{incident.student.currentEnrollment?.academicYear.name ?? 'No academic year'}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Resolution</p>
              <p className="mt-1">
                {incident.resolutionSummary || 'The incident is still open or under review.'}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Resolved at: {formatDateTime(incident.resolvedAt)}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Edit Incident" subtitle="Update details, severity, or review status.">
          {canManage ? (
            <form className="grid gap-3" onSubmit={handleUpdateSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Category
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, category: event.target.value }))
                    }
                    className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Severity
                  <select
                    value={editForm.severity}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        severity: event.target.value as ConductSeverity,
                      }))
                    }
                    className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                  >
                    {severityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                  Title
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, title: event.target.value }))
                    }
                    className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Review status
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        status: event.target.value as 'OPEN' | 'UNDER_REVIEW',
                      }))
                    }
                    className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Location
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, location: event.target.value }))
                    }
                    className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Description
                <textarea
                  rows={5}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Reporter notes
                <textarea
                  rows={4}
                  value={editForm.reporterNotes}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, reporterNotes: event.target.value }))
                  }
                  className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <EmptyState message="You can review this incident, but your role cannot edit conduct details." />
          )}
        </SectionCard>

        <SectionCard title="Actions & Resolution" subtitle="Track interventions and close the incident when appropriate.">
          {canManage ? (
            <form className="grid gap-3 border-b border-brand-100 pb-4" onSubmit={handleActionSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Action type
                <select
                  value={actionForm.type}
                  onChange={(event) =>
                    setActionForm((current) => ({
                      ...current,
                      type: event.target.value as ConductActionType,
                    }))
                  }
                  className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                >
                  {actionTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Action date
                <input
                  type="date"
                  value={actionForm.actionDate}
                  onChange={(event) =>
                    setActionForm((current) => ({
                      ...current,
                      actionDate: event.target.value,
                    }))
                  }
                  className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Action title
              <input
                type="text"
                value={actionForm.title}
                onChange={(event) =>
                  setActionForm((current) => ({ ...current, title: event.target.value }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Description
              <textarea
                rows={3}
                value={actionForm.description}
                onChange={(event) =>
                  setActionForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Due date
              <input
                type="date"
                value={actionForm.dueDate}
                onChange={(event) =>
                  setActionForm((current) => ({ ...current, dueDate: event.target.value }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addActionMutation.isPending}
                className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addActionMutation.isPending ? 'Adding...' : 'Add action'}
              </button>
            </div>
            </form>
          ) : (
            <EmptyState message="Your role does not allow adding school-side conduct actions." />
          )}

          <div className="mt-4 grid gap-3">
            {incident.actions.length ? (
              incident.actions.map((action) => (
                <article key={action.id} className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{action.title}</p>
                    <p className="text-xs text-slate-500">{action.type.replace('_', ' ')}</p>
                  </div>
                  <p className="mt-1">{action.description || 'No extra notes.'}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Action date: {formatDate(action.actionDate)} • Due: {formatDate(action.dueDate)}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState message="No follow-up actions have been attached to this incident yet." />
            )}
          </div>

          {canResolveIncident ? (
            <form className="mt-4 grid gap-3 border-t border-brand-100 pt-4" onSubmit={handleResolveSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Resolution summary
                <textarea
                  rows={4}
                  value={resolutionSummary}
                  onChange={(event) => setResolutionSummary(event.target.value)}
                  placeholder="Summarize the final decision, follow-up commitments, and close-out notes."
                  className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={resolveMutation.isPending || !canResolve}
                  className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {incident.status === 'RESOLVED'
                    ? 'Already resolved'
                    : resolveMutation.isPending
                      ? 'Resolving...'
                      : 'Resolve incident'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 border-t border-brand-100 pt-4">
              <EmptyState message="Only roles with conduct.resolve can close this incident." />
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Government Feedback" subtitle="Auditor comments appear here for the school team.">
        {incident.feedback.length ? (
          <div className="grid gap-3">
            {incident.feedback.map((entry) => (
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
            ))}
          </div>
        ) : (
          <EmptyState message="No auditor feedback has been added for this incident." />
        )}
      </SectionCard>
    </div>
  );
}
