import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { SectionCard } from '../components/section-card';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  createAnnouncementApi,
  type AnnouncementAudience,
  type AnnouncementPriority,
} from '../features/announcements/announcements.api';
import { listClassRoomsApi, listSubjectsApi } from '../features/sprint1/sprint1.api';
import { listUsersApi, type UserListItem } from '../features/users/users.api';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';

interface AnnouncementCreateFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function AnnouncementCreatePage() {
  const navigate = useNavigate();

  return (
    <SectionCard
      title="New Announcement"
      subtitle="Create a school announcement. Choose audience to target specific classes, grades, subjects, roles, or individual people."
    >
      <AnnouncementCreateForm
        onCancel={() => navigate('/admin/announcements')}
        onSuccess={() => navigate('/admin/announcements')}
      />
    </SectionCard>
  );
}

const ROLE_OPTIONS = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'GOV_AUDITOR'];
const PRIORITY_OPTIONS: AnnouncementPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function AnnouncementCreateForm({ onCancel, onSuccess }: AnnouncementCreateFormProps) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('ALL');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [targetClassRoomIds, setTargetClassRoomIds] = useState<string[]>([]);
  const [targetGradeLevelIds, setTargetGradeLevelIds] = useState<string[]>([]);
  const [targetSubjectIds, setTargetSubjectIds] = useState<string[]>([]);
  const [targetRoleNames, setTargetRoleNames] = useState<string[]>([]);
  const [targetUsers, setTargetUsers] = useState<Array<{ id: string; label: string }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [emailNotify, setEmailNotify] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => listSubjectsApi(auth.accessToken!),
    enabled: audience === 'SUBJECT',
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserSearch(userSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const userSearchQuery = useQuery({
    queryKey: ['announcement-user-search', debouncedUserSearch],
    queryFn: () => listUsersApi(auth.accessToken!, { search: debouncedUserSearch, pageSize: 10 }),
    enabled: audience === 'INDIVIDUAL_USERS' && debouncedUserSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let attachments: Awaited<ReturnType<typeof uploadFileToCloudinary>>[] = [];
      if (attachmentFiles.length) {
        setIsUploading(true);
        try {
          attachments = await Promise.all(
            attachmentFiles.map(file => uploadFileToCloudinary(auth.accessToken!, 'announcement', file))
          );
        } finally {
          setIsUploading(false);
        }
      }

      return createAnnouncementApi(auth.accessToken!, {
        title,
        body,
        audience,
        priority,
        targetClassRoomIds: audience === 'CLASS_ROOM' ? targetClassRoomIds : undefined,
        targetGradeLevelIds: audience === 'GRADE_LEVEL' ? targetGradeLevelIds : undefined,
        targetSubjectIds: audience === 'SUBJECT' ? targetSubjectIds : undefined,
        targetRoleNames: audience === 'SPECIFIC_ROLES' ? targetRoleNames : undefined,
        targetUserIds: audience === 'INDIVIDUAL_USERS' ? targetUsers.map(u => u.id) : undefined,
        attachments,
        emailNotify,
        publishedAt: publishNow
          ? new Date().toISOString()
          : scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      showToast({ type: 'success', title: 'Announcement created' });
      onSuccess();
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create announcement',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const classes = (classesQuery.data ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    gradeLevelId: string;
    gradeLevel?: { id: string; name: string };
  }>;
  const subjects = (subjectsQuery.data ?? []) as Array<{ id: string; code: string; name: string }>;
  const gradeLevels = Array.from(
    new Map(
      classes
        .map(c => c.gradeLevel ?? (c.gradeLevelId ? { id: c.gradeLevelId, name: c.gradeLevelId } : null))
        .filter((g): g is { id: string; name: string } => Boolean(g))
        .map(g => [g.id, g])
    ).values()
  );

  function toggleClass(id: string) {
    setTargetClassRoomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleGradeLevel(id: string) {
    setTargetGradeLevelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSubject(id: string) {
    setTargetSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function addUser(user: UserListItem) {
    if (targetUsers.some(u => u.id === user.id)) return;
    setTargetUsers((prev) => [
      ...prev,
      { id: user.id, label: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email },
    ]);
    setUserSearch('');
  }

  function removeUser(id: string) {
    setTargetUsers((prev) => prev.filter(u => u.id !== id));
  }

  const isBusy = createMutation.isPending || isUploading;

  return (
    <>
      {classesQuery.isError ? (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          Could not load classes. You can still create a school-wide announcement.
        </div>
      ) : null}
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

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Audience
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            >
              <option value="ALL">Everyone</option>
              <option value="CLASS_ROOM">Specific classes</option>
              <option value="GRADE_LEVEL">Specific grade</option>
              <option value="SUBJECT">Specific subject</option>
              <option value="SPECIFIC_ROLES">Specific roles</option>
              <option value="INDIVIDUAL_USERS">Individual users</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        {audience === 'CLASS_ROOM' ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-slate-800">Select classes</p>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-brand-100 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={targetClassRoomIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                    className="rounded border-brand-200"
                  />
                  <span className="text-sm">
                    {c.code} - {c.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {audience === 'GRADE_LEVEL' ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-slate-800">Select grade levels</p>
            <div className="flex flex-wrap gap-2">
              {gradeLevels.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 rounded-lg border border-brand-100 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={targetGradeLevelIds.includes(g.id)}
                    onChange={() => toggleGradeLevel(g.id)}
                    className="rounded border-brand-200"
                  />
                  <span className="text-sm">{g.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {audience === 'SUBJECT' ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-slate-800">Select subjects</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-brand-100 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={targetSubjectIds.includes(s.id)}
                    onChange={() => toggleSubject(s.id)}
                    className="rounded border-brand-200"
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {audience === 'SPECIFIC_ROLES' ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-slate-800">Select roles</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 rounded-lg border border-brand-100 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={targetRoleNames.includes(role)}
                    onChange={() =>
                      setTargetRoleNames((prev) =>
                        prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
                      )
                    }
                    className="rounded border-brand-200"
                  />
                  <span className="text-sm">{role.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {audience === 'INDIVIDUAL_USERS' ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-slate-800">Search and add people</p>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or email (min 2 characters)"
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            />
            {userSearchQuery.data?.items.length ? (
              <div className="flex flex-col gap-1 rounded-lg border border-brand-100 p-2">
                {userSearchQuery.data.items.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addUser(u)}
                    className="rounded px-2 py-1 text-left text-sm hover:bg-brand-50"
                  >
                    {u.firstName} {u.lastName} · {u.email}
                  </button>
                ))}
              </div>
            ) : null}
            {targetUsers.length ? (
              <div className="flex flex-wrap gap-2">
                {targetUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                  >
                    {u.label}
                    <button type="button" onClick={() => removeUser(u.id)} className="text-brand-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2">
          <p className="text-sm font-semibold text-slate-800">Attachments (optional)</p>
          <input
            type="file"
            multiple
            onChange={(e) => setAttachmentFiles(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
          {attachmentFiles.length ? (
            <p className="text-xs text-slate-500">
              {attachmentFiles.length} file{attachmentFiles.length > 1 ? 's' : ''} selected
            </p>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="rounded border-brand-200"
          />
          Publish immediately
        </label>

        {!publishNow ? (
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Schedule for
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
        ) : null}

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Expires on (optional)
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={emailNotify}
            onChange={(e) => setEmailNotify(e.target.checked)}
            className="rounded border-brand-200"
          />
          Also notify recipients by email
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isBusy || !title.trim() || !body.trim()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isUploading ? 'Uploading...' : createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
