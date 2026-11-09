import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  Layers,
  Plus,
  School,
  Search,
  Sparkles,
} from 'lucide-react';
import { KeyboardEvent, ReactNode, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { LevelGroupsPanel, useLevelGroups } from '../components/academics/level-groups-panel';
import { ConfirmDrawer } from '../components/confirm-drawer';
import { AppDrawer } from '../components/drawer';
import { DrawerForm } from '../components/drawer-form';
import { EmptyState } from '../components/empty-state';
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
import { listCoursesApi } from '../features/sprint4/lms.api';

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
  // Public academy school only: the group ("Lower Primary"…) this grade belongs to.
  levelGroupId: z.string().optional(),
});

const classRoomSchema = z.object({
  gradeLevelId: z.string().min(1),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  capacity: z.coerce.number().int().min(1).optional(),
  // Public academy school only: how the class is sold in the public catalog.
  price: z.coerce.number().min(0, 'Price cannot be negative').optional(),
  thumbnail: z.union([z.string().trim().url('Enter a full image URL'), z.literal('')]).optional(),
  listedInPublicCatalog: z.boolean().optional(),
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
  levelGroupId: '',
};

const classDefaults: ClassRoomForm = {
  gradeLevelId: '',
  code: 'G1-A',
  name: 'Grade 1 A',
  capacity: 40,
  price: 0,
  thumbnail: '',
  listedInPublicCatalog: true,
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
  // Only the public academy school sells classes, so only it sees catalog fields.
  const isAcademySchool = Boolean(auth.me?.tenant.isAcademyCatalog);
  const levelGroupsQuery = useLevelGroups(isAcademySchool);
  const levelGroups = levelGroupsQuery.data ?? [];
  const [classTab, setClassTab] = useState<ClassTab>('grades');

  function gradePayload(values: GradeLevelForm) {
    const base = { code: values.code, name: values.name, rank: values.rank };
    if (!isAcademySchool) return base;
    return { ...base, levelGroupId: values.levelGroupId || null };
  }

  /** Request body for the class API; catalog fields are sent only by the academy school. */
  function classPayload(values: ClassRoomForm) {
    const base = {
      gradeLevelId: values.gradeLevelId,
      code: values.code,
      name: values.name,
      capacity: Number.isFinite(values.capacity) ? values.capacity : undefined,
    };
    if (!isAcademySchool) return base;
    return {
      ...base,
      price: Number.isFinite(values.price) ? values.price : 0,
      listedInPublicCatalog: values.listedInPublicCatalog ?? true,
      // An empty field means "no picture" (cleared on edit, omitted on create).
      thumbnail: values.thumbnail?.trim() || null,
    };
  }

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
  const [termsDrawerYearId, setTermsDrawerYearId] = useState<string | null>(null);
  const lastTermsDrawerYearRef = useRef<string | null>(null);

  // Hierarchy drill-down state: Grade -> Class -> Subject/Course.
  // Null means "list" level. Kept in-component so back/forward stays local
  // and existing route permissions are untouched.
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

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

  // Courses for the selected class only — used to derive Subject -> Course
  // grouping without changing any existing list behaviour.
  const classCoursesQuery = useQuery({
    queryKey: ['lms', 'courses', 'academics-hierarchy', selectedClassId],
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        classId: selectedClassId ?? undefined,
        page: 1,
        pageSize: 100,
      }),
    enabled: showClasses && Boolean(selectedClassId && auth.accessToken),
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
      if (lastTermsDrawerYearRef.current !== null) {
        setTermsDrawerYearId(lastTermsDrawerYearRef.current);
        lastTermsDrawerYearRef.current = null;
      }
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
      if (lastTermsDrawerYearRef.current !== null) {
        setTermsDrawerYearId(lastTermsDrawerYearRef.current);
        lastTermsDrawerYearRef.current = null;
      }
    },
  });

  const createGradeMutation = useMutation({
    mutationFn: (values: GradeLevelForm) =>
      createGradeLevelApi(auth.accessToken!, gradePayload(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      showToast({ type: 'success', title: 'Grade level created' });
    },
  });

  const updateGradeMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: GradeLevelForm }) =>
      updateGradeLevelApi(auth.accessToken!, id, gradePayload(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      showToast({ type: 'success', title: 'Grade level updated' });
    },
  });

  const createClassMutation = useMutation({
    mutationFn: (values: ClassRoomForm) => {
      const { thumbnail, ...payload } = classPayload(values) as ReturnType<typeof classPayload> & {
        thumbnail?: string | null;
      };
      return createClassRoomApi(auth.accessToken!, thumbnail ? { ...payload, thumbnail } : payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-rooms'] });
      showToast({ type: 'success', title: 'Class created' });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ClassRoomForm }) =>
      updateClassRoomApi(auth.accessToken!, id, classPayload(values)),
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

  const years = (yearsQuery.data ?? []) as any[];
  const terms = (termsQuery.data ?? []) as any[];
  const gradeLevels = (gradeLevelsQuery.data ?? []) as any[];
  const classRooms = (classRoomsQuery.data ?? []) as any[];
  const subjects = (subjectsQuery.data ?? []) as any[];

  const yearNameMap = useMemo(() => new Map(years.map((year) => [year.id, year.name])), [years]);

  const yearTermCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const term of terms) {
      const count = map.get(term.academicYearId) ?? 0;
      map.set(term.academicYearId, count + 1);
    }
    return map;
  }, [terms]);

  const sortedGrades = useMemo(
    () => [...gradeLevels].sort((a, b) => Number(a.rank ?? 0) - Number(b.rank ?? 0)),
    [gradeLevels]
  );

  const filteredYears = useMemo(() => {
    const query = yearFilter.trim().toLowerCase();
    if (!query) {
      return years;
    }

    return years.filter((year) =>
      `${year.name} ${toDateInput(year.startDate)} ${toDateInput(year.endDate)}`
        .toLowerCase()
        .includes(query)
    );
  }, [years, yearFilter]);

  const filteredTerms = useMemo(() => {
    const query = termFilter.trim().toLowerCase();
    if (!query && !termsDrawerYearId) {
      return terms;
    }

    return terms.filter((term) => {
      const matchesQuery =
        !query ||
        `${term.name} ${term.sequence} ${yearNameMap.get(term.academicYearId) ?? ''}`
          .toLowerCase()
          .includes(query);

      const matchesYear =
        !termsDrawerYearId || term.academicYearId === termsDrawerYearId;

      return matchesQuery && matchesYear;
    });
  }, [terms, termFilter, termsDrawerYearId, yearNameMap]);

  const filteredGradeLevels = useMemo(() => {
    const query = gradeFilter.trim().toLowerCase();
    const base = [...sortedGrades];
    if (!query) {
      return base;
    }

    return base.filter((level) =>
      `${level.code} ${level.name} ${level.rank}`.toLowerCase().includes(query)
    );
  }, [sortedGrades, gradeFilter]);

  const filteredClassRooms = useMemo(() => {
    const query = classFilter.trim().toLowerCase();
    if (!query) {
      return classRooms;
    }

    return classRooms.filter((room) =>
      `${room.code} ${room.name} ${room.gradeLevel?.name ?? ''}`.toLowerCase().includes(query)
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
        .includes(query)
    );
  }, [subjects, subjectFilter]);

  // --- Hierarchy derivations (no new endpoints, client-side grouping) ---
  const classesByGradeId = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const room of classRooms) {
      const key = room.gradeLevelId ?? room.gradeLevel?.id ?? 'unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(room);
    }
    return map;
  }, [classRooms]);

  const selectedGrade = useMemo(
    () => gradeLevels.find((level: any) => level.id === selectedGradeId) ?? null,
    [gradeLevels, selectedGradeId]
  );

  const selectedClass = useMemo(
    () => classRooms.find((room: any) => room.id === selectedClassId) ?? null,
    [classRooms, selectedClassId]
  );

  const classesForSelectedGrade = useMemo(() => {
    if (!selectedGradeId) return [];
    const query = classFilter.trim().toLowerCase();
    const rooms = classesByGradeId.get(selectedGradeId) ?? [];
    if (!query) return rooms;
    return rooms.filter((room: any) =>
      `${room.code} ${room.name}`.toLowerCase().includes(query)
    );
  }, [classesByGradeId, selectedGradeId, classFilter]);

  const classCourses = useMemo(
    () => (classCoursesQuery.data as any)?.items ?? [],
    [classCoursesQuery.data]
  );

  const subjectsForSelectedClass = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; courses: any[] }>();
    for (const course of classCourses) {
      const key = course.subject?.id ?? 'general';
      const name = course.subject?.name ?? 'General studies';
      if (!groups.has(key)) groups.set(key, { id: key, name, courses: [] });
      groups.get(key)!.courses.push(course);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [classCourses]);

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
    lastTermsDrawerYearRef.current = termsDrawerYearId;
    setEditingTermId(null);
    termForm.reset({
      ...termDefaults,
      academicYearId: termsDrawerYearId ?? years[0]?.id ?? '',
    });
    setTermsDrawerYearId(null);
    setIsTermModalOpen(true);
  }

  function openEditTerm(term: any) {
    lastTermsDrawerYearRef.current = termsDrawerYearId;
    setEditingTermId(term.id);
    termForm.reset({
      academicYearId: term.academicYearId,
      name: term.name,
      sequence: Number(term.sequence),
      startDate: toDateInput(term.startDate),
      endDate: toDateInput(term.endDate),
    });
    setTermsDrawerYearId(null);
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
      levelGroupId: level.levelGroupId ?? '',
    });
    setIsGradeModalOpen(true);
  }

  function openAddClass(presetGradeId?: string) {
    setEditingClassId(null);
    classForm.reset({
      ...classDefaults,
      // Same behaviour everywhere: when launched inside a grade context,
      // pre-fill (and lock) that grade; otherwise fall back to first grade.
      gradeLevelId: presetGradeId ?? selectedGradeId ?? gradeLevels[0]?.id ?? '',
    });
    setIsClassModalOpen(true);
  }

  function selectGrade(gradeId: string) {
    setSelectedGradeId(gradeId);
    setSelectedClassId(null);
  }

  function selectClass(classId: string) {
    setSelectedClassId(classId);
  }

  function backToGrades() {
    setSelectedGradeId(null);
    setSelectedClassId(null);
  }

  function backToClasses() {
    setSelectedClassId(null);
  }

  function openEditClass(room: any) {
    setEditingClassId(room.id);
    classForm.reset({
      gradeLevelId: room.gradeLevelId,
      code: room.code,
      name: room.name,
      capacity: room.capacity ?? undefined,
      price: Number(room.price ?? 0),
      thumbnail: room.thumbnail ?? '',
      listedInPublicCatalog: room.listedInPublicCatalog ?? true,
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
                  <div className="flex items-center gap-2">
                    <ActionButtons
                      onEdit={() => openEditYear(year)}
                      onDelete={() => requestDelete('academicYear', year.id, year.name)}
                    />
                    <button
                      type="button"
                      onClick={() => setTermsDrawerYearId(year.id)}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                      View Terms
                    </button>
                  </div>
                ])}
                emptyMessage="No academic years found."
              />
            ) : null}
          </SectionCard>

          </>
      ) : null}

      {showClasses && isAcademySchool ? (
        <ClassManagementTabs value={classTab} onChange={setClassTab} />
      ) : null}

      {showClasses && isAcademySchool && classTab === 'groups' ? (
        <div role="tabpanel" id="class-tab-panel-groups" aria-labelledby="class-tab-groups">
          <LevelGroupsPanel />
        </div>
      ) : null}

      {showClasses && (!isAcademySchool || classTab === 'grades') ? (
        <div
          id="class-tab-panel-grades"
          role={isAcademySchool ? 'tabpanel' : undefined}
          aria-labelledby={isAcademySchool ? 'class-tab-grades' : undefined}
        >
        <SectionCard
          title="Grades and classes"
          subtitle="Browse grade levels, open a grade to see its classes, then open a class to see subjects and courses."
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openAddGradeLevel}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Add grade level
              </button>
              <button
                type="button"
                onClick={() => openAddClass()}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Add class
              </button>
            </div>
          }
        >
          <HierarchyBreadcrumbs
            trail={
              selectedClass && selectedGrade
                ? [
                    { label: 'Grades', onSelect: backToGrades },
                    { label: selectedGrade.name, onSelect: backToClasses },
                    { label: selectedClass.name },
                  ]
                : selectedGrade
                  ? [
                      { label: 'Grades', onSelect: backToGrades },
                      { label: selectedGrade.name },
                    ]
                  : [{ label: 'Grades' }]
            }
          />

          {(gradeLevelsQuery.isPending || classRoomsQuery.isPending) && <LoadingRows />}
          {gradeLevelsQuery.isError || classRoomsQuery.isError ? (
            <StateView
              title="Could not load grades or classes"
              message="Please retry."
              action={
                <button
                  type="button"
                  onClick={() => {
                    void gradeLevelsQuery.refetch();
                    void classRoomsQuery.refetch();
                  }}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : null}

          {!gradeLevelsQuery.isPending &&
          !gradeLevelsQuery.isError &&
          !classRoomsQuery.isPending &&
          !classRoomsQuery.isError ? (
            <>
              {!selectedGrade ? (
                <>
                  <FilterInput
                    value={gradeFilter}
                    onChange={setGradeFilter}
                    placeholder="Filter by code, name, rank"
                    label="Filter grade levels"
                  />
                  {filteredGradeLevels.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredGradeLevels.map((level: any, index: number) => {
                        const rooms = classesByGradeId.get(level.id) ?? [];
                        return (
                          <GradeCard
                            key={level.id}
                            iconIndex={index}
                            title={level.name}
                            code={
                              level.levelGroup?.name
                                ? `${level.code} · ${level.levelGroup.name}`
                                : level.code
                            }
                            countLabel={`${rooms.length} ${rooms.length === 1 ? 'class' : 'classes'}`}
                            emptyHint={
                              rooms.length
                                ? undefined
                                : 'No classes yet — open this grade to add the first class.'
                            }
                            onOpen={() => selectGrade(level.id)}
                            onEdit={() => openEditGradeLevel(level)}
                            onDelete={() =>
                              requestDelete('gradeLevel', level.id, level.name)
                            }
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="No grade levels found"
                      message="Add the first grade level to start organising classes, subjects, and courses."
                      action={
                        <button
                          type="button"
                          onClick={openAddGradeLevel}
                          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Add grade level
                        </button>
                      }
                    />
                  )}
                </>
              ) : null}

              {selectedGrade && !selectedClass ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedGrade.name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {classesForSelectedGrade.length}{' '}
                        {classesForSelectedGrade.length === 1 ? 'class' : 'classes'} in
                        this grade
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditGradeLevel(selectedGrade)}
                        className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        Update grade
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddClass(selectedGrade.id)}
                        className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Add class to {selectedGrade.name}
                      </button>
                    </div>
                  </div>
                  <FilterInput
                    value={classFilter}
                    onChange={setClassFilter}
                    placeholder="Filter classes in this grade"
                    label="Filter classes in this grade"
                  />
                  {classesForSelectedGrade.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {classesForSelectedGrade.map((room: any) => (
                        <ClassCard
                          key={room.id}
                          title={room.name}
                          code={room.code}
                          meta={
                            room.capacity
                              ? `Capacity ${room.capacity}`
                              : 'Capacity not set'
                          }
                          onOpen={() => selectClass(room.id)}
                          onEdit={() => openEditClass(room)}
                          onDelete={() =>
                            requestDelete('classRoom', room.id, room.name)
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title={`No classes in ${selectedGrade.name} yet`}
                      message="Add the first class for this grade. Subjects and courses attach to classes in the next step."
                      action={
                        <button
                          type="button"
                          onClick={() => openAddClass(selectedGrade.id)}
                          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Add class to {selectedGrade.name}
                        </button>
                      }
                    />
                  )}
                </>
              ) : null}

              {selectedGrade && selectedClass ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedClass.name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {selectedGrade.name} · {selectedClass.code}
                        {selectedClass.capacity
                          ? ` · Capacity ${selectedClass.capacity}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditClass(selectedClass)}
                        className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        Update class
                      </button>
                      <Link
                        to={`/admin/courses?classId=${selectedClass.id}`}
                        className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                      >
                        View courses for {selectedClass.name}
                      </Link>
                    </div>
                  </div>

                  {classCoursesQuery.isPending ? <LoadingRows /> : null}
                  {classCoursesQuery.isError ? (
                    <StateView
                      title="Could not load courses for this class"
                      message="Retry to see subjects and courses grouped under this class."
                      action={
                        <button
                          type="button"
                          onClick={() => void classCoursesQuery.refetch()}
                          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Retry
                        </button>
                      }
                    />
                  ) : null}

                  {!classCoursesQuery.isPending && !classCoursesQuery.isError ? (
                    subjectsForSelectedClass.length ? (
                      <div className="grid gap-3">
                        {subjectsForSelectedClass.map((group) => (
                          <div
                            key={group.id}
                            className="rounded-xl border border-brand-100 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <BookOpen
                                  className="h-4 w-4 text-brand-600"
                                  aria-hidden="true"
                                />
                                <h4 className="text-sm font-bold text-slate-900">
                                  {group.name}
                                </h4>
                                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  {group.courses.length}{' '}
                                  {group.courses.length === 1 ? 'course' : 'courses'}
                                </span>
                              </div>
                              <Link
                                to={`/admin/courses?classId=${selectedClass.id}`}
                                className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
                              >
                                Open {group.name} courses in Courses
                              </Link>
                            </div>
                            <ul className="mt-2 grid gap-1.5">
                              {group.courses.map((course: any) => (
                                <li
                                  key={course.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                                >
                                  <span className="font-medium text-slate-800">
                                    {course.title}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {course.counts?.lessons ?? 0} lessons ·{' '}
                                    {course.academicYear?.name ?? ''}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title={`No subjects with courses in ${selectedClass.name} yet`}
                        message="Create the first course for this class in Courses. It will appear here grouped under its subject."
                        action={
                          <Link
                            to={`/admin/courses?classId=${selectedClass.id}`}
                            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Create course for {selectedClass.name}
                          </Link>
                        }
                      />
                    )
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </SectionCard>
        </div>
      ) : null}

      {showSubjects ? (
        <SectionCard
          title="Subjects"
          subtitle={
            canManageSubjects
              ? 'List, update, and softly delete subjects.'
              : 'Browse the school subjects configured for courses and classes.'
          }
          action={
            canManageSubjects ? (
              <button
                type="button"
                onClick={openAddSubject}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Add subject
              </button>
            ) : null
          }
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
              columns={
                canManageSubjects ? ['Code', 'Name', 'Core', 'Actions'] : ['Code', 'Name', 'Core']
              }
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

      <DrawerForm
        open={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        onCancel={() => setIsYearModalOpen(false)}
        title={editingYearId ? 'Update Academic Year' : 'Add Academic Year'}
        description="Set year details and whether it is the current year."
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
        isLoading={isSavingYear}
        submitLabel={editingYearId ? 'Update year' : 'Create year'}
        formId="academic-year-form"
      >
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Name
          <input
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...yearForm.register('name')}
          />
        </label>
        <FieldError message={yearForm.formState.errors.name?.message} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Start date
            <input
              type="date"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...yearForm.register('startDate')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            End date
            <input
              type="date"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...yearForm.register('endDate')}
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input type="checkbox" {...yearForm.register('isCurrent')} /> Mark as current year
        </label>
      </DrawerForm>

      <DrawerForm
        open={isTermModalOpen}
        onClose={() => setIsTermModalOpen(false)}
        onCancel={() => setIsTermModalOpen(false)}
        title={editingTermId ? 'Update Term' : 'Add Term'}
        description="Create or update a term under an academic year."
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
        isLoading={isSavingTerm}
        submitLabel={editingTermId ? 'Update term' : 'Create term'}
        formId="term-form"
      >
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Academic year
          <select
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...termForm.register('academicYearId')}
          >
            <option value="">Select year</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </label>
        <FieldError message={termForm.formState.errors.academicYearId?.message} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...termForm.register('name')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Sequence
            <input
              type="number"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...termForm.register('sequence', { valueAsNumber: true })}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Start date
            <input
              type="date"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...termForm.register('startDate')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            End date
            <input
              type="date"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...termForm.register('endDate')}
            />
          </label>
        </div>
      </DrawerForm>

      <DrawerForm
        open={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        onCancel={() => setIsGradeModalOpen(false)}
        title={editingGradeId ? 'Update Grade Level' : 'Add Grade Level'}
        description="Manage grade level code, name, and ordering rank."
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
        isLoading={isSavingGrade}
        submitLabel={editingGradeId ? 'Update level' : 'Create level'}
        formId="grade-level-form"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Code
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...gradeForm.register('code')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...gradeForm.register('name')}
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Rank
          <input
            type="number"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...gradeForm.register('rank', { valueAsNumber: true })}
          />
        </label>
        {isAcademySchool ? (
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Level group
            <select
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal"
              {...gradeForm.register('levelGroupId')}
            >
              <option value="">No group</option>
              {levelGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-slate-500">
              {levelGroups.length
                ? 'The public academy page lists this grade under the group you pick.'
                : 'Create groups such as Lower Primary on the Level groups tab first.'}
            </span>
          </label>
        ) : null}
      </DrawerForm>

      <DrawerForm
        open={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onCancel={() => setIsClassModalOpen(false)}
        title={editingClassId ? 'Update Class' : 'Add Class'}
        description="Assign class to a grade level and set capacity."
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
        isLoading={isSavingClass}
        submitLabel={editingClassId ? 'Update class' : 'Create class'}
        formId="class-room-form"
      >
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Grade level
          <select
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm disabled:bg-slate-100"
            {...classForm.register('gradeLevelId')}
            disabled={!editingClassId && Boolean(selectedGradeId)}
            title={
              !editingClassId && selectedGradeId
                ? `Locked to ${selectedGrade?.name ?? 'the selected grade'} because this class is created inside that grade.`
                : undefined
            }
          >
            <option value="">Select grade level</option>
            {gradeLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </label>
        {!editingClassId && selectedGradeId ? (
          <p className="text-xs text-slate-500">
            Grade is locked to {selectedGrade?.name ?? 'the selected grade'} to keep
            creation consistent with the hierarchy.
          </p>
        ) : null}
        <FieldError message={classForm.formState.errors.gradeLevelId?.message} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Code
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...classForm.register('code')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...classForm.register('name')}
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          Capacity
          <input
            type="number"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            {...classForm.register('capacity', { valueAsNumber: true })}
          />
        </label>

        {isAcademySchool ? (
          <fieldset className="grid gap-3 rounded-lg border border-brand-100 bg-brand-50/50 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-900">Public academy</legend>
            <label className="flex items-start gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600"
                {...classForm.register('listedInPublicCatalog')}
              />
              <span>
                <span className="block font-semibold">Show this class in the public academy</span>
                <span className="block text-xs text-slate-500">
                  Visitors can see its courses and enroll. Untick to keep it private.
                </span>
              </span>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Class price (RWF)
              <input
                type="number"
                min={0}
                step={100}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
                {...classForm.register('price', { valueAsNumber: true })}
              />
            </label>
            <FieldError message={classForm.formState.errors.price?.message} />
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Picture URL <span className="font-normal text-slate-500">(optional)</span>
              <input
                type="url"
                placeholder="https://…"
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
                {...classForm.register('thumbnail')}
              />
            </label>
            <FieldError message={classForm.formState.errors.thumbnail?.message} />
          </fieldset>
        ) : null}
      </DrawerForm>

      <DrawerForm
        open={canManageSubjects && isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onCancel={() => setIsSubjectModalOpen(false)}
        title={editingSubjectId ? 'Update Subject' : 'Add Subject'}
        description="Configure subject code, name, and whether it is core."
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
        isLoading={isSavingSubject}
        submitLabel={editingSubjectId ? 'Update subject' : 'Create subject'}
        formId="subject-form"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Code
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...subjectForm.register('code')}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...subjectForm.register('name')}
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input type="checkbox" {...subjectForm.register('isCore')} /> Core subject
        </label>
      </DrawerForm>

      <AppDrawer
        open={!!termsDrawerYearId}
        onClose={() => setTermsDrawerYearId(null)}
        title="Academic Year Terms"
        description="Manage terms for the selected academic year."
        size="default"
        icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
        bodyClassName="px-4 py-4 sm:px-5"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-slate-700">
            <span className="font-semibold">Academic Year:</span>{' '}
            {yearNameMap.get(termsDrawerYearId ?? '') ?? 'Unknown'}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[12rem]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                placeholder="Search terms..."
                className="h-10 w-full rounded-lg border border-brand-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-400"
                aria-label="Search terms"
              />
            </div>
            <button
              type="button"
              onClick={openAddTerm}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add New Term
            </button>
          </div>

          {termsQuery.isPending ? (
            <LoadingRows />
          ) : termsQuery.isError ? (
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
          ) : (
            <>
              {filteredTerms.length === 0 ? (
                <EmptyState
                  title="No terms found"
                  message="Add the first term for this academic year."
                  action={
                    <button
                      type="button"
                      onClick={openAddTerm}
                      className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Add New Term
                    </button>
                  }
                />
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                  <table className="w-full min-w-full table-auto text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 text-slate-700">
                        <th className="px-2 py-2 font-semibold">No.</th>
                        <th className="px-2 py-2 font-semibold">Name</th>
                        <th className="px-2 py-2 font-semibold">Sequence</th>
                        <th className="px-2 py-2 font-semibold">Start Date</th>
                        <th className="px-2 py-2 font-semibold">End Date</th>
                        <th className="px-2 py-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTerms.map((term: any, index: number) => (
                        <tr key={term.id} className="border-b border-brand-50">
                          <td className="px-2 py-2 align-middle text-slate-600">{index + 1}</td>
                          <td className="px-2 py-2 align-middle font-medium text-slate-900">{term.name}</td>
                          <td className="px-2 py-2 align-middle text-slate-600">{term.sequence}</td>
                          <td className="px-2 py-2 align-middle text-slate-600">{toDateInput(term.startDate)}</td>
                          <td className="px-2 py-2 align-middle text-slate-600">{toDateInput(term.endDate)}</td>
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditTerm(term)}
                                className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-brand-100"
                                aria-label={`Edit term ${term.name}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDelete('term', term.id, term.name)}
                                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                                aria-label={`Delete term ${term.name}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          You can add, edit or delete terms. Deleting a term will remove it from the academic year and may affect related records.
        </div>
      </AppDrawer>

      <ConfirmDrawer
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="Confirm Delete"
        message={
          deleteError
            ? deleteError
            : `Delete ${deleteTarget?.label ?? 'this record'}? This will soft delete the record so it no longer appears in active lists.`
        }
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}

const GRADE_CARD_ICONS = [GraduationCap, School, Layers, BookOpen, Award, Sparkles];

function HierarchyBreadcrumbs({
  trail,
}: {
  trail: Array<{ label: string; onSelect?: () => void }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              ) : null}
              {crumb.onSelect && !isLast ? (
                <button
                  type="button"
                  onClick={crumb.onSelect}
                  className="rounded px-1 py-0.5 font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  {crumb.label}
                </button>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="px-1 py-0.5 font-semibold text-slate-900">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type ClassTab = 'grades' | 'groups';

const CLASS_TABS: Array<{ value: ClassTab; label: string }> = [
  { value: 'grades', label: 'Grades and classes' },
  { value: 'groups', label: 'Level groups' },
];

/** Tabs for the academy school's Class Management page. */
function ClassManagementTabs({
  value,
  onChange,
}: {
  value: ClassTab;
  onChange: (tab: ClassTab) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = CLASS_TABS.findIndex((tab) => tab.value === value);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = CLASS_TABS[(index + step + CLASS_TABS.length) % CLASS_TABS.length];
    onChange(next.value);
    document.getElementById(`class-tab-${next.value}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Class management"
      className="flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {CLASS_TABS.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            id={`class-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`class-tab-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={onKeyDown}
            className={
              selected
                ? '-mb-px whitespace-nowrap border-b-2 border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-600'
                : '-mb-px whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function GradeCard({
  iconIndex,
  title,
  code,
  countLabel,
  emptyHint,
  onOpen,
  onEdit,
  onDelete,
}: {
  iconIndex: number;
  title: string;
  code: string;
  countLabel: string;
  emptyHint?: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = GRADE_CARD_ICONS[iconIndex % GRADE_CARD_ICONS.length];
  return (
    <article className="group flex flex-col rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open grade ${title}, ${countLabel}`}
        className="flex items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-brand-500 rounded-lg"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-900">{title}</span>
          <span className="block text-xs text-slate-500">{code}</span>
          <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {countLabel}
          </span>
        </span>
      </button>
      {emptyHint ? <p className="mt-2 text-xs text-slate-500">{emptyHint}</p> : null}
      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5">
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
    </article>
  );
}

function ClassCard({
  title,
  code,
  meta,
  onOpen,
  onEdit,
  onDelete,
}: {
  title: string;
  code: string;
  meta: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group flex flex-col rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open class ${title} to see subjects and courses`}
        className="flex items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-brand-500 rounded-lg"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
          <School className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-900">{title}</span>
          <span className="block text-xs text-slate-500">{code}</span>
          <span className="mt-1 block text-xs text-slate-500">{meta}</span>
        </span>
      </button>
      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5">
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
    </article>
  );
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex-row gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 mr-2 text-xs font-semibold text-slate-700"
      >
        Update
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 mr-2 text-xs font-semibold text-red-700"
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
    <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
      <table className="w-full min-w-full table-auto text-left text-sm">
        <thead>
          <tr className="border-b border-brand-100 text-slate-700">
            <th className="px-2 py-2 font-semibold">No.</th>
            {columns.map((column) => (
              <th key={column} className="px-2 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-brand-50">
              <td className="px-2 py-2 align-middle text-slate-600"># {index + 1}</td>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-2 align-middle">
                  {cell}
                </td>
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
