import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '../../features/auth/auth.context';
import {
  createLevelGroupApi,
  deleteLevelGroupApi,
  listLevelGroupsApi,
  updateLevelGroupApi,
  type LevelGroup,
} from '../../features/sprint1/sprint1.api';
import { ConfirmDrawer } from '../confirm-drawer';
import { DrawerForm } from '../drawer-form';
import { SectionCard } from '../section-card';
import { StateView } from '../state-view';
import { useToast } from '../toast';

export const LEVEL_GROUPS_QUERY_KEY = ['level-groups'] as const;

const levelGroupSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters').max(80),
  description: z.string().trim().max(300).optional(),
  thumbnail: z.union([z.string().trim().url('Enter a full image URL'), z.literal('')]).optional(),
  rank: z.coerce.number().int().min(1, 'Order starts at 1').max(50),
});

type LevelGroupForm = z.infer<typeof levelGroupSchema>;

const emptyForm: LevelGroupForm = { name: '', description: '', thumbnail: '', rank: 1 };

const inputClass = 'rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal';

/** Shared query for the admin's level groups (also used by the grade form's picker). */
export function useLevelGroups(enabled = true) {
  const auth = useAuth();
  return useQuery({
    queryKey: LEVEL_GROUPS_QUERY_KEY,
    queryFn: () => listLevelGroupsApi(auth.accessToken!),
    enabled: enabled && Boolean(auth.accessToken),
  });
}

/**
 * Lets the academy admin create the groups the public catalog shows first,
 * such as "Lower Primary" or "Upper Primary". Grades join a group from the
 * grade level form.
 */
export function LevelGroupsPanel() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const groupsQuery = useLevelGroups();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<LevelGroup | null>(null);

  const form = useForm<LevelGroupForm>({
    resolver: zodResolver(levelGroupSchema),
    defaultValues: emptyForm,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: LEVEL_GROUPS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
  }

  const saveMutation = useMutation({
    mutationFn: (values: LevelGroupForm) => {
      const payload = {
        name: values.name,
        description: values.description?.trim() || null,
        thumbnail: values.thumbnail?.trim() || null,
        rank: values.rank,
      };
      return editingId
        ? updateLevelGroupApi(auth.accessToken!, editingId, payload)
        : createLevelGroupApi(auth.accessToken!, payload);
    },
    onSuccess: () => {
      refresh();
      showToast({
        type: 'success',
        title: editingId ? 'Level group updated' : 'Level group created',
      });
      setIsOpen(false);
      setEditingId(null);
      form.reset(emptyForm);
    },
    onError: (error) =>
      showToast({
        type: 'error',
        title: 'Save failed',
        message: error instanceof Error ? error.message : 'Could not save the level group',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLevelGroupApi(auth.accessToken!, id),
    onSuccess: () => {
      refresh();
      showToast({ type: 'success', title: 'Level group deleted' });
      setDeleting(null);
    },
    onError: (error) =>
      showToast({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Could not delete the level group',
      }),
  });

  const groups = groupsQuery.data ?? [];

  function openAdd() {
    setEditingId(null);
    const nextRank = groups.reduce((max, group) => Math.max(max, group.rank), 0) + 1;
    form.reset({ ...emptyForm, rank: Math.min(nextRank, 50) });
    setIsOpen(true);
  }

  function openEdit(group: LevelGroup) {
    setEditingId(group.id);
    form.reset({
      name: group.name,
      description: group.description ?? '',
      thumbnail: group.thumbnail ?? '',
      rank: group.rank,
    });
    setIsOpen(true);
  }

  const errors = form.formState.errors;

  return (
    <SectionCard
      title="Level groups"
      subtitle="Groups such as Lower Primary or Upper Primary. The public academy page shows these first; put a grade in a group from its Update form."
      action={
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
        >
          Add level group
        </button>
      }
    >
      {groupsQuery.isPending ? (
        <p className="text-sm text-slate-500">Loading level groups…</p>
      ) : groupsQuery.isError ? (
        <StateView
          title="Could not load level groups"
          message="Please retry."
          action={
            <button
              type="button"
              onClick={() => void groupsQuery.refetch()}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-brand-200 bg-brand-50/40 p-4 text-sm text-slate-600">
          No level groups yet. Until you add some, the public page splits your grades into two
          groups automatically.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const grades = group.gradeLevels ?? [];
            return (
              <li
                key={group.id}
                className="flex flex-col rounded-xl border border-brand-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                    <Layers className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{group.name}</p>
                    <p className="text-xs text-slate-500">Order {group.rank}</p>
                    {group.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                        {group.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  {grades.length
                    ? grades.map((grade) => grade.name).join(' · ')
                    : 'No grades yet. Open a grade’s Update form to add it here.'}
                </p>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5">
                  <button
                    type="button"
                    onClick={() => openEdit(group)}
                    className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(group)}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DrawerForm
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
        title={editingId ? 'Update level group' : 'Add level group'}
        description="Name the group visitors pick first on the public academy page."
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        isLoading={saveMutation.isPending}
        submitLabel={editingId ? 'Update group' : 'Create group'}
        formId="level-group-form"
      >
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Name
          <input
            className={inputClass}
            placeholder="e.g. Lower Primary"
            {...form.register('name')}
          />
          {errors.name ? (
            <span className="text-xs font-medium text-red-700">{errors.name.message}</span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Order
          <input
            type="number"
            min={1}
            className={inputClass}
            {...form.register('rank', { valueAsNumber: true })}
          />
          <span className="text-xs font-normal text-slate-500">Lower numbers show first.</span>
          {errors.rank ? (
            <span className="text-xs font-medium text-red-700">{errors.rank.message}</span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Description (optional)
          <textarea
            rows={2}
            className={inputClass}
            placeholder="e.g. Primary 1 to Primary 3"
            {...form.register('description')}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Picture URL (optional)
          <input className={inputClass} placeholder="https://…" {...form.register('thumbnail')} />
          {errors.thumbnail ? (
            <span className="text-xs font-medium text-red-700">{errors.thumbnail.message}</span>
          ) : null}
        </label>
      </DrawerForm>

      <ConfirmDrawer
        open={Boolean(deleting)}
        title="Delete level group?"
        message={
          deleting
            ? `"${deleting.name}" will be removed. Its grades, classes and courses stay; they just won't be in a group.`
            : ''
        }
        confirmLabel="Delete group"
        isDestructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </SectionCard>
  );
}
