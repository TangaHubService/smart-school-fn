import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyAssessmentsApi } from '../features/assessments/assessments.api';
import { formatAssessmentDateTime, formatAssessmentTypeLabel } from '../features/assessments/assessment-ui';

export function StudentAssessmentsPage() {
  const { t } = useTranslation('student');
  const auth = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const myAssessmentsQuery = useQuery({
    queryKey: ['student-assessments', search, page],
    queryFn: () =>
      listMyAssessmentsApi(auth.accessToken!, {
        q: search || undefined,
        page,
        pageSize: 20,
      }),
  });

  const assessmentItems = myAssessmentsQuery.data?.items ?? [];

  return (
    <div className="grid gap-5">
      <SectionCard
        title={t('assessments.title')}
        subtitle={t('assessments.subtitle')}
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>{t('assessments.searchLabel')}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder={t('assessments.searchPlaceholder')}
                className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
              />
            </label>

            <div className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              {myAssessmentsQuery.data?.student.firstName ?? t('assessments.studentFallback')} · {myAssessmentsQuery.data?.student.studentCode ?? t('assessments.noCode')}
            </div>
          </div>

          {myAssessmentsQuery.isPending ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
              ))}
            </div>
          ) : null}

          {myAssessmentsQuery.isError ? (
            <StateView
              title={t('assessments.errorTitle')}
              message={t('assessments.errorMessage')}
              action={
                <button
                  type="button"
                  onClick={() => void myAssessmentsQuery.refetch()}
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  {t('assessments.retry')}
                </button>
              }
            />
          ) : null}

          {!myAssessmentsQuery.isPending && !myAssessmentsQuery.isError ? (
            assessmentItems.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assessmentItems.map((assessment) => (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => navigate(`/student/assessments/${assessment.id}`)}
                    className="grid min-h-[250px] grid-rows-[auto_auto_1fr_auto] gap-4 overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-lg font-bold leading-6 text-slate-900">
                          {assessment.title}
                        </p>
                        <p className="mt-1 break-words text-sm leading-5 text-slate-600">
                          {assessment.course.title}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {assessment.counts.questions} Qs
                        </span>
                        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {formatAssessmentTypeLabel(assessment.type)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-700">
                      <p className="break-words">{assessment.course.classRoom.name}</p>
                      <p className="break-words">{formatAssessmentDateTime(assessment.dueAt)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 self-start text-xs font-semibold text-slate-700">
                      <span className="rounded-full bg-brand-100 px-2.5 py-1">
                        {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} min` : 'No timer'}
                      </span>
                      <span className="rounded-full bg-brand-100 px-2.5 py-1">
                        {assessment.maxAttempts} attempts
                      </span>
                      {assessment.latestAttempt?.status === 'SUBMITTED' ? (
                        assessment.type === 'GENERAL' || assessment.type === 'PSYCHOMETRIC' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">
                            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                            {assessment.latestAttempt.score}/{assessment.latestAttempt.maxScore ?? 0}
                          </span>
                        ) : assessment.latestAttempt.manualScore !== null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">
                            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                            {assessment.latestAttempt.score}/{assessment.latestAttempt.maxScore ?? 0}
                          </span>
                        ) : (
                          <span className="rounded-full bg-brand-100 px-2.5 py-1">{t('assessments.awaitingReview')}</span>
                        )
                      ) : assessment.latestAttempt?.status === 'IN_PROGRESS' ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">{t('assessments.inProgress')}</span>
                      ) : null}
                    </div>

                    <div className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-800">
                      {t('assessments.openTest')}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title={t('assessments.emptyTitle')} message={t('assessments.emptyMessage')} />
            )
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
