import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Lightbulb,
  ListChecks,
  Loader2,
  Menu,
  Plus,
  SendHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { MarkdownLite } from '../components/markdown-lite';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  createAiConversationApi,
  deleteAiConversationApi,
  getAiConversationApi,
  getAiStatusApi,
  listAiConversationsApi,
  sendAiMessageApi,
  type AiConversation,
  type AiMessage,
  type AiMode,
} from '../features/ai-assistant/ai-assistant.api';
import { listMyCoursesApi } from '../features/sprint4/lms.api';
import { ApiClientError } from '../types/api';

const QUICK_ACTIONS: Array<{ mode: Exclude<AiMode, 'ask'>; label: string; icon: typeof BookOpen }> = [
  { mode: 'summarize', label: 'Summarize this course', icon: BookOpen },
  { mode: 'examples', label: 'Give me examples', icon: Lightbulb },
  { mode: 'quiz', label: 'Quiz me', icon: ListChecks },
];

const SUGGESTIONS = [
  'Explain photosynthesis in simple words',
  'How do I solve 2x + 5 = 17? Show the steps',
  'Give me tips to prepare for my exams',
  'What is the difference between weather and climate?',
];

const QUICK_LABELS: Record<string, string> = {
  'Summarize this course.': 'Summarize this course',
  'Give me clear, worked examples': 'Give me examples',
  'Quiz me on this course.': 'Quiz me',
};

/** The stored prompt for quick actions is long; show the short button label instead. */
function displayUserText(content: string) {
  for (const [prefix, label] of Object.entries(QUICK_LABELS)) {
    if (content.startsWith(prefix)) {
      const extra = content.split('\n\n').slice(1).join('\n\n');
      return extra ? `${label} — ${extra}` : label;
    }
  }
  return content;
}

export function StudentAiAssistantPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [input, setInput] = useState('');
  const [draftCourseId, setDraftCourseId] = useState<string>(searchParams.get('courseId') ?? '');
  const [pending, setPending] = useState<{ text: string } | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const statusQuery = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => getAiStatusApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });
  const conversationsQuery = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => listAiConversationsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });
  const coursesQuery = useQuery({
    queryKey: ['ai-my-courses'],
    queryFn: () => listMyCoursesApi(auth.accessToken!, { pageSize: 100 }),
    enabled: Boolean(auth.accessToken),
  });
  const conversationQuery = useQuery({
    queryKey: ['ai-conversation', conversationId],
    queryFn: () => getAiConversationApi(auth.accessToken!, conversationId!),
    enabled: Boolean(auth.accessToken && conversationId),
    retry: false,
  });

  const courses = useMemo(
    () => (coursesQuery.data?.items ?? []).map((c) => ({ id: c.id, title: c.title })),
    [coursesQuery.data]
  );
  const conversation = conversationId ? conversationQuery.data : undefined;
  const activeCourseId = conversation ? conversation.courseId : draftCourseId || null;
  const activeCourse = courses.find((c) => c.id === activeCourseId) ?? null;
  const messages = conversation?.messages ?? [];
  const enabled = statusQuery.data?.enabled ?? true;

  useEffect(() => {
    setShowSidebar(false);
    setPending(null);
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pending]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const sendMutation = useMutation({
    mutationFn: async ({ content, mode }: { content: string; mode: AiMode }) => {
      let id = conversationId;
      if (!id) {
        const created = await createAiConversationApi(auth.accessToken!, {
          courseId: draftCourseId || undefined,
        });
        id = created.id;
      }
      const result = await sendAiMessageApi(auth.accessToken!, id, { content, mode });
      return { id, result };
    },
    onMutate: ({ content, mode }) => {
      setPending({ text: mode === 'ask' ? content : QUICK_ACTIONS.find((a) => a.mode === mode)!.label });
      setInput('');
    },
    onSuccess: ({ id, result }) => {
      queryClient.setQueryData<AiConversation | undefined>(['ai-conversation', id], (old) =>
        old ? { ...old, messages: [...old.messages, result.userMessage, result.assistantMessage] } : old
      );
      void queryClient.invalidateQueries({ queryKey: ['ai-conversation', id] });
      void queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (id !== conversationId) navigate(`/student/ai-assistant/${id}`, { replace: !conversationId });
      setPending(null);
    },
    onError: (e, vars) => {
      setPending(null);
      if (vars.mode === 'ask') setInput(vars.content);
      showToast({ type: 'error', title: 'The assistant could not answer', message: (e as ApiClientError).message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAiConversationApi(auth.accessToken!, id),
    onSuccess: (_r, id) => {
      void queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (id === conversationId) navigate('/student/ai-assistant');
    },
  });

  function send(mode: AiMode, content = input.trim()) {
    if (sendMutation.isPending || !enabled) return;
    if (mode === 'ask' && !content) return;
    sendMutation.mutate({ content: mode === 'ask' ? content : '', mode });
  }

  function newChat() {
    setDraftCourseId('');
    setInput('');
    navigate('/student/ai-assistant');
    inputRef.current?.focus();
  }

  const sidebar = (
    <aside
      className={`absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-slate-50 transition-transform md:static md:translate-x-0 ${
        showSidebar ? 'translate-x-0 shadow-xl' : '-translate-x-full'
      }`}
    >
      <div className="p-3">
        <button
          type="button"
          onClick={newChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>
      <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent</p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {(conversationsQuery.data ?? []).length === 0 ? (
          <p className="px-2 py-4 text-sm text-slate-500">Your conversations will appear here.</p>
        ) : (
          <ul className="space-y-0.5">
            {conversationsQuery.data!.map((c) => (
              <li key={c.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => navigate(`/student/ai-assistant/${c.id}`)}
                  className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm ${
                    c.id === conversationId ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {c.courseId ? <BookOpen className="h-3.5 w-3.5 shrink-0 text-brand-500" /> : null}
                    <span className="truncate">{c.title}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="ml-1 rounded p-1.5 text-slate-400 opacity-0 hover:bg-white hover:text-red-600 group-hover:opacity-100"
                  aria-label={`Delete ${c.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );

  const showWelcome = !conversationId && !pending;

  return (
    <div className="relative flex h-[calc(100vh-9rem)] min-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      {sidebar}
      {showSidebar ? (
        <button
          type="button"
          aria-label="Close conversations"
          onClick={() => setShowSidebar(false)}
          className="absolute inset-0 z-10 bg-black/20 md:hidden"
        />
      ) : null}

      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Show conversations"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-slate-900">
              {conversation?.title ?? 'AI Study Assistant'}
            </p>
            <p className="truncate text-xs text-slate-500">
              {activeCourse ? `Helping with ${activeCourse.title}` : 'Ask about your courses or any school topic'}
            </p>
          </div>
          {conversationId ? (
            <button
              type="button"
              onClick={newChat}
              className="hidden items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 sm:inline-flex"
            >
              <Plus className="h-4 w-4" /> New
            </button>
          ) : null}
        </div>

        {!enabled ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            The AI assistant is not switched on for your school yet. Ask your school administrator to add an OpenAI key in AI Assistant settings.
          </div>
        ) : null}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversationId && conversationQuery.isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-slate-600">{(conversationQuery.error as ApiClientError).message}</p>
              <button type="button" onClick={newChat} className="text-sm font-medium text-brand-700">
                <ArrowLeft className="mr-1 inline h-4 w-4" /> Start a new chat
              </button>
            </div>
          ) : showWelcome ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-md">
                <Brain className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">Hi {auth.me?.firstName ?? 'there'}, what shall we learn?</h2>
              <p className="mt-2 text-sm text-slate-500">
                Pick one of your courses to get a summary, worked examples or a quick quiz — or just ask any question.
              </p>

              <label className="mt-6 w-full max-w-md text-left text-sm font-medium text-slate-700">
                Course (optional)
                <select
                  value={draftCourseId}
                  onChange={(e) => setDraftCourseId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">General question — no course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>

              {draftCourseId ? (
                <div className="mt-4 grid w-full max-w-md gap-2 sm:grid-cols-3">
                  {QUICK_ACTIONS.map(({ mode, label, icon: Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={!enabled || sendMutation.isPending}
                      onClick={() => send(mode)}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                    >
                      <Icon className="h-5 w-5 text-brand-600" />
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={!enabled || sendMutation.isPending}
                      onClick={() => send('ask', s)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 px-3 py-5 sm:px-6">
              {conversationQuery.isPending && conversationId ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : null}
              {messages.map((m) => (
                <MessageRow key={m.id} message={m} />
              ))}
              {pending ? (
                <>
                  <MessageRow message={{ id: 'pending', role: 'USER', content: pending.text, createdAt: '' }} />
                  <div className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    </div>
                  </div>
                </>
              ) : null}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-6">
          {activeCourseId && !showWelcome ? (
            <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
              {QUICK_ACTIONS.map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  disabled={!enabled || sendMutation.isPending}
                  onClick={() => send(mode)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5 text-brand-600" /> {label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send('ask');
                }
              }}
              disabled={!enabled}
              maxLength={4000}
              placeholder={activeCourse ? `Ask anything about ${activeCourse.title}…` : 'Ask a question…'}
              className="max-h-40 flex-1 resize-none bg-transparent py-1 text-[15px] leading-6 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => send('ask')}
              disabled={!enabled || !input.trim() || sendMutation.isPending}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300"
              aria-label="Send question"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </button>
          </div>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-slate-400">
            The assistant can make mistakes. Check important answers with your teacher.
          </p>
        </div>
      </section>
    </div>
  );
}

function MessageRow({ message }: { message: AiMessage }) {
  if (message.role === 'USER') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-[14.5px] text-white">
          {displayUserText(message.content)}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-md bg-slate-50 px-4 py-3">
        <MarkdownLite content={message.content} />
      </div>
    </div>
  );
}
