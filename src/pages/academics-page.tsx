import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReactNode, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { hasPermission } from '../features/auth/auth-helpers';
import { useAuth } from '../features/auth/auth.context';
import {
  createAcademicYearApi,
  createClassRoomApi,
  createGradeLevelApi,
  createSubjectApi,
  createTermApi,
  deleteAcademicYearApi,
  deleteClassRoomApi,
  deleteGradeLevelApi,
  deleteSubjectApi,
  deleteTermApi,
  listAcademicYearsApi,
  listClassRoomsApi,
  listGradeLevelsApi,
  listSubjectsApi,
  listTermsApi,
  updateAcademicYearApi,
  updateClassRoomApi,
  updateGradeLevelApi,
  updateSubjectApi,
  updateTermApi,
} from '../features/sprint1/sprint1.api';

const academicYearSchema = z.object({
  name: z.string().trim().min(2),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  isCurrent: z.boolean().default(false),
});

const termSchema = z.object({
  academicYearId: z.string().min(1),
  name: z.string().trim().min(2),
  sequence: z.coerce.number().int().min(1),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
});

const gradeLevelSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(2),
  rank: z.coerce.number().int().min(1),
});

const classRoomSchema = z.object({
  gradeLevelId: z.string().min(1),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  capacity: z.coerce.number().int().min(1).optional(),
});

const subjectSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(2),
  isCore: z.boolean().default(false),
});

type AcademicYearForm = z.infer<typeof academicYearSchema>;
type TermForm = z.infer<typeof termSchema>;
type GradeLevelForm = z.infer<typeof gradeLevelSchema>;
type ClassRoomForm = z.infer<typeof classRoomSchema>;
type SubjectForm = z.infer<typeof subjectSchema>;

type DeleteTargetType = 'academicYear' | 'term' | 'gradeLevel' | 'classRoom' | 'subject';

interface DeleteTarget {
  id: string;
  type: DeleteTargetType;
  label: string;
}

const academicYearDefaults: AcademicYearForm = {
  name: '2026/2027',
  startDate: '2026-09-01',
  endDate: '2027-07-15',
  isCurrent: true,
};

const termDefaults: TermForm = {
  academicYearId: '',
  name: 'Term 1',
  sequence: 1,
  startDate: '2026-09-01',
  endDate: '2026-12-15',
};

const gradeLevelDefaults: GradeLevelForm = {
  code: 'G1',
  name: 'Grade 1',
  rank: 1,
};

const classDefaults: ClassRoomForm = {
  gradeLevelId: '',
  code: 'G1-A',
  name: 'Grade 1 A',
  capacity: 40,
};

const subjectDefaults: SubjectForm = {
  code: 'MATH',
  name: 'Mathematics',
  isCore: true,
};

export type AcademicsPageFocus = 'academic-years' | 'classes' | 'subjects' | 'all';

interface AcademicsPageProps {
  focus?: AcademicsPageFocus;
}

export function AcademicsPage({ focus = 'all' }: AcademicsPageProps) {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const canManageSubjects = hasPermission(auth.me, 'subject.manage');

  const [yearFilter, setYearFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showAcademicYears = focus === 'all' || focus === 'academic-years';
  const showClasses = focus === 'all' || focus === 'classes';
  const showSubjects = focus === 'all' || focus === 'subjects';

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
    enabled: showAcademicYears,
  });

  const termsQuery = useQuery({
    queryKey: ['terms'],
    queryFn: () => listTermsApi(auth.accessToken!),
    enabled: showAcademicYears,
  });

  const gradeLevelsQuery = useQuery({
    queryKey: ['grade-levels'],
    queryFn: () => listGradeLevelsApi(auth.accessToken!),
    enabled: showClasses,
  });

  const classRoomsQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
    enabled: showClasses,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => listSubjectsApi(auth.accessToken!),
    enabled: showSubjects,
  });

  const yearForm = useForm<AcademicYearForm>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: academicYearDefaults,
  });

  const termForm = useForm<TermForm>({
    resolver: zodResolver(termSchema),
    defaultValues: termDefaults,
  });

  const gradeForm = useForm<GradeLevelForm>({
    resolver: zodResolver(gradeLevelSchema),
    defaultValues: gradeLevelDefaults,
  });

  const classForm = useForm<ClassRoomForm>({
    resolver: zodResolver(classRoomSchema),
    defaultValues: classDefaults,
  });

  const subjectForm = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: subjectDefaults,
  });

  const createYearMutation = useMutation({
    mutationFn: (values: AcademicYearForm) => createAcademicYearApi(auth.accessToken!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      showToast({ type: 'success', title: 'Academic year created' });
    },
  });

  const updateYearMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AcademicYearForm }) =>
      updateAcademicYearApi(auth.accessToken!, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      showToast({ type: 'success', title: 'Academic year updated' });
    },
  });

  const createTermMutation = useMutation({
    mutationFn: (values: TermForm) => createTermApi(auth.accessToken!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      showToast({ type: 'success', title: 'Term created' });
    },
  });

  const updateTermMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TermForm }) =>
      updateTermApi(auth.accessToken!, id, {
        name: values.name,
        sequence: values.sequence,
        startDate: values.startDate,
        endDate: values.endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      showToast({ type: 'success', title: 'Term updated' });
    },
  });

  const createGradeMutation = useMutation({
    mutationFn: (values: GradeLevelForm) => createGradeLevelApi(auth.accessToken!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      showToast({ type: 'success', title: 'Grade level created' });
    },
  });

  const updateGradeMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: GradeLevelForm }) =>
      updateGradeLevelApi(auth.accessToken!, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      showToast({ type: 'success', title: 'Grade level updated' });
    },
  });

  const createClassMutation = useMutation({
    mutationFn: (values: ClassRoomForm) => createClassRoomApi(auth.accessToken!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-rooms'] });
      showToast({ type: 'success', title: 'Class created' });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ClassRoomForm }) =>
      updateClassRoomApi(auth.accessToken!, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-rooms'] });
      showToast({ type: 'success', title: 'Class updated' });
    },
  });

  const createSubjectMutation = useMutation({
    mutationFn: (values: SubjectForm) => createSubjectApi(auth.accessToken!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showToast({ type: 'success', title: 'Subject created' });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubjectForm }) =>
      updateSubjectApi(auth.accessToken!, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showToast({ type: 'success', title: 'Subject updated' });
    },
  });

  const deleteYearMutation = useMutation({
    mutationFn: (id: string) => deleteAcademicYearApi(auth.accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      showToast({ type: 'success', title: 'Academic year deleted' });
    },
  });

  const deleteTermMutation = useMutation({
    mutationFn: (id: string) => deleteTermApi(auth.accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      showToast({ type: 'success', title: 'Term deleted' });
    },
  });

  const deleteGradeMutation = useMutation({
    mutationFn: (id: string) => deleteGradeLevelApi(auth.accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      showToast({ type: 'success', title: 'Grade level deleted' });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => deleteClassRoomApi(auth.accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-rooms'] });
      showToast({ type: 'success', title: 'Class deleted' });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => deleteSubjectApi(auth.accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showToast({ type: 'success', title: 'Subject deleted' });
    },
  });

  const years = ((yearsQuery.data as any[]) ?? []) as any[];
  const terms = ((termsQuery.data as any[]) ?? []) as any[];
  const gradeLevels = ((gradeLevelsQuery.data as any[]) ?? []) as any[];
  const classRooms = ((classRoomsQuery.data as any[]) ?? []) as any[];
  const subjects = ((subjectsQuery.data as any[]) ?? []) as any[];

  const yearNameMap = useMemo(() => new Map(years.map((year) => [year.id, year.name])), [years]);

  const filteredYears = useMemo(() => {
    const query = yearFilter.trim().toLowerCase();
    if (!query) {
      return years;
    }

    return years.filter((year) =>
      `${year.name} ${toDateInput(year.startDate)} ${toDateInput(year.endDate)}`
        .toLowerCase()
        .includes(query),
    );
  }, [years, yearFilter]);

  const filteredTerms = useMemo(() => {
    const query = termFilter.trim().toLowerCase();
    if (!query) {
      return terms;
    }

    return terms.filter((term) =>
      `${term.name} ${term.sequence} ${yearNameMap.get(term.academicYearId) ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [terms, termFilter, yearNameMap]);

  const filteredGradeLevels = useMemo(() => {
    const query = gradeFilter.trim().toLowerCase();
    if (!query) {
      return gradeLevels;
    }

    return gradeLevels.filter((level) =>
      `${level.code} ${level.name} ${level.rank}`.toLowerCase().includes(query),
    );
  }, [gradeLevels, gradeFilter]);

  const filteredClassRooms = useMemo(() => {
    const query = classFilter.trim().toLowerCase();
    if (!query) {
      return classRooms;
    }

    return classRooms.filter((room) =>
      `${room.code} ${room.name} ${room.gradeLevel?.name ?? ''}`.toLowerCase().includes(query),
    );
  }, [classRooms, classFilter]);

  const filteredSubjects = useMemo(() => {
    const query = subjectFilter.trim().toLowerCase();
    if (!query) {
      return subjects;
    }

    return subjects.filter((subject) =>
      `${subject.code} ${subject.name} ${subject.isCore ? 'core' : 'elective'}`
        .toLowerCase()
        .includes(query),
    );
  }, [subjects, subjectFilter]);

  function openAddYear() {
    setEditingYearId(null);
    yearForm.reset(academicYearDefaults);
    setIsYearModalOpen(true);
  }

  function openEditYear(year: any) {
    setEditingYearId(year.id);
    yearForm.reset({
      name: year.name,
      startDate: toDateInput(year.startDate),
      endDate: toDateInput(year.endDate),
      isCurrent: Boolean(year.isCurrent),
    });
    setIsYearModalOpen(true);
  }

  function openAddTerm() {
    setEditingTermId(null);
    termForm.reset({
      ...termDefaults,
      academicYearId: years[0]?.id ?? '',
    });
    setIsTermModalOpen(true);
  }

  function openEditTerm(term: any) {
    setEditingTermId(term.id);
    termForm.reset({
      academicYearId: term.academicYearId,
      name: term.name,
      sequence: Number(term.sequence),
      startDate: toDateInput(term.startDate),
      endDate: toDateInput(term.endDate),
    });
    setIsTermModalOpen(true);
  }

  function openAddGradeLevel() {
    setEditingGradeId(null);
    gradeForm.reset(gradeLevelDefaults);
    setIsGradeModalOpen(true);
  }

  function openEditGradeLevel(level: any) {
    setEditingGradeId(level.id);
    gradeForm.reset({
      code: level.code,
      name: level.name,
      rank: Number(level.rank),
    });
    setIsGradeModalOpen(true);
  }

  function openAddClass() {
    setEditingClassId(null);
    classForm.reset({
      ...classDefaults,
      gradeLevelId: gradeLevels[0]?.id ?? '',
    });
    setIsClassModalOpen(true);
  }

  function openEditClass(room: any) {
    setEditingClassId(room.id);
    classForm.reset({
      gradeLevelId: room.gradeLevelId,
      code: room.code,
      name: room.name,
      capacity: room.capacity ?? undefined,
    });
    setIsClassModalOpen(true);
  }

  function openAddSubject() {
    setEditingSubjectId(null);
    subjectForm.reset(subjectDefaults);
    setIsSubjectModalOpen(true);
  }

  function openEditSubject(subject: any) {
    setEditingSubjectId(subject.id);
    subjectForm.reset({
      code: subject.code,
      name: subject.name,
      isCore: Boolean(subject.isCore),
    });
    setIsSubjectModalOpen(true);
  }

  function requestDelete(type: DeleteTargetType, id: string, label: string) {
    setDeleteError(null);
    setDeleteTarget({ type, id, label });
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (deleteTarget.type === 'academicYear') {
        await deleteYearMutation.mutateAsync(deleteTarget.id);
      }
      if (deleteTarget.type === 'term') {
        await deleteTermMutation.mutateAsync(deleteTarget.id);
      }
      if (deleteTarget.type === 'gradeLevel') {
        await deleteGradeMutation.mutateAsync(deleteTarget.id);
      }
      if (deleteTarget.type === 'classRoom') {
        await deleteClassMutation.mutateAsync(deleteTarget.id);
      }
      if (deleteTarget.type === 'subject') {
        await deleteSubjectMutation.mutateAsync(deleteTarget.id);
      }

      setDeleteTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      setDeleteError(message);
      showToast({ type: 'error', title: 'Delete failed', message });
    } finally {
      setIsDeleting(false);
    }
  }

  const isSavingYear = createYearMutation.isPending || updateYearMutation.isPending;
  const isSavingTerm = createTermMutation.isPending || updateTermMutation.isPending;
  const isSavingGrade = createGradeMutation.isPending || updateGradeMutation.isPending;
  const isSavingClass = createClassMutation.isPending || updateClassMutation.isPending;
  const isSavingSubject = createSubjectMutation.isPending || updateSubjectMutation.isPending;

  return (
    <div className="grid gap-4">
      {showAcademicYears ? (
        <>
          <SectionCard
            title="Academic Years"
            subtitle="List, update, and softly delete academic years."
            action={
              <button
                type="button"
                onClick={openAddYear}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Add academic year
              </button>
            }
          >
            <FilterInput
              value={yearFilter}
              onChange={setYearFilter}
              placeholder="Filter by name or dates"
              label="Filter academic years"
            />

            {yearsQuery.isPending ? <LoadingRows /> : null}
            {yearsQuery.isError ? (
              <StateView
                title="Could not load academic years"
                message="Please retry."
                action={
                  <button
                    type="button"
                    onClick={() => void yearsQuery.refetch()}
                    className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                }
              />
            ) : null}

            {!yearsQuery.isPending && !yearsQuery.isError ? (
              <SimpleTable
                columns={['Name', 'Start', 'End', 'Current', 'Actions']}
                rows={filteredYears.map((year) => [
                  year.name,
                  toDateInput(year.startDate),
                  toDateInput(year.endDate),
                  year.isCurrent ? 'Yes' : 'No',
                  <ActionButtons
                    onEdit={() => openEditYear(year)}
                    onDelete={() => requestDelete('academicYear', year.id, year.name)}
                  />,
                ])}
                emptyMessage="No academic years found."
              />
            ) : null}
          </SectionCard>

          <SectionCard
            title="Terms"
            subtitle="List, update, and softly delete terms."
            action={
              <button
                type="button"
                onClick={openAddTerm}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Add term
              </button>
            }
          >
            <FilterInput
              value={termFilter}
              onChange={setTermFilter}
              placeholder="Filter by term name, sequence, or year"
              label="Filter terms"
            />

            {termsQuery.isPending ? <LoadingRows /> : null}
            {termsQuery.isError ? (
              <StateView
                title="Could not load terms"
                message="Please retry."
                action={
                  <button
                    type="button"
                    onClick={() => void termsQuery.refetch()}
                    className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                }
              />
            ) : null}

            {!termsQuery.isPending && !termsQuery.isError ? (
              <SimpleTable
                columns={['Name', 'Sequence', 'Year', 'Start', 'End', 'Actions']}
                rows={filteredTerms.map((term) => [
                  term.name,
                  term.sequence,
                  yearNameMap.get(term.academicYearId) ?? term.academicYearId,
                  toDateInput(term.startDate),
                  toDateInput(term.endDate),
                  <ActionButtons
                    onEdit={() => openEditTerm(term)}
                    onDelete={() => requestDelete('term', term.id, term.name)}
                  />,
                ])}
                emptyMessage="No terms found."
              />
            ) : null}
          </SectionCard>
        </>
      ) : null}

      {showClasses ? (
        <>
          <SectionCard
            title="Grade Levels"
            subtitle="List, update, and softly delete grade levels."
            action={
              <button
                type="button"
                onClick={openAddGradeLevel}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Add grade level
              </button>
            }
          >
            <FilterInput
              value={gradeFilter}
              onChange={setGradeFilter}
              placeholder="Filter by code, name, rank"
              label="Filter grade levels"
            />

            {gradeLevelsQuery.isPending ? <LoadingRows /> : null}
            {gradeLevelsQuery.isError ? (
              <StateView
                title="Could not load grade levels"
                message="Please retry."
                action={
                  <button
                    type="button"
                    onClick={() => void gradeLevelsQuery.refetch()}
                    className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                }
              />
            ) : null}

            {!gradeLevelsQuery.isPending && !gradeLevelsQuery.isError ? (
              <SimpleTable
                columns={['Code', 'Name', 'Rank', 'Actions']}
                rows={filteredGradeLevels.map((level) => [
                  level.code,
                  level.name,
                  level.rank,
                  <ActionButtons
                    onEdit={() => openEditGradeLevel(level)}
                    onDelete={() => requestDelete('gradeLevel', level.id, level.name)}
                  />,
                ])}
                emptyMessage="No grade levels found."
              />
            ) : null}
          </SectionCard>

          <SectionCard
            title="Classes"
            subtitle="List, update, and softly delete classes."
            action={
              <button
                type="button"
                onClick={openAddClass}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Add class
              </button>
            }
          >
            <FilterInput
              value={classFilter}
              onChange={setClassFilter}
              placeholder="Filter by class code, name, grade"
              label="Filter classes"
            />

            {classRoomsQuery.isPending ? <LoadingRows /> : null}
            {classRoomsQuery.isError ? (
              <StateView
                title="Could not load classes"
                message="Please retry."
                action={
                  <button
                    type="button"
                    onClick={() => void classRoomsQuery.refetch()}
                    className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                }
              />
            ) : null}

            {!classRoomsQuery.isPending && !classRoomsQuery.isError ? (
              <SimpleTable
                columns={['Code', 'Name', 'Grade', 'Capacity', 'Actions']}
                rows={filteredClassRooms.map((room) => [
                  room.code,
                  room.name,
                  room.gradeLevel?.name ?? '-',
                  room.capacity ?? '-',
                  <ActionButtons
                    onEdit={() => openEditClass(room)}
                    onDelete={() => requestDelete('classRoom', room.id, room.name)}
                  />,
                ])}
                emptyMessage="No classes found."
              />
            ) : null}
          </SectionCard>
        </>
      ) : null}

      {showSubjects ? (
        <SectionCard
          title="Subjects"
          subtitle={
            canManageSubjects
              ? 'List, update, and softly delete subjects.'
              : 'Browse the school subjects configured for courses and classes.'
          }
          action={canManageSubjects ? (
            <button
              type="button"
              onClick={openAddSubject}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Add subject
            </button>
          ) : null}
        >
          <FilterInput
            value={subjectFilter}
            onChange={setSubjectFilter}
            placeholder="Filter by subject code or name"
            label="Filter subjects"
          />

          {subjectsQuery.isPending ? <LoadingRows /> : null}
          {subjectsQuery.isError ? (
            <StateView
              title="Could not load subjects"
              message="Please retry."
              action={
                <button
                  type="button"
                  onClick={() => void subjectsQuery.refetch()}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : null}

          {!subjectsQuery.isPending && !subjectsQuery.isError ? (
            <SimpleTable
              columns={canManageSubjects ? ['Code', 'Name', 'Core', 'Actions'] : ['Code', 'Name', 'Core']}
              rows={filteredSubjects.map((subject) => [
                subject.code,
                subject.name,
                subject.isCore ? 'Yes' : 'No',
                ...(canManageSubjects
                  ? [
                      <ActionButtons
                        onEdit={() => openEditSubject(subject)}
                        onDelete={() => requestDelete('subject', subject.id, subject.name)}
                      />,
                    ]
                  : []),
              ])}
              emptyMessage="No subjects found."
            />
          ) : null}
        </SectionCard>
      ) : null}

      <Modal
        open={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        title={editingYearId ? 'Update Academic Year' : 'Add Academic Year'}
        description="Set year details and whether it is the current year."
      >
        <form
          className="grid gap-3"
          onSubmit={yearForm.handleSubmit(async (values) => {
            try {
              if (editingYearId) {
                await updateYearMutation.mutateAsync({ id: editingYearId, values });
              } else {
                await createYearMutation.mutateAsync(values);
              }

              setIsYearModalOpen(false);
              setEditingYearId(null);
              yearForm.reset(academicYearDefaults);
            } catch (error) {
              showToast({
                type: 'error',
                title: 'Save failed',
                message: error instanceof Error ? error.message : 'Could not save academic year',
              });
            }
          })}
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Name
            <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...yearForm.register('name')} />
          </label>
          <FieldError message={yearForm.formState.errors.name?.message} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Start date
              <input type="date" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...yearForm.register('startDate')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              End date
              <input type="date" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...yearForm.register('endDate')} />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" {...yearForm.register('isCurrent')} /> Mark as current year
          </label>

          <ModalActions
            isSubmitting={isSavingYear}
            submitLabel={editingYearId ? 'Update year' : 'Create year'}
            onCancel={() => setIsYearModalOpen(false)}
          />
        </form>
      </Modal>

      <Modal
        open={isTermModalOpen}
        onClose={() => setIsTermModalOpen(false)}
        title={editingTermId ? 'Update Term' : 'Add Term'}
        description="Create or update a term under an academic year."
      >
        <form
          className="grid gap-3"
          onSubmit={termForm.handleSubmit(async (values) => {
            try {
              if (editingTermId) {
                await updateTermMutation.mutateAsync({ id: editingTermId, values });
              } else {
                await createTermMutation.mutateAsync(values);
              }

              setIsTermModalOpen(false);
              setEditingTermId(null);
              termForm.reset(termDefaults);
            } catch (error) {
              showToast({
                type: 'error',
                title: 'Save failed',
                message: error instanceof Error ? error.message : 'Could not save term',
              });
            }
          })}
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Academic year
            <select className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...termForm.register('academicYearId')}>
              <option value="">Select year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </label>
          <FieldError message={termForm.formState.errors.academicYearId?.message} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Name
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...termForm.register('name')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Sequence
              <input type="number" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...termForm.register('sequence', { valueAsNumber: true })} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Start date
              <input type="date" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...termForm.register('startDate')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              End date
              <input type="date" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...termForm.register('endDate')} />
            </label>
          </div>

          <ModalActions
            isSubmitting={isSavingTerm}
            submitLabel={editingTermId ? 'Update term' : 'Create term'}
            onCancel={() => setIsTermModalOpen(false)}
          />
        </form>
      </Modal>

      <Modal
        open={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        title={editingGradeId ? 'Update Grade Level' : 'Add Grade Level'}
        description="Manage grade level code, name, and ordering rank."
      >
        <form
          className="grid gap-3"
          onSubmit={gradeForm.handleSubmit(async (values) => {
            try {
              if (editingGradeId) {
                await updateGradeMutation.mutateAsync({ id: editingGradeId, values });
              } else {
                await createGradeMutation.mutateAsync(values);
              }

              setIsGradeModalOpen(false);
              setEditingGradeId(null);
              gradeForm.reset(gradeLevelDefaults);
            } catch (error) {
              showToast({
                type: 'error',
                title: 'Save failed',
                message: error instanceof Error ? error.message : 'Could not save grade level',
              });
            }
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Code
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...gradeForm.register('code')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Name
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...gradeForm.register('name')} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Rank
            <input type="number" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...gradeForm.register('rank', { valueAsNumber: true })} />
          </label>

          <ModalActions
            isSubmitting={isSavingGrade}
            submitLabel={editingGradeId ? 'Update level' : 'Create level'}
            onCancel={() => setIsGradeModalOpen(false)}
          />
        </form>
      </Modal>

      <Modal
        open={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title={editingClassId ? 'Update Class' : 'Add Class'}
        description="Assign class to a grade level and set capacity."
      >
        <form
          className="grid gap-3"
          onSubmit={classForm.handleSubmit(async (values) => {
            try {
              if (editingClassId) {
                await updateClassMutation.mutateAsync({ id: editingClassId, values });
              } else {
                await createClassMutation.mutateAsync(values);
              }

              setIsClassModalOpen(false);
              setEditingClassId(null);
              classForm.reset(classDefaults);
            } catch (error) {
              showToast({
                type: 'error',
                title: 'Save failed',
                message: error instanceof Error ? error.message : 'Could not save class',
              });
            }
          })}
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Grade level
            <select className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...classForm.register('gradeLevelId')}>
              <option value="">Select grade level</option>
              {gradeLevels.map((level) => (
                <option key={level.id} value={level.id}>{level.name}</option>
              ))}
            </select>
          </label>
          <FieldError message={classForm.formState.errors.gradeLevelId?.message} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Code
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...classForm.register('code')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Name
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...classForm.register('name')} />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Capacity
            <input type="number" className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...classForm.register('capacity', { valueAsNumber: true })} />
          </label>

          <ModalActions
            isSubmitting={isSavingClass}
            submitLabel={editingClassId ? 'Update class' : 'Create class'}
            onCancel={() => setIsClassModalOpen(false)}
          />
        </form>
      </Modal>

      <Modal
        open={canManageSubjects && isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubjectId ? 'Update Subject' : 'Add Subject'}
        description="Configure subject code, name, and whether it is core."
      >
        <form
          className="grid gap-3"
          onSubmit={subjectForm.handleSubmit(async (values) => {
            try {
              if (editingSubjectId) {
                await updateSubjectMutation.mutateAsync({ id: editingSubjectId, values });
              } else {
                await createSubjectMutation.mutateAsync(values);
              }

              setIsSubjectModalOpen(false);
              setEditingSubjectId(null);
              subjectForm.reset(subjectDefaults);
            } catch (error) {
              showToast({
                type: 'error',
                title: 'Save failed',
                message: error instanceof Error ? error.message : 'Could not save subject',
              });
            }
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Code
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...subjectForm.register('code')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Name
              <input className="rounded-lg border border-brand-200 px-3 py-2 text-sm" {...subjectForm.register('name')} />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" {...subjectForm.register('isCore')} /> Core subject
          </label>

          <ModalActions
            isSubmitting={isSavingSubject}
            submitLabel={editingSubjectId ? 'Update subject' : 'Create subject'}
            onCancel={() => setIsSubjectModalOpen(false)}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete"
        description="This will soft delete the record. You can no longer see it in active lists."
      >
        <p className="text-sm text-slate-800">
          Are you sure you want to delete <strong>{deleteTarget?.label}</strong>?
        </p>
        {deleteError ? <p className="mt-2 text-xs text-red-700">{deleteError}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
      >
        Update
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
      >
        Delete
      </button>
    </div>
  );
}

function FilterInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="mb-3">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
        aria-label={label}
      />
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="mb-3 grid gap-2" role="status" aria-live="polite">
      <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
      <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
      <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-xs text-red-700" aria-live="polite">
      {message}
    </p>
  );
}

function ModalActions({
  isSubmitting,
  submitLabel,
  onCancel,
}: {
  isSubmitting: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

function SimpleTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
  emptyMessage: string;
}) {
  if (!rows.length) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-100">
      <table className="w-full table-auto text-left text-sm">
        <thead>
          <tr className="border-b border-brand-100 text-slate-700">
            <th className="px-2 py-2 font-semibold">#</th>
            {columns.map((column) => (
              <th key={column} className="px-2 py-2 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-brand-50">
              <td className="px-2 py-2 align-middle text-slate-600">{index + 1}</td>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-2 align-middle">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toDateInput(value: string | Date): string {
  return String(value).slice(0, 10);
}
