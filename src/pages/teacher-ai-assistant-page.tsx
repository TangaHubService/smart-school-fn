import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  type KnowledgeDocument,
  MAX_AI_QUESTIONS,
  deleteKnowledgeDocumentApi,
  generateQuestionsInParts,
  listKnowledgeDocumentsApi,
  uploadKnowledgeDocumentApi,
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
import {
  buildAssessmentPdf,
  buildAssessmentWorkbook,
  buildStudyMaterialPdf,
  buildStudyMaterialWorkbook,
  downloadPdf,
  downloadWorkbook,
} from '../utils/ai-material-export';
import { markdownToPlainText } from '../utils/markdown-blocks';

type Tab = 'study' | 'prep';

const FORMATS: Array<{ id: StudyMaterialFormat; label: string; hint: string }> = [
  { id: 'summary', label: 'Summary', hint: 'Overview and key ideas per lesson' },
  { id: 'revision-notes', label: 'Revision notes', hint: 'Short notes to study before a test' },
  { id: 'key-terms', label: 'Key terms', hint: 'Glossary: term, meaning, example' },
  { id: 'study-guide', label: 'Study guide', hint: 'Objectives, examples, practice and answers' },
  { id: 'custom', label: 'Custom', hint: 'Describe exactly what you want' },
];

/** Ready-made requests the teacher can start from and then edit. */
const PROMPT_EXAMPLES: Record<'study' | 'prep', string[]> = {
  study: [
    'Make one-page summary notes for a Senior 2 class: short paragraphs, key definitions in bold, and 5 quick check questions at the end.',
    'Summarize chapter 3 of the book as bullet-point notes learners can copy into their exercise books, with a simple diagram described in words.',
    'Write revision notes comparing the main ideas in a table, then list the common mistakes learners make on this topic.',
    'Explain this topic in simple language for weaker learners, with everyday examples from Rwanda and a short activity they can do at home.',
  ],
  prep: [
    'End-of-term exam: cover every unit evenly, start easy and get harder, and include questions that test application, not just recall.',
    'Short quiz on the first two lessons only, with real-life word problems from the market or the farm.',
    'Questions in the style of the national exam, with a marking guide for each written answer.',
  ],
};

const DOCUMENT_ACCEPT = '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown';

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'ai-material';
}

/** Plain text (no Markdown symbols) for the Copy button. */
function prepToPlainText(prep: AssessmentPrepResult) {
  let text = `${prep.title}\n\n`;
  if (prep.instructions) text += `${prep.instructions}\n\n`;
  text += `Total: ${prep.totalPoints} points\n\n`;
  prep.questions.forEach((q, i) => {
    text += `${i + 1}. ${q.prompt} (${q.points} pt${q.points === 1 ? '' : 's'})\n`;
    q.options.forEach((o, j) => {
      text += `   ${String.fromCharCode(65 + j)}. ${o.label}\n`;
    });
    text += '\n';
  });
  text += `ANSWER KEY\n\n`;
  prep.questions.forEach((q, i) => {
    const correct = q.options.findIndex((o) => o.isCorrect);
    const answer = correct >= 0 ? `${String.fromCharCode(65 + correct)}. ${q.options[correct].label}` : '';
    text += `${i + 1}. ${answer}${answer && q.explanation ? ' - ' : ''}${q.explanation ?? ''}\n`;
  });
  return text;
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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [prepProgress, setPrepProgress] = useState<{ done: number; total: number } | null>(null);

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

  const documentsQuery = useQuery({
    queryKey: ['ai-teacher-documents'],
    queryFn: () => listKnowledgeDocumentsApi(token),
    enabled: Boolean(token),
  });

  const courses = kbQuery.data ?? [];
  const documents: KnowledgeDocument[] = documentsQuery.data ?? [];
  const course: KnowledgeBaseCourse | undefined = courses.find((c) => c.id === courseId);
  const [courseTouched, setCourseTouched] = useState(false);

  useEffect(() => {
    if (!courseTouched && !courseId && courses.length) setCourseId(courses[0].id);
  }, [courseTouched, courseId, courses]);
  useEffect(() => setLessonIds([]), [courseId]);
  // Forget selections for documents that were removed.
  useEffect(() => {
    setDocumentIds((prev) => prev.filter((id) => documents.some((d) => d.id === id)));
  }, [documents]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      setUploading(file.name);
      try {
        const doc = await uploadKnowledgeDocumentApi(token, file);
        setDocumentIds((prev) => [...prev, doc.id]);
        showToast({
          type: 'success',
          title: 'Document added',
          message: `${doc.title}${doc.pageCount ? ` (${doc.pageCount} pages)` : ''} is ready for the AI to read.`,
        });
      } catch (e) {
        showToast({ type: 'error', title: `Could not add ${file.name}`, message: errorMessage(e) });
      }
    }
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await queryClient.invalidateQueries({ queryKey: ['ai-teacher-documents'] });
  };

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => deleteKnowledgeDocumentApi(token, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['ai-teacher-documents'] }),
    onError: (e) => showToast({ type: 'error', title: 'Could not remove document', message: errorMessage(e) }),
  });

  const toggleDocument = (id: string) =>
    setDocumentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

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
        ...(courseId ? { courseId } : {}),
        lessonIds: courseId ? lessonIds : [],
        documentIds,
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
    mutationFn: async () => {
      const result = await generateQuestionsInParts(
        count,
        (partCount, avoidPrompts) =>
          prepareAssessmentWithAiApi(token, {
            ...(courseId ? { courseId } : {}),
            lessonIds: courseId ? lessonIds : [],
            documentIds,
            avoidPrompts,
            count: partCount,
            types,
            difficulty,
            language,
            ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
          }),
        (done, total) => setPrepProgress({ done, total })
      );
      if (result.partialError) {
        showToast({
          type: 'error',
          title: `Only ${result.questions.length} of ${count} questions were written`,
          message: errorMessage(result.partialError),
        });
      }
      const first = result.first!;
      return {
        ...first,
        questions: result.questions,
        totalPoints: result.questions.reduce((sum, q) => sum + q.points, 0),
      };
    },
    onSettled: () => setPrepProgress(null),
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
  const hasSource = Boolean((courseId && course?.lessons.length) || documentIds.length);
  const needsPrompt = tab === 'study' && format === 'custom' && instructions.trim().length < 5;
  const sourceLabel = [
    course ? `${selectedCount} lesson${selectedCount === 1 ? '' : 's'}` : null,
    documentIds.length ? `${documentIds.length} document${documentIds.length === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' + ');

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
              You have no courses yet. You can still upload documents below, or create a course with lessons.
            </p>
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Course
                <select
                  value={courseId}
                  onChange={(e) => {
                    setCourseTouched(true);
                    setCourseId(e.target.value);
                  }}
                  className={inputClass}
                >
                  <option value="">No course — use documents only</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.classRoomName ? ` — ${c.classRoomName}` : ''}
                      {c.academicYearName ? ` (${c.academicYearName})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {course ? (
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
              ) : null}
            </>
          )}

          <div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Documents &amp; books</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(uploading)}
                className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? 'Reading…' : 'Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={DOCUMENT_ACCEPT}
                className="hidden"
                onChange={(e) => void uploadFiles(e.target.files)}
              />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              PDF, Word or text, up to 25 MB. The AI reads the ticked documents before answering.
            </p>
            <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {documentsQuery.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : !documents.length ? (
                <p className="p-1 text-sm text-slate-500">
                  No documents yet. Upload a textbook, your notes or the syllabus.
                </p>
              ) : (
                documents.map((d) => (
                  <div key={d.id} className="flex items-start gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                    <input
                      id={`doc-${d.id}`}
                      type="checkbox"
                      className="mt-0.5"
                      checked={documentIds.includes(d.id)}
                      onChange={() => toggleDocument(d.id)}
                    />
                    <label htmlFor={`doc-${d.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block truncate text-slate-700">{d.title}</span>
                      <span className="block text-xs text-slate-400">
                        {d.pageCount ? `${d.pageCount} pages · ` : ''}
                        {fileSize(d.sizeBytes)}
                      </span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${d.title}`}
                      onClick={() => {
                        if (window.confirm(`Remove "${d.title}" from your knowledge base?`)) deleteDocMutation.mutate(d.id);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

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
                    max={MAX_AI_QUESTIONS}
                    value={count}
                    onChange={(e) =>
                      setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), MAX_AI_QUESTIONS))
                    }
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

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="ai-prompt">
              {tab === 'study' && format === 'custom' ? (
                'Describe what you want'
              ) : (
                <>
                  Describe what you want <span className="font-normal text-slate-400">(optional)</span>
                </>
              )}
            </label>
            <textarea
              id="ai-prompt"
              rows={6}
              maxLength={4000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                tab === 'study'
                  ? 'e.g. Make summary notes on photosynthesis from chapter 4 for Senior 1: one page, simple words, key terms in bold, a labelled-diagram description and 5 practice questions with answers.'
                  : 'e.g. 40 questions for the end-of-term exam: cover all units evenly, half application questions, include a marking guide for written answers.'
              }
              className={inputClass}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>Topic, class level, length, style, what to include or leave out.</span>
              <span>{instructions.length}/4000</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PROMPT_EXAMPLES[tab].map((example) => (
                <button
                  key={example}
                  type="button"
                  title={example}
                  onClick={() => setInstructions(example)}
                  className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                >
                  {example.length > 48 ? `${example.slice(0, 48)}…` : example}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !hasSource || needsPrompt || aiOff}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {tab === 'study' ? 'Generate study material' : 'Prepare assessment'}
            {sourceLabel ? ` (${sourceLabel})` : ''}
          </button>
        </form>

        {/* ---- Result ---- */}
        <section className="min-h-[320px] rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          {busy ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              {prepProgress && prepProgress.total > 40
                ? `Writing questions… ${prepProgress.done} of ${prepProgress.total} done`
                : documentIds.length
                  ? 'Reading your documents and lessons, then writing… this can take up to a minute.'
                  : 'Reading your lessons and writing… this can take up to a minute.'}
            </div>
          ) : tab === 'study' ? (
            study ? (
              <div className="space-y-4">
                <ResultToolbar
                  meta={study.basedOnLessons}
                  documents={study.basedOnDocuments ?? []}
                  shortened={study.contentShortened}
                  noText={!study.usedWrittenContent}
                  onCopy={() => copy(markdownToPlainText(study.content))}
                  onPdf={() =>
                    downloadPdf(buildStudyMaterialPdf(study.title, study.content), slug(study.title))
                  }
                  onExcel={() =>
                    downloadWorkbook(buildStudyMaterialWorkbook(study.title, study.content), slug(study.title))
                  }
                />
                <article className="prose-sm max-w-none text-slate-800">
                  <MarkdownLite content={study.content} />
                </article>
              </div>
            ) : (
              <EmptyResult icon={<FileText className="h-8 w-8" />} text="Pick a course or upload documents, choose the type of material (or Custom and describe what you want), then generate. The result appears here for you to copy or download and share with learners." />
            )
          ) : prep ? (
            <div className="space-y-4">
              <ResultToolbar
                meta={prep.basedOnLessons}
                documents={prep.basedOnDocuments ?? []}
                shortened={prep.contentShortened}
                noText={!prep.usedWrittenContent}
                onCopy={() => copy(prepToPlainText(prep))}
                onPdf={() => downloadPdf(buildAssessmentPdf(prep), slug(prep.title))}
                onExcel={() => downloadWorkbook(buildAssessmentWorkbook(prep), slug(prep.title))}
              >
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !courseId}
                  title={courseId ? undefined : 'Pick a course to save this as an assessment in it'}
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
            <EmptyResult icon={<ClipboardCheck className="h-8 w-8" />} text="Pick a course or documents, how many questions (up to 200) and the difficulty, then prepare. You get draft questions with an answer key; review them and save as a draft assessment." />
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
  documents,
  shortened,
  noText,
  onCopy,
  onPdf,
  onExcel,
  children,
}: {
  meta: string[];
  documents: string[];
  shortened: boolean;
  noText: boolean;
  onCopy: () => void;
  onPdf: () => void;
  onExcel: () => void;
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
          onClick={onPdf}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
        <button
          type="button"
          onClick={onExcel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
        {children}
      </div>
      <p className="text-xs text-slate-500">
        {meta.length ? (
          <>
            Based on {meta.length} lesson{meta.length === 1 ? '' : 's'}: {meta.slice(0, 6).join(', ')}
            {meta.length > 6 ? ` and ${meta.length - 6} more` : ''}.
          </>
        ) : null}
        {documents.length ? ` Documents read: ${documents.join(', ')}.` : ''}
        {noText ? ' The sources have little written text, so the AI also used the standard curriculum.' : ''}
        {shortened ? ' The material is long, so the passages most relevant to your request were used.' : ''}
      </p>
    </div>
  );
}
