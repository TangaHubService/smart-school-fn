import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  AcademyProgram,
  createAcademyProgramApi,
  listAcademyProgramsApi,
  listCoursesApi,
  updateAcademyProgramApi,
} from '../features/sprint4/lms.api';
import { ApiClientError } from '../types/api';

const programFormSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  thumbnail: z.string().trim().max(2000).optional().or(z.literal('')),
  price: z.coerce.number().positive('Price must be greater than 0'),
  durationDays: z.coerce.number().int().min(1).max(3650),
  isActive: z.boolean(),
  listedInPublicCatalog: z.boolean(),
  courseId: z.string().optional(),
});

type ProgramFormValues = z.infer<typeof programFormSchema>;

const defaultProgramForm: ProgramFormValues = {
  title: '',
  description: '',
  thumbnail: '',
  price: 10000,
  durationDays: 30,
  isActive: true,
  listedInPublicCatalog: true,
  courseId: '',
};

export function AcademyProgramsAdminPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AcademyProgram | null>(null);

  const canManage = Boolean(auth.me?.permissions.includes('courses.manage'));

  const programsQuery = useQuery({
    queryKey: ['admin-academy-programs'],
    queryFn: () => listAcademyProgramsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });

  const coursesQuery = useQuery({
    queryKey: ['admin-academy-program-courses'],
    queryFn: () => listCoursesApi(auth.accessToken!, { page: 1, pageSize: 100 }),
    enabled: Boolean(auth.accessToken) && (createOpen || Boolean(editing)),
  });

  const courseOptions = useMemo(() => coursesQuery.data?.items ?? [], [coursesQuery.data]);

  const createForm = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: defaultProgramForm,
  });

  const editForm = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: defaultProgramForm,
  });

  const createMutation = useMutation({
    mutationFn: (values: ProgramFormValues) =>
      createAcademyProgramApi(auth.accessToken!, {
        title: values.title,
        description: values.description?.trim() || undefined,
        thumbnail: values.thumbnail?.trim() || undefined,
        price: values.price,
        durationDays: values.durationDays,
        isActive: values.isActive,
        listedInPublicCatalog: values.listedInPublicCatalog,
        courseId: values.courseId?.trim() ? values.courseId.trim() : null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-programs'] }),
        queryClient.invalidateQueries({ queryKey: ['academy-programs'] }),
      ]);
      showToast({ type: 'success', title: 'Program created', message: 'It can appear on /academy if your school is the catalog tenant.' });
      setCreateOpen(false);
      createForm.reset(defaultProgramForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProgramFormValues }) =>
      updateAcademyProgramApi(auth.accessToken!, id, {
        title: values.title,
        description: values.description?.trim() ? values.description.trim() : null,
        thumbnail: values.thumbnail?.trim() ? values.thumbnail.trim() : null,
        price: values.price,
        durationDays: values.durationDays,
        isActive: values.isActive,
        listedInPublicCatalog: values.listedInPublicCatalog,
        courseId: values.courseId?.trim() ? values.courseId.trim() : null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-programs'] }),
        queryClient.invalidateQueries({ queryKey: ['academy-programs'] }),
      ]);
      showToast({ type: 'success', title: 'Program updated', message: 'Public pages will refresh on next load.' });
      setEditing(null);
    },
  });

  function openEdit(program: AcademyProgram) {
    setEditing(program);
    editForm.reset({
      title: program.title,
      description: program.description ?? '',
      thumbnail: program.thumbnail ?? '',
      price: program.price,
      durationDays: program.durationDays,
      isActive: program.isActive,
      listedInPublicCatalog: program.listedInPublicCatalog,
      courseId: program.courseId ?? '',
    });
  }

  const listError = programsQuery.error as ApiClientError | null;

  return (
    <SectionCard
      title="Academy programs (public catalog)"
      subtitle="These catalog items appear on /academy for plan-based access. Link an LMS course so selected learners can open the content after activating a plan."
      action={
        canManage ? (
          <button
            type="button"
            onClick={() => {
              createForm.reset(defaultProgramForm);
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            New program
          </button>
        ) : null
      }
    >
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Shown on the website only when this school is the academy catalog</p>
        <p className="mt-1 text-amber-900/90">
          Super Admin → Schools → enable <strong>Public academy catalog school</strong> for this tenant. Then create programs here (or keep using class courses only for in-school teaching).
        </p>
        <Link
          to="/admin/courses"
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
        >
          Back to class courses
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {programsQuery.isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : listError ? (
        <StateView title="Could not load programs" message={listError.message} />
      ) : !programsQuery.data?.length ? (
        <EmptyState
          title="No academy programs yet"
          message="Create a catalog program, keep the legacy price filled for old records, and link it to an LMS course so learners can open it from their plan."
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => {
                  createForm.reset(defaultProgramForm);
                  setCreateOpen(true);
                }}
                className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Create first program
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full min-w-[max(100%,720px)] text-left text-sm">
            <thead className="bg-brand-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Legacy price (RWF)</th>
                <th className="px-3 py-2 font-semibold">Days</th>
                <th className="px-3 py-2 font-semibold">Public</th>
                <th className="px-3 py-2 font-semibold">Linked course</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {programsQuery.data.map((row) => (
                <tr key={row.id} className="border-t border-brand-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{row.title}</p>
                    <p className="text-xs text-slate-500">{row.isActive ? 'Active' : 'Inactive'}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{Number(row.price).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.durationDays}</td>
                  <td className="px-3 py-2">{row.listedInPublicCatalog ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {row.linkedCourse ? row.linkedCourse.title : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createMutation.reset();
        }}
        title="New academy program"
        description="Appears on /academy when this school is the catalog tenant."
      >
        <form
          className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1"
          onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
        >
          <ProgramFormFields form={createForm} courseOptions={courseOptions} />
          {createMutation.error ? (
            <StateView title="Could not create" message={(createMutation.error as ApiClientError).message} />
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createMutation.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => {
          setEditing(null);
          updateMutation.reset();
        }}
        title="Edit academy program"
        description={editing?.title}
      >
        <form
          className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1"
          onSubmit={editForm.handleSubmit((values) => {
            if (!editing) {
              return;
            }
            updateMutation.mutate({ id: editing.id, values });
          })}
        >
          <ProgramFormFields form={editForm} courseOptions={courseOptions} />
          {updateMutation.error ? (
            <StateView title="Could not update" message={(updateMutation.error as ApiClientError).message} />
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}

function ProgramFormFields({
  form,
  courseOptions,
}: {
  form: UseFormReturn<ProgramFormValues>;
  courseOptions: Array<{ id: string; title: string; classRoom: { name: string }; academicYear: { name: string } }>;
}) {
  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Title
        <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('title')} />
      </label>
      {form.formState.errors.title?.message ? (
        <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
      ) : null}

      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Description (optional)
        <textarea className="min-h-[80px] rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('description')} />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Thumbnail URL (optional)
        <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="https://…" {...form.register('thumbnail')} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Legacy price (RWF)
          <input type="number" step="1" min="1" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('price')} />
          <span className="text-xs font-normal text-slate-500">
            Kept for older per-program purchases. The public academy now charges by time plan instead.
          </span>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Access length (days)
          <input type="number" min="1" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('durationDays')} />
        </label>
      </div>
      {form.formState.errors.price?.message ? (
        <p className="text-xs text-red-600">{String(form.formState.errors.price.message)}</p>
      ) : null}

      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Link to LMS course (optional)
        <select className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...form.register('courseId')}>
          <option value="">None</option>
          {courseOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} — {c.classRoom.name} ({c.academicYear.name})
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={form.watch('listedInPublicCatalog')}
          onChange={(e) =>
            form.setValue('listedInPublicCatalog', e.target.checked, { shouldDirty: true, shouldValidate: true })
          }
        />
        Listed on public /academy
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={form.watch('isActive')}
          onChange={(e) => form.setValue('isActive', e.target.checked, { shouldDirty: true, shouldValidate: true })}
        />
        Active
      </label>
    </>
  );
}
