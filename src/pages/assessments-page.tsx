import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Eye, Plus } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { RichTextEditor } from '../components/rich-text-editor';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  createAssessmentApi,
  listAssessmentsApi,
  publishAssessmentApi,
} from '../features/assessments/assessments.api';
import {
  AssessmentFormValues,
  AssessmentStatusPill,
  assessmentTypeOptions,
  assessmentFormSchema,
  defaultAssessmentForm,
  formatAssessmentTypeLabel,
  formatAssessmentDateTime,
  htmlToPlainText,
} from '../features/assessments/assessment-ui';
import { hasPermission } from '../features/auth/auth-helpers';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
} from '../features/sprint1/sprint1.api';
import { getCourseDetailApi, listCoursesApi } from '../features/sprint4/lms.api';

interface AcademicYearOption {
  id: string;
  name: string;
}

interface ClassRoomOption {
  id: string;
  name: string;
}

export function AssessmentsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const assessmentForm = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentFormSchema),
    defaultValues: defaultAssessmentForm,
  });

  const selectedCreateCourseId = assessmentForm.watch('courseId');
  const canPublishAssessments = hasPermission(auth.me, 'assessments.publish');
  const canReviewAssessmentResults = hasPermission(auth.me, 'assessment_results.read');

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const courseOptionsQuery = useQuery({
    queryKey: ['assessment-course-options', yearFilter || null, classFilter || null],
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        academicYearId: yearFilter || undefined,
        classId: classFilter || undefined,
        page: 1,
        pageSize: 50,
      }),
  });

  const createCourseDetailQuery = useQuery({
    queryKey: ['assessment-create-course-detail', selectedCreateCourseId || null],
    enabled: Boolean(selectedCreateCourseId),
    queryFn: () => getCourseDetailApi(auth.accessToken!, selectedCreateCourseId),
  });

  const assessmentsQuery = useQuery({
    queryKey: ['assessments', search, classFilter, yearFilter, courseFilter, page],
    queryFn: () =>
      listAssessmentsApi(auth.accessToken!, {
        q: search || undefined,
        classId: classFilter || undefined,
        academicYearId: yearFilter || undefined,
        courseId: courseFilter || undefined,
        page,
        pageSize: 20,
      }),
  });

  const createAssessmentMutation = useMutation({
    mutationFn: (values: AssessmentFormValues) =>
      createAssessmentApi(auth.accessToken!, {
        courseId: values.courseId,
        lessonId: values.lessonId || undefined,
        type: values.type,
        title: values.title,
        instructions: htmlToPlainText(values.instructions) ? values.instructions : undefined,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : undefined,
        timeLimitMinutes: values.timeLimitMinutes || undefined,
        maxAttempts: values.maxAttempts,
        isPublished: values.isPublished,
      }),
    onSuccess: (assessment) => {
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setIsCreateOpen(false);
      assessmentForm.reset(defaultAssessmentForm);
      showToast({ type: 'success', title: 'Assessment created' });
      navigate(`/admin/assessments/${assessment.id}`);
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create assessment',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const publishAssessmentMutation = useMutation({
    mutationFn: ({ assessmentId, isPublished }: { assessmentId: string; isPublished: boolean }) =>
      publishAssessmentApi(auth.accessToken!, assessmentId, isPublished),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
      void queryClient.invalidateQueries({ queryKey: ['assessment-detail', variables.assessmentId] });
      showToast({
        type: 'success',
        title: variables.isPublished ? 'Assessment published' : 'Assessment moved back to draft',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update assessment',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const academicYears = useMemo(
    () => ((yearsQuery.data as AcademicYearOption[] | undefined) ?? []).slice(),
    [yearsQuery.data],
  );
  const classRooms = useMemo(
    () => ((classesQuery.data as ClassRoomOption[] | undefined) ?? []).slice(),
    [classesQuery.data],
  );
  const courseOptions = courseOptionsQuery.data?.items ?? [];
  const lessonsForCreate = createCourseDetailQuery.data?.lessons.items ?? [];
  const assessmentItems = assessmentsQuery.data?.items ?? [];

  function openCreateModal() {
    assessmentForm.reset({
      ...defaultAssessmentForm,
      courseId: courseFilter || courseOptions[0]?.id || '',
    });
    setIsCreateOpen(true);
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Assessments"
        subtitle="Browse your available tests, then open one to manage questions, publishing, and results."
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New assessment
          </button>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 p-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px] lg:items-end">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Search assessments</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search by title or course"
                className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Academic year</span>
              <select
                value={yearFilter}
                onChange={(event) => {
                  setPage(1);
                  setYearFilter(event.target.value);
                }}
                className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              >
                <option value="">All years</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Class</span>
              <select
                value={classFilter}
                onChange={(event) => {
                  setPage(1);
                  setClassFilter(event.target.value);
                }}
                className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              >
                <option value="">All classes</option>
                {classRooms.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>
                    {classRoom.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Course</span>
              <select
                value={courseFilter}
                onChange={(event) => {
                  setPage(1);
                  setCourseFilter(event.target.value);
                }}
                className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              >
                <option value="">All courses</option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {assessmentsQuery.isPending ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-48 animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
              ))}
            </div>
          ) : null}

          {assessmentsQuery.isError ? (
            <StateView
              title="Could not load assessments"
              message="Retry to load the assessment list."
              action={
                <button
                  type="button"
                  onClick={() => void assessmentsQuery.refetch()}
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : null}

          {!assessmentsQuery.isPending && !assessmentsQuery.isError ? (
            assessmentItems.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assessmentItems.map((assessment) => (
                  <article
                    key={assessment.id}
                    className="grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-slate-900">{assessment.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{assessment.course.title}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <AssessmentStatusPill isPublished={assessment.isPublished} />
                        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {formatAssessmentTypeLabel(assessment.type)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                      <span className="rounded-full bg-brand-100 px-2.5 py-1">{assessment.counts.questions} questions</span>
                      <span className="rounded-full bg-brand-100 px-2.5 py-1">{assessment.counts.attempts} attempts</span>
                      <span className="rounded-full bg-brand-100 px-2.5 py-1">{formatAssessmentDateTime(assessment.dueAt)}</span>
                    </div>

                    <div className="grid gap-1 text-sm text-slate-700">
                      <p>{assessment.course.classRoom.name}</p>
                      <p>{assessment.course.academicYear.name}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/assessments/${assessment.id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        Manage
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/assessments/${assessment.id}#results`)}
                        disabled={!canReviewAssessmentResults || assessment.counts.attempts === 0}
                        title={
                          !canReviewAssessmentResults
                            ? 'You do not have permission to review assessment results.'
                            : assessment.counts.attempts === 0
                              ? 'Results appear after students submit attempts.'
                              : 'Review submitted attempts'
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Results
                      </button>
                      {canPublishAssessments ? (
                        <button
                          type="button"
                          onClick={() =>
                            publishAssessmentMutation.mutate({
                              assessmentId: assessment.id,
                              isPublished: !assessment.isPublished,
                            })
                          }
                          disabled={publishAssessmentMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          {publishAssessmentMutation.isPending &&
                          publishAssessmentMutation.variables?.assessmentId === assessment.id
                            ? 'Saving...'
                            : assessment.isPublished
                              ? 'Unpublish'
                              : 'Publish'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No assessments yet"
                message="Create the first assessment for one of your courses."
                action={
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Create assessment
                  </button>
                }
              />
            )
          ) : null}
        </div>
      </SectionCard>

      <Modal
        open={isCreateOpen}
        title="Create assessment"
        description="Set the course, instructions, timing, and attempt limits before you add questions."
        onClose={() => setIsCreateOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={assessmentForm.handleSubmit((values) => createAssessmentMutation.mutate(values))}
              disabled={createAssessmentMutation.isPending}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save assessment
            </button>
          </div>
        }
      >
        <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Course</span>
            <select
              {...assessmentForm.register('courseId')}
              className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            >
              <option value="">Select course</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {assessmentForm.formState.errors.courseId ? (
              <span className="text-xs text-rose-600">{assessmentForm.formState.errors.courseId.message}</span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Test type</span>
            <select
              {...assessmentForm.register('type')}
              className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            >
              {assessmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Lesson (optional)</span>
            <select
              {...assessmentForm.register('lessonId')}
              className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            >
              <option value="">Course-level assessment</option>
              {lessonsForCreate.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.sequence}. {lesson.title}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Assessment title</span>
            <input
              {...assessmentForm.register('title')}
              className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              placeholder="End of unit quick check"
            />
            {assessmentForm.formState.errors.title ? (
              <span className="text-xs text-rose-600">{assessmentForm.formState.errors.title.message}</span>
            ) : null}
          </label>

          <Controller
            control={assessmentForm.control}
            name="instructions"
            render={({ field }) => (
              <div className="grid gap-1 text-sm font-medium text-slate-700">
                <span>Instructions</span>
                <RichTextEditor
                  value={field.value ?? '<p></p>'}
                  onChange={field.onChange}
                  placeholder="Explain how students should take this test."
                  minHeightClassName="min-h-[180px]"
                />
              </div>
            )}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Due at</span>
              <input
                type="datetime-local"
                {...assessmentForm.register('dueAt')}
                className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Timer (minutes)</span>
              <input
                type="number"
                min={1}
                max={240}
                {...assessmentForm.register('timeLimitMinutes')}
                className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Max attempts</span>
              <input
                type="number"
                min={1}
                max={5}
                {...assessmentForm.register('maxAttempts')}
                className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
