import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  LoaderCircle,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { RichContent } from '../components/rich-content';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  AssessmentAttemptDetail,
  getAssessmentAttemptApi,
  saveAssessmentAttemptAnswersApi,
  submitAssessmentAttemptApi,
} from '../features/assessments/assessments.api';
import { formatAssessmentDateTime, formatAssessmentTypeLabel } from '../features/assessments/assessment-ui';

interface DraftAnswer {
  selectedOptionId: string | null;
  textResponse: string;
}

function extractAnswerMap(attempt: AssessmentAttemptDetail) {
  return Object.fromEntries(
    attempt.questions.map((question) => [
      question.id,
      {
        selectedOptionId: question.selectedOptionId ?? null,
        textResponse: question.textResponse ?? '',
      },
    ]),
  ) as Record<string, DraftAnswer>;
}

function serializeAnswerMap(answers: Record<string, DraftAnswer>) {
  return JSON.stringify(
    Object.entries(answers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([questionId, value]) => ({
        questionId,
        selectedOptionId: value.selectedOptionId,
        textResponse: value.textResponse.trim() || null,
      })),
  );
}

function isQuestionAnswered(
  question: AssessmentAttemptDetail['questions'][number],
  answer: DraftAnswer | undefined,
) {
  if (!answer) {
    return false;
  }

  return question.type === 'OPEN_TEXT'
    ? Boolean(answer.textResponse.trim())
    : Boolean(answer.selectedOptionId);
}

function buildAnswerPayload(
  attempt: AssessmentAttemptDetail,
  draftAnswers: Record<string, DraftAnswer>,
) {
  return attempt.questions.map((question) => ({
    questionId: question.id,
    selectedOptionId: question.type === 'MCQ_SINGLE' ? (draftAnswers[question.id]?.selectedOptionId ?? null) : null,
    textResponse: question.type === 'OPEN_TEXT' ? (draftAnswers[question.id]?.textResponse?.trim() || null) : null,
  }));
}

function formatTimer(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function StudentAssessmentAttemptPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { assessmentId = '', attemptId = '' } = useParams();

  const [attempt, setAttempt] = useState<AssessmentAttemptDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, DraftAnswer>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lastSavedAnswersRef = useRef('');

  const attemptQuery = useQuery({
    queryKey: ['student-assessment-attempt', attemptId || null],
    enabled: Boolean(attemptId),
    queryFn: () => getAssessmentAttemptApi(auth.accessToken!, attemptId),
  });

  const saveAnswersMutation = useMutation({
    mutationFn: (answers: Array<{ questionId: string; selectedOptionId: string | null; textResponse?: string | null }>) =>
      saveAssessmentAttemptAnswersApi(auth.accessToken!, attemptId, answers),
    onSuccess: (updatedAttempt) => {
      setAttempt(updatedAttempt);
      lastSavedAnswersRef.current = serializeAnswerMap(draftAnswers);
      setSaveState('saved');
      void queryClient.invalidateQueries({ queryKey: ['student-assessments'] });
      void queryClient.invalidateQueries({ queryKey: ['student-assessment-detail', assessmentId] });
    },
    onError: (error) => {
      setSaveState('error');
      showToast({
        type: 'error',
        title: 'Could not save answers',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const submitAttemptMutation = useMutation({
    mutationFn: () => submitAssessmentAttemptApi(auth.accessToken!, attemptId),
    onSuccess: (submittedAttempt) => {
      setAttempt(submittedAttempt);
      const nextAnswers = extractAnswerMap(submittedAttempt);
      setDraftAnswers(nextAnswers);
      lastSavedAnswersRef.current = serializeAnswerMap(nextAnswers);
      setSaveState('saved');
      void queryClient.invalidateQueries({ queryKey: ['student-assessments'] });
      void queryClient.invalidateQueries({ queryKey: ['student-assessment-detail', assessmentId] });
      showToast({
        type: 'success',
        title:
          submittedAttempt.assessment.type === 'OPENENDED' || submittedAttempt.assessment.type === 'INTERVIEW'
            ? 'Responses submitted'
            : 'Test finished',
        message:
          submittedAttempt.assessment.type === 'OPENENDED' || submittedAttempt.assessment.type === 'INTERVIEW'
            ? 'Your written responses were submitted successfully.'
            : 'Your answers were submitted successfully.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not submit test',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  useEffect(() => {
    if (!attemptQuery.data) {
      return;
    }

    setAttempt(attemptQuery.data);
    const nextAnswers = extractAnswerMap(attemptQuery.data);
    setDraftAnswers(nextAnswers);
    lastSavedAnswersRef.current = serializeAnswerMap(nextAnswers);
    setSaveState(attemptQuery.data.status === 'SUBMITTED' ? 'saved' : 'idle');

    const firstUnansweredIndex = attemptQuery.data.questions.findIndex(
      (question) => !isQuestionAnswered(question, nextAnswers[question.id]),
    );
    setCurrentQuestionIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
  }, [attemptQuery.data?.id, attemptQuery.data?.status]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return;
    }

    const payload = buildAnswerPayload(attempt, draftAnswers);
    const serialized = JSON.stringify(payload);

    if (serialized === lastSavedAnswersRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveState('saving');
      saveAnswersMutation.mutate(payload);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [draftAnswers, attempt?.id, attempt?.status]);

  useEffect(() => {
    if (!attempt?.assessment.timeLimitMinutes || attempt.status !== 'IN_PROGRESS') {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [attempt?.assessment.timeLimitMinutes, attempt?.status]);

  const currentQuestion = attempt?.questions[currentQuestionIndex] ?? null;
  const answeredCount = useMemo(() => {
    if (!attempt) {
      return 0;
    }

    return attempt.questions.filter((question) => isQuestionAnswered(question, draftAnswers[question.id])).length;
  }, [attempt, draftAnswers]);

  const remainingTime = useMemo(() => {
    if (!attempt?.assessment.timeLimitMinutes || attempt.status !== 'IN_PROGRESS') {
      return null;
    }

    const deadline =
      new Date(attempt.startedAt).getTime() +
      attempt.assessment.timeLimitMinutes * 60_000;

    return Math.max(0, deadline - now);
  }, [attempt, now]);

  const isLastQuestion = Boolean(attempt && currentQuestionIndex === attempt.questions.length - 1);
  const currentQuestionAnswered = Boolean(currentQuestion && isQuestionAnswered(currentQuestion, draftAnswers[currentQuestion.id]));

  async function flushDraftAnswers() {
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return attempt;
    }

    const payload = buildAnswerPayload(attempt, draftAnswers);
    const serialized = JSON.stringify(payload);

    if (serialized === lastSavedAnswersRef.current) {
      return attempt;
    }

    setSaveState('saving');
    const updatedAttempt = await saveAnswersMutation.mutateAsync(payload);
    setAttempt(updatedAttempt);
    lastSavedAnswersRef.current = serializeAnswerMap(draftAnswers);
    return updatedAttempt;
  }

  async function handleFinish() {
    try {
      await flushDraftAnswers();
      await submitAttemptMutation.mutateAsync();
    } catch {
      // Mutation handlers already report the failure.
    }
  }

  if (attemptQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-16 animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
        <div className="h-[560px] animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
      </div>
    );
  }

  if (attemptQuery.isError || !attempt) {
    return (
      <StateView
        title="Could not load test"
        message="Retry to continue this attempt or return to the test details page."
        action={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/student/assessments/${assessmentId}`)}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700"
            >
              Back to test
            </button>
            <button
              type="button"
              onClick={() => void attemptQuery.refetch()}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        }
      />
    );
  }

  if (attempt.status === 'SUBMITTED') {
    return (
      <div className="grid gap-5">
        <SectionCard
          title={attempt.assessment.title}
          subtitle="Your test is complete. Review your result and return to the test list when ready."
          action={
            <button
              type="button"
              onClick={() => navigate(`/student/assessments/${assessmentId}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to test
            </button>
          }
        >
          <div className="grid gap-5">
            <div className="grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-soft lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="grid gap-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {attempt.assessment.type === 'OPENENDED' || attempt.assessment.type === 'INTERVIEW'
                    ? 'Responses submitted successfully'
                    : 'Test finished successfully'}
                </div>
                <h2 className="text-2xl font-bold text-brand-900">
                  {attempt.assessment.type === 'GENERAL' || attempt.assessment.type === 'PSYCHOMETRIC'
                    ? `Score ${attempt.score}/${attempt.maxScore ?? 0}`
                    : attempt.manualScore !== null
                      ? `Reviewed score ${attempt.score}/${attempt.maxScore ?? 0}`
                      : 'Responses submitted'}
                </h2>
                <p className="text-sm text-brand-700">Submitted on {formatAssessmentDateTime(attempt.submittedAt)}</p>
                {attempt.assessment.type === 'OPENENDED' || attempt.assessment.type === 'INTERVIEW' ? (
                  <p className="text-sm text-brand-700">
                    {attempt.manualScore !== null ? 'Your teacher review is available below.' : 'Your teacher will review the written responses next.'}
                  </p>
                ) : null}
                {attempt.manualFeedback ? (
                  <p className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-brand-800">
                    {attempt.manualFeedback}
                  </p>
                ) : null}
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-brand-900 shadow-soft">
                <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
                Attempt #{attempt.attemptNumber}
              </div>
            </div>

            <div className="grid gap-3">
              {attempt.questions.map((question) => (
                <article key={question.id} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-brand-900">
                        Question {question.sequence} · {question.type === 'OPEN_TEXT' && question.manualPointsAwarded === null
                          ? 'Awaiting review'
                          : `${question.effectivePointsAwarded ?? 0}/${question.points}`}
                      </p>
                      <p className="mt-2 text-sm text-brand-900">{question.prompt}</p>
                    </div>
                    {question.type === 'OPEN_TEXT' ? (
                      <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                        {question.manualPointsAwarded !== null ? 'Reviewed' : 'Awaiting review'}
                      </span>
                    ) : (
                      <span
                        className={
                          question.isCorrect
                            ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900'
                            : 'rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900'
                        }
                      >
                        {question.isCorrect ? 'Correct' : 'Needs review'}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2">
                    {question.type === 'OPEN_TEXT' ? (
                      <div className="rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-3 text-sm text-brand-800">
                        {question.textResponse?.trim() || 'No answer submitted.'}
                      </div>
                    ) : (
                      question.options.map((option) => {
                        const selected = question.selectedOptionId === option.id;
                        const showCorrect = option.isCorrect;
                        const showWrong = selected && !question.isCorrect;

                        return (
                          <div
                            key={option.id}
                            className={
                              showCorrect
                                ? 'flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900'
                                : showWrong
                                  ? 'flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900'
                                  : selected
                                    ? 'flex items-start gap-3 rounded-xl border border-brand-300 bg-brand-50 px-3 py-3 text-sm text-brand-900'
                                    : 'flex items-start gap-3 rounded-xl border border-brand-100 bg-white px-3 py-3 text-sm text-brand-800'
                            }
                          >
                            <span className="flex-1">{option.label}</span>
                            {showCorrect ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
                            {showWrong ? <Circle className="h-4 w-4" aria-hidden="true" /> : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {question.explanation ? (
                    <p className="mt-3 text-sm text-brand-600">Explanation: {question.explanation}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title={attempt.assessment.title}
        subtitle="Answer one question at a time, then move to the next until you finish."
        action={
          <button
            type="button"
            onClick={() => navigate(`/student/assessments/${assessmentId}`)}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Leave test
          </button>
        }
      >
        <div className="grid gap-5">
          <div className="grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-brand-700">
                <span className="rounded-full bg-brand-100 px-2.5 py-1">
                  {formatAssessmentTypeLabel(attempt.assessment.type)}
                </span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1">
                  Question {currentQuestionIndex + 1} of {attempt.questions.length}
                </span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1">
                  {answeredCount}/{attempt.questions.length} answered
                </span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1">Attempt #{attempt.attemptNumber}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-brand-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${((currentQuestionIndex + 1) / Math.max(attempt.questions.length, 1)) * 100}%` }}
                />
              </div>
              {attempt.assessment.instructions ? (
                <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
                  <RichContent html={attempt.assessment.instructions} />
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-brand-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">Save status</p>
                <p className="mt-2 font-semibold text-brand-900">
                  {saveState === 'saving'
                    ? 'Saving...'
                    : saveState === 'saved'
                      ? 'All answers saved'
                      : saveState === 'error'
                        ? 'Save failed'
                        : 'Autosave ready'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">Due</p>
                <p className="mt-2 font-semibold text-brand-900">{formatAssessmentDateTime(attempt.assessment.dueAt)}</p>
              </div>
              {remainingTime !== null ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">Time left</p>
                  <p className="mt-2 inline-flex items-center gap-2 font-semibold text-brand-900">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {formatTimer(remainingTime)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {currentQuestion ? (
            <div className="grid gap-5 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="grid gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-500">
                  Question {currentQuestion.sequence}
                </p>
                <h2 className="text-2xl font-bold text-brand-900">{currentQuestion.prompt}</h2>
                <p className="text-sm text-brand-600">
                  {currentQuestion.type === 'OPEN_TEXT'
                    ? `Write your answer before you continue. This question is worth ${currentQuestion.points} point${currentQuestion.points === 1 ? '' : 's'}.`
                    : `Choose one answer to continue. This question is worth ${currentQuestion.points} point${currentQuestion.points === 1 ? '' : 's'}.`}
                </p>
              </div>

              <div className="grid gap-3">
                {currentQuestion.type === 'OPEN_TEXT' ? (
                  <textarea
                    value={draftAnswers[currentQuestion.id]?.textResponse ?? ''}
                    onChange={(event) =>
                      setDraftAnswers((current) => ({
                        ...current,
                        [currentQuestion.id]: {
                          selectedOptionId: null,
                          textResponse: event.target.value,
                        },
                      }))
                    }
                    rows={8}
                    placeholder="Write your answer here"
                    className="w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 text-base text-brand-900 outline-none focus:border-brand-400"
                  />
                ) : (
                  currentQuestion.options.map((option) => {
                    const selected = draftAnswers[currentQuestion.id]?.selectedOptionId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setDraftAnswers((current) => ({
                            ...current,
                            [currentQuestion.id]: {
                              selectedOptionId: option.id,
                              textResponse: '',
                            },
                          }))
                        }
                        className={
                          selected
                            ? 'flex items-start gap-3 rounded-2xl border border-brand-300 bg-brand-50 px-4 py-4 text-left text-brand-900 shadow-soft'
                            : 'flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-4 text-left text-brand-800 transition hover:border-brand-200 hover:bg-brand-50/60'
                        }
                      >
                        <span
                          className={
                            selected
                              ? 'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white'
                              : 'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700'
                          }
                        >
                          {String.fromCharCode(65 + option.sequence - 1)}
                        </span>
                        <span className="text-base font-medium">{option.label}</span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((current) => Math.max(0, current - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </button>

                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={!currentQuestionAnswered || submitAttemptMutation.isPending || saveAnswersMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {submitAttemptMutation.isPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    Finish test
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((current) => Math.min(attempt.questions.length - 1, current + 1))}
                    disabled={!currentQuestionAnswered}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Next question
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="Question not found" message="This attempt has no questions to answer." />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
