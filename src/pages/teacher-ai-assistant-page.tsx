import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MarkdownLite } from '../components/markdown-lite';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { hasPermission } from '../features/auth/auth-helpers';
import {
  type AiDifficulty,
  type AiLanguage,
  type AiQuestionType,
  type AssessmentPrepResult,
  type KnowledgeBaseCourse,
  type StudyMaterialFormat,
  type StudyMaterialResult,
  generateStudyMaterialApi,
  getAiKnowledgeBaseApi,
  getAiTeacherStatusApi,
  prepareAssessmentWithAiApi,
} from '../features/ai-assistant/ai-teacher.api';
import { assessmentsFeatureEnabled } from '../features/assessments/feature';
import { bulkAddAssessmentQuestionsApi, createAssessmentApi } from '../features/assessments/assessments.api';
import { ApiClientError } from '../types/api';

type Tab = 'study' | 'prep';

const FORMATS: Array<{ id: StudyMaterialFormat; label: string; hint: string }> = [
  { id: 'summary', label: 'Summary', hint: 'Overview and key ideas per lesson' },
  { id: 'revision-notes', label: 'Revision notes', hint: 'Short notes to study before a test' },
  { id: 'key-terms', label: 'Key terms', hint: 'Glossary: term, meaning, example' },
  { id: 'study-guide', label: 'Study guide', hint: 'Objectives, examples, practice and answers' },
];

const LANGUAGES: Array<{ id: AiLanguage; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'French' },
  { id: 'rw', label: 'Kinyarwanda' },
];

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500';

function errorMessage(e: unknown) {
  return e instanceof ApiClientError ? e.message : 'Something went wrong. Please try again.';
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'ai-material';
}

function prepToMarkdown(prep: AssessmentPrepResult, withAnswers: boolean) {
  let md = `# ${prep.title}\n\n`;
  if (prep.instructions) md += `${prep.instructions}\n\n`;
  md += `Total: ${prep.totalPoints} points\n\n`;
  prep.questions.forEach((q, i) => {
    md += `**${i + 1}. ${q.prompt}** (${q.points} pt${q.points === 1 ? '' : 's'})\n\n`;
    q.options.forEach((o, j) => {
      md += `- ${String.fromCharCode(65 + j)}. ${o.label}\n`;
    });
    if (q.options.length) md += '\n';
  });
  if (withAnswers) {
    md += `## Answer key\n\n`;
    prep.questions.forEach((q, i) => {
      const correct = q.options.findIndex((o) => o.isCorrect);
      const answer = correct >= 0 ? `${String.fromCharCode(65 + correct)}. ${q.options[correct].label}` : '';
      md += `${i + 1}. ${answer}${answer && q.explanation ? ' — ' : ''}${q.explanation ?? ''}\n`;
    });
  }
  return md;
}

/**
 * Teacher AI assistant: turns the teacher's own course content (the knowledge base) into
 * study material for learners, or into a draft assessment with an answer key.
 * Uses the platform-wide AI settings managed by the super admin.
 */
export function TeacherAiAssistantPage() {
  const auth = useAuth();
  const token = auth.accessToken!;
  const { showToast } = useToast();
  const navigate = useNavigate();
  const canPrep = assessmentsFeatureEnabled && hasPermission(auth.me, 'assessments.manage');

  const [tab, setTab] = useState<Tab>('study');
  const [courseId, setCourseId] = useState('');
  const [lessonIds, setLessonIds] = useState<string[]>([]);
  const [language, setLanguage] = useState<AiLanguage>('en');
  const [instructions, setInstructions] = useState('');
  const [format, setFormat] = useState<StudyMaterialFormat>('summary');
  const [count, setCount] = useState(10);
  const [types, setTypes] = useState<AiQuestionType[]>(['MCQ_SINGLE', 'OPEN_TEXT']);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('mixed');
  const [study, setStudy] = useState<StudyMaterialResult | null>(null);
  const [prep, setPrep] = useState<AssessmentPrepResult | null>(null);

  const statusQuery = useQuery({
    queryKey: ['ai-teacher-status'],
    queryFn: () => getAiTeacherStatusApi(token),
    enabled: Boolean(token),
  });
  const kbQuery = useQuery({
    queryKey: ['ai-teacher-knowledge-base'],
    queryFn: () => getAiKnowledgeBaseApi(token),
    enabled: Boolean(token),
  });

  const courses = kbQuery.data ?? [];
  const course: KnowledgeBaseCourse | undefined = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courseId, courses]);
  useEffect(() => setLessonIds([]), [courseId]);

  const groupedLessons = useMemo(() => {
    if (!course) return [];
    const groups = course.sections.map((s) => ({
      id: s.id,
      title: s.title,
      lessons: course.lessons.filter((l) => l.sectionId === s.id),
    }));
    const loose = course.lessons.filter((l) => !l.sectionId || !course.sections.some((s) => s.id === l.sectionId));
    if (loose.length) groups.push({ id: 'none', title: course.sections.length ? 'Other lessons' : 'Lessons', lessons: loose });
    return groups.filter((g) => g.lessons.length);
  }, [course]);

  const toggleLesson = (id: string) =>
    setLessonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const afterGenerate = () => void statusQuery.refetch();

  const studyMutation = useMutation({
    mutationFn: () =>
      generateStudyMaterialApi(token, {
        courseId,
        lessonIds,
        format,
        language,
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      }),
    onSuccess: (data) => {
      setStudy(data);
      afterGenerate();
    },
    onError: (e) => showToast({ type: 'error', title: 'Could not generate', message: errorMessage(e) }),
  });

  const prepMutation = useMutation({
    mutationFn: () =>
      prepareAssessmentWithAiApi(token, {
        courseId,
        lessonIds,
        count,
        types,
        difficulty,
        language,
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      }),
    onSuccess: (data) => {
      setPrep(data);
      afterGenerate();
    },
    onError: (e) => showToast({ type: 'error', title: 'Could not generate', message: errorMessage(e) }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!prep) throw new Error('Nothing to save');
      const assessment = await createAssessmentApi(token, {
        courseId,
        title: prep.title.slice(0, 200),
        ...(prep.instructions ? { instructions: prep.instructions } : {}),
        isPublished: false,
      });
      await bulkAddAssessmentQuestionsApi(token, assessment.id, {
        questions: prep.questions.map((q) => ({
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          ...(q.explanation ? { explanation: q.explanation } : {}),
          options: q.options.map((o, i) => ({ label: o.label, isCorrect: o.isCorrect, sequence: i + 1 })),
        })),
      });
      return assessment;
    },
    onSuccess: (assessment) => {
      showToast({ type: 'success', title: 'Saved as a draft assessment', message: 'Review it, then publish when ready.' });
      navigate(`/admin/assessments/${assessment.id}`);
    },
    onError: (e) => showToast({ type: 'error', title: 'Could not save', message: errorMessage(e) }),
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ type: 'success', title: 'Copied' });
    } catch {
      showToast({ type: 'error', title: 'Could not copy' });
    }
  };

  const status = statusQuery.data;
  const aiOff = status && !status.enabled;
  const busy = studyMutation.isPending || prepMutation.isPending;
  const selectedCount = lessonIds.length || course?.lessons.length || 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Assistant</h1>
            <p className="text-sm text-slate-500">
              Summarize your course content into study material, or prepare an assessment from it.
            </p>
          </div>
        </div>
        {status?.enabled && typeof status.remainingToday === 'number' ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {status.remainingToday} of {status.dailyLimit} AI requests left today
          </span>
        ) : null}
      </div>

      {aiOff ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The AI assistant is not switched on yet. It is managed by the platform administrator for all schools.
        </div>
      ) : null}

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
        <button
          type="button"
          onClick={() => setTab('study')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'study' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpenText className="h-4 w-4" /> Study material
        </button>
        {canPrep ? (
          <button
            type="button"
            onClick={() => setTab('prep')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === 'prep' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardCheck className="h-4 w-4" /> Assessment prep
          </button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {/* ---- Options ---- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (tab === 'study') studyMutation.mutate();
            else prepMutation.mutate();
          }}
          className="space-y-4 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
        >
          <h2 className="text-sm font-semibold text-slate-800">Knowledge base</h2>
          {kbQuery.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : kbQuery.isError ? (
            <p className="text-sm text-red-600">{errorMessage(kbQuery.error)}</p>
          ) : !courses.length ? (
            <p className="text-sm text-slate-500">
              You have no courses yet. Create a course and add lessons, then come back here.
            </p>
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Course
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputClass}>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.classRoomName ? ` — ${c.classRoomName}` : ''}
                      {c.academicYearName ? ` (${c.academicYearName})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Lessons</span>
                  {lessonIds.length ? (
                    <button type="button" onClick={() => setLessonIds([])} className="text-xs text-brand-600 hover:underline">
                      Use all lessons
                    </button>
                  ) : (
                    <span className="text-xs font-normal text-slate-500">All lessons are used</span>
                  )}
                </div>
                <div className="mt-1 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {!groupedLessons.length ? (
                    <p className="p-1 text-sm text-slate-500">This course has no lessons yet.</p>
                  ) : (
                    groupedLessons.map((g) => (
                      <div key={g.id}>
                        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.title}</p>
                        {g.lessons.map((l) => (
                          <label key={l.id} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={lessonIds.includes(l.id)}
                              onChange={() => toggleLesson(l.id)}
                            />
                            <span className="flex-1 text-slate-700">
                              {l.title}
                              {!l.hasText ? (
                                <span className="ml-1 text-xs text-slate-400">({l.contentType.toLowerCase()}, title only)</span>
                              ) : null}
                            </span>
                          </label>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'study' ? (
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Type of material</legend>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      format === f.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block font-semibold">{f.label}</span>
                    <span className="block text-xs text-slate-500">{f.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Questions
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 20))}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Difficulty
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as AiDifficulty)} className={inputClass}>
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
              </div>
              <fieldset className="text-sm text-slate-700">
                <legend className="font-medium">Question types</legend>
                {(
                  [
                    ['MCQ_SINGLE', 'Multiple choice'],
                    ['OPEN_TEXT', 'Written answer'],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id} className="mr-4 mt-1 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={types.includes(id)}
                      onChange={() =>
                        setTypes((prev) =>
                          prev.includes(id) ? (prev.length > 1 ? prev.filter((t) => t !== id) : prev) : [...prev, id]
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            </>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value as AiLanguage)} className={inputClass}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Extra instructions <span className="font-normal text-slate-400">(optional)</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                tab === 'study' ? 'e.g. Keep it to one page, focus on fractions' : 'e.g. Include two questions on real-life problems'
              }
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            disabled={busy || !courseId || !course?.lessons.length || aiOff}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {tab === 'study' ? 'Generate study material' : 'Prepare assessment'}
            {course ? ` (${selectedCount} lesson${selectedCount === 1 ? '' : 's'})` : ''}
          </button>
        </form>

        {/* ---- Result ---- */}
        <section className="min-h-[320px] rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          {busy ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              Reading your lessons and writing… this can take up to a minute.
            </div>
          ) : tab === 'study' ? (
            study ? (
              <div className="space-y-4">
                <ResultToolbar
                  meta={study.basedOnLessons}
                  shortened={study.contentShortened}
                  noText={!study.usedWrittenContent}
                  onCopy={() => copy(study.content)}
                  onDownload={() => downloadText(`${slug(study.title)}.md`, study.content)}
                />
                <article className="prose-sm max-w-none text-slate-800">
                  <MarkdownLite content={study.content} />
                </article>
              </div>
            ) : (
              <EmptyResult icon={<FileText className="h-8 w-8" />} text="Pick a course and the type of material, then generate. The result appears here for you to copy or download and share with learners." />
            )
          ) : prep ? (
            <div className="space-y-4">
              <ResultToolbar
                meta={prep.basedOnLessons}
                shortened={prep.contentShortened}
                noText={!prep.usedWrittenContent}
                onCopy={() => copy(prepToMarkdown(prep, true))}
                onDownload={() => downloadText(`${slug(prep.title)}.md`, prepToMarkdown(prep, true))}
              >
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save as draft assessment
                </button>
              </ResultToolbar>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{prep.title}</h3>
                {prep.instructions ? <p className="mt-1 text-sm text-slate-600">{prep.instructions}</p> : null}
                <p className="mt-1 text-xs text-slate-500">
                  {prep.questions.length} questions · {prep.totalPoints} points
                </p>
              </div>
              <ol className="space-y-3">
                {prep.questions.map((q, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {i + 1}. {q.prompt}
                      </p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {q.points} pt{q.points === 1 ? '' : 's'} · {q.type === 'MCQ_SINGLE' ? 'Multiple choice' : 'Written'}
                      </span>
                    </div>
                    {q.options.length ? (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((o, j) => (
                          <li
                            key={j}
                            className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                              o.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700'
                            }`}
                          >
                            <span className="font-mono text-xs">{String.fromCharCode(65 + j)}.</span>
                            {o.label}
                            {o.isCorrect ? <CheckCircle2 className="ml-auto h-4 w-4" /> : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {q.explanation ? (
                      <p className="mt-2 rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                        <span className="font-semibold">Answer guide: </span>
                        {q.explanation}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <EmptyResult icon={<ClipboardCheck className="h-8 w-8" />} text="Pick a course, how many questions and the difficulty, then prepare. You get draft questions with an answer key; review them and save as a draft assessment." />
          )}
        </section>
      </div>
      <p className="text-xs text-slate-400">
        AI can make mistakes. Always review generated material and questions before sharing them with learners.
      </p>
    </div>
  );
}

function EmptyResult({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
      <span className="text-slate-300">{icon}</span>
      <p className="max-w-md">{text}</p>
    </div>
  );
}

function ResultToolbar({
  meta,
  shortened,
  noText,
  onCopy,
  onDownload,
  children,
}: {
  meta: string[];
  shortened: boolean;
  noText: boolean;
  onCopy: () => void;
  onDownload: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-b border-slate-100 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" /> Download (.md)
        </button>
        {children}
      </div>
      <p className="text-xs text-slate-500">
        Based on {meta.length} lesson{meta.length === 1 ? '' : 's'}: {meta.slice(0, 6).join(', ')}
        {meta.length > 6 ? ` and ${meta.length - 6} more` : ''}.
        {noText ? ' These lessons have little written text, so the AI also used the standard curriculum.' : ''}
        {shortened ? ' The course is long, so only the first part of its content was used.' : ''}
      </p>
    </div>
  );
}
