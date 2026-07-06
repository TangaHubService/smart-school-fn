import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { DrawerForm } from '../components/drawer-form';
import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  AcademyProgram,
  createAcademyProgramApi,
  deleteAcademyProgramApi,
  listAcademyProgramsApi,
  updateAcademyProgramApi,
} from '../features/sprint4/lms.api';
import { listClassRoomsApi } from '../features/sprint1/sprint1.api';
import { ApiClientError } from '../types/api';

const programFormSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  thumbnail: z.string().trim().max(2000).optional().or(z.literal('')),
  section: z.string().trim().max(200).optional().or(z.literal('')),
  price: z.coerce.number().positive('Price must be greater than 0'),
  durationDays: z.coerce.number().int().min(1).max(3650),
  isActive: z.boolean(),
  listedInPublicCatalog: z.boolean(),
  classRoomId: z.string().optional(),
});

type ProgramFormValues = z.infer<typeof programFormSchema>;

const defaultProgramForm: ProgramFormValues = {
  title: '',
  description: '',
  thumbnail: '',
  section: '',
  price: 10000,
  durationDays: 30,
  isActive: true,
  listedInPublicCatalog: true,
  classRoomId: '',
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

  const classRoomsQuery = useQuery({
    queryKey: ['admin-academy-program-class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken) && (createOpen || Boolean(editing)),
  });

  const classRoomOptions = useMemo(
    () =>
      (classRoomsQuery.data ?? []) as Array<{
        id: string;
        name: string;
        gradeLevel: { name: string };
      }>,
    [classRoomsQuery.data]
  );

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
        section: values.section?.trim() || undefined,
        price: values.price,
        durationDays: values.durationDays,
        isActive: values.isActive,
        listedInPublicCatalog: values.listedInPublicCatalog,
        classRoomId: values.classRoomId?.trim() ? values.classRoomId.trim() : null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-programs'] }),
        queryClient.invalidateQueries({ queryKey: ['academy-programs'] }),
      ]);
      showToast({
        type: 'success',
        title: 'Program created',
        message: 'It can appear on /academy if your school is the catalog tenant.',
      });
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
        section: values.section?.trim() ? values.section.trim() : null,
        price: values.price,
        durationDays: values.durationDays,
        isActive: values.isActive,
        listedInPublicCatalog: values.listedInPublicCatalog,
        classRoomId: values.classRoomId?.trim() ? values.classRoomId.trim() : null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-programs'] }),
        queryClient.invalidateQueries({ queryKey: ['academy-programs'] }),
      ]);
      showToast({
        type: 'success',
        title: 'Program updated',
        message: 'Public pages will refresh on next load.',
      });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (programId: string) =>
      deleteAcademyProgramApi(auth.accessToken!, programId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-programs'] }),
        queryClient.invalidateQueries({ queryKey: ['academy-programs'] }),
      ]);
      showToast({
        type: 'success',
        title: 'Program deleted',
        message: 'The program has been removed.',
      });
    },
  });

  function openEdit(program: AcademyProgram) {
    setEditing(program);
    editForm.reset({
      title: program.title,
      description: program.description ?? '',
      thumbnail: program.thumbnail ?? '',
      section: program.section ?? '',
      price: program.price,
      durationDays: program.durationDays,
      isActive: program.isActive,
      listedInPublicCatalog: program.listedInPublicCatalog,
      classRoomId: program.classRoomId ?? '',
    });
  }

  const listError = programsQuery.error as ApiClientError | null;

  return (
    <SectionCard
      title="Academy programs (public catalog)"
      subtitle="These catalog items appear on /academy for class-based access. Link a class so learners unlock every subject, course, and lesson in it after purchasing."
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
        <p className="font-semibold">
          Shown on the website only when this school is the academy catalog
        </p>
        <p className="mt-1 text-amber-900/90">
          Super Admin → Schools → enable <strong>Public academy catalog school</strong> for this
          tenant. Then create programs here (or keep using class courses only for in-school
          teaching).
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
          message="Create a catalog program and link it to a class so learners unlock every subject, course, and lesson in that class after purchasing."
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
                <th className="px-3 py-2 font-semibold">Section</th>
                <th className="px-3 py-2 font-semibold">Legacy price (RWF)</th>
                <th className="px-3 py-2 font-semibold">Days</th>
                <th className="px-3 py-2 font-semibold">Public</th>
                <th className="px-3 py-2 font-semibold">Linked class</th>
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
                  <td className="px-3 py-2 text-xs text-slate-600">{row.section ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {Number(row.price).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{row.durationDays}</td>
                  <td className="px-3 py-2">{row.listedInPublicCatalog ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {row.linkedClassRoom
                      ? `${row.linkedClassRoom.name} (${row.linkedClassRoom.gradeLevelName})`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canManage ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete "${row.title}"? This action cannot be undone.`)) {
                              deleteMutation.mutate(row.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 ml-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DrawerForm
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createMutation.reset();
        }}
        onCancel={() => {
          setCreateOpen(false);
          createMutation.reset();
        }}
        title="New academy program"
        onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
        isLoading={createMutation.isPending}
        submitLabel="Create"
        formId="create-academy-program-form"
      >
        <p className="text-sm text-slate-600">
          Appears on /academy when this school is the catalog tenant.
        </p>
        <ProgramFormFields form={createForm} classRoomOptions={classRoomOptions} />
        {createMutation.error ? (
          <StateView
            title="Could not create"
            message={(createMutation.error as ApiClientError).message}
          />
        ) : null}
      </DrawerForm>

      <DrawerForm
        open={Boolean(editing)}
        onClose={() => {
          setEditing(null);
          updateMutation.reset();
        }}
        onCancel={() => {
          setEditing(null);
          updateMutation.reset();
        }}
        title="Edit academy program"
        onSubmit={editForm.handleSubmit((values) => {
          if (!editing) {
            return;
          }
          updateMutation.mutate({ id: editing.id, values });
        })}
        isLoading={updateMutation.isPending}
        submitLabel="Save"
        formId="edit-academy-program-form"
      >
        {editing?.title ? <p className="text-sm text-slate-600">{editing.title}</p> : null}
        <ProgramFormFields form={editForm} classRoomOptions={classRoomOptions} />
        {updateMutation.error ? (
          <StateView
            title="Could not update"
            message={(updateMutation.error as ApiClientError).message}
          />
        ) : null}
      </DrawerForm>
    </SectionCard>
  );
}

function ProgramFormFields({
  form,
  classRoomOptions,
}: {
  form: UseFormReturn<ProgramFormValues>;
  classRoomOptions: Array<{
    id: string;
    name: string;
    gradeLevel: { name: string };
  }>;
}) {
  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Title
        <input
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          {...form.register('title')}
        />
      </label>
      {form.formState.errors.title?.message ? (
        <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
      ) : null}

      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Description (optional)
        <textarea
          className="min-h-[80px] rounded-lg border border-brand-200 px-3 py-2 text-sm"
          {...form.register('description')}
        />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Thumbnail URL (optional)
        <input
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          placeholder="https://…"
          {...form.register('thumbnail')}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Price (RWF)
          <input
            type="number"
            step="1"
            min="1"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...form.register('price')}
          />
          <span className="text-xs font-normal text-slate-500">
            Charged once to unlock every subject, course, and lesson in the linked class.
          </span>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Access length (days)
          <input
            type="number"
            min="1"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...form.register('durationDays')}
          />
        </label>
      </div>
      {form.formState.errors.price?.message ? (
        <p className="text-xs text-red-600">{String(form.formState.errors.price.message)}</p>
      ) : null}

      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Link to class (required for purchasable access)
        <select
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          {...form.register('classRoomId')}
        >
          <option value="">None</option>
          {classRoomOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.gradeLevel.name})
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-slate-500">
          Purchasing this program unlocks every subject, course, lesson, and assessment in the
          linked class.
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={form.watch('listedInPublicCatalog')}
          onChange={(e) =>
            form.setValue('listedInPublicCatalog', e.target.checked, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        Listed on public /academy
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={form.watch('isActive')}
          onChange={(e) =>
            form.setValue('isActive', e.target.checked, { shouldDirty: true, shouldValidate: true })
          }
        />
        Active
      </label>
    </>
  );
}
