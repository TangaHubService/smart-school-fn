import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  getAiSettingsApi,
  removeAiKeyApi,
  updateAiSettingsApi,
} from '../features/ai-assistant/ai-assistant.api';
import { ApiClientError } from '../types/api';

const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini — fast and low cost (recommended)' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4o', label: 'GPT-4o — higher quality, higher cost' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
];

/**
 * Super admin: the one OpenAI key, model and limits used by every school on the platform.
 * School admins have no AI settings; teachers and students simply use what is set here.
 */
export function SuperAdminAiSettingsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [enabled, setEnabled] = useState(true);
  const [limit, setLimit] = useState(100);
  const [teacherLimit, setTeacherLimit] = useState(50);

  const settingsQuery = useQuery({
    queryKey: ['platform-ai-settings'],
    queryFn: () => getAiSettingsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });
  const settings = settingsQuery.data;

  useEffect(() => {
    if (!settings) return;
    setModel(settings.model);
    setEnabled(settings.enabled);
    setLimit(settings.dailyLimitPerStudent);
    setTeacherLimit(settings.dailyLimitPerTeacher);
  }, [settings]);

  const onError = (e: unknown) =>
    showToast({ type: 'error', title: 'Could not save', message: (e as ApiClientError).message });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAiSettingsApi(auth.accessToken!, {
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        model,
        enabled,
        dailyLimitPerStudent: limit,
        dailyLimitPerTeacher: teacherLimit,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['platform-ai-settings'], data);
      setApiKey('');
      showToast({ type: 'success', title: 'AI settings saved' });
    },
    onError,
  });
  const removeMutation = useMutation({
    mutationFn: () => removeAiKeyApi(auth.accessToken!),
    onSuccess: (data) => {
      queryClient.setQueryData(['platform-ai-settings'], data);
      showToast({ type: 'success', title: 'Key removed' });
    },
    onError,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI Settings</h1>
          <p className="text-sm text-slate-500">
            One OpenAI key for the whole platform. Every school uses it for the teacher AI assistant
            (study material, assessment preparation, lesson plans) and the student study assistant.
          </p>
        </div>
      </div>

      {settingsQuery.isPending ? (
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      ) : settingsQuery.isError ? (
        <p className="text-sm text-red-600">{(settingsQuery.error as ApiClientError).message}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
        >
          <div>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <KeyRound className="h-4 w-4" /> OpenAI API key
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  settings?.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {settings?.active ? 'AI is on for all schools' : 'AI is off'}
              </span>
            </div>
            {settings?.hasKey ? (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <span>Key saved: sk-…{settings.keyLast4}</span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate()}
                  disabled={removeMutation.isPending}
                  className="inline-flex items-center gap-1 text-red-600 hover:underline"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                {settings?.usingEnvKey
                  ? 'No key saved here — schools are using the key from the server configuration.'
                  : 'No key yet. Teachers and students cannot use AI until you add one.'}
              </p>
            )}
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.hasKey ? 'Paste a new key to replace it' : 'sk-...'}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Create a key at platform.openai.com → API keys. It is checked with OpenAI, stored encrypted, and never shown again.
            </p>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Model
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Requests per teacher per day
              <input
                type="number"
                min={1}
                max={1000}
                value={teacherLimit}
                onChange={(e) => setTeacherLimit(Number(e.target.value))}
                className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Questions per student per day
              <input
                type="number"
                min={1}
                max={1000}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            AI is switched on for all schools (teachers and students)
          </label>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {apiKey.trim() ? 'Check key and save' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}
