import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  FilePlus2,
  Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { RichContent } from '../components/rich-content';
import { RichTextEditor } from '../components/rich-text-editor';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
} from '../features/sprint1/sprint1.api';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';
import {
  AssignmentItem,
  createAssignmentApi,
  getCourseDetailApi,
  gradeSubmissionApi,
  listAssignmentsApi,
  listAssignmentSubmissionsApi,
  listCoursesApi,
} from '../features/sprint4/lms.api';

interface AcademicYearOption {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface ClassRoomOption {
  id: string;
  code: string;
  name: string;
}

function htmlToPlainText(value: string | undefined) {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const assignmentFormSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  lessonId: z.string().optional(),
  title: z.string().trim().min(2, 'Assignment title is required').max(120),
  instructions: z
    .string()
    .max(40000)
    .refine((value) => htmlToPlainText(value).length >= 2, 'Instructions are required'),
  dueAt: z.string().optional(),
  maxPoints: z.coerce.number().int().min(1, 'Max points must be at least 1').max(1000),
  isPublished: z.boolean().default(true),
});

const gradeFormSchema = z.object({
  gradePoints: z.coerce.number().int().min(0, 'Grade must be 0 or more').max(1000),
  feedback: z.string().trim().max(5000).optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
type GradeFormValues = z.infer<typeof gradeFormSchema>;

const defaultAssignmentForm: AssignmentFormValues = {
  courseId: '',
  lessonId: '',
  title: '',
  instructions: '<p></p>',
  dueAt: '',
  maxPoints: 100,
  isPublished: true,
};

const defaultGradeForm: GradeFormValues = {
  gradePoints: 0,
  feedback: '',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'No due date';
  }

  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function AttachmentLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
    >
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'draft' | 'published' | 'graded' | 'submitted';
}) {
  const toneClass: Record<typeof tone, string> = {
    draft: 'border-amber-200 bg-amber-50 text-amber-800',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    graded: 'border-brand-200 bg-brand-100 text-brand-800',
    submitted: 'border-sky-200 bg-sky-50 text-sky-800',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}>
      {label}
    </span>
  );
}

export function AssignmentsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: defaultAssignmentForm,
  });
  const gradeForm = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: defaultGradeForm,
  });

  const selectedCreateCourseId = assignmentForm.watch('courseId');

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const courseOptionsQuery = useQuery({
    queryKey: ['lms', 'course-options', yearFilter || null, classFilter || null],
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        academicYearId: yearFilter || undefined,
        classId: classFilter || undefined,
        page: 1,
        pageSize: 50,
      }),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['lms', 'assignments', search, classFilter, yearFilter, courseFilter, page],
    queryFn: () =>
      listAssignmentsApi(auth.accessToken!, {
        q: search || undefined,
        classId: classFilter || undefined,
        academicYearId: yearFilter || undefined,
        courseId: courseFilter || undefined,
        page,
        pageSize: 20,
      }),
  });

  const createCourseDetailQuery = useQuery({
    queryKey: ['lms', 'assignment-create-course-detail', selectedCreateCourseId || null],
    enabled: Boolean(selectedCreateCourseId),
    queryFn: () =>
      getCourseDetailApi(auth.accessToken!, selectedCreateCourseId, {
        lessonsPage: 1,
        lessonsPageSize: 100,
      }),
  });

  const submissionsQuery = useQuery({
    queryKey: ['lms', 'assignment-submissions', selectedAssignment?.id ?? null],
    enabled: Boolean(selectedAssignment?.id),
    queryFn: () =>
      listAssignmentSubmissionsApi(auth.accessToken!, selectedAssignment!.id, {
        page: 1,
        pageSize: 50,
      }),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (values: AssignmentFormValues) => {
      let asset;
      if (attachmentFile) {
        asset = await uploadFileToCloudinary(auth.accessToken!, 'assignment', attachmentFile);
      }

      return createAssignmentApi(auth.accessToken!, {
        courseId: values.courseId,
        lessonId: values.lessonId || undefined,
        title: values.title,
        instructions: values.instructions,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : undefined,
        maxPoints: values.maxPoints,
        isPublished: values.isPublished,
        asset,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['lms', 'course-detail'] });
      setIsCreateOpen(false);
      setAttachmentFile(null);
      assignmentForm.reset(defaultAssignmentForm);
      showToast({
        type: 'success',
        title: 'Assignment created',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create assignment',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const gradeSubmissionMutation = useMutation({
    mutationFn: (values: GradeFormValues) =>
      gradeSubmissionApi(auth.accessToken!, gradingSubmissionId!, {
        gradePoints: values.gradePoints,
        feedback: values.feedback || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['lms', 'assignment-submissions', selectedAssignment?.id ?? null],
      });
      void queryClient.invalidateQueries({ queryKey: ['lms', 'assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
      setGradingSubmissionId(null);
      gradeForm.reset(defaultGradeForm);
      showToast({
        type: 'success',
        title: 'Submission graded',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not grade submission',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const academicYears = ((yearsQuery.data as AcademicYearOption[] | undefined) ?? []).slice();
  const classRooms = ((classesQuery.data as ClassRoomOption[] | undefined) ?? []).slice();
  const courseOptions = courseOptionsQuery.data?.items ?? [];

  const visibleAssignments = useMemo(() => assignmentsQuery.data?.items ?? [], [assignmentsQuery.data?.items]);

  function openCreate() {
    assignmentForm.reset({
      ...defaultAssignmentForm,
      courseId: courseFilter || courseOptions[0]?.id || '',
    });
    setAttachmentFile(null);
    setIsCreateOpen(true);
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Assignments"
        subtitle="Manage assignment publishing, submissions, and grading from one tab."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create assignment
          </button>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 p-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px] lg:items-end">
            <label className="grid gap-1 text-sm font-medium text-brand-700">
              <span>Search assignments</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by title, instruction, or course"
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-900 outline-none placeholder:text-brand-400 focus:border-brand-400"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-brand-700">
              <span>Academic year</span>
              <select
                value={yearFilter}
                onChange={(event) => {
                  setYearFilter(event.target.value);
                  setCourseFilter('');
                  setPage(1);
                }}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-900 outline-none focus:border-brand-400"
              >
                <option value="">All years</option>
                {academicYears.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-brand-700">
              <span>Class</span>
              <select
                value={classFilter}
                onChange={(event) => {
                  setClassFilter(event.target.value);
                  setCourseFilter('');
                  setPage(1);
                }}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-900 outline-none focus:border-brand-400"
              >
                <option value="">All classes</option>
                {classRooms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-brand-700">
              <span>Course</span>
              <select
                value={courseFilter}
                onChange={(event) => {
                  setCourseFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-900 outline-none focus:border-brand-400"
              >
                <option value="">All courses</option>
                {courseOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {assignmentsQuery.isPending ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-2xl border border-brand-100 bg-brand-50" />
              ))}
            </div>
          ) : null}

          {assignmentsQuery.isError ? (
            <StateView
              title="Could not load assignments"
              message="Retry the assignment list after checking your connection."
              action={
                <button
                  type="button"
                  onClick={() => void assignmentsQuery.refetch()}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : null}

          {!assignmentsQuery.isPending && !assignmentsQuery.isError ? (
            visibleAssignments.length ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-brand-700">
                  <span className="font-medium text-brand-800">
                    {assignmentsQuery.data?.pagination.totalItems ?? visibleAssignments.length} assignments
                  </span>
                  {assignmentsQuery.data?.pagination.totalPages &&
                  assignmentsQuery.data.pagination.totalPages > 1 ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={
                          page >= (assignmentsQuery.data?.pagination.totalPages ?? 1)
                        }
                        onClick={() =>
                          setPage((current) =>
                            Math.min(assignmentsQuery.data!.pagination.totalPages, current + 1),
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {visibleAssignments.map((assignment) => (
                  <article key={assignment.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-brand-900">{assignment.title}</p>
                        <p className="mt-1 text-sm text-brand-600">
                          {assignment.course?.title ?? 'Course'} · {assignment.course?.classRoom.name ?? 'Class'} ·{' '}
                          {formatDateTime(assignment.dueAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          label={assignment.isPublished ? 'Published' : 'Draft'}
                          tone={assignment.isPublished ? 'published' : 'draft'}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedAssignment(assignment)}
                          className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          View submissions ({assignment.submissionCount})
                        </button>
                      </div>
                    </div>

                    <RichContent
                      html={assignment.instructions}
                      className="rich-content mt-3 text-sm leading-6 text-brand-700"
                    />

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                        {assignment.maxPoints} pts
                      </span>
                      {assignment.lesson ? (
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                          Lesson: {assignment.lesson.title}
                        </span>
                      ) : null}
                      {assignment.attachmentAsset ? (
                        <AttachmentLink
                          label={`Open ${assignment.attachmentAsset.originalName}`}
                          url={assignment.attachmentAsset.secureUrl}
                        />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No assignments yet"
                message="Create the first assignment from this tab."
                action={
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                    Create assignment
                  </button>
                }
              />
            )
          ) : null}
        </div>
      </SectionCard>

      <Modal
        open={isCreateOpen}
        title="Create assignment"
        description="Pick a course first, then optionally attach the assignment to a lesson."
        onClose={() => setIsCreateOpen(false)}
      >
        <form
          className="grid gap-4"
          onSubmit={assignmentForm.handleSubmit((values) => createAssignmentMutation.mutate(values))}
        >
          <FormField label="Course" error={assignmentForm.formState.errors.courseId?.message}>
            <select
              {...assignmentForm.register('courseId')}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            >
              <option value="">Select course</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Lesson" error={assignmentForm.formState.errors.lessonId?.message}>
            <select
              {...assignmentForm.register('lessonId')}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            >
              <option value="">No linked lesson</option>
              {createCourseDetailQuery.data?.lessons.items.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.sequence}. {lesson.title}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Title" error={assignmentForm.formState.errors.title?.message}>
            <input
              {...assignmentForm.register('title')}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </FormField>

          <FormField
            label="Instructions"
            error={assignmentForm.formState.errors.instructions?.message}
          >
            <Controller
              control={assignmentForm.control}
              name="instructions"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Describe the task, the expected answer format, and grading criteria."
                  minHeightClassName="min-h-[180px]"
                />
              )}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Due date" error={assignmentForm.formState.errors.dueAt?.message}>
              <input
                type="datetime-local"
                {...assignmentForm.register('dueAt')}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </FormField>

            <FormField label="Max points" error={assignmentForm.formState.errors.maxPoints?.message}>
              <input
                type="number"
                min={1}
                max={1000}
                {...assignmentForm.register('maxPoints')}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </FormField>
          </div>

          <FormField label="Attachment">
            <input
              type="file"
              onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-dashed border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-700"
            />
          </FormField>

          <label className="flex items-center gap-2 text-sm font-medium text-brand-700">
            <input type="checkbox" {...assignmentForm.register('isPublished')} />
            Publish immediately
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAssignmentMutation.isPending}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createAssignmentMutation.isPending ? 'Saving...' : 'Create assignment'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedAssignment)}
        title={selectedAssignment ? `Submissions · ${selectedAssignment.title}` : 'Submissions'}
        description="Review and grade submissions for the selected assignment."
        onClose={() => setSelectedAssignment(null)}
      >
        {submissionsQuery.isPending ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl border border-brand-100 bg-brand-50" />
            ))}
          </div>
        ) : null}

        {submissionsQuery.isError ? (
          <StateView
            title="Could not load submissions"
            message="Retry to review student work."
            action={
              <button
                type="button"
                onClick={() => void submissionsQuery.refetch()}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            }
          />
        ) : null}

        {!submissionsQuery.isPending && !submissionsQuery.isError ? (
          submissionsQuery.data?.items.length ? (
            <div className="grid gap-3">
              {submissionsQuery.data.items.map((submission) => (
                <article key={submission.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-brand-900">
                        {submission.student.firstName} {submission.student.lastName}
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-brand-500">
                        {submission.student.studentCode}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        label={submission.status === 'GRADED' ? 'Graded' : 'Submitted'}
                        tone={submission.status === 'GRADED' ? 'graded' : 'submitted'}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setGradingSubmissionId(submission.id);
                          gradeForm.reset({
                            gradePoints:
                              submission.gradePoints ?? submissionsQuery.data.assignment.maxPoints,
                            feedback: submission.feedback ?? '',
                          });
                        }}
                        className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
                      >
                        Grade
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-brand-700">
                    {submission.textAnswer ? <p className="whitespace-pre-wrap">{submission.textAnswer}</p> : null}
                    {submission.linkUrl ? (
                      <AttachmentLink label="Open submitted link" url={submission.linkUrl} />
                    ) : null}
                    {submission.fileAsset ? (
                      <AttachmentLink
                        label={`Open ${submission.fileAsset.originalName}`}
                        url={submission.fileAsset.secureUrl}
                      />
                    ) : null}
                    {submission.feedback ? (
                      <p className="rounded-xl bg-brand-50 p-3">
                        Feedback: {submission.feedback}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState message="No submissions yet." />
          )
        ) : null}
      </Modal>

      <Modal
        open={Boolean(gradingSubmissionId)}
        title="Grade submission"
        description="Save points and feedback for the selected submission."
        onClose={() => setGradingSubmissionId(null)}
      >
        <form className="grid gap-4" onSubmit={gradeForm.handleSubmit((values) => gradeSubmissionMutation.mutate(values))}>
          <FormField label="Points" error={gradeForm.formState.errors.gradePoints?.message}>
            <input
              type="number"
              min={0}
              {...gradeForm.register('gradePoints')}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </FormField>
          <FormField label="Feedback" error={gradeForm.formState.errors.feedback?.message}>
            <textarea
              {...gradeForm.register('feedback')}
              rows={5}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setGradingSubmissionId(null)}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={gradeSubmissionMutation.isPending}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {gradeSubmissionMutation.isPending ? 'Saving...' : 'Save grade'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-brand-700">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
