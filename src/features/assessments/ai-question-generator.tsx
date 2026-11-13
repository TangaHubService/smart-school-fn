import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AppDrawer } from '../../components/drawer';
import { useToast } from '../../components/toast';
import { ApiClientError } from '../../types/api';
import {
  generateAssessmentQuestionsWithAiApi,
  type AiDifficulty,
  type AiLanguage,
  type AiQuestionType,
  type GeneratedQuestion,
} from '../ai-assistant/ai-teacher.api';
import { bulkAddAssessmentQuestionsApi } from './assessments.api';

/** A generated question while the teacher edits it (key keeps React rows stable). */
interface DraftQuestion extends GeneratedQuestion {
  key: string;
}

let draftKey = 0;
const nextKey = () => `ai-q-${++draftKey}`;

const inputClass =
  'w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400';

function questionProblem(q: DraftQuestion): string | null {
  if (q.prompt.trim().length < 2) return 'Write the question';
  if (q.type === 'MCQ_SINGLE') {
    const filled = q.options.filter((o) => o.label.trim());
    if (filled.length < 2) return 'Add at least two options';
    if (filled.filter((o) => o.isCorrect).length !== 1) return 'Mark exactly one correct option';
  }
  return null;
}

/**
 * Step 1: the teacher picks lessons and settings and asks the AI for questions.
 * Step 2: every question is editable (text, options, correct answer, points, explanation)
 * and can be removed. Only the questions the teacher keeps are added to the test.
 */
export function AiQuestionGenerator({
  open,
  onClose,
  accessToken,
  assessmentId,
  lessons,
  defaultLessonId,
}: {
  open: boolean;
  onClose: () => void;
  accessToken: string;
  assessmentId: string;
  lessons: Array<{ id: string; title: string }>;
  defaultLessonId?: string | null;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [lessonIds, setLessonIds] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<AiQuestionType[]>(['MCQ_SINGLE']);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('mixed');
  const [language, setLanguage] = useState<AiLanguage>('en');
  const [instructions, setInstructions] = useState('');
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [basedOn, setBasedOn] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setLessonIds(defaultLessonId ? [defaultLessonId] : []);
    }
  }, [open, defaultLessonId]);

  const generateMutation = useMutation({
    mutationFn: () =>
      generateAssessmentQuestionsWithAiApi(accessToken, {
        assessmentId,
        lessonIds,
        count,
        types,
        difficulty,
        language,
        instructions: instructions.trim() || undefined,
      }),
    onSuccess: (result) => {
      setDrafts((current) => [
        ...current,
        ...result.questions.map((q) => ({
          ...q,
          options: q.type === 'MCQ_SINGLE' ? q.options : [],
          key: nextKey(),
        })),
      ]);
      setBasedOn(result.basedOnLessons);
    },
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'AI could not write questions',
        message: (e as ApiClientError).message,
      }),
  });

  const addMutation = useMutation({
    mutationFn: (questions: DraftQuestion[]) =>
      bulkAddAssessmentQuestionsApi(accessToken, assessmentId, {
        questions: questions.map((q) => ({
          type: q.type,
          prompt: q.prompt.trim(),
          points: q.points,
          explanation: q.explanation?.trim() || undefined,
          options:
            q.type === 'MCQ_SINGLE'
              ? q.options
                  .filter((o) => o.label.trim())
                  .map((o, i) => ({ label: o.label.trim(), isCorrect: o.isCorrect, sequence: i + 1 }))
              : [],
        })),
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-detail', assessmentId] });
      void queryClient.invalidateQueries({ queryKey: ['assessment-results', assessmentId] });
      showToast({
        type: 'success',
        title: 'Questions added',
        message: `${result.createdCount} question${result.createdCount === 1 ? '' : 's'} added. You can still edit them on this page before publishing.`,
      });
      setDrafts([]);
      setBasedOn([]);
      onClose();
    },
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not add questions',
        message: (e as ApiClientError).message,
      }),
  });

  function update(key: string, patch: Partial<DraftQuestion>) {
    setDrafts((current) => current.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function changeType(q: DraftQuestion, type: AiQuestionType) {
    update(q.key, {
      type,
      options:
        type === 'MCQ_SINGLE'
          ? q.options.length
            ? q.options
            : [
                { label: '', isCorrect: true },
                { label: '', isCorrect: false },
              ]
          : [],
    });
  }

  function toggleType(type: AiQuestionType) {
    setTypes((current) =>
      current.includes(type)
        ? current.length > 1
          ? current.filter((t) => t !== type)
          : current
        : [...current, type]
    );
  }

  const problems = drafts.map(questionProblem);
  const firstProblem = problems.findIndex(Boolean);
  const busy = generateMutation.isPending || addMutation.isPending;

  return (
    <AppDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="wide"
      title="Generate questions with AI"
      description="AI writes questions from your lessons. Check and edit each one; only the questions you keep are added."
      footer={
        drafts.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              {firstProblem >= 0
                ? `Question ${firstProblem + 1}: ${problems[firstProblem]}`
                : `${drafts.length} question${drafts.length === 1 ? '' : 's'} ready`}
            </span>
            <button
              type="button"
              disabled={busy || firstProblem >= 0}
              onClick={() => addMutation.mutate(drafts)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {addMutation.isPending
                ? 'Adding…'
                : `Add ${drafts.length} question${drafts.length === 1 ? '' : 's'} to the test`}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="grid gap-5">
        <section className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Base the questions on</span>
            {lessons.length ? (
              <div className="grid max-h-40 gap-1 overflow-auto rounded-lg border border-brand-200 bg-white p-2">
                {lessons.map((lesson) => (
                  <label key={lesson.id} className="flex items-center gap-2 text-sm font-normal">
                    <input
                      type="checkbox"
                      checked={lessonIds.includes(lesson.id)}
                      onChange={(e) =>
                        setLessonIds((current) =>
                          e.target.checked
                            ? [...current, lesson.id]
                            : current.filter((id) => id !== lesson.id)
                        )
                      }
                    />
                    <span className="truncate">{lesson.title}</span>
                  </label>
                ))}
              </div>
            ) : null}
            <span className="text-xs font-normal text-slate-500">
              {lessonIds.length
                ? `${lessonIds.length} lesson${lessonIds.length === 1 ? '' : 's'} selected`
                : 'No lesson selected: the AI uses the whole course.'}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Number of questions
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 20))}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Difficulty
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as AiDifficulty)}
                className={inputClass}
              >
                <option value="mixed">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Language
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as AiLanguage)}
                className={inputClass}
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="rw">Kinyarwanda</option>
              </select>
            </label>
          </div>

          <fieldset className="grid gap-1 text-sm font-medium text-slate-700">
            <legend className="mb-1">Question types</legend>
            <div className="flex flex-wrap gap-4 font-normal">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={types.includes('MCQ_SINGLE')}
                  onChange={() => toggleType('MCQ_SINGLE')}
                />
                Multiple choice
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={types.includes('OPEN_TEXT')}
                  onChange={() => toggleType('OPEN_TEXT')}
                />
                Written answer
              </label>
            </div>
          </fieldset>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Extra instructions (optional)
            <textarea
              rows={2}
              maxLength={1000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. focus on word problems; use examples from the market"
              className={inputClass}
            />
          </label>

          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {drafts.length ? (
              <Plus className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {generateMutation.isPending
              ? 'Writing questions… (up to a minute)'
              : drafts.length
                ? 'Generate more'
                : 'Generate questions'}
          </button>
        </section>

        {drafts.length ? (
          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Review and edit</h3>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Discard all generated questions?')) {
                    setDrafts([]);
                    setBasedOn([]);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Discard all
              </button>
            </div>
            {basedOn.length ? (
              <p className="text-xs text-slate-500">Based on: {basedOn.join(', ')}</p>
            ) : null}

            {drafts.map((q, index) => (
              <article
                key={q.key}
                className={`grid gap-3 rounded-2xl border bg-white p-4 ${problems[index] ? 'border-amber-300' : 'border-brand-100'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
                    Question {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={q.type}
                      onChange={(e) => changeType(q, e.target.value as AiQuestionType)}
                      className="rounded-lg border border-brand-200 px-2 py-1 text-xs"
                      aria-label={`Question ${index + 1} type`}
                    >
                      <option value="MCQ_SINGLE">Multiple choice</option>
                      <option value="OPEN_TEXT">Written answer</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      Points
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={q.points}
                        onChange={(e) =>
                          update(q.key, {
                            points: Math.min(Math.max(Number(e.target.value) || 1, 1), 100),
                          })
                        }
                        className="w-16 rounded-lg border border-brand-200 px-2 py-1 text-xs"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setDrafts((current) => current.filter((d) => d.key !== q.key))}
                      className="rounded-lg border border-red-200 p-1 text-red-600 hover:bg-red-50"
                      aria-label={`Remove question ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => update(q.key, { prompt: e.target.value })}
                  className={inputClass}
                  aria-label={`Question ${index + 1} text`}
                />

                {q.type === 'MCQ_SINGLE' ? (
                  <div className="grid gap-2">
                    <span className="text-xs text-slate-500">Select the correct answer</span>
                    {q.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`${q.key}-correct`}
                          checked={option.isCorrect}
                          onChange={() =>
                            update(q.key, {
                              options: q.options.map((o, i) => ({ ...o, isCorrect: i === optionIndex })),
                            })
                          }
                          aria-label={`Option ${optionIndex + 1} is correct`}
                        />
                        <input
                          value={option.label}
                          onChange={(e) =>
                            update(q.key, {
                              options: q.options.map((o, i) =>
                                i === optionIndex ? { ...o, label: e.target.value } : o
                              ),
                            })
                          }
                          className={inputClass}
                          aria-label={`Option ${optionIndex + 1}`}
                        />
                        <button
                          type="button"
                          disabled={q.options.length <= 2}
                          onClick={() =>
                            update(q.key, { options: q.options.filter((_, i) => i !== optionIndex) })
                          }
                          className="rounded-lg p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                          aria-label={`Remove option ${optionIndex + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    {q.options.length < 6 ? (
                      <button
                        type="button"
                        onClick={() =>
                          update(q.key, { options: [...q.options, { label: '', isCorrect: false }] })
                        }
                        className="justify-self-start text-xs font-semibold text-brand-700 hover:underline"
                      >
                        + Add option
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  {q.type === 'MCQ_SINGLE' ? 'Explanation' : 'Model answer / marking guide'}
                  <textarea
                    rows={2}
                    value={q.explanation ?? ''}
                    onChange={(e) => update(q.key, { explanation: e.target.value })}
                    className={inputClass}
                  />
                </label>

                {problems[index] ? (
                  <p className="text-xs font-medium text-amber-700">{problems[index]}</p>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </AppDrawer>
  );
}
