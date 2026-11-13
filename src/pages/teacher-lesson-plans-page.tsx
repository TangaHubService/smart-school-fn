import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Eye,
  History,
  MessageSquarePlus,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { AppDrawer } from '../components/drawer';
import { DrawerForm } from '../components/drawer-form';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { ListSkeleton } from '../components/skeleton-loader';
import { useToast } from '../components/toast';
import { Avatar } from '../components/ui/avatar';
import { Badge, type BadgeTone } from '../components/ui/badge';
import {
  DataTable,
  type DataTableColumn,
} from '../components/ui/data-table';
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
  listTeachingOptionsApi,
  type LessonPlan,
  type LessonPlanStatus,
  type TeachingOption,
} from '../features/sprint4/lesson-plans.api';
import {
  listClassRoomsApi,
  listStaffMembersApi,
  listSubjectsApi,
} from '../features/sprint1/sprint1.api';
import { hasPermission } from '../features/auth/auth-helpers';
import {
  draftLessonPlanWithAiApi,
  getAiTeacherStatusApi,
  type AiLanguage,
} from '../features/ai-assistant/ai-teacher.api';
import { ApiClientError } from '../types/api';

const planFormSchema = z.object({
  title: z.string().trim().min(2).max(200),
  // Taken from the class + subject the teacher picks (each comes from a course in a year),
  // so planning works even when no year is selected in the header.
  academicYearId: z.string().optional(),
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
  academicYearId: '',
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

const LESSON_PLAN_STATUS_TONES: Record<LessonPlan['status'], BadgeTone> = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'neutral',
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium' }).format(new Date(d));
}

function formatDateTime(d: string) {
  return new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(d)
  );
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
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [recommendationText, setRecommendationText] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');

  const isSchoolAdmin = auth.me?.roles.includes('SCHOOL_ADMIN');
  const isSuperAdmin = auth.me?.roles.includes('SUPER_ADMIN');
  const isAuditor = Boolean(auth.me?.roles.includes('GOV_AUDITOR'));
  const isTeacher = Boolean(auth.me?.roles.includes('TEACHER'));
  // Admins approve/reject; auditors only look; teachers write their own plans.
  const isReviewer = Boolean(isSchoolAdmin || isSuperAdmin);
  const seesAllPlans = isReviewer || isAuditor;
  const canWrite = isTeacher && !isReviewer;
  const canFilterByTeacher = isReviewer && hasPermission(auth.me, 'staff.invite');

  const [statusFilter, setStatusFilter] = useState<LessonPlanStatus | ''>('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');

  // Any filter or year change starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, classFilter, subjectFilter, teacherFilter, academicYearId]);

  const plansQuery = useQuery({
    queryKey: [
      'lesson-plans',
      page,
      academicYearId,
      statusFilter,
      classFilter,
      subjectFilter,
      teacherFilter,
    ],
    queryFn: () =>
      listLessonPlansApi(auth.accessToken!, {
        page,
        academicYearId: academicYearId ?? undefined,
        status: statusFilter || undefined,
        classRoomId: classFilter || undefined,
        subjectId: subjectFilter || undefined,
        teacherUserId: teacherFilter || undefined,
      }),
    enabled: Boolean(auth.accessToken),
  });

  const classesQuery = useQuery({
    queryKey: ['lesson-plans-classes'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken) && seesAllPlans,
  });

  const subjectsQuery = useQuery({
    queryKey: ['lesson-plans-subjects'],
    queryFn: () => listSubjectsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken) && seesAllPlans,
  });

  const teachersQuery = useQuery({
    queryKey: ['lesson-plans-teachers'],
    queryFn: () => listStaffMembersApi(auth.accessToken!, { roleName: 'TEACHER' }),
    enabled: Boolean(auth.accessToken) && canFilterByTeacher,
  });

  // Teachers may only plan for the class + subject pairs they teach.
  const teachingOptionsQuery = useQuery({
    queryKey: ['lesson-plans-teaching-options', academicYearId],
    queryFn: () => listTeachingOptionsApi(auth.accessToken!, academicYearId ?? undefined),
    enabled: Boolean(auth.accessToken) && canWrite,
  });

  const aiStatusQuery = useQuery({
    queryKey: ['ai-teacher-status'],
    queryFn: () => getAiTeacherStatusApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken) && canWrite,
    staleTime: 5 * 60_000,
  });

  const revisionsQuery = useQuery({
    queryKey: ['lesson-plan-revisions', historyPlan?.id],
    queryFn: () => listLessonPlanRevisionsApi(auth.accessToken!, historyPlan!.id),
    enabled: Boolean(historyPlan),
  });

  const createForm = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: defaultForm,
  });
  const editForm = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: defaultForm,
  });

  function invalidatePlans() {
    void queryClient.invalidateQueries({ queryKey: ['lesson-plan-revisions'] });
    return queryClient.invalidateQueries({ queryKey: ['lesson-plans'] });
  }

  const createMutation = useMutation({
    mutationFn: (v: PlanFormValues) =>
      createLessonPlanApi(auth.accessToken!, {
        title: v.title,
        academicYearId: v.academicYearId || academicYearId!,
        classRoomId: v.classRoomId,
        subjectId: v.subjectId,
        objectives: v.objectives || undefined,
        materials: v.materials || undefined,
        activities: v.activities || undefined,
        assessment: v.assessment || undefined,
        weekNumber: v.weekNumber || undefined,
        durationMinutes: v.durationMinutes || undefined,
      }),
    onSuccess: () => {
      invalidatePlans();
      showToast({ type: 'success', title: 'Lesson plan created' });
      setCreateOpen(false);
      createForm.reset(defaultForm);
    },
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not create',
        message: (e as ApiClientError).message,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: string; v: PlanFormValues }) =>
      updateLessonPlanApi(auth.accessToken!, id, {
        title: v.title,
        objectives: v.objectives || null,
        materials: v.materials || null,
        activities: v.activities || null,
        assessment: v.assessment || null,
        weekNumber: v.weekNumber || null,
        durationMinutes: v.durationMinutes || null,
      }),
    onSuccess: () => {
      invalidatePlans();
      showToast({ type: 'success', title: 'Lesson plan updated' });
      setEditing(null);
    },
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not update',
        message: (e as ApiClientError).message,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLessonPlanApi(auth.accessToken!, id),
    onSuccess: () => {
      invalidatePlans();
      showToast({ type: 'success', title: 'Lesson plan deleted' });
    },
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not delete',
        message: (e as ApiClientError).message,
      }),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitLessonPlanApi(auth.accessToken!, id),
    onSuccess: () => {
      invalidatePlans();
      showToast({ type: 'success', title: 'Submitted for review' });
    },
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not submit',
        message: (e as ApiClientError).message,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: 'APPROVED' | 'REJECTED';
      note?: string;
    }) => reviewLessonPlanApi(auth.accessToken!, id, { decision, note }),
    onSuccess: (_, variables) => {
      invalidatePlans();
      showToast({
        type: 'success',
        title: variables.decision === 'APPROVED' ? 'Lesson plan approved' : 'Lesson plan rejected',
      });
      setRejecting(null);
      setRejectionNote('');
    },
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not submit review',
        message: (e as ApiClientError).message,
      }),
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
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not add recommendation',
        message: (e as ApiClientError).message,
      }),
  });

  function openEdit(plan: LessonPlan) {
    setEditing(plan);
    editForm.reset({
      title: plan.title,
      academicYearId: plan.academicYear.id,
      classRoomId: plan.classRoom.id,
      subjectId: plan.subject.id,
      objectives: plan.objectives ?? '',
      materials: plan.materials ?? '',
      activities: plan.activities ?? '',
      assessment: plan.assessment ?? '',
      weekNumber: plan.weekNumber ?? (undefined as any),
      durationMinutes: plan.durationMinutes ?? (undefined as any),
    });
  }

  function openRecommend(plan: LessonPlan) {
    setRecommending(plan);
    setRecommendationText(plan.feedback ?? '');
  }

  function openReject(plan: LessonPlan) {
    setRejecting(plan);
    setRejectionNote('');
  }

  const planColumns: DataTableColumn<LessonPlan>[] = [
    {
      key: 'title',
      header: 'Title',
      mobile: 'primary',
      render: (plan) => (
        <button
          type="button"
          onClick={() => setViewingId(plan.id)}
          className="text-left font-medium text-slate-900 underline-offset-2 hover:text-brand-700 hover:underline"
        >
          {plan.title}
        </button>
      ),
    },
    ...(seesAllPlans
      ? [
          {
            key: 'teacher',
            header: 'Teacher',
            mobile: 'secondary' as const,
            render: (plan: LessonPlan) => (
              <span className="flex items-center gap-2">
                <Avatar name={`${plan.teacher.firstName} ${plan.teacher.lastName}`} size="sm" />
                <span className="text-slate-600">
                  {plan.teacher.firstName} {plan.teacher.lastName}
                </span>
              </span>
            ),
          } satisfies DataTableColumn<LessonPlan>,
        ]
      : []),
    {
      key: 'classRoom',
      header: 'Class',
      render: (plan) => <span className="text-slate-600">{plan.classRoom.code}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (plan) => <span className="text-slate-600">{plan.subject.name}</span>,
    },
    {
      key: 'weekNumber',
      header: 'Week',
      align: 'center',
      render: (plan) => <span className="tabular-nums text-slate-600">{plan.weekNumber ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      mobile: 'secondary',
      render: (plan) => <Badge tone={LESSON_PLAN_STATUS_TONES[plan.status]}>{plan.status}</Badge>,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (plan) => (
        <span className="text-xs text-slate-500">{formatDate(plan.updatedAt)}</span>
      ),
    },
  ];

  // Looked up from the latest list so the drawer reflects status changes (submit, approve...).
  const viewingPlan = viewingId
    ? (plansQuery.data?.items.find((p) => p.id === viewingId) ?? null)
    : null;
  const error = plansQuery.error as ApiClientError | null;
  const classes = (classesQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;
  const subjects = (subjectsQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;
  const teachers = teachersQuery.data ?? [];
  const teachingOptions = teachingOptionsQuery.data ?? [];
  const aiEnabled = Boolean(aiStatusQuery.data?.enabled);
  const hasFilters = Boolean(statusFilter || classFilter || subjectFilter || teacherFilter);
  const filterSelectClass =
    'w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400';

  return (
    <SectionCard
      title="Teacher Lesson Plans"
      subtitle={
        canWrite
          ? 'Create, submit, and manage your lesson plans'
          : isReviewer
            ? 'Review lesson plans, leave recommendations, and approve or reject submissions'
            : 'View lesson plans and their review history (read-only)'
      }
      action={
        canWrite ? (
          <button
            type="button"
            onClick={() => {
              createForm.reset(defaultForm);
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> New Plan
          </button>
        ) : null
      }
    >
      <div className="mb-4 grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select
            className={filterSelectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LessonPlanStatus | '')}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted (to review)</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Class
          <select
            className={filterSelectClass}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter by class"
          >
            <option value="">All classes</option>
            {(seesAllPlans
              ? classes
              : uniqueBy(teachingOptions.map((o) => o.classRoom), (c) => c.id)
            ).map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Subject
          <select
            className={filterSelectClass}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Filter by subject"
          >
            <option value="">All subjects</option>
            {(seesAllPlans
              ? subjects
              : uniqueBy(teachingOptions.map((o) => o.subject), (s) => s.id)
            ).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {canFilterByTeacher ? (
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Teacher
            <select
              className={filterSelectClass}
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              aria-label="Filter by teacher"
            >
              <option value="">All teachers</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </label>
        ) : hasFilters ? (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('');
                setClassFilter('');
                setSubjectFilter('');
                setTeacherFilter('');
              }}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <StateView title="Could not load lesson plans" message={error.message} />
      ) : (
        <DataTable<LessonPlan>
          ariaLabel="Lesson plans"
          columns={planColumns}
          data={plansQuery.data?.items ?? []}
          rowKey={(plan) => plan.id}
          showIndex
          loading={plansQuery.isPending}
          skeletonRows={6}
          emptyTitle={hasFilters ? 'No lesson plans match these filters' : 'No lesson plans yet'}
          emptyDescription={
            hasFilters
              ? 'Try another status, class or subject.'
              : canWrite
                ? teachingOptions.length || teachingOptionsQuery.isPending
                  ? 'Create your first lesson plan to get started.'
                  : 'You have no class and subject assigned this year. Ask your school admin to assign you a course first.'
                : 'No lesson plans available for review.'
          }
          pagination={
            plansQuery.data?.pagination
              ? {
                  page: plansQuery.data.pagination.page,
                  pageSize: plansQuery.data.pagination.pageSize,
                  totalItems: plansQuery.data.pagination.totalItems,
                  totalPages: plansQuery.data.pagination.totalPages,
                  onPageChange: setPage,
                  onPageSizeChange: () => undefined,
                }
              : undefined
          }
          minWidth={940}
          rowActions={(plan) => {
            const isEditable = EDITABLE_STATUSES.includes(plan.status);
            return (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setViewingId(plan.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" /> View
                </button>
                {canWrite && isEditable && (
                  <button
                    type="button"
                    onClick={() => openEdit(plan)}
                    className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-brand-50"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                )}
                {canWrite && isEditable && (
                  <button
                    type="button"
                    onClick={() => submitMutation.mutate(plan.id)}
                    disabled={submitMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" /> Submit
                  </button>
                )}
                {canWrite && plan.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this lesson plan?'))
                        deleteMutation.mutate(plan.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                  </button>
                )}
                {isReviewer && plan.status === 'SUBMITTED' && (
                  <button
                    type="button"
                    onClick={() =>
                      reviewMutation.mutate({ id: plan.id, decision: 'APPROVED' })
                    }
                    disabled={reviewMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-success-100 bg-success-50 px-2 py-1 text-xs font-semibold text-success-700 transition hover:bg-success-100 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Approve
                  </button>
                )}
                {isReviewer && plan.status === 'SUBMITTED' && (
                  <button
                    type="button"
                    onClick={() => openReject(plan)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                  </button>
                )}
                {isReviewer && (
                  <button
                    type="button"
                    onClick={() => openRecommend(plan)}
                    className="inline-flex items-center gap-1 rounded-lg border border-accent-100 bg-accent-50 px-2 py-1 text-xs font-semibold text-accent-600 transition hover:bg-accent-100"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" /> Recommend
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryPlan(plan)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <History className="h-3.5 w-3.5" aria-hidden="true" /> History
                </button>
                {plan.feedback && (
                  <button
                    type="button"
                    onClick={() => setHistoryPlan(plan)}
                    className="text-xs font-semibold text-accent-600 underline-offset-2 hover:underline"
                    title={`Latest feedback: ${plan.feedback}`}
                  >
                    Feedback ✓
                  </button>
                )}
              </div>
            );
          }}
        />
      )}

      <DrawerForm
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        title="New Lesson Plan"
        onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
        isLoading={createMutation.isPending}
        submitLabel="Create"
        formId="create-lesson-plan-form"
      >
        <PlanFormFields
          mode="create"
          form={createForm}
          teachingOptions={teachingOptions}
          teachingOptionsLoading={teachingOptionsQuery.isPending}
          academicYearId={academicYearId ?? undefined}
          aiEnabled={aiEnabled}
          accessToken={auth.accessToken!}
        />
      </DrawerForm>

      <DrawerForm
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        title="Edit Lesson Plan"
        onSubmit={editForm.handleSubmit((v) => {
          if (editing) updateMutation.mutate({ id: editing.id, v });
        })}
        isLoading={updateMutation.isPending}
        submitLabel="Save"
        formId="edit-lesson-plan-form"
      >
        {editing?.feedback ? (
          <div className="rounded-xl border border-accent-100 bg-accent-50 p-3 text-sm text-slate-700">
            <p className="text-xs font-bold uppercase tracking-wide text-accent-600">
              Latest feedback from your school admin
            </p>
            <p className="mt-1 whitespace-pre-line">{editing.feedback}</p>
            <button
              type="button"
              onClick={() => setHistoryPlan(editing)}
              className="mt-2 text-xs font-semibold text-accent-600 hover:underline"
            >
              See all feedback in the history
            </button>
          </div>
        ) : null}
        {editing && (
          <PlanFormFields
            mode="edit"
            form={editForm}
            fixedClassSubject={`${editing.classRoom.code} - ${editing.classRoom.name} · ${editing.subject.name}`}
            teachingOptions={[]}
            teachingOptionsLoading={false}
            academicYearId={editing.academicYear.id}
            aiEnabled={aiEnabled}
            accessToken={auth.accessToken!}
          />
        )}
      </DrawerForm>

      <AppDrawer
        open={Boolean(recommending)}
        onClose={() => setRecommending(null)}
        title="Add recommendation"
        description={
          recommending ? `Leave a recommendation for "${recommending.title}"` : undefined
        }
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
            onClick={() =>
              recommending &&
              recommendMutation.mutate({ id: recommending.id, feedback: recommendationText.trim() })
            }
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
            onClick={() =>
              rejecting &&
              reviewMutation.mutate({
                id: rejecting.id,
                decision: 'REJECTED',
                note: rejectionNote.trim() || undefined,
              })
            }
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {reviewMutation.isPending ? 'Saving…' : 'Reject with feedback'}
          </button>
        </div>
      </AppDrawer>

      <AppDrawer
        open={Boolean(viewingPlan)}
        onClose={() => setViewingId(null)}
        size="wide"
        title={viewingPlan?.title ?? 'Lesson plan'}
        description={
          viewingPlan
            ? `${viewingPlan.classRoom.code} - ${viewingPlan.classRoom.name} · ${viewingPlan.subject.name}`
            : undefined
        }
        footer={
          viewingPlan ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setHistoryPlan(viewingPlan)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <History className="h-4 w-4" aria-hidden="true" /> History
              </button>
              {canWrite && EDITABLE_STATUSES.includes(viewingPlan.status) ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const plan = viewingPlan;
                      setViewingId(null);
                      openEdit(plan);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => submitMutation.mutate(viewingPlan.id)}
                    disabled={submitMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" /> Submit for review
                  </button>
                </>
              ) : null}
              {isReviewer && viewingPlan.status === 'SUBMITTED' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const plan = viewingPlan;
                      setViewingId(null);
                      openReject(plan);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewMutation.mutate({ id: viewingPlan.id, decision: 'APPROVED' })}
                    disabled={reviewMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg bg-success-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
                  </button>
                </>
              ) : null}
              {isReviewer ? (
                <button
                  type="button"
                  onClick={() => {
                    const plan = viewingPlan;
                    setViewingId(null);
                    openRecommend(plan);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-accent-100 bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-600 hover:bg-accent-100"
                >
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" /> Recommend
                </button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {viewingPlan ? <LessonPlanDetails plan={viewingPlan} showTeacher={seesAllPlans} /> : null}
      </AppDrawer>

      <AppDrawer
        open={Boolean(historyPlan)}
        onClose={() => setHistoryPlan(null)}
        title="Revision history"
        description={historyPlan ? historyPlan.title : undefined}
      >
        {revisionsQuery.isPending ? (
          <ListSkeleton rows={5} showAvatar={false} />
        ) : !revisionsQuery.data?.length ? (
          <p className="py-8 text-center text-sm text-slate-500">No history yet.</p>
        ) : (
          <ol className="space-y-3">
            {revisionsQuery.data.map((rev) => (
              <li key={rev.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
                    {rev.action}
                  </span>
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

function LessonPlanDetails({ plan, showTeacher }: { plan: LessonPlan; showTeacher: boolean }) {
  const sections: Array<{ label: string; value: string | null }> = [
    { label: 'Objectives', value: plan.objectives },
    { label: 'Materials', value: plan.materials },
    { label: 'Activities', value: plan.activities },
    { label: 'Assessment', value: plan.assessment },
  ];
  const facts: Array<{ label: string; value: string }> = [
    { label: 'Status', value: plan.status },
    { label: 'Academic year', value: plan.academicYear.name },
    { label: 'Week', value: plan.weekNumber ? String(plan.weekNumber) : '—' },
    { label: 'Duration', value: plan.durationMinutes ? `${plan.durationMinutes} min` : '—' },
    ...(showTeacher
      ? [{ label: 'Teacher', value: `${plan.teacher.firstName} ${plan.teacher.lastName}` }]
      : []),
    { label: 'Last updated', value: formatDateTime(plan.updatedAt) },
  ];

  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{fact.label}</dt>
            <dd className="mt-0.5 truncate text-sm text-slate-900">
              {fact.label === 'Status' ? (
                <Badge tone={LESSON_PLAN_STATUS_TONES[plan.status]}>{plan.status}</Badge>
              ) : (
                fact.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      {plan.feedback ? (
        <div className="rounded-2xl border border-accent-100 bg-accent-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-accent-600">Latest feedback</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{plan.feedback}</p>
        </div>
      ) : null}

      {sections.map((section) => (
        <section key={section.label} className="grid gap-1">
          <h3 className="text-sm font-bold text-slate-900">{section.label}</h3>
          {section.value?.trim() ? (
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{section.value}</p>
          ) : (
            <p className="text-sm italic text-slate-400">Not filled in</p>
          )}
        </section>
      ))}
    </div>
  );
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const PLAN_CONTENT_FIELDS = ['objectives', 'materials', 'activities', 'assessment'] as const;

function PlanFormFields({
  mode,
  form,
  teachingOptions,
  teachingOptionsLoading,
  fixedClassSubject,
  academicYearId,
  aiEnabled,
  accessToken,
}: {
  mode: 'create' | 'edit';
  form: UseFormReturn<PlanFormValues>;
  teachingOptions: TeachingOption[];
  teachingOptionsLoading: boolean;
  fixedClassSubject?: string;
  academicYearId?: string;
  aiEnabled: boolean;
  accessToken: string;
}) {
  const classRoomId = form.watch('classRoomId');
  const subjectId = form.watch('subjectId');
  const formYearId = form.watch('academicYearId');
  const pairValue =
    classRoomId && subjectId ? `${formYearId || academicYearId || ''}:${classRoomId}:${subjectId}` : '';
  const yearForAi = formYearId || academicYearId;
  const { errors } = form.formState;

  return (
    <>
      {mode === 'create' ? (
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Class and subject
          <select
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            value={pairValue}
            disabled={teachingOptionsLoading}
            onChange={(e) => {
              const [nextYear = '', nextClass = '', nextSubject = ''] = e.target.value.split(':');
              form.setValue('academicYearId', nextYear);
              form.setValue('classRoomId', nextClass, { shouldValidate: true });
              form.setValue('subjectId', nextSubject, { shouldValidate: true });
            }}
          >
            <option value="">
              {teachingOptionsLoading
                ? 'Loading your classes…'
                : teachingOptions.length
                  ? 'Select one of the classes you teach'
                  : 'No class and subject assigned to you this year'}
            </option>
            {teachingOptions.map((o) => (
              <option
                key={`${o.academicYearId}:${o.classRoom.id}:${o.subject.id}`}
                value={`${o.academicYearId}:${o.classRoom.id}:${o.subject.id}`}
              >
                {o.classRoom.code} - {o.classRoom.name} · {o.subject.name}
              </option>
            ))}
          </select>
          {errors.classRoomId || errors.subjectId ? (
            <span className="text-xs font-medium text-red-600">Pick a class and subject you teach</span>
          ) : null}
        </label>
      ) : (
        <div className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-800">Class and subject</span>
          <span className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">{fixedClassSubject}</span>
        </div>
      )}

      <AiLessonPlanAssistant
        form={form}
        academicYearId={yearForAi}
        aiEnabled={aiEnabled}
        accessToken={accessToken}
      />

      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Title
        <input
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          {...form.register('title')}
        />
        {errors.title ? (
          <span className="text-xs font-medium text-red-600">Give the plan a title (at least 2 characters)</span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Objectives
        <textarea
          rows={4}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          {...form.register('objectives')}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Materials
        <textarea
          rows={3}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          {...form.register('materials')}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Activities
        <textarea
          rows={6}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          {...form.register('activities')}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Assessment
        <textarea
          rows={4}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          {...form.register('assessment')}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Week #
          <input
            type="number"
            min="1"
            max="52"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...form.register('weekNumber')}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Duration (min)
          <input
            type="number"
            min="1"
            max="600"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...form.register('durationMinutes')}
          />
        </label>
      </div>
    </>
  );
}

/**
 * Lets the teacher describe the lesson and have AI fill the plan fields. It only fills the
 * form: the teacher reviews and edits everything before saving.
 */
function AiLessonPlanAssistant({
  form,
  academicYearId,
  aiEnabled,
  accessToken,
}: {
  form: UseFormReturn<PlanFormValues>;
  academicYearId?: string;
  aiEnabled: boolean;
  accessToken: string;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [language, setLanguage] = useState<AiLanguage>('en');

  const draftMutation = useMutation({
    mutationFn: () => {
      const values = form.getValues();
      const week = Number(values.weekNumber);
      const duration = Number(values.durationMinutes);
      return draftLessonPlanWithAiApi(accessToken, {
        academicYearId: academicYearId!,
        classRoomId: values.classRoomId,
        subjectId: values.subjectId,
        topic: topic.trim(),
        weekNumber: Number.isInteger(week) && week >= 1 && week <= 52 ? week : undefined,
        durationMinutes: Number.isInteger(duration) && duration >= 5 && duration <= 600 ? duration : undefined,
        notes: notes.trim() || undefined,
        language,
      });
    },
    onSuccess: (draft) => {
      const values = form.getValues();
      const hasContent = PLAN_CONTENT_FIELDS.some((field) => values[field]?.trim());
      if (hasContent && !window.confirm('Replace what you have written with the AI draft?')) {
        return;
      }
      form.setValue('title', draft.title, { shouldDirty: true, shouldValidate: true });
      PLAN_CONTENT_FIELDS.forEach((field) =>
        form.setValue(field, draft[field], { shouldDirty: true })
      );
      showToast({
        type: 'success',
        title: 'AI draft added',
        message: 'Read it through and edit anything before you save.',
      });
    },
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'AI could not draft the plan',
        message: (e as ApiClientError).message,
      }),
  });

  const classRoomId = form.watch('classRoomId');
  const subjectId = form.watch('subjectId');
  const missingClass = !classRoomId || !subjectId;

  if (!aiEnabled) {
    return (
      <p className="rounded-xl border border-dashed border-brand-200 px-3 py-2 text-xs text-slate-500">
        <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
        AI planning help appears here once your school admin switches on AI in AI settings.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-brand-700"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Plan with AI
        </span>
        <span className="text-xs font-medium text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? (
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            What is the lesson about?
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Fractions: adding fractions with the same denominator"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
              maxLength={300}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Anything the AI should know (optional)
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 45 learners, no projector, some learners struggle with division"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
              maxLength={2000}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as AiLanguage)}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="rw">Kinyarwanda</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => draftMutation.mutate()}
            disabled={
              draftMutation.isPending || missingClass || topic.trim().length < 2 || !academicYearId
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {draftMutation.isPending ? 'Drafting… (up to a minute)' : 'Draft the plan'}
          </button>
          <p className="text-xs text-slate-500">
            {missingClass
              ? 'Pick the class and subject first.'
              : 'The AI fills the fields below. Nothing is saved until you press Create or Save.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
