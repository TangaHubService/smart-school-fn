import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  getAnnouncementApi,
  updateAnnouncementApi,
  type AnnouncementAudience,
  type AnnouncementItem,
} from '../features/announcements/announcements.api';
import { listClassRoomsApi } from '../features/sprint1/sprint1.api';

export function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('ALL');
  const [targetClassRoomIds, setTargetClassRoomIds] = useState<string[]>([]);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const announcementQuery = useQuery({
    queryKey: ['announcement', id],
    enabled: Boolean(id),
    queryFn: () => getAnnouncementApi(auth.accessToken!, id!),
  });

  const item = announcementQuery.data as AnnouncementItem | undefined;

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setBody(item.body);
      setAudience(item.audience);
      setTargetClassRoomIds(item.targetClassRoomIds ?? []);
      setPublishedAt(item.publishedAt);
      setExpiresAt(item.expiresAt);
    }
  }, [item]);

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateAnnouncementApi(auth.accessToken!, id!, {
        title,
        body,
        audience,
        targetClassRoomIds: audience === 'CLASS_ROOM' ? targetClassRoomIds : [],
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcement', id] });
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      showToast({ type: 'success', title: 'Announcement updated' });
      setIsEditing(false);
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update announcement',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const canManage = auth.me?.permissions.includes('announcements.manage') ?? false;
  const classes = (classesQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;

  function toggleClass(classId: string) {
    setTargetClassRoomIds((prev) =>
      prev.includes(classId) ? prev.filter((x) => x !== classId) : [...prev, classId],
    );
  }

  if (!id) {
    return (
      <StateView
        title="Invalid announcement"
        message="The announcement ID is missing."
      />
    );
  }

  if (announcementQuery.isError || (!announcementQuery.isPending && !item)) {
    return (
      <StateView
        title="Announcement not found"
        message="The announcement may have been deleted."
        action={
          <button
            type="button"
            onClick={() => navigate('/admin/announcements')}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Back to list
          </button>
        }
      />
    );
  }

  if (announcementQuery.isPending) {
    return (
      <SectionCard title="Loading..." subtitle="">
        <div className="h-20 animate-pulse rounded-lg bg-brand-100" />
      </SectionCard>
    );
  }

  if (!item) return null;

  return (
    <SectionCard
      title={isEditing ? 'Edit Announcement' : item.title}
      subtitle={
        isEditing
          ? 'Update the announcement details.'
          : `By ${item.author.firstName} ${item.author.lastName}`
      }
    >
      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
              maxLength={200}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Body
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
          ) : null}
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Publish at (optional)
            <input
              type="datetime-local"
              value={publishedAt ? publishedAt.slice(0, 16) : ''}
              onChange={(e) => setPublishedAt(e.target.value || null)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Expires at (optional)
            <input
              type="datetime-local"
              value={expiresAt ? expiresAt.slice(0, 16) : ''}
              onChange={(e) => setExpiresAt(e.target.value || null)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateMutation.isPending || !title.trim() || !body.trim()}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setTitle(item.title);
                setBody(item.body);
                setAudience(item.audience);
                setTargetClassRoomIds(item.targetClassRoomIds ?? []);
                setPublishedAt(item.publishedAt);
                setExpiresAt(item.expiresAt);
              }}
              className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div>
          <p className="whitespace-pre-wrap text-slate-600">{item.body}</p>
          <div className="mt-4 text-sm text-slate-500">
            Audience: {item.audience} •{' '}
            {item.publishedAt ? `Published ${new Date(item.publishedAt).toLocaleString()}` : 'Draft'} •{' '}
            {item.expiresAt ? `Expires ${new Date(item.expiresAt).toLocaleString()}` : 'No expiry'}
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/admin/announcements')}
            className="ml-2 mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to list
          </button>
        </div>
      )}
    </SectionCard>
  );
}
