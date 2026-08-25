import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DrawerForm } from '../components/drawer-form';
import { AppDrawer } from '../components/drawer';
import { SectionCard } from '../components/section-card';
import { InlineSkeleton } from '../components/skeleton-loader';
import { useToast } from '../components/toast';
import { ConfirmDrawer } from '../components/confirm-drawer';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  DataTable,
  DataTableToolbar,
  type DataTableColumn,
} from '../components/ui/data-table';
import { useAuth } from '../features/auth/auth.context';
import { listClassRoomsApi } from '../features/sprint1/sprint1.api';
import {
  createParentApi,
  listLinkableStudentsApi,
  linkParentStudentApi,
  listParentsApi,
  updateParentApi,
  deleteParentApi,
  type ParentListItem,
} from '../features/sprint2/sprint2.api';
import { ApiClientError } from '../types/api';

const parentColumns: DataTableColumn<ParentListItem>[] = [
  {
    key: 'name',
    header: 'Parent',
    mobile: 'primary',
    render: (parent) => (
      <span className="flex items-center gap-3">
        <Avatar name={`${parent.firstName} ${parent.lastName}`} size="sm" />
        <span className="min-w-0">
          <span className="block font-semibold text-slate-900">
            {parent.firstName} {parent.lastName}
          </span>
          {parent.parentCode ? (
            <span className="block text-xs text-slate-500">{parent.parentCode}</span>
          ) : null}
        </span>
      </span>
    ),
  },
  {
    key: 'contact',
    header: 'Contact',
    mobile: 'secondary',
    render: (parent) => (
      <span className="min-w-0">
        <span className="block truncate text-slate-700">{parent.email ?? '—'}</span>
        <span className="block text-xs text-slate-500">{parent.phone ?? '—'}</span>
      </span>
    ),
  },
  {
    key: 'linkedStudents',
    header: 'Linked Students',
    render: (parent) => (
      <span>
        <span className="tabular-nums text-slate-800">{parent.linkedStudentsCount}</span>
        {parent.linkedStudents.length ? (
          <span className="block text-xs text-slate-500">
            {parent.linkedStudents
              .slice(0, 2)
              .map((student) => student.studentCode)
              .join(', ')}
            {parent.linkedStudents.length > 2 ? ' …' : ''}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'hasLogin',
    header: 'Portal',
    render: (parent) =>
      parent.hasLogin ? (
        <Badge tone="success">Enabled</Badge>
      ) : (
        <Badge tone="neutral">No login</Badge>
      ),
  },
];

const createParentSchema = z.object({
  parentCode: z.string().optional(),
  firstName: z.string().trim().min(2, 'First name is required').max(80),
  lastName: z.string().trim().min(2, 'Last name is required').max(80),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().min(6, 'Phone must be at least 6 digits').optional().or(z.literal('')),
  createLogin: z.boolean().default(false),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional()
    .or(z.literal('')),
});

type CreateParentForm = z.infer<typeof createParentSchema>;

const defaultCreateParentForm: CreateParentForm = {
  parentCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  createLogin: false,
  password: '',
};

const linkSchema = z.object({
  studentId: z.string().min(1, 'Select a student'),
  relationship: z.enum(['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER']).default('GUARDIAN'),
  isPrimary: z.boolean().default(false),
});

type LinkForm = z.infer<typeof linkSchema>;

const defaultLinkForm: LinkForm = {
  studentId: '',
  relationship: 'GUARDIAN',
  isPrimary: false,
};

interface ClassRoomOption {
  id: string;
  code: string;
  name: string;
  gradeLevel?: {
    id: string;
    code: string;
    name: string;
    rank: number;
  };
}

export function ParentsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<any | null>(null);
  const [linkTarget, setLinkTarget] = useState<{ id: string; name: string } | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkClassId, setLinkClassId] = useState('');
  const [deletingParent, setDeletingParent] = useState<{ id: string; name: string } | null>(null);

  const createForm = useForm<CreateParentForm>({
    resolver: zodResolver(createParentSchema),
    defaultValues: defaultCreateParentForm,
  });

  const linkForm = useForm<LinkForm>({
    resolver: zodResolver(linkSchema),
    defaultValues: defaultLinkForm,
  });

  const parentsQuery = useQuery({
    queryKey: ['parents', { search, page, pageSize }],
    queryFn: () =>
      listParentsApi(auth.accessToken!, {
        q: search,
        page,
        pageSize,
      }),
  });

  const studentsForLinkQuery = useQuery({
    queryKey: ['parents-linkable-students', { q: linkSearch, classId: linkClassId }],
    queryFn: () =>
      listLinkableStudentsApi(auth.accessToken!, {
        classId: linkClassId || undefined,
        q: linkSearch || undefined,
        pageSize: 50,
      }),
    enabled: Boolean(linkTarget),
  });

  const classesQuery = useQuery({
    queryKey: ['parent-link-classes'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
    enabled: Boolean(linkTarget),
  });

  const createParentMutation = useMutation({
    mutationFn: (values: CreateParentForm) => {
      if (values.createLogin && (!values.email || !values.password)) {
        throw new Error('Email and password are required when creating parent login');
      }

      return createParentApi(auth.accessToken!, {
        parentCode: values.parentCode || undefined,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        createLogin: values.createLogin,
        password: values.createLogin ? values.password || undefined : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setIsCreateModalOpen(false);
      createForm.reset(defaultCreateParentForm);
      showToast({ type: 'success', title: 'Parent created successfully' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create parent',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const updateParentMutation = useMutation({
    mutationFn: ({ parentId, values }: { parentId: string; values: CreateParentForm }) => {
      if (values.createLogin && !values.password) {
        throw new Error('Password is required when enabling parent login');
      }

      return updateParentApi(auth.accessToken!, parentId, {
        parentCode: values.parentCode || undefined,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email ? values.email : null,
        phone: values.phone ? values.phone : null,
        createLogin: values.createLogin,
        password: values.password || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setIsCreateModalOpen(false);
      setEditingParent(null);
      createForm.reset(defaultCreateParentForm);
      showToast({ type: 'success', title: 'Parent updated successfully' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update parent',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ parentId, values }: { parentId: string; values: LinkForm }) =>
      linkParentStudentApi(auth.accessToken!, parentId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setLinkTarget(null);
      setLinkSearch('');
      setLinkClassId('');
      linkForm.reset(defaultLinkForm);
      showToast({ type: 'success', title: 'Student linked to parent' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not link student',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const deleteParentMutation = useMutation({
    mutationFn: (parentId: string) => deleteParentApi(auth.accessToken!, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setDeletingParent(null);
      showToast({ type: 'success', title: 'Parent deleted successfully' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not delete parent',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const parents = parentsQuery.data?.items ?? [];
  const pagination =
    parentsQuery.data?.pagination ??
    ({
      page,
      pageSize,
      totalItems: 0,
      totalPages: 1,
    } as const);

  const studentOptions = studentsForLinkQuery.data ?? [];
  const classOptions = ((classesQuery.data as ClassRoomOption[] | undefined) ??
    []) as ClassRoomOption[];

  useEffect(() => {
    if (!linkTarget) {
      return;
    }

    const selectedStudentId = linkForm.getValues('studentId');
    if (!selectedStudentId) {
      return;
    }

    const selectedStillVisible = studentOptions.some((student) => student.id === selectedStudentId);
    if (!selectedStillVisible) {
      linkForm.setValue('studentId', '');
    }
  }, [linkTarget, studentOptions, linkForm]);

  function openCreateModal() {
    createForm.reset(defaultCreateParentForm);
    setEditingParent(null);
    setIsCreateModalOpen(true);
  }

  function openEditModal(parent: any) {
    setEditingParent(parent);
    createForm.reset({
      parentCode: parent.parentCode ?? '',
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email ?? '',
      phone: parent.phone ?? '',
      createLogin: Boolean(parent.hasLogin),
      password: '',
    });
    setIsCreateModalOpen(true);
  }

  function openLinkModal(parent: any) {
    setLinkTarget({
      id: parent.id,
      name: `${parent.firstName} ${parent.lastName}`,
    });
    setLinkSearch('');
    setLinkClassId('');
    linkForm.reset(defaultLinkForm);
  }

  return (
    <SectionCard
      title="Parents"
      subtitle="Create parent contacts and link students for secure parent portal access."
      action={
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
        >
          Add parent
        </button>
      }
    >
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.055)]">
        <DataTableToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Search by name, email, phone"
          searchAriaLabel="Search parents"
          onReset={() => {
            setSearch('');
            setPage(1);
          }}
        />

        <div className="p-4">
          <DataTable<ParentListItem>
            ariaLabel="Parents"
            columns={parentColumns}
            data={parents}
            rowKey={(parent) => parent.id}
            showIndex
            loading={parentsQuery.isPending}
            skeletonRows={6}
            error={
              parentsQuery.isError
                ? { title: 'Could not load parents', message: 'Please retry.' }
                : null
            }
            onRetry={() => void parentsQuery.refetch()}
            emptyTitle="No parents found"
            emptyDescription="Add parent records and start linking students."
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              totalItems: pagination.totalItems,
              totalPages: pagination.totalPages,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(1);
              },
              pageSizeOptions: [10, 25, 50, 100],
            }}
            rowActions={(parent) => (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(parent)}
                  className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-brand-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => openLinkModal(parent)}
                  className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-brand-100"
                >
                  Link student
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeletingParent({
                      id: parent.id,
                      name: `${parent.firstName} ${parent.lastName}`,
                    })
                  }
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            )}
            minWidth={820}
            className="border-0 shadow-none"
          />
        </div>
      </div>

      <DrawerForm
        open={isCreateModalOpen}
        title={editingParent ? 'Edit Parent' : 'Add Parent'}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setEditingParent(null);
          createParentMutation.reset();
          updateParentMutation.reset();
        }}
        isLoading={createParentMutation.isPending || updateParentMutation.isPending}
        submitLabel={editingParent ? 'Update parent' : 'Create parent'}
        onSubmit={createForm.handleSubmit((values) => {
          if (editingParent) {
            updateParentMutation.mutate({
              parentId: editingParent.id,
              values,
            });
            return;
          }
          createParentMutation.mutate(values);
        })}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            First Name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2"
              {...createForm.register('firstName')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Last Name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2"
              {...createForm.register('lastName')}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Parent Code (optional)
            <input
              className="rounded-lg border border-brand-200 px-3 py-2"
              {...createForm.register('parentCode')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Phone (optional)
            <input
              className="rounded-lg border border-brand-200 px-3 py-2"
              {...createForm.register('phone')}
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Email (optional)
          <input
            className="rounded-lg border border-brand-200 px-3 py-2"
            {...createForm.register('email')}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input type="checkbox" {...createForm.register('createLogin')} />
          Enable parent portal login
        </label>

        {createForm.watch('createLogin') ? (
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Initial Password
            <input
              type="password"
              className="rounded-lg border border-brand-200 px-3 py-2"
              {...createForm.register('password')}
            />
          </label>
        ) : null}

        {(createParentMutation.error as ApiClientError | null) ? (
          <p className="text-xs text-red-700">
            {(createParentMutation.error as ApiClientError).message}
          </p>
        ) : null}
        {(updateParentMutation.error as ApiClientError | null) ? (
          <p className="text-xs text-red-700">
            {(updateParentMutation.error as ApiClientError).message}
          </p>
        ) : null}
      </DrawerForm>

      <DrawerForm
        open={Boolean(linkTarget)}
        title="Link Student"
        onCancel={() => {
          setLinkTarget(null);
          setLinkSearch('');
          setLinkClassId('');
          linkForm.reset(defaultLinkForm);
          linkMutation.reset();
        }}
        isLoading={linkMutation.isPending}
        submitLabel="Link student"
        onSubmit={linkForm.handleSubmit((values) => {
          if (!linkTarget) {
            return;
          }

          linkMutation.mutate({ parentId: linkTarget.id, values });
        })}
      >
        <input type="hidden" {...linkForm.register('studentId')} />
        <div className="grid gap-1 text-sm font-semibold text-slate-800">
          <label htmlFor="student-class-filter">Class</label>
          <select
            id="student-class-filter"
            value={linkClassId}
            onChange={(event) => {
              setLinkClassId(event.target.value);
              linkForm.setValue('studentId', '');
            }}
            disabled={classesQuery.isPending || classesQuery.isError}
            className="rounded-lg border border-brand-200 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">All classes</option>
            {classOptions.map((classRoom) => (
              <option key={classRoom.id} value={classRoom.id}>
                {classRoom.name} ({classRoom.code})
              </option>
            ))}
          </select>
        </div>
        {classesQuery.isPending ? (
          <InlineSkeleton className="py-1" label="Loading classes" />
        ) : null}
        {classesQuery.isError ? (
          <p className="text-xs text-red-700">
            Could not load classes. You can retry by reopening this dialog.
          </p>
        ) : null}
        <div className="grid gap-1 text-sm font-semibold text-slate-800">
          <label htmlFor="student-lookup-input">Student Lookup</label>
          <input
            id="student-lookup-input"
            value={linkSearch}
            onChange={(event) => setLinkSearch(event.target.value)}
            placeholder="Search by student name or code"
            className="rounded-lg border border-brand-200 px-3 py-2"
          />
        </div>
        {studentsForLinkQuery.isPending ? (
          <InlineSkeleton className="py-1" label="Loading students" />
        ) : null}
        {studentsForLinkQuery.isError ? (
          <p className="text-xs text-red-700">Could not load students. Try searching again.</p>
        ) : null}
        {!studentsForLinkQuery.isPending && !studentsForLinkQuery.isError ? (
          <div className="max-h-44 overflow-y-auto rounded-lg border border-brand-100">
            {studentOptions.length ? (
              <div className="grid">
                {studentOptions.map((student) => {
                  const isSelected = linkForm.watch('studentId') === student.id;
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() =>
                        linkForm.setValue('studentId', student.id, { shouldValidate: true })
                      }
                      className={[
                        'flex items-center justify-between border-b border-brand-50 px-3 py-2 text-left text-sm',
                        isSelected
                          ? 'bg-brand-100 text-slate-900'
                          : 'bg-white text-slate-800 hover:bg-brand-50',
                      ].join(' ')}
                    >
                      <span>
                        <span className="block">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {student.currentEnrollment?.classRoom.name ?? 'No active class'}
                        </span>
                      </span>
                      <span className="text-right text-xs text-slate-600">
                        <span className="block">{student.studentCode}</span>
                        <span className="block">
                          {student.currentEnrollment?.classRoom.code ?? '-'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-3 py-2 text-sm text-slate-600">No students match your search.</p>
            )}
          </div>
        ) : null}
        {linkForm.formState.errors.studentId ? (
          <p className="text-xs text-red-700">{linkForm.formState.errors.studentId.message}</p>
        ) : null}

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Relationship
          <select
            className="rounded-lg border border-brand-200 px-3 py-2"
            {...linkForm.register('relationship')}
          >
            <option value="MOTHER">Mother</option>
            <option value="FATHER">Father</option>
            <option value="GUARDIAN">Guardian</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input type="checkbox" {...linkForm.register('isPrimary')} />
          Mark as primary contact for this student
        </label>

        {(linkMutation.error as ApiClientError | null) ? (
          <p className="text-xs text-red-700">{(linkMutation.error as ApiClientError).message}</p>
        ) : null}
      </DrawerForm>

      <ConfirmDrawer
        open={Boolean(deletingParent)}
        title="Delete Parent"
        message={`Are you sure you want to delete "${deletingParent?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive
        isLoading={deleteParentMutation.isPending}
        onConfirm={() => {
          if (deletingParent) {
            deleteParentMutation.mutate(deletingParent.id);
          }
        }}
        onCancel={() => setDeletingParent(null)}
      />
    </SectionCard>
  );
}
