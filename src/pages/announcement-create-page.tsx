import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { SectionCard } from '../components/section-card';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  createAnnouncementApi,
  type AnnouncementAudience,
} from '../features/announcements/announcements.api';
import { listClassRoomsApi } from '../features/sprint1/sprint1.api';

export function AnnouncementCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('ALL');
  const [targetClassRoomIds, setTargetClassRoomIds] = useState<string[]>([]);
  const [publishNow, setPublishNow] = useState(true);

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAnnouncementApi(auth.accessToken!, {
        title,
        body,
        audience,
        targetClassRoomIds: audience === 'CLASS_ROOM' ? targetClassRoomIds : undefined,
        publishedAt: publishNow ? new Date().toISOString() : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      showToast({ type: 'success', title: 'Announcement created' });
      navigate('/admin/announcements');
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create announcement',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const classes = (classesQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;

  function toggleClass(id: string) {
    setTargetClassRoomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <SectionCard
      title="New Announcement"
      subtitle="Create a school announcement. Choose audience to target specific classes or grade levels."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !body.trim()) {
            showToast({
              type: 'error',
              title: 'Validation',
              message: 'Title and body are required.',
            });
            return;
          }
          createMutation.mutate();
        }}
        className="grid gap-4"
      >
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            maxLength={200}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Body
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Announcement content..."
            rows={6}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            maxLength={10000}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Audience
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="ALL">All (school-wide)</option>
            <option value="CLASS_ROOM">Specific classes</option>
            <option value="GRADE_LEVEL">Grade level</option>
          </select>
        </label>
        {audience === 'CLASS_ROOM' ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-slate-800">Select classes</p>
            <div className="flex flex-wrap gap-2">
              {classes.map((c: { id: string; code: string; name: string }) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg border border-brand-100 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={targetClassRoomIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                    className="rounded border-brand-200"
                  />
                  <span className="text-sm">{c.code} - {c.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="rounded border-brand-200"
          />
          Publish immediately
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending || !title.trim() || !body.trim()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/announcements')}
            className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
