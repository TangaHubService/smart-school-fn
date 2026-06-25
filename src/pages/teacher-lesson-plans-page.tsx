import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

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

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium' }).format(new Date(d));
}

export function TeacherLessonPlansPage() {
  const auth = useAuth();
  const { academicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<LessonPlan | null>(null);

  const isSchoolAdmin = auth.me?.roles.includes('SCHOOL_ADMIN');
  const isSuperAdmin = auth.me?.roles.includes('SUPER_ADMIN');
  const canWrite = !isSchoolAdmin && !isSuperAdmin;

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

  const createForm = useForm<PlanFormValues>({ resolver: zodResolver(planFormSchema), defaultValues: defaultForm });
  const editForm = useForm<PlanFormValues>({ resolver: zodResolver(planFormSchema), defaultValues: defaultForm });

  const createMutation = useMutation({
    mutationFn: (v: PlanFormValues) => createLessonPlanApi(auth.accessToken!, {
      title: v.title, academicYearId: academicYearId!, classRoomId: v.classRoomId, subjectId: v.subjectId,
      objectives: v.objectives || undefined, materials: v.materials || undefined,
      activities: v.activities || undefined, assessment: v.assessment || undefined,
      weekNumber: v.weekNumber || undefined, durationMinutes: v.durationMinutes || undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }); showToast({ type: 'success', title: 'Lesson plan created' }); setCreateOpen(false); createForm.reset(defaultForm); },
    onError: (e) => showToast({ type: 'error', title: 'Could not create', message: (e as ApiClientError).message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: string; v: PlanFormValues }) => updateLessonPlanApi(auth.accessToken!, id, {
      title: v.title, objectives: v.objectives || null, materials: v.materials || null,
      activities: v.activities || null, assessment: v.assessment || null,
      weekNumber: v.weekNumber || null, durationMinutes: v.durationMinutes || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }); showToast({ type: 'success', title: 'Lesson plan updated' }); setEditing(null); },
    onError: (e) => showToast({ type: 'error', title: 'Could not update', message: (e as ApiClientError).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLessonPlanApi(auth.accessToken!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }); showToast({ type: 'success', title: 'Lesson plan deleted' }); },
    onError: (e) => showToast({ type: 'error', title: 'Could not delete', message: (e as ApiClientError).message }),
  });

  function openEdit(plan: LessonPlan) {
    setEditing(plan);
    editForm.reset({ title: plan.title, classRoomId: plan.classRoom.id, subjectId: plan.subject.id, objectives: plan.objectives ?? '', materials: plan.materials ?? '', activities: plan.activities ?? '', assessment: plan.assessment ?? '', weekNumber: plan.weekNumber ?? undefined as any, durationMinutes: plan.durationMinutes ?? undefined as any });
  }

  const error = plansQuery.error as ApiClientError | null;
  const classes = (classesQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;
  const subjects = (subjectsQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;

  return (
    <SectionCard
      title="Teacher Lesson Plans"
      subtitle={canWrite ? 'Create and manage your lesson plans' : 'View lesson plans and provide feedback'}
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
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Class</th>
                <th className="px-3 py-2 font-semibold">Subject</th>
                <th className="px-3 py-2 font-semibold">Week</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
                {(canWrite || isSchoolAdmin || isSuperAdmin) && <th className="px-3 py-2 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {plansQuery.data.items.map((plan) => (
                <tr key={plan.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{plan.title}</td>
                  <td className="px-3 py-2 text-slate-600">{plan.classRoom.code}</td>
                  <td className="px-3 py-2 text-slate-600">{plan.subject.name}</td>
                  <td className="px-3 py-2 text-slate-600">{plan.weekNumber ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      plan.status === 'PUBLISHED' ? 'bg-success-50 text-success-700' :
                      plan.status === 'DRAFT' ? 'bg-accent-50 text-accent-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>{plan.status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{formatDate(plan.updatedAt)}</td>
                  {(canWrite || isSchoolAdmin || isSuperAdmin) && (
                    <td className="px-3 py-2 text-right">
                      {canWrite && (
                        <>
                          <button type="button" onClick={() => openEdit(plan)} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-slate-700 mr-2">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button type="button" onClick={() => { if (window.confirm('Delete this lesson plan?')) deleteMutation.mutate(plan.id); }} disabled={deleteMutation.isPending} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </>
                      )}
                      {plan.feedback && (
                        <span className="ml-2 text-xs text-amber-600" title={plan.feedback}>Feedback ✓</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
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
