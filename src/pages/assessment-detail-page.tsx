import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookCheck, CheckCircle2, Clock3, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { RichContent } from '../components/rich-content';
import { RichTextEditor } from '../components/rich-text-editor';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  AssessmentQuestion,
  addAssessmentQuestionApi,
  deleteAssessmentApi,
  deleteAssessmentQuestionApi,
  getAssessmentAttemptApi,
  getAssessmentDetailApi,
  listAssessmentResultsApi,
  publishAssessmentApi,
  regradeAssessmentAttemptApi,
  updateAssessmentApi,
  updateAssessmentQuestionApi,
} from '../features/assessments/assessments.api';
import {
  AssessmentEditFormValues,
  AssessmentStatusPill,
  assessmentEditFormSchema,
  defaultAssessmentEditForm,
  defaultQuestionForm,
  formatAssessmentTypeLabel,
  formatAssessmentDateTime,
  htmlToPlainText,
  QuestionFormValues,
  questionFormSchema,
} from '../features/assessments/assessment-ui';
import { getCourseDetailApi } from '../features/sprint4/lms.api';

function toDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AssessmentDetailPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { assessmentId = '' } = useParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [isAssessmentEditOpen, setIsAssessmentEditOpen] = useState(false);
  const [isDeleteAssessmentOpen, setIsDeleteAssessmentOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [questionToDelete, setQuestionToDelete] = useState<{
    id: string;
    prompt: string;
    sequence: number;
  } | null>(null);
  const [reviewAttemptId, setReviewAttemptId] = useState('');
  const [isRegradeOpen, setIsRegradeOpen] = useState(false);
  const [regradePoints, setRegradePoints] = useState<Record<string, string>>({});
  const [regradeFeedback, setRegradeFeedback] = useState('');

  const questionForm = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: defaultQuestionForm,
  });
  const assessmentForm = useForm<AssessmentEditFormValues>({
    resolver: zodResolver(assessmentEditFormSchema),
    defaultValues: defaultAssessmentEditForm,
  });
  const selectedQuestionType = questionForm.watch('type');

  const assessmentDetailQuery = useQuery({
    queryKey: ['assessment-detail', assessmentId || null],
    enabled: Boolean(assessmentId),
    queryFn: () => getAssessmentDetailApi(auth.accessToken!, assessmentId),
  });

  const resultsQuery = useQuery({
    queryKey: ['assessment-results', assessmentId || null],
    enabled: Boolean(assessmentId),
    queryFn: () => listAssessmentResultsApi(auth.accessToken!, assessmentId, { page: 1, pageSize: 20 }),
  });

  const assessment = assessmentDetailQuery.data ?? null;

  const courseDetailQuery = useQuery({
    queryKey: ['assessment-course-detail', assessment?.course.id ?? null],
    enabled: Boolean(assessment?.course.id),
    queryFn: () => getCourseDetailApi(auth.accessToken!, assessment!.course.id),
  });

  const reviewAttemptQuery = useQuery({
    queryKey: ['assessment-attempt-review', reviewAttemptId || null],
    enabled: Boolean(reviewAttemptId),
    queryFn: () => getAssessmentAttemptApi(auth.accessToken!, reviewAttemptId),
  });

  const addQuestionMutation = useMutation({
    mutationFn: (values: QuestionFormValues) =>
      addAssessmentQuestionApi(auth.accessToken!, assessmentId, {
        prompt: values.prompt,
        explanation: values.explanation || undefined,
        type: values.type,
        points: values.points,
        options:
          values.type === 'MCQ_SINGLE'
            ? [values.optionA, values.optionB, values.optionC, values.optionD].map((label, index) => ({
                label: label ?? '',
                isCorrect: values.correctOptionIndex === index,
                sequence: index + 1,
              }))
            : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-detail', assessmentId] });
      void queryClient.invalidateQueries({ queryKey: ['assessment-results', assessmentId] });
      closeQuestionModal();
      showToast({ type: 'success', title: 'Question added' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not add question',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: (values: QuestionFormValues) =>
      updateAssessmentQuestionApi(auth.accessToken!, editingQuestionId, {
        prompt: values.prompt,
        explanation: values.explanation || undefined,
        type: values.type,
        points: values.points,
        options:
          values.type === 'MCQ_SINGLE'
            ? [values.optionA, values.optionB, values.optionC, values.optionD].map((label, index) => ({
                label: label ?? '',
                isCorrect: values.correctOptionIndex === index,
                sequence: index + 1,
              }))
            : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-detail', assessmentId] });
      closeQuestionModal();
      showToast({ type: 'success', title: 'Question updated' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update question',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) => deleteAssessmentQuestionApi(auth.accessToken!, questionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-detail', assessmentId] });
      setQuestionToDelete(null);
      showToast({ type: 'success', title: 'Question deleted' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not delete question',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const publishAssessmentMutation = useMutation({
    mutationFn: (isPublished: boolean) => publishAssessmentApi(auth.accessToken!, assessmentId, isPublished),
    onSuccess: (_result, isPublished) => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-detail', assessmentId] });
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
      showToast({
        type: 'success',
        title: isPublished ? 'Assessment published' : 'Assessment moved back to draft',
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

  const updateAssessmentMutation = useMutation({
    mutationFn: (values: AssessmentEditFormValues) =>
      updateAssessmentApi(auth.accessToken!, assessmentId, {
        lessonId: values.lessonId || null,
        title: values.title,
        instructions: htmlToPlainText(values.instructions) ? values.instructions : null,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
        timeLimitMinutes: values.timeLimitMinutes ?? null,
        maxAttempts: values.maxAttempts,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-detail', assessmentId] });
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setIsAssessmentEditOpen(false);
      showToast({ type: 'success', title: 'Assessment updated' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update assessment',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: () => deleteAssessmentApi(auth.accessToken!, assessmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
      void queryClient.removeQueries({ queryKey: ['assessment-detail', assessmentId] });
      setIsDeleteAssessmentOpen(false);
      showToast({ type: 'success', title: 'Assessment deleted' });
      navigate('/admin/assessments');
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not delete assessment',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const regradeAttemptMutation = useMutation({
    mutationFn: (payload: { manualFeedback?: string; answers: Array<{ questionId: string; pointsAwarded: number }> }) =>
      regradeAssessmentAttemptApi(auth.accessToken!, reviewAttemptId, payload),
    onSuccess: (attempt) => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-results', assessmentId] });
      void queryClient.invalidateQueries({ queryKey: ['assessment-attempt-review', reviewAttemptId] });
      setRegradeFeedback(attempt.manualFeedback ?? '');
      setRegradePoints(
        Object.fromEntries(
          attempt.questions.map((question) => [
            question.id,
            String(question.manualPointsAwarded ?? question.pointsAwarded ?? 0),
          ]),
        ),
      );
      showToast({ type: 'success', title: 'Manual score saved' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not save manual grade',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const resultRows = useMemo(() => resultsQuery.data?.items ?? [], [resultsQuery.data?.items]);
  const selectedAttempt = reviewAttemptQuery.data ?? null;
  const assessmentEditingLocked = Boolean(assessment && assessment.counts.attempts > 0);
  const assessmentDeletionLocked = Boolean(assessment && assessment.counts.attempts > 0);
  const questionEditingLocked = Boolean(
    assessment && (assessment.isPublished || assessment.counts.attempts > 0),
  );
  const lessonOptions = useMemo(() => {
    const items = courseDetailQuery.data?.lessons.items ?? [];
    if (!assessment?.lesson) {
      return items;
    }

    return items.some((lesson) => lesson.id === assessment.lesson?.id)
      ? items
      : [
          {
            id: assessment.lesson.id,
            title: assessment.lesson.title,
            sequence: assessment.lesson.sequence,
          },
          ...items,
        ];
  }, [assessment?.lesson, courseDetailQuery.data?.lessons.items]);

  function openAssessmentEditModal() {
    if (!assessment) {
      return;
    }

    assessmentForm.reset({
      lessonId: assessment.lesson?.id ?? '',
      title: assessment.title,
      instructions: assessment.instructions ?? '<p></p>',
      dueAt: toDateTimeLocalInput(assessment.dueAt),
      timeLimitMinutes: assessment.timeLimitMinutes ?? undefined,
      maxAttempts: assessment.maxAttempts,
    });
    setIsAssessmentEditOpen(true);
  }

  function openQuestionModal(question?: AssessmentQuestion) {
    if (!question) {
      setEditingQuestionId('');
      questionForm.reset({
        ...defaultQuestionForm,
        type: assessment?.type === 'OPENENDED' || assessment?.type === 'INTERVIEW' ? 'OPEN_TEXT' : 'MCQ_SINGLE',
      });
      setIsQuestionOpen(true);
      return;
    }

    const options = question.options.slice().sort((a, b) => a.sequence - b.sequence);
    setEditingQuestionId(question.id);
    questionForm.reset({
      prompt: question.prompt,
      explanation: question.explanation ?? '',
      type: question.type,
      points: question.points,
      correctOptionIndex: Math.max(0, options.findIndex((option) => option.isCorrect)),
      optionA: options[0]?.label ?? '',
      optionB: options[1]?.label ?? '',
      optionC: options[2]?.label ?? '',
      optionD: options[3]?.label ?? '',
    });
    setIsQuestionOpen(true);
  }

  function closeQuestionModal() {
    setIsQuestionOpen(false);
    setEditingQuestionId('');
    questionForm.reset(defaultQuestionForm);
  }

  function openReviewModal(attemptId: string) {
    setReviewAttemptId(attemptId);
    setIsRegradeOpen(true);
  }

  function closeRegradeModal() {
    setIsRegradeOpen(false);
    setReviewAttemptId('');
    setRegradePoints({});
    setRegradeFeedback('');
  }

  function handleSaveRegrade() {
    if (!selectedAttempt) {
      return;
    }

    try {
      const answers = selectedAttempt.questions.map((question) => {
        const rawValue = regradePoints[question.id] ?? String(question.manualPointsAwarded ?? question.pointsAwarded ?? 0);
        const pointsAwarded = Number(rawValue);

        if (!Number.isFinite(pointsAwarded) || pointsAwarded < 0 || pointsAwarded > question.points) {
          throw new Error(`Question ${question.sequence} must be between 0 and ${question.points}`);
        }

        return {
          questionId: question.id,
          pointsAwarded,
        };
      });

      regradeAttemptMutation.mutate({
        manualFeedback: regradeFeedback.trim() || undefined,
        answers,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Invalid manual score',
        message: error instanceof Error ? error.message : 'Check the question scores and try again.',
      });
    }
  }

  useEffect(() => {
    if (!selectedAttempt) {
      return;
    }

    setRegradeFeedback(selectedAttempt.manualFeedback ?? '');
    setRegradePoints(
      Object.fromEntries(
        selectedAttempt.questions.map((question) => [
          question.id,
          String(question.manualPointsAwarded ?? question.pointsAwarded ?? 0),
        ]),
      ),
    );
  }, [selectedAttempt?.id, selectedAttempt?.manualFeedback]);

  if (assessmentDetailQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-16 animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
        <div className="h-[640px] animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
      </div>
    );
  }

  if (assessmentDetailQuery.isError || !assessment) {
    return (
      <StateView
        title="Could not load assessment"
        message="Retry to load this assessment or return to the assessment list."
        action={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/assessments')}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to assessments
            </button>
            <button
              type="button"
              onClick={() => void assessmentDetailQuery.refetch()}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title={assessment.title}
        subtitle="Manage questions, publish the test, and review student results from one page."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/assessments')}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to list
            </button>
            <button
              type="button"
              onClick={openAssessmentEditModal}
              disabled={assessmentEditingLocked}
              title={assessmentEditingLocked ? 'Assessment settings are locked after students start attempting it' : undefined}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit assessment
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteAssessmentOpen(true)}
              disabled={assessmentDeletionLocked || deleteAssessmentMutation.isPending}
              title={
                assessmentDeletionLocked
                  ? 'Assessment cannot be deleted after students start attempting it'
                  : 'Delete assessment'
              }
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {deleteAssessmentMutation.isPending ? 'Deleting...' : 'Delete assessment'}
            </button>
            <button
              type="button"
              onClick={() => openQuestionModal()}
              disabled={questionEditingLocked}
              title={questionEditingLocked ? 'Questions are locked after publish or after students start attempting' : undefined}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add question
            </button>
            <button
              type="button"
              onClick={() => publishAssessmentMutation.mutate(!assessment.isPublished)}
              disabled={publishAssessmentMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {assessment.isPublished ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        }
      >
        <div className="grid gap-5">
          <div className="grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <AssessmentStatusPill isPublished={assessment.isPublished} />
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {formatAssessmentTypeLabel(assessment.type)}
                </span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {assessment.counts.questions} questions
                </span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {assessment.counts.attempts} attempts
                </span>
              </div>
              <p className="text-sm text-slate-700">
                {assessment.course.title} · {assessment.course.classRoom.name} · {assessment.course.academicYear.name}
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                <span className="rounded-full bg-brand-100 px-2.5 py-1">
                  {assessment.maxAttempts} max attempts
                </span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1">
                  {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} min timer` : 'No timer'}
                </span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1">
                  {formatAssessmentDateTime(assessment.dueAt)}
                </span>
              </div>
            </div>

            {assessmentEditingLocked || questionEditingLocked ? (
              <div className="grid max-w-sm gap-2 text-sm text-slate-600">
                {assessmentEditingLocked ? (
                  <p>Assessment settings are locked after students start attempting it.</p>
                ) : null}
                {questionEditingLocked ? (
                  <p>Questions are locked once the assessment is published or after students start attempting it.</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {assessment.instructions ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
              <h3 className="text-sm font-bold text-slate-900">Instructions</h3>
              <div className="mt-3">
                <RichContent html={assessment.instructions} />
              </div>
            </div>
          ) : null}

          <div id="questions" className="grid gap-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <BookCheck className="h-5 w-5 text-slate-600" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900">Questions</h3>
            </div>

            {assessment.questions.length ? (
              assessment.questions.map((question) => (
                <article key={question.id} className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        Question {question.sequence} · {question.type === 'OPEN_TEXT' ? 'Open text' : 'MCQ'} · {question.points} pt{question.points === 1 ? '' : 's'}
                      </p>
                      <p className="text-sm text-slate-900">{question.prompt}</p>
                    </div>
                    {!questionEditingLocked ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openQuestionModal(question)}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionToDelete({
                              id: question.id,
                              prompt: question.prompt,
                              sequence: question.sequence,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2">
                    {question.type === 'OPEN_TEXT' ? (
                      <div className="rounded-xl border border-dashed border-brand-200 bg-white px-3 py-3 text-sm text-slate-700">
                        Students will type a free-text answer for this question.
                      </div>
                    ) : (
                      question.options.map((option) => (
                        <div
                          key={option.id}
                          className={
                            option.isCorrect
                              ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900'
                              : 'rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-slate-800'
                          }
                        >
                          {option.label}
                        </div>
                      ))
                    )}
                  </div>

                  {question.explanation ? (
                    <p className="mt-3 text-sm text-slate-600">Explanation: {question.explanation}</p>
                  ) : null}
                </article>
              ))
            ) : (
              <EmptyState
                title="No questions yet"
                message="Add the first question, then publish the assessment when it is ready."
              />
            )}
          </div>

          <div id="results" className="grid gap-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-slate-600" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900">Results</h3>
            </div>

            {resultsQuery.isPending ? (
              <div className="h-48 animate-pulse rounded-2xl bg-brand-50" />
            ) : resultsQuery.isError ? (
              <StateView
                title="Could not load results"
                message="Retry to view submitted attempts."
                action={
                  <button
                    type="button"
                    onClick={() => void resultsQuery.refetch()}
                    className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                }
              />
            ) : resultRows.length ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-full border-separate border-spacing-0 text-left text-sm text-slate-800">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      <th className="border-b border-brand-100 px-3 py-3">Student</th>
                      <th className="border-b border-brand-100 px-3 py-3">Attempt</th>
                      <th className="border-b border-brand-100 px-3 py-3">Score</th>
                      <th className="border-b border-brand-100 px-3 py-3">Submitted</th>
                      <th className="border-b border-brand-100 px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultRows.map((attempt) => (
                      <tr key={attempt.id}>
                        <td className="border-b border-brand-100 px-3 py-3 font-medium text-slate-900">
                          {attempt.student.firstName} {attempt.student.lastName}
                        </td>
                        <td className="border-b border-brand-100 px-3 py-3">#{attempt.attemptNumber}</td>
                        <td className="border-b border-brand-100 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span>
                              {assessment.type === 'GENERAL' || assessment.type === 'PSYCHOMETRIC'
                                ? `${attempt.score}/${attempt.maxScore ?? 0}`
                                : attempt.manualScore !== null
                                  ? `${attempt.score}/${attempt.maxScore ?? 0}`
                                  : 'Awaiting review'}
                            </span>
                            {attempt.manualScore !== null ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                Manual
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="border-b border-brand-100 px-3 py-3">
                          {formatAssessmentDateTime(attempt.submittedAt)}
                        </td>
                        <td className="border-b border-brand-100 px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openReviewModal(attempt.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="Results will appear here after students submit their assessments." />
            )}
          </div>
        </div>
      </SectionCard>

      <Modal
        open={isAssessmentEditOpen}
        title="Edit assessment"
        description="Update the instructions, lesson link, timing, and attempt settings for this assessment."
        onClose={() => setIsAssessmentEditOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAssessmentEditOpen(false)}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={assessmentForm.handleSubmit((values) => updateAssessmentMutation.mutate(values))}
              disabled={updateAssessmentMutation.isPending}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        }
      >
        <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm text-slate-700">
            {assessment.course.title} · {assessment.course.classRoom.name} · {assessment.course.academicYear.name}
          </div>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Lesson (optional)</span>
            <select
              {...assessmentForm.register('lessonId')}
              className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            >
              <option value="">Course-level assessment</option>
              {lessonOptions.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.sequence}. {lesson.title}
                </option>
              ))}
            </select>
            {courseDetailQuery.isError ? (
              <span className="text-xs text-amber-700">Could not refresh course lessons. You can still save the current lesson selection.</span>
            ) : null}
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
              {assessmentForm.formState.errors.timeLimitMinutes ? (
                <span className="text-xs text-rose-600">{assessmentForm.formState.errors.timeLimitMinutes.message}</span>
              ) : null}
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
              {assessmentForm.formState.errors.maxAttempts ? (
                <span className="text-xs text-rose-600">{assessmentForm.formState.errors.maxAttempts.message}</span>
              ) : null}
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={isQuestionOpen}
        title={editingQuestionId ? 'Edit question' : 'Add question'}
        description="Use MCQ for auto-corrected tests or open text for written responses."
        onClose={closeQuestionModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeQuestionModal}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={questionForm.handleSubmit((values) =>
                editingQuestionId ? updateQuestionMutation.mutate(values) : addQuestionMutation.mutate(values),
              )}
              disabled={addQuestionMutation.isPending || updateQuestionMutation.isPending}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editingQuestionId ? 'Save changes' : 'Save question'}
            </button>
          </div>
        }
      >
        <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Question prompt</span>
            <textarea
              {...questionForm.register('prompt')}
              rows={3}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Explanation (optional)</span>
            <textarea
              {...questionForm.register('explanation')}
              rows={2}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400"
              placeholder="Shown after submission to explain the answer."
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Question type</span>
            <select
              {...questionForm.register('type')}
              className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            >
              <option value="MCQ_SINGLE">Multiple choice</option>
              <option value="OPEN_TEXT">Open text</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Points</span>
            <input
              type="number"
              min={1}
              max={100}
              {...questionForm.register('points')}
              className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
            />
          </label>

          {selectedQuestionType === 'MCQ_SINGLE' ? (
            <div className="grid gap-3">
              {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((fieldName, index) => (
                <label key={fieldName} className="grid gap-1 text-sm font-medium text-slate-700">
                  <span>Option {String.fromCharCode(65 + index)}</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      aria-label={`Mark option ${String.fromCharCode(65 + index)} as correct`}
                      checked={questionForm.watch('correctOptionIndex') === index}
                      onChange={() => questionForm.setValue('correctOptionIndex', index)}
                      className="h-4 w-4"
                    />
                    <input
                      {...questionForm.register(fieldName)}
                      className="h-11 flex-1 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                    />
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/70 px-3 py-3 text-sm text-slate-700">
              Students will see a text box and answer this question in their own words.
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(questionToDelete)}
        title="Delete question"
        description="This removes the question from the assessment. Student attempts must not exist."
        onClose={() => setQuestionToDelete(null)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setQuestionToDelete(null)}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => questionToDelete && deleteQuestionMutation.mutate(questionToDelete.id)}
              disabled={deleteQuestionMutation.isPending}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Delete question
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-700">
          Question {questionToDelete?.sequence}: {questionToDelete?.prompt}
        </p>
      </Modal>

      <Modal
        open={isDeleteAssessmentOpen}
        title="Delete assessment"
        description="This permanently removes the assessment and all of its questions. Students must not have started any attempts."
        onClose={() => setIsDeleteAssessmentOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteAssessmentOpen(false)}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteAssessmentMutation.mutate()}
              disabled={deleteAssessmentMutation.isPending}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Delete assessment
            </button>
          </div>
        }
      >
        <div className="grid gap-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{assessment.title}</p>
          <p>This action cannot be undone.</p>
        </div>
      </Modal>

      <Modal
        open={isRegradeOpen}
        title="Review attempt"
        description="Inspect auto-grading and override points where needed."
        onClose={closeRegradeModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeRegradeModal}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveRegrade}
              disabled={!selectedAttempt || regradeAttemptMutation.isPending || reviewAttemptQuery.isPending}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save manual score
            </button>
          </div>
        }
      >
        {reviewAttemptQuery.isPending ? (
          <div className="grid gap-3">
            <div className="h-20 animate-pulse rounded-2xl bg-brand-50" />
            <div className="h-44 animate-pulse rounded-2xl bg-brand-50" />
          </div>
        ) : reviewAttemptQuery.isError ? (
          <StateView
            title="Could not load attempt"
            message="Retry to review this student's answers."
            action={
              <button
                type="button"
                onClick={() => void reviewAttemptQuery.refetch()}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            }
          />
        ) : selectedAttempt ? (
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Student</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedAttempt.student?.firstName} {selectedAttempt.student?.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Score</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedAttempt.assessment.type === 'GENERAL' || selectedAttempt.assessment.type === 'PSYCHOMETRIC'
                    ? `${selectedAttempt.score}/${selectedAttempt.maxScore ?? 0}`
                    : selectedAttempt.manualScore !== null
                      ? `${selectedAttempt.score}/${selectedAttempt.maxScore ?? 0}`
                      : 'Awaiting manual review'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Submitted</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatAssessmentDateTime(selectedAttempt.submittedAt)}</p>
              </div>
            </div>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Teacher feedback</span>
              <textarea
                value={regradeFeedback}
                onChange={(event) => setRegradeFeedback(event.target.value)}
                rows={3}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400"
                placeholder="Optional feedback about the manual review."
              />
            </label>

            <div className="grid gap-3">
              {selectedAttempt.questions.map((question) => (
                <article key={question.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Question {question.sequence} · max {question.points}
                      </p>
                      <p className="mt-2 text-sm text-slate-800">{question.prompt}</p>
                    </div>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      <span>Manual points</span>
                      <input
                        type="number"
                        min={0}
                        max={question.points}
                        value={regradePoints[question.id] ?? String(question.manualPointsAwarded ?? question.pointsAwarded ?? 0)}
                        onChange={(event) =>
                          setRegradePoints((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        className="h-11 w-28 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {question.type === 'OPEN_TEXT' ? (
                      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-3 text-sm text-slate-800">
                        {question.textResponse?.trim() || 'No answer submitted.'}
                      </div>
                    ) : (
                      question.options.map((option) => (
                        <div
                          key={option.id}
                          className={
                            option.id === question.selectedOptionId
                              ? 'rounded-xl border border-brand-300 bg-brand-50 px-3 py-2 text-sm text-slate-900'
                              : 'rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-slate-700'
                          }
                        >
                          <span className="font-medium">{option.label}</span>
                          {option.isCorrect ? (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                              Correct answer
                            </span>
                          ) : null}
                          {option.id === question.selectedOptionId ? (
                            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                              Selected
                            </span>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                    <span className="rounded-full bg-brand-100 px-2.5 py-1">
                      Auto {question.pointsAwarded ?? 0}/{question.points}
                    </span>
                    {question.manualPointsAwarded !== null ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">
                        Manual {question.manualPointsAwarded}/{question.points}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="No attempt selected" message="Choose a submitted attempt to review." />
        )}
      </Modal>
    </div>
  );
}
