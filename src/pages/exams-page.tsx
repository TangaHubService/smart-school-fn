import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, FileLock2, FileSpreadsheet, Plus, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { hasRole } from '../features/auth/auth-helpers';
import { listCourseSubjectOptionsApi } from '../features/sprint4/lms.api';
import {
  bulkSaveConductGradesApi,
  bulkSaveExamMarksApi,
  createExamApi,
  createGradingSchemeApi,
  getExamDetailApi,
  listConductGradesForEntryApi,
  listExamsApi,
  listGradingSchemesApi,
  lockResultsApi,
  publishResultsApi,
  unlockResultsApi,
} from '../features/sprint5/exams.api';
import {
  listClassRoomsApi,
  listTermsApi,
} from '../features/sprint1/sprint1.api';

const examSchema = z.object({
  termId: z.string().min(1, 'Term is required'),
  classRoomId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  gradingSchemeId: z.string().optional(),
  examType: z.enum(['CAT', 'EXAM']).default('EXAM'),
  name: z.string().trim().min(2, 'Exam name is required').max(120),
  description: z.string().trim().max(500).optional(),
  totalMarks: z.coerce.number().int().min(1).max(500),
  weight: z.coerce.number().int().min(1).max(500),
  examDate: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examSchema>;

const defaultExamForm: ExamFormValues = {
  termId: '',
  classRoomId: '',
  subjectId: '',
  gradingSchemeId: '',
  examType: 'EXAM',
  name: '',
  description: '',
  totalMarks: 100,
  weight: 100,
  examDate: '',
};

const defaultBands = [
  { min: 80, max: 100, grade: 'A', remark: 'Excellent' },
  { min: 70, max: 79, grade: 'B', remark: 'Very good' },
  { min: 60, max: 69, grade: 'C', remark: 'Good' },
  { min: 50, max: 59, grade: 'D', remark: 'Pass' },
  { min: 0, max: 49, grade: 'F', remark: 'Needs improvement' },
];

const inputClassName =
  'h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400';
const textareaClassName =
  'rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400';
const secondaryButtonClassName =
  'inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60';
const primaryButtonClassName =
  'inline-flex items-center gap-2 rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60';

export function ExamsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isTeacherOnly =
    hasRole(auth.me, 'TEACHER') &&
    !hasRole(auth.me, 'SCHOOL_ADMIN') &&
    !hasRole(auth.me, 'SUPER_ADMIN');

  const [search, setSearch] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [schemeName, setSchemeName] = useState('Standard grading');
  const [schemeDescription, setSchemeDescription] = useState('Default school grading bands');
  const [schemeIsDefault, setSchemeIsDefault] = useState(true);
  const [schemeBands, setSchemeBands] = useState(defaultBands);

  const [marksExamId, setMarksExamId] = useState('');
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({});
  const [isConductModalOpen, setIsConductModalOpen] = useState(false);
  const [conductDraft, setConductDraft] = useState<Record<string, { grade: string; remark: string }>>({});

  const examForm = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: defaultExamForm,
  });

  const termsQuery = useQuery({
    queryKey: ['terms'],
    queryFn: () => listTermsApi(auth.accessToken!),
  });
  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });
  const subjectsQuery = useQuery({
    queryKey: ['course-subject-options'],
    queryFn: () => listCourseSubjectOptionsApi(auth.accessToken!),
  });
  const schemesQuery = useQuery({
    queryKey: ['grading-schemes'],
    queryFn: () => listGradingSchemesApi(auth.accessToken!),
  });

  const examsQuery = useQuery({
    queryKey: ['exams', search, termFilter, classFilter, subjectFilter, page],
    queryFn: () =>
      listExamsApi(auth.accessToken!, {
        q: search || undefined,
        termId: termFilter || undefined,
        classId: classFilter || undefined,
        subjectId: subjectFilter || undefined,
        page,
        pageSize: 20,
      }),
  });

  const examDetailQuery = useQuery({
    queryKey: ['exam-detail', marksExamId || null],
    enabled: Boolean(marksExamId),
    queryFn: () => getExamDetailApi(auth.accessToken!, marksExamId),
  });

  const conductQuery = useQuery({
    queryKey: ['conduct-grades', termFilter, classFilter],
    enabled: Boolean(termFilter && classFilter && isConductModalOpen),
    queryFn: () =>
      listConductGradesForEntryApi(auth.accessToken!, {
        termId: termFilter,
        classRoomId: classFilter,
      }),
  });

  useEffect(() => {
    if (!examDetailQuery.data) {
      return;
    }

    setMarksDraft(
      Object.fromEntries(
        examDetailQuery.data.students.map((student) => [
          student.id,
          student.marksObtained == null ? '' : String(student.marksObtained),
        ]),
      ),
    );
  }, [examDetailQuery.data?.id]);

  useEffect(() => {
    if (!conductQuery.data?.students) return;
    setConductDraft(
      Object.fromEntries(
        conductQuery.data.students.map((s) => [
          s.id,
          { grade: s.grade ?? '', remark: s.remark ?? '' },
        ]),
      ),
    );
  }, [conductQuery.data?.students]);

  const createSchemeMutation = useMutation({
    mutationFn: () =>
      createGradingSchemeApi(auth.accessToken!, {
        name: schemeName,
        description: schemeDescription,
        isDefault: schemeIsDefault,
        rules: schemeBands,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['grading-schemes'] });
      setIsSchemeModalOpen(false);
      showToast({ type: 'success', title: 'Grading scheme saved' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not save grading scheme',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const createExamMutation = useMutation({
    mutationFn: (values: ExamFormValues) =>
      createExamApi(auth.accessToken!, {
        termId: values.termId,
        classRoomId: values.classRoomId,
        subjectId: values.subjectId,
        gradingSchemeId: values.gradingSchemeId || undefined,
        examType: values.examType,
        name: values.name,
        description: values.description || undefined,
        totalMarks: values.totalMarks,
        weight: values.weight,
        examDate: values.examDate ? new Date(values.examDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      setIsExamModalOpen(false);
      examForm.reset({
        ...defaultExamForm,
        gradingSchemeId: schemesQuery.data?.find((scheme) => scheme.isDefault)?.id ?? schemesQuery.data?.[0]?.id ?? '',
      });
      showToast({ type: 'success', title: 'Exam created' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create exam',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const saveMarksMutation = useMutation({
    mutationFn: () =>
      bulkSaveExamMarksApi(auth.accessToken!, marksExamId, {
        entries: (examDetailQuery.data?.students ?? []).map((student) => ({
          studentId: student.id,
          marksObtained: marksDraft[student.id] === '' ? null : Number(marksDraft[student.id]),
        })),
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['exam-detail', marksExamId] });
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      showToast({
        type: result.warnings.missingCount ? 'info' : 'success',
        title: 'Marks saved',
        message: result.warnings.missingCount
          ? `${result.warnings.missingCount} students are still missing marks.`
          : 'All visible marks were saved.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not save marks',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      lockResultsApi(auth.accessToken!, {
        termId: termFilter,
        classRoomId: classFilter,
        gradingSchemeId: schemesQuery.data?.find((scheme) => scheme.isDefault)?.id,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      showToast({
        type: 'success',
        title: 'Results locked',
        message: `${result.snapshotsCreated} report cards prepared.`,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not lock results',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: () =>
      unlockResultsApi(auth.accessToken!, {
        termId: termFilter,
        classRoomId: classFilter,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      showToast({
        type: 'success',
        title: 'Results unlocked',
        message: `${result.snapshotsRemoved} snapshots removed. Marks can be edited again.`,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not unlock results',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const saveConductMutation = useMutation({
    mutationFn: () => {
      const entries = (conductQuery.data?.students ?? [])
        .map((s) => ({
          studentId: s.id,
          grade: (conductDraft[s.id]?.grade ?? '').trim(),
          remark: (conductDraft[s.id]?.remark ?? '').trim() || undefined,
        }))
        .filter((e) => e.grade.length > 0);
      if (!entries.length) {
        throw new Error('Enter at least one conduct grade');
      }
      return bulkSaveConductGradesApi(auth.accessToken!, {
        termId: termFilter,
        classRoomId: classFilter,
        entries,
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['conduct-grades', termFilter, classFilter] });
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      setIsConductModalOpen(false);
      showToast({ type: 'success', title: 'Conduct grades saved', message: `${result.savedCount} students updated.` });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not save conduct grades',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      publishResultsApi(auth.accessToken!, {
        termId: termFilter,
        classRoomId: classFilter,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      showToast({
        type: 'success',
        title: 'Results published',
        message: `${result.snapshotsUpdated} report cards are now visible to students and parents.`,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not publish results',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const exams = examsQuery.data?.items ?? [];
  const pagination = examsQuery.data?.pagination;
  const terms = (termsQuery.data as any[]) ?? [];
  const classRooms = (classesQuery.data as any[]) ?? [];
  const subjects = (subjectsQuery.data as any[]) ?? [];
  const selectedExamSubjectId = examForm.watch('subjectId');
  const isTeacherExamSubjectMissing = isTeacherOnly && !selectedExamSubjectId?.trim();
  const schemes = schemesQuery.data ?? [];

  const currentScopeStatus = useMemo(() => exams[0]?.resultStatus ?? 'UNLOCKED', [exams]);

  function openExamModal() {
    examForm.reset({
      ...defaultExamForm,
      termId: termFilter || terms[0]?.id || '',
      classRoomId: classFilter || classRooms[0]?.id || '',
      subjectId: subjectFilter || subjects[0]?.id || '',
      gradingSchemeId: schemes.find((scheme) => scheme.isDefault)?.id ?? schemes[0]?.id ?? '',
    });
    setIsExamModalOpen(true);
  }

  function handleMarkChange(studentId: string, value: string) {
    if (value !== '' && (!/^\d+$/.test(value) || Number(value) < 0)) {
      return;
    }
    setMarksDraft((current) => ({ ...current, [studentId]: value }));
  }

  const canManageResults = Boolean(termFilter && classFilter);

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Exams & results"
        subtitle="Create exams, enter marks in bulk, then lock and publish clean report cards."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsSchemeModalOpen(true)}
              className={secondaryButtonClassName}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Grading scheme
            </button>
            <button
              type="button"
              onClick={openExamModal}
              disabled={isTeacherOnly && !subjects.length}
              className={primaryButtonClassName}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New exam
            </button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-xl bg-brand-50/75 p-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px] xl:items-end">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Search exams</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search by exam, class, or subject"
                className={inputClassName}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Term</span>
              <select
                value={termFilter}
                onChange={(event) => {
                  setPage(1);
                  setTermFilter(event.target.value);
                }}
                className={inputClassName}
              >
                <option value="">All terms</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Class</span>
              <select
                value={classFilter}
                onChange={(event) => {
                  setPage(1);
                  setClassFilter(event.target.value);
                }}
                className={inputClassName}
              >
                <option value="">All classes</option>
                {classRooms.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>
                    {classRoom.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Subject</span>
              <select
                value={subjectFilter}
                onChange={(event) => {
                  setPage(1);
                  setSubjectFilter(event.target.value);
                }}
                className={inputClassName}
              >
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 rounded-xl bg-brand-50/55 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-slate-900">Results control</p>
              <p className="text-sm text-slate-600">
                Select a term and class, then lock or publish report cards for that scope.
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Current scope status: {currentScopeStatus}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsConductModalOpen(true)}
                disabled={!canManageResults || currentScopeStatus !== 'UNLOCKED'}
                className={secondaryButtonClassName}
                title={currentScopeStatus !== 'UNLOCKED' ? 'Unlock results first to edit conduct' : 'Enter conduct grades per term'}
              >
                Conduct
              </button>
              <button
                type="button"
                onClick={() => lockMutation.mutate()}
                disabled={!canManageResults || lockMutation.isPending}
                className={secondaryButtonClassName}
              >
                <FileLock2 className="h-4 w-4" aria-hidden="true" />
                Lock
              </button>
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={!canManageResults || publishMutation.isPending}
                className={primaryButtonClassName}
              >
                Publish
              </button>
              <button
                type="button"
                onClick={() => unlockMutation.mutate()}
                disabled={!canManageResults || unlockMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Unlock
              </button>
            </div>
          </div>

          {examsQuery.isPending ? (
            <div className="h-64 animate-pulse rounded-xl bg-brand-50" />
          ) : null}

          {examsQuery.isError ? (
            <StateView
              title="Could not load exams"
              message="Retry to load the exams list."
              action={
                <button
                  type="button"
                  onClick={() => void examsQuery.refetch()}
                  className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : null}

          {!examsQuery.isPending && !examsQuery.isError ? (
            exams.length ? (
              <div className="overflow-x-auto rounded-xl bg-white/88">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-800">
                  <thead>
                    <tr className="bg-brand-50/80 text-xs uppercase tracking-[0.14em] text-slate-500">
                      <th className="border-b border-brand-100 px-3 py-3">#</th>
                      <th className="border-b border-brand-100 px-3 py-3">Exam</th>
                      <th className="border-b border-brand-100 px-3 py-3">Term</th>
                      <th className="border-b border-brand-100 px-3 py-3">Class</th>
                      <th className="border-b border-brand-100 px-3 py-3">Subject</th>
                      <th className="border-b border-brand-100 px-3 py-3">Marks</th>
                      <th className="border-b border-brand-100 px-3 py-3">Status</th>
                      <th className="border-b border-brand-100 px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam, index) => (
                      <tr key={exam.id}>
                        <td className="border-b border-brand-100 px-3 py-3 align-top">{(pagination?.pageSize ?? 20) * ((pagination?.page ?? 1) - 1) + index + 1}</td>
                        <td className="border-b border-brand-100 px-3 py-3 align-top">
                          <p className="font-semibold text-slate-900">{exam.name}</p>
                          <p className="text-xs text-slate-600">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{exam.examType ?? 'EXAM'}</span>
                            {' · '}{exam.totalMarks} total · weight {exam.weight}
                          </p>
                        </td>
                        <td className="border-b border-brand-100 px-3 py-3 align-top">{exam.term.name}</td>
                        <td className="border-b border-brand-100 px-3 py-3 align-top">{exam.classRoom.name}</td>
                        <td className="border-b border-brand-100 px-3 py-3 align-top">{exam.subject.name}</td>
                        <td className="border-b border-brand-100 px-3 py-3 align-top">{exam.marksEnteredCount}</td>
                        <td className="border-b border-brand-100 px-3 py-3 align-top">
                          <span className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {exam.resultStatus}
                          </span>
                        </td>
                        <td className="border-b border-brand-100 px-3 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => setMarksExamId(exam.id)}
                            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            Enter marks
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No exams yet" message="Create the first exam for the selected term, class, and subject." />
            )
          ) : null}
        </div>
      </SectionCard>

      <Modal
        open={isExamModalOpen}
        title="Create exam"
        description="Set the class, subject, and grading scheme before entering marks."
        onClose={() => setIsExamModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsExamModalOpen(false)}
              className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={examForm.handleSubmit((values) => createExamMutation.mutate(values))}
              disabled={createExamMutation.isPending || isTeacherExamSubjectMissing}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save exam
            </button>
          </div>
        }
      >
        <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
          {isTeacherOnly && !subjects.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No subject is assigned to your teaching load yet. Ask an administrator to assign at
              least one subject before creating exams.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Term</span>
              <select {...examForm.register('termId')} className={inputClassName}>
                <option value="">Select term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{term.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Class</span>
              <select {...examForm.register('classRoomId')} className={inputClassName}>
                <option value="">Select class</option>
                {classRooms.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>{classRoom.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Subject</span>
              <select {...examForm.register('subjectId')} className={inputClassName}>
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Grading scheme</span>
              <select {...examForm.register('gradingSchemeId')} className={inputClassName}>
                <option value="">Use default scheme</option>
                {schemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>{scheme.name} v{scheme.version}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Exam type</span>
              <select {...examForm.register('examType')} className={inputClassName}>
                <option value="CAT">CAT (Continuous Assessment)</option>
                <option value="EXAM">EXAM (End of term)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Exam name</span>
              <input {...examForm.register('name')} className={inputClassName} placeholder="Mid-term mathematics" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Description</span>
            <textarea {...examForm.register('description')} rows={3} className={textareaClassName} placeholder="Optional notes about the exam scope." />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Total marks</span>
              <input type="number" min={1} max={500} {...examForm.register('totalMarks')} className={inputClassName} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Weight</span>
              <input type="number" min={1} max={500} {...examForm.register('weight')} className={inputClassName} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Exam date</span>
              <input type="datetime-local" {...examForm.register('examDate')} className={inputClassName} />
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={isSchemeModalOpen}
        title="Grading scheme"
        description="Define the school grade bands used for report cards."
        onClose={() => setIsSchemeModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsSchemeModalOpen(false)} className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
            <button type="button" onClick={() => createSchemeMutation.mutate()} disabled={createSchemeMutation.isPending} className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save scheme</button>
          </div>
        }
      >
        <div className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Name</span>
            <input value={schemeName} onChange={(event) => setSchemeName(event.target.value)} className={inputClassName} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>Description</span>
            <textarea value={schemeDescription} onChange={(event) => setSchemeDescription(event.target.value)} rows={2} className={textareaClassName} />
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={schemeIsDefault} onChange={(event) => setSchemeIsDefault(event.target.checked)} />
            Set as default scheme
          </label>

          <div className="grid gap-3">
            {schemeBands.map((band, index) => (
              <div key={`${band.grade}-${index}`} className="grid gap-3 rounded-xl bg-brand-50/70 p-3 md:grid-cols-[1fr_110px_110px_1.2fr]">
                <input value={band.grade} onChange={(event) => setSchemeBands((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, grade: event.target.value } : item))} className={inputClassName} placeholder="Grade" />
                <input type="number" min={0} max={100} value={band.min} onChange={(event) => setSchemeBands((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, min: Number(event.target.value) } : item))} className={inputClassName} placeholder="Min" />
                <input type="number" min={0} max={100} value={band.max} onChange={(event) => setSchemeBands((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, max: Number(event.target.value) } : item))} className={inputClassName} placeholder="Max" />
                <input value={band.remark} onChange={(event) => setSchemeBands((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, remark: event.target.value } : item))} className={inputClassName} placeholder="Remark" />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(marksExamId)}
        title={examDetailQuery.data ? `Marks entry: ${examDetailQuery.data.name}` : 'Marks entry'}
        description="Use the grid to enter marks quickly. Leave a cell empty if a mark is still pending."
        onClose={() => setMarksExamId('')}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {examDetailQuery.data?.warnings.missingCount ? (
                <span className="inline-flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1 text-amber-900">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {examDetailQuery.data.warnings.missingCount} students missing marks
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMarksExamId('')} className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700">Close</button>
              <button type="button" onClick={() => saveMarksMutation.mutate()} disabled={saveMarksMutation.isPending || !examDetailQuery.data} className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save marks</button>
            </div>
          </div>
        }
      >
        {examDetailQuery.isPending ? (
          <div className="h-64 animate-pulse rounded-xl bg-brand-50" />
        ) : examDetailQuery.isError || !examDetailQuery.data ? (
          <StateView title="Could not load exam" message="Retry to load the marks grid." action={<button type="button" onClick={() => void examDetailQuery.refetch()} className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white">Retry</button>} />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-xl bg-brand-50/70 p-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Class</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{examDetailQuery.data.classRoom.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Subject</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{examDetailQuery.data.subject.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total marks</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{examDetailQuery.data.totalMarks}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Result status</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{examDetailQuery.data.resultStatus}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl bg-white/92">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-800">
                <thead>
                  <tr className="bg-brand-50/80 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="border-b border-brand-100 px-3 py-3">#</th>
                    <th className="border-b border-brand-100 px-3 py-3">Student</th>
                    <th className="border-b border-brand-100 px-3 py-3">Code</th>
                    <th className="border-b border-brand-100 px-3 py-3">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {examDetailQuery.data.students.map((student, index) => (
                    <tr key={student.id}>
                      <td className="border-b border-brand-100 px-3 py-3 align-top">{index + 1}</td>
                      <td className="border-b border-brand-100 px-3 py-3 align-top font-medium text-slate-900">{student.firstName} {student.lastName}</td>
                      <td className="border-b border-brand-100 px-3 py-3 align-top">{student.studentCode}</td>
                      <td className="border-b border-brand-100 px-3 py-3 align-top">
                        <input
                          value={marksDraft[student.id] ?? ''}
                          onChange={(event) => handleMarkChange(student.id, event.target.value)}
                          inputMode="numeric"
                          className="h-10 w-28 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isConductModalOpen}
        title="Conduct grades"
        description="Enter conduct grade per student for the selected term and class. Shown on report cards."
        onClose={() => setIsConductModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsConductModalOpen(false)} className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
            <button
              type="button"
              onClick={() => saveConductMutation.mutate()}
              disabled={saveConductMutation.isPending || !conductQuery.data?.students?.length || !(conductQuery.data?.students ?? []).some((s) => (conductDraft[s.id]?.grade ?? '').trim().length > 0)}
              className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save conduct
            </button>
          </div>
        }
      >
        {!termFilter || !classFilter ? (
          <p className="text-sm text-slate-600">Select a term and class above to enter conduct grades.</p>
        ) : conductQuery.isPending ? (
          <div className="h-64 animate-pulse rounded-xl bg-brand-50" />
        ) : conductQuery.isError || !conductQuery.data ? (
          <StateView title="Could not load students" message="Retry to load the conduct grid." action={<button type="button" onClick={() => void conductQuery.refetch()} className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white">Retry</button>} />
        ) : (
          <div className="grid gap-4">
            <p className="text-sm text-slate-600">
              Term: {terms.find((t) => t.id === termFilter)?.name ?? termFilter} · Class: {classRooms.find((c) => c.id === classFilter)?.name ?? classFilter}
            </p>
            <div className="overflow-x-auto rounded-xl bg-white/92">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-800">
                <thead>
                  <tr className="bg-brand-50/80 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="border-b border-brand-100 px-3 py-3">#</th>
                    <th className="border-b border-brand-100 px-3 py-3">Student</th>
                    <th className="border-b border-brand-100 px-3 py-3">Code</th>
                    <th className="border-b border-brand-100 px-3 py-3">Grade</th>
                    <th className="border-b border-brand-100 px-3 py-3">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {conductQuery.data.students.map((student, index) => (
                    <tr key={student.id}>
                      <td className="border-b border-brand-100 px-3 py-3 align-top">{index + 1}</td>
                      <td className="border-b border-brand-100 px-3 py-3 align-top font-medium text-slate-900">{student.firstName} {student.lastName}</td>
                      <td className="border-b border-brand-100 px-3 py-3 align-top">{student.studentCode}</td>
                      <td className="border-b border-brand-100 px-3 py-3 align-top">
                        <input
                          value={conductDraft[student.id]?.grade ?? ''}
                          onChange={(e) => setConductDraft((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] ?? { grade: '', remark: '' }), grade: e.target.value } }))}
                          className="h-10 w-24 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                          placeholder="A"
                        />
                      </td>
                      <td className="border-b border-brand-100 px-3 py-3 align-top">
                        <input
                          value={conductDraft[student.id]?.remark ?? ''}
                          onChange={(e) => setConductDraft((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] ?? { grade: '', remark: '' }), remark: e.target.value } }))}
                          className="h-10 min-w-[140px] rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
