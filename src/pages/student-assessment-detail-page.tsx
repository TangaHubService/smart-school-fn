import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle, PlayCircle, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { RichContent } from '../components/rich-content';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  getMyAssessmentDetailApi,
  startAssessmentAttemptApi,
} from '../features/assessments/assessments.api';
import { formatAssessmentDateTime, formatAssessmentTypeLabel } from '../features/assessments/assessment-ui';

export function StudentAssessmentDetailPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { assessmentId = '' } = useParams();
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [startStep, setStartStep] = useState<0 | 1>(0);
  const [examAccessCode, setExamAccessCode] = useState('');

  const assessmentQuery = useQuery({
    queryKey: ['student-assessment-detail', assessmentId || null],
    enabled: Boolean(assessmentId),
    queryFn: () => getMyAssessmentDetailApi(auth.accessToken!, assessmentId),
  });

  const startAttemptMutation = useMutation({
    mutationFn: () =>
      startAssessmentAttemptApi(
        auth.accessToken!,
        assessmentId,
        assessment?.requiresAccessCode
          ? { accessCode: examAccessCode.trim() }
          : undefined,
      ),
    onSuccess: (attempt) => {
      void queryClient.invalidateQueries({ queryKey: ['student-assessments'] });
      void queryClient.invalidateQueries({ queryKey: ['student-assessment-detail', assessmentId] });
      navigate(`/student/assessments/${assessmentId}/attempts/${attempt.id}`);
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not open test',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const assessment = assessmentQuery.data ?? null;

  function openStartModal() {
    setStartStep(0);
    setExamAccessCode('');
    setIsStartOpen(true);
  }

  function closeStartModal() {
    if (startAttemptMutation.isPending) {
      return;
    }

    setIsStartOpen(false);
    setStartStep(0);
  }

  if (assessmentQuery.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-16 animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
        <div className="h-[520px] animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
      </div>
    );
  }

  if (assessmentQuery.isError || !assessment) {
    return (
      <StateView
        title="Could not load test"
        message="Retry to open this test or return to the list."
        action={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/assessments')}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to tests
            </button>
            <button
              type="button"
              onClick={() => void assessmentQuery.refetch()}
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
        subtitle="Read the instructions first, then start the test when you are ready."
        action={
          <button
            type="button"
            onClick={() => navigate('/student/assessments')}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to tests
          </button>
        }
      >
        <div className="grid gap-5">
          <div className="grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                <span className="rounded-full bg-brand-100 px-2.5 py-1">{formatAssessmentTypeLabel(assessment.type)}</span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1">{assessment.counts.questions} questions</span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1">{assessment.maxAttempts} attempts</span>
                <span className="rounded-full bg-brand-100 px-2.5 py-1">
                  {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} min timer` : 'No timer'}
                </span>
              </div>
              <p className="text-sm text-slate-700">
                {assessment.course.title} · {assessment.course.classRoom.name} · {assessment.course.academicYear.name}
              </p>
              {assessment.instructions ? (
                <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
                  <h3 className="text-sm font-bold text-slate-900">Instructions</h3>
                  <div className="mt-3">
                    <RichContent html={assessment.instructions} />
                  </div>
                </div>
              ) : (
                <EmptyState message="No extra instructions were added for this test." />
              )}
            </div>

            <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Due</p>
                <p className="mt-2 font-semibold text-slate-900">{formatAssessmentDateTime(assessment.dueAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Latest result</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {assessment.latestAttempt?.status === 'SUBMITTED'
                    ? assessment.type === 'GENERAL' || assessment.type === 'PSYCHOMETRIC'
                      ? `${assessment.latestAttempt.score}/${assessment.latestAttempt.maxScore ?? 0}`
                      : assessment.latestAttempt.manualScore !== null
                        ? `${assessment.latestAttempt.score}/${assessment.latestAttempt.maxScore ?? 0}`
                        : 'Awaiting review'
                    : assessment.latestAttempt?.status === 'IN_PROGRESS'
                      ? 'In progress'
                      : 'Not started'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Student</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {assessment.student.firstName} {assessment.student.lastName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {assessment.latestAttempt?.status === 'IN_PROGRESS' ? (
              <button
                type="button"
                onClick={() => navigate(`/student/assessments/${assessment.id}/attempts/${assessment.latestAttempt!.id}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Continue test
              </button>
            ) : (
              <button
                type="button"
                onClick={openStartModal}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                {assessment.latestAttempt?.status === 'SUBMITTED' ? 'Start another attempt' : 'Start test'}
              </button>
            )}

            {assessment.latestAttempt?.status === 'SUBMITTED' ? (
              <button
                type="button"
                onClick={() => navigate(`/student/assessments/${assessment.id}/attempts/${assessment.latestAttempt!.id}`)}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Review result
              </button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <Modal
        open={isStartOpen}
        title={startStep === 0 ? 'Test instructions' : 'Ready to start?'}
        description={
          startStep === 0
            ? 'Read these instructions before you begin.'
            : 'When you start, the test will open one question at a time.'
        }
        onClose={closeStartModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeStartModal}
              className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            {startStep === 0 ? (
              <button
                type="button"
                onClick={() => setStartStep(1)}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startAttemptMutation.mutate()}
                disabled={
                  startAttemptMutation.isPending ||
                  (Boolean(assessment.requiresAccessCode) && examAccessCode.trim().length < 4)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {startAttemptMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                )}
                Start now
              </button>
            )}
          </div>
        }
      >
        {startStep === 0 ? (
          <div className="grid gap-4 text-sm text-slate-700">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-brand-100 px-2.5 py-1">{formatAssessmentTypeLabel(assessment.type)}</span>
              <span className="rounded-full bg-brand-100 px-2.5 py-1">{assessment.counts.questions} questions</span>
              <span className="rounded-full bg-brand-100 px-2.5 py-1">
                {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} minute timer` : 'No timer'}
              </span>
              <span className="rounded-full bg-brand-100 px-2.5 py-1">{assessment.maxAttempts} attempts</span>
            </div>
            {assessment.instructions ? (
              <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
                <RichContent html={assessment.instructions} />
              </div>
            ) : (
              <EmptyState message="No extra instructions were added for this test." />
            )}
          </div>
        ) : (
          <div className="grid gap-3 text-sm text-slate-700">
            <p>Make sure you have enough time and a stable connection before you begin.</p>
            <ul className="grid gap-2 text-slate-700">
              <li>Questions are shown one at a time.</li>
              <li>Your answers save automatically while you work.</li>
              <li>Use Next to move forward until you reach Finish test.</li>
            </ul>
            {assessment.requiresAccessCode ? (
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Exam access code
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  value={examAccessCode}
                  onChange={(e) => setExamAccessCode(e.target.value)}
                  placeholder="Enter the code from your teacher"
                  className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none ring-brand-200 focus:ring-2"
                />
              </label>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
