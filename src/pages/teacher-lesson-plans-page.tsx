import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, History, Loader2, MessageSquarePlus, Pencil, Plus, Send, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { AppDrawer } from '../components/drawer';
import { DrawerForm } from '../components/drawer-form';
import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { useAcademicYear } from '../contexts/academic-year-context';
import {
  listLessonPlansApi,
  createLessonPlanApi,
  updateLessonPlanApi,
  deleteLessonPlanApi,
  submitLessonPlanApi,
  reviewLessonPlanApi,
  addLessonPlanFeedbackApi,
  listLessonPlanRevisionsApi,
  type LessonPlan,
} from '../features/sprint4/lesson-plans.api';
import { listClassRoomsApi, listSubjectsApi } from '../features/sprint1/sprint1.api';
import { ApiClientError } from '../types/api';

const planFormSchema = z.object({
  title: z.string().trim().min(2).max(200),
  classRoomId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  objectives: z.string().trim().max(5000).optional(),
  materials: z.string().trim().max(5000).optional(),
  activities: z.string().trim().max(10000).optional(),
  assessment: z.string().trim().max(5000).optional(),
  weekNumber: z.coerce.number().int().min(1).max(52).optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600).optional(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

const defaultForm: PlanFormValues = {
  title: '',
  classRoomId: '',
  subjectId: '',
  objectives: '',
  materials: '',
  activities: '',
  assessment: '',
  weekNumber: undefined as any,
  durationMinutes: undefined as any,
};

const EDITABLE_STATUSES: LessonPlan['status'][] = ['DRAFT', 'REJECTED'];

const STATUS_STYLES: Record<LessonPlan['status'], string> = {
  DRAFT: 'bg-accent-50 text-accent-600',
  SUBMITTED: 'bg-sky-50 text-sky-700',
  APPROVED: 'bg-success-50 text-success-700',
  REJECTED: 'bg-red-50 text-red-700',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium' }).format(new Date(d));
}

function formatDateTime(d: string) {
  return new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
}

export function TeacherLessonPlansPage() {
  const auth = useAuth();
  const { academicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<LessonPlan | null>(null);
  const [recommending, setRecommending] = useState<LessonPlan | null>(null);
  const [rejecting, setRejecting] = useState<LessonPlan | null>(null);
  const [historyPlan, setHistoryPlan] = useState<LessonPlan | null>(null);
  const [recommendationText, setRecommendationText] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');

  const isSchoolAdmin = auth.me?.roles.includes('SCHOOL_ADMIN');
  const isSuperAdmin = auth.me?.roles.includes('SUPER_ADMIN');
  const isReviewer = Boolean(isSchoolAdmin || isSuperAdmin);
  const canWrite = !isReviewer;

  const plansQuery = useQuery({
    queryKey: ['lesson-plans', page, academicYearId],
    queryFn: () => listLessonPlansApi(auth.accessToken!, { page, academicYearId: academicYearId ?? undefined }),
    enabled: Boolean(auth.accessToken),
  });

  const classesQuery = useQuery({
    queryKey: ['lesson-plans-classes'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
    enabled: createOpen || Boolean(editing),
  });

  const subjectsQuery = useQuery({
    queryKey: ['lesson-plans-subjects'],
    queryFn: () => listSubjectsApi(auth.accessToken!),
    enabled: createOpen || Boolean(editing),
  });

  const revisionsQuery = useQuery({
    queryKey: ['lesson-plan-revisions', historyPlan?.id],
    queryFn: () => listLessonPlanRevisionsApi(auth.accessToken!, historyPlan!.id),
    enabled: Boolean(historyPlan),
  });

  const createForm = useForm<PlanFormValues>({ resolver: zodResolver(planFormSchema), defaultValues: defaultForm });
  const editForm = useForm<PlanFormValues>({ resolver: zodResolver(planFormSchema), defaultValues: defaultForm });

  function invalidatePlans() {
    void queryClient.invalidateQueries({ queryKey: ['lesson-plan-revisions'] });
    return queryClient.invalidateQueries({ queryKey: ['lesson-plans'] });
  }

  const createMutation = useMutation({
    mutationFn: (v: PlanFormValues) => createLessonPlanApi(auth.accessToken!, {
      title: v.title, academicYearId: academicYearId!, classRoomId: v.classRoomId, subjectId: v.subjectId,
      objectives: v.objectives || undefined, materials: v.materials || undefined,
      activities: v.activities || undefined, assessment: v.assessment || undefined,
      weekNumber: v.weekNumber || undefined, durationMinutes: v.durationMinutes || undefined,
    }),
    onSuccess: () => { invalidatePlans(); showToast({ type: 'success', title: 'Lesson plan created' }); setCreateOpen(false); createForm.reset(defaultForm); },
    onError: (e) => showToast({ type: 'error', title: 'Could not create', message: (e as ApiClientError).message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: string; v: PlanFormValues }) => updateLessonPlanApi(auth.accessToken!, id, {
      title: v.title, objectives: v.objectives || null, materials: v.materials || null,
      activities: v.activities || null, assessment: v.assessment || null,
      weekNumber: v.weekNumber || null, durationMinutes: v.durationMinutes || null,
    }),
    onSuccess: () => { invalidatePlans(); showToast({ type: 'success', title: 'Lesson plan updated' }); setEditing(null); },
    onError: (e) => showToast({ type: 'error', title: 'Could not update', message: (e as ApiClientError).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLessonPlanApi(auth.accessToken!, id),
    onSuccess: () => { invalidatePlans(); showToast({ type: 'success', title: 'Lesson plan deleted' }); },
    onError: (e) => showToast({ type: 'error', title: 'Could not delete', message: (e as ApiClientError).message }),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitLessonPlanApi(auth.accessToken!, id),
    onSuccess: () => { invalidatePlans(); showToast({ type: 'success', title: 'Submitted for review' }); },
    onError: (e) => showToast({ type: 'error', title: 'Could not submit', message: (e as ApiClientError).message }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      reviewLessonPlanApi(auth.accessToken!, id, { decision, note }),
    onSuccess: (_, variables) => {
      invalidatePlans();
      showToast({
        type: 'success',
        title: variables.decision === 'APPROVED' ? 'Lesson plan approved' : 'Lesson plan rejected',
      });
      setRejecting(null);
      setRejectionNote('');
    },
    onError: (e) => showToast({ type: 'error', title: 'Could not submit review', message: (e as ApiClientError).message }),
  });

  const recommendMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) =>
      addLessonPlanFeedbackApi(auth.accessToken!, id, { feedback }),
    onSuccess: () => {
      invalidatePlans();
      showToast({ type: 'success', title: 'Recommendation added' });
      setRecommending(null);
      setRecommendationText('');
    },
    onError: (e) => showToast({ type: 'error', title: 'Could not add recommendation', message: (e as ApiClientError).message }),
  });

  function openEdit(plan: LessonPlan) {
    setEditing(plan);
    editForm.reset({ title: plan.title, classRoomId: plan.classRoom.id, subjectId: plan.subject.id, objectives: plan.objectives ?? '', materials: plan.materials ?? '', activities: plan.activities ?? '', assessment: plan.assessment ?? '', weekNumber: plan.weekNumber ?? undefined as any, durationMinutes: plan.durationMinutes ?? undefined as any });
  }

  function openRecommend(plan: LessonPlan) {
    setRecommending(plan);
    setRecommendationText(plan.feedback ?? '');
  }

  function openReject(plan: LessonPlan) {
    setRejecting(plan);
    setRejectionNote('');
  }

  const error = plansQuery.error as ApiClientError | null;
  const classes = (classesQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;
  const subjects = (subjectsQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;

  return (
    <SectionCard
      title="Teacher Lesson Plans"
      subtitle={canWrite ? 'Create, submit, and manage your lesson plans' : 'Review lesson plans, leave recommendations, and approve or reject submissions'}
      action={canWrite ? (
        <button type="button" onClick={() => { createForm.reset(defaultForm); setCreateOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> New Plan
        </button>
      ) : null}
    >
      {plansQuery.isPending ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      ) : error ? (
        <StateView title="Could not load lesson plans" message={error.message} />
      ) : !plansQuery.data?.items.length ? (
        <EmptyState title="No lesson plans yet" message={canWrite ? 'Create your first lesson plan to get started.' : 'No lesson plans available for review.'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                {isReviewer && <th className="px-3 py-2 font-semibold">Teacher</th>}
                <th className="px-3 py-2 font-semibold">Class</th>
                <th className="px-3 py-2 font-semibold">Subject</th>
                <th className="px-3 py-2 font-semibold">Week</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plansQuery.data.items.map((plan) => {
                const isEditable = EDITABLE_STATUSES.includes(plan.status);
                return (
                  <tr key={plan.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{plan.title}</td>
                    {isReviewer && (
                      <td className="px-3 py-2 text-slate-600">
                        {plan.teacher.firstName} {plan.teacher.lastName}
                      </td>
                    )}
                    <td className="px-3 py-2 text-slate-600">{plan.classRoom.code}</td>
                    <td className="px-3 py-2 text-slate-600">{plan.subject.name}</td>
                    <td className="px-3 py-2 text-slate-600">{plan.weekNumber ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[plan.status]}`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{formatDate(plan.updatedAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {canWrite && isEditable && (
                          <button type="button" onClick={() => openEdit(plan)} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-slate-700">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                        {canWrite && isEditable && (
                          <button
                            type="button"
                            onClick={() => submitMutation.mutate(plan.id)}
                            disabled={submitMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700"
                          >
                            <Send className="h-3.5 w-3.5" /> Submit
                          </button>
                        )}
                        {canWrite && plan.status === 'DRAFT' && (
                          <button type="button" onClick={() => { if (window.confirm('Delete this lesson plan?')) deleteMutation.mutate(plan.id); }} disabled={deleteMutation.isPending} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                        {isReviewer && plan.status === 'SUBMITTED' && (
                          <button
                            type="button"
                            onClick={() => reviewMutation.mutate({ id: plan.id, decision: 'APPROVED' })}
                            disabled={reviewMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-success-200 bg-success-50 px-2 py-1 text-xs font-semibold text-success-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {isReviewer && plan.status === 'SUBMITTED' && (
                          <button
                            type="button"
                            onClick={() => openReject(plan)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        )}
                        {isReviewer && (
                          <button
                            type="button"
                            onClick={() => openRecommend(plan)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                          >
                            <MessageSquarePlus className="h-3.5 w-3.5" /> Recommend
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setHistoryPlan(plan)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
                        >
                          <History className="h-3.5 w-3.5" /> History
                        </button>
                        {plan.feedback && (
                          <span className="text-xs text-amber-600" title={plan.feedback}>Feedback ✓</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DrawerForm open={createOpen} onCancel={() => setCreateOpen(false)} title="New Lesson Plan"
        onSubmit={createForm.handleSubmit(v => createMutation.mutate(v))}
        isLoading={createMutation.isPending} submitLabel="Create" formId="create-lesson-plan-form">
        <PlanFormFields form={createForm} classes={classes} subjects={subjects} />
      </DrawerForm>

      <DrawerForm open={Boolean(editing)} onCancel={() => setEditing(null)} title="Edit Lesson Plan"
        onSubmit={editForm.handleSubmit(v => { if (editing) updateMutation.mutate({ id: editing.id, v }); })}
        isLoading={updateMutation.isPending} submitLabel="Save" formId="edit-lesson-plan-form">
        {editing && <p className="text-sm text-slate-600">{editing.title}</p>}
        <PlanFormFields form={editForm} classes={classes} subjects={subjects} />
      </DrawerForm>

      <AppDrawer
        open={Boolean(recommending)}
        onClose={() => setRecommending(null)}
        title="Add recommendation"
        description={recommending ? `Leave a recommendation for "${recommending.title}"` : undefined}
      >
        <div className="space-y-4">
          <textarea
            rows={5}
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            value={recommendationText}
            onChange={(e) => setRecommendationText(e.target.value)}
            placeholder="Share guidance for the teacher..."
          />
          <button
            type="button"
            disabled={!recommendationText.trim() || recommendMutation.isPending}
            onClick={() => recommending && recommendMutation.mutate({ id: recommending.id, feedback: recommendationText.trim() })}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {recommendMutation.isPending ? 'Saving…' : 'Save recommendation'}
          </button>
        </div>
      </AppDrawer>

      <AppDrawer
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject lesson plan"
        description={rejecting ? `Explain why "${rejecting.title}" needs changes` : undefined}
      >
        <div className="space-y-4">
          <textarea
            rows={5}
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            placeholder="What needs to change before this can be approved?"
          />
          <button
            type="button"
            disabled={reviewMutation.isPending}
            onClick={() => rejecting && reviewMutation.mutate({ id: rejecting.id, decision: 'REJECTED', note: rejectionNote.trim() || undefined })}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {reviewMutation.isPending ? 'Saving…' : 'Reject with feedback'}
          </button>
        </div>
      </AppDrawer>

      <AppDrawer
        open={Boolean(historyPlan)}
        onClose={() => setHistoryPlan(null)}
        title="Revision history"
        description={historyPlan ? historyPlan.title : undefined}
      >
        {revisionsQuery.isPending ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
        ) : !revisionsQuery.data?.length ? (
          <p className="py-8 text-center text-sm text-slate-500">No history yet.</p>
        ) : (
          <ol className="space-y-3">
            {revisionsQuery.data.map((rev) => (
              <li key={rev.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-700">{rev.action}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(rev.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {rev.actor.firstName} {rev.actor.lastName}
                </p>
                {rev.note ? <p className="mt-2 text-sm text-slate-600">{rev.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </AppDrawer>
    </SectionCard>
  );
}

function PlanFormFields({ form, classes, subjects }: { form: UseFormReturn<PlanFormValues>; classes: Array<{ id: string; code: string; name: string }>; subjects: Array<{ id: string; code: string; name: string }> }) {
  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">Title<input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('title')} /></label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">Class<select className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('classRoomId')}><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">Subject<select className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('subjectId')}><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">Objectives<textarea rows={3} className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('objectives')} /></label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">Materials<textarea rows={3} className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('materials')} /></label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">Activities<textarea rows={4} className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('activities')} /></label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">Assessment<textarea rows={3} className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('assessment')} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-800">Week #<input type="number" min="1" max="52" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('weekNumber')} /></label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">Duration (min)<input type="number" min="1" max="600" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('durationMinutes')} /></label>
      </div>
    </>
  );
}
