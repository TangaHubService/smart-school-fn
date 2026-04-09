import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { hasPermission } from '../features/auth/auth-helpers';
import { listAcademicYearsApi, listClassRoomsApi } from '../features/sprint1/sprint1.api';
import {
  createStudentApi,
  deleteStudentApi,
  exportStudentsApi,
  importStudentsApi,
  listStudentsApi,
  updateStudentApi,
} from '../features/sprint2/sprint2.api';
import { ApiClientError } from '../types/api';

const studentSchema = z.object({
  studentCode: z.string().trim().min(1, 'Student code is required').max(40),
  firstName: z.string().trim().min(2, 'First name is required').max(80),
  lastName: z.string().trim().min(2, 'Last name is required').max(80),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']).optional(),
  dateOfBirth: z.string().optional(),
  academicYearId: z.string().min(1, 'Academic year is required'),
  classRoomId: z.string().min(1, 'Class is required'),
});

type StudentForm = z.infer<typeof studentSchema>;

const defaultStudentForm: StudentForm = {
  studentCode: '',
  firstName: '',
  lastName: '',
  email: '',
  gender: '',
  dateOfBirth: '',
  academicYearId: '',
  classRoomId: '',
};

type StudentImportPreview = Awaited<ReturnType<typeof importStudentsApi>>;

function buildCsvFromRows(rows: unknown[][]): string {
  return rows
    .map((row) =>
      (row as (string | number)[])
        .map((cell) => {
          const value = String(cell ?? '');
          if (/[,"\n\r]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        })
        .join(','),
    )
    .join('\r\n');
}

function toDateInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

export function StudentsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [importPreview, setImportPreview] = useState<StudentImportPreview | null>(null);
  const [importAcademicYearId, setImportAcademicYearId] = useState('');
  const [importClassRoomId, setImportClassRoomId] = useState('');

  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const studentForm = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: defaultStudentForm,
  });

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const studentsQuery = useQuery({
    queryKey: ['students', { search, classFilter, yearFilter, page, pageSize }],
    queryFn: () =>
      listStudentsApi(auth.accessToken!, {
        q: search,
        classId: classFilter || undefined,
        academicYearId: yearFilter || undefined,
        page,
        pageSize,
      }),
  });

  const createStudentMutation = useMutation({
    mutationFn: (values: StudentForm) =>
      createStudentApi(auth.accessToken!, {
        studentCode: values.studentCode,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email || undefined,
        gender: values.gender ? (values.gender as any) : undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        enrollment: {
          academicYearId: values.academicYearId,
          classRoomId: values.classRoomId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsStudentModalOpen(false);
      studentForm.reset(defaultStudentForm);
      showToast({ type: 'success', title: 'Student created successfully' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create student',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: StudentForm }) =>
      updateStudentApi(auth.accessToken!, id, {
        studentCode: values.studentCode,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email || null,
        gender: values.gender ? (values.gender as any) : null,
        dateOfBirth: values.dateOfBirth || null,
        enrollment: {
          academicYearId: values.academicYearId,
          classRoomId: values.classRoomId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsStudentModalOpen(false);
      setEditingStudent(null);
      studentForm.reset(defaultStudentForm);
      showToast({ type: 'success', title: 'Student updated successfully' });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update student',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      exportStudentsApi(auth.accessToken!, {
        q: search,
        classId: classFilter || undefined,
        academicYearId: yearFilter || undefined,
      }),
    onSuccess: async (result) => {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(result.csv, { type: 'string', raw: true });
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const baseName = (result.fileName || 'students').replace(/\.csv$/i, '');
      link.setAttribute('download', `${baseName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        title: 'Export ready',
        message: `${result.rowCount} rows exported`,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Export failed',
        message: error instanceof Error ? error.message : 'Export request failed',
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: string) => deleteStudentApi(auth.accessToken!, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      showToast({
        type: 'success',
        title: 'Student deleted',
      });
      setStudentToDelete(null);
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not delete student',
        message: error instanceof Error ? error.message : 'Delete request failed',
      });
    },
  });

  const previewImportMutation = useMutation({
    mutationFn: ({
      csv,
      defaultAcademicYearId,
      defaultClassRoomId,
    }: {
      csv: string;
      defaultAcademicYearId: string;
      defaultClassRoomId: string;
    }) =>
      importStudentsApi(auth.accessToken!, {
        csv,
        mode: 'preview',
        allowPartial: true,
        defaultAcademicYearId,
        defaultClassRoomId,
      }),
    onSuccess: (result) => {
      setImportPreview(result);
    },
    onError: (error) => {
      setImportPreview(null);
      showToast({
        type: 'error',
        title: 'Could not preview import',
        message: error instanceof Error ? error.message : 'Preview request failed',
      });
    },
  });

  const commitImportMutation = useMutation({
    mutationFn: ({
      csv,
      defaultAcademicYearId,
      defaultClassRoomId,
    }: {
      csv: string;
      defaultAcademicYearId: string;
      defaultClassRoomId: string;
    }) =>
      importStudentsApi(auth.accessToken!, {
        csv,
        mode: 'commit',
        allowPartial: true,
        defaultAcademicYearId,
        defaultClassRoomId,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsImportPreviewOpen(false);
      setImportPreview(null);
      setImportCsv('');
      setImportFileName('');
      setImportAcademicYearId('');
      setImportClassRoomId('');
      showToast({
        type: 'success',
        title: 'Import complete',
        message: `${result.summary.importedRows ?? result.summary.validRows ?? 0} students imported. ${result.summary.invalidRows ?? 0} row(s) still had validation errors.`,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Could not import students.',
      });
    },
  });

  const years = ((yearsQuery.data as any[]) ?? []) as any[];
  const classRooms = ((classesQuery.data as any[]) ?? []) as any[];
  const selectedImportAcademicYear = useMemo(
    () => years.find((year) => year.id === importAcademicYearId) ?? null,
    [years, importAcademicYearId],
  );
  const selectedImportClassRoom = useMemo(
    () => classRooms.find((room) => room.id === importClassRoomId) ?? null,
    [classRooms, importClassRoomId],
  );

  const students = studentsQuery.data?.items ?? [];
  const pagination =
    studentsQuery.data?.pagination ??
    ({
      page,
      pageSize,
      totalItems: 0,
      totalPages: 1,
    } as const);

  function openCreateStudent() {
    setEditingStudent(null);
    studentForm.reset({
      ...defaultStudentForm,
      academicYearId: years[0]?.id ?? '',
      classRoomId: classRooms[0]?.id ?? '',
    });
    setIsStudentModalOpen(true);
  }

  function openEditStudent(student: any) {
    setEditingStudent(student);
    studentForm.reset({
      studentCode: student.studentCode,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email ?? '',
      gender: student.gender ?? '',
      dateOfBirth: toDateInput(student.dateOfBirth),
      academicYearId: student.currentEnrollment?.academicYear.id ?? years[0]?.id ?? '',
      classRoomId: student.currentEnrollment?.classRoom.id ?? classRooms[0]?.id ?? '',
    });
    setIsStudentModalOpen(true);
  }

  function closeImportPreview() {
    if (commitImportMutation.isPending) {
      return;
    }

    setIsImportPreviewOpen(false);
    setImportPreview(null);
    setImportCsv('');
    setImportFileName('');
    setImportAcademicYearId('');
    setImportClassRoomId('');
  }

  function runImportPreview(csv: string, defaultAcademicYearId: string, defaultClassRoomId: string) {
    if (!defaultAcademicYearId || !defaultClassRoomId) {
      setImportPreview(null);
      return;
    }

    setImportPreview(null);
    previewImportMutation.mutate({
      csv,
      defaultAcademicYearId,
      defaultClassRoomId,
    });
  }

  async function handleFileSelect(file: File) {
    const isExcel =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';
    if (!isExcel) {
      showToast({
        type: 'error',
        title: 'Invalid file',
        message: 'Please upload an Excel file (.xlsx or .xls).',
      });
      return;
    }
    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        showToast({ type: 'error', title: 'Invalid Excel', message: 'No sheet found.' });
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
      }) as unknown[][];
      if (rows.length === 0) {
        showToast({ type: 'error', title: 'Empty file', message: 'Excel has no data.' });
        return;
      }
      const csv = buildCsvFromRows(rows);
      const initialAcademicYearId = yearFilter || years[0]?.id || '';
      const initialClassRoomId = classFilter || classRooms[0]?.id || '';

      setImportFileName(file.name);
      setImportCsv(csv);
      setImportAcademicYearId(initialAcademicYearId);
      setImportClassRoomId(initialClassRoomId);
      setImportPreview(null);
      setIsImportPreviewOpen(true);
      runImportPreview(csv, initialAcademicYearId, initialClassRoomId);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Import failed',
        message: err instanceof Error ? err.message : 'Could not import Excel file.',
      });
    } finally {
      setIsImporting(false);
    }
  }

  function openExcelPicker() {
    excelInputRef.current?.click();
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const headers = [
      'studentCode',
      'firstName',
      'lastName',
      'gender',
      'dateOfBirth',
      'enrolledAt',
    ];
    const exampleRow = [
      'STU-001',
      'Alice',
      'Uwase',
      'FEMALE',
      '2014-05-20',
      '2026-09-01',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    const blob = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'students-import-template.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast({
      type: 'info',
      title: 'Template downloaded',
      message: 'Fill in the student details, then choose the academic year and class in the preview step.',
    });
  }

  return (
    <SectionCard
      title="Students"
      subtitle="Enroll students, manage class assignments, and import/export records in bulk."
      action={
        <div className="flex flex-wrap gap-2">
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFileSelect(file);
              }
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => exportMutation.mutate()}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            type="button"
            onClick={openExcelPicker}
            disabled={isImporting || previewImportMutation.isPending || commitImportMutation.isPending}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {isImporting ? 'Reading Excel...' : previewImportMutation.isPending ? 'Preparing preview...' : 'Upload Excel'}
          </button>
          <button
            type="button"
            onClick={() => void downloadTemplate()}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Template Excel
          </button>
          <button
            type="button"
            onClick={openCreateStudent}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Add student
          </button>
        </div>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_200px_auto]">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by code or student name"
          className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          aria-label="Search students"
        />

        <select
          value={yearFilter}
          onChange={(event) => {
            setYearFilter(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          aria-label="Filter by academic year"
        >
          <option value="">All years</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>

        <select
          value={classFilter}
          onChange={(event) => {
            setClassFilter(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          aria-label="Filter by class"
        >
          <option value="">All classes</option>
          {classRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.code} - {room.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void studentsQuery.refetch()}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Refresh
        </button>
      </div>

      {studentsQuery.isPending ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {studentsQuery.isError ? (
        <StateView
          title="Could not load students"
          message="Please retry."
          action={
            <button
              type="button"
              onClick={() => void studentsQuery.refetch()}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!studentsQuery.isPending && !studentsQuery.isError && students.length === 0 ? (
        <EmptyState message="No students found. Add one manually or import Excel." />
      ) : null}

      {!studentsQuery.isPending && !studentsQuery.isError && students.length > 0 ? (
        <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full min-w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-slate-700">
                <th className="px-2 py-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Code</th>
                <th className="px-2 py-2 font-semibold">Student</th>
                <th className="px-2 py-2 font-semibold">Class</th>
                <th className="px-2 py-2 font-semibold">Year</th>
                <th className="px-2 py-2 font-semibold">Parents</th>
                <th className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id} className="border-b border-brand-50">
                  <td className="px-2 py-2 align-middle text-slate-600">
                    {(page - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-2 py-2 align-middle font-semibold text-slate-800">{student.studentCode}</td>
                  <td className="px-2 py-2 align-middle">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    {student.currentEnrollment?.classRoom.name ?? '-'}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    {student.currentEnrollment?.academicYear.name ?? '-'}
                  </td>
                  <td className="px-2 py-2 align-middle">{(student.parents ?? []).length}</td>
                  <td className="px-2 py-2 align-middle">
                    <div className="flex flex-wrap gap-2">
                      {hasPermission(auth.me, 'conduct.read') || hasPermission(auth.me, 'conduct.manage') ? (
                        <Link
                          to={`/admin/students/${student.id}/conduct`}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          Conduct
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEditStudent(student)}
                        className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStudentToDelete({
                            id: student.id,
                            name: `${student.firstName} ${student.lastName}`,
                          })
                        }
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
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
      ) : null}

      {!studentsQuery.isPending && !studentsQuery.isError ? (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-700">
          <p>
            Showing page {pagination.page} of {Math.max(1, pagination.totalPages)} ({pagination.totalItems} students)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
          studentForm.reset(defaultStudentForm);
        }}
        title={editingStudent ? 'Edit Student' : 'Add Student'}
        description="Manage student profile and active enrollment."
      >
        <form
          className="grid gap-3"
          onSubmit={studentForm.handleSubmit((values) => {
            if (editingStudent) {
              updateStudentMutation.mutate({ id: editingStudent.id, values });
              return;
            }

            createStudentMutation.mutate(values);
          })}
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Student Code
            <input className="rounded-lg border border-brand-200 px-3 py-2" {...studentForm.register('studentCode')} />
          </label>
          {studentForm.formState.errors.studentCode ? (
            <p className="text-xs text-red-700">{studentForm.formState.errors.studentCode.message}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              First Name
              <input className="rounded-lg border border-brand-200 px-3 py-2" {...studentForm.register('firstName')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Last Name
              <input className="rounded-lg border border-brand-200 px-3 py-2" {...studentForm.register('lastName')} />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Email Address (Optional)
            <input
              type="email"
              className="rounded-lg border border-brand-200 px-3 py-2"
              placeholder="student@example.com"
              {...studentForm.register('email')}
            />
          </label>
          {studentForm.formState.errors.email ? (
            <p className="text-xs text-red-700">{studentForm.formState.errors.email.message}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Gender
              <select className="rounded-lg border border-brand-200 px-3 py-2" {...studentForm.register('gender')}>
                <option value="">Not set</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="UNDISCLOSED">Undisclosed</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Date of Birth
              <input type="date" className="rounded-lg border border-brand-200 px-3 py-2" {...studentForm.register('dateOfBirth')} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Academic Year
              <select className="rounded-lg border border-brand-200 px-3 py-2" {...studentForm.register('academicYearId')}>
                <option value="">Select year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Class
              <select className="rounded-lg border border-brand-200 px-3 py-2" {...studentForm.register('classRoomId')}>
                <option value="">Select class</option>
                {classRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} - {room.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(createStudentMutation.error as ApiClientError | null) ? (
            <p className="text-xs text-red-700">{(createStudentMutation.error as ApiClientError).message}</p>
          ) : null}
          {(updateStudentMutation.error as ApiClientError | null) ? (
            <p className="text-xs text-red-700">{(updateStudentMutation.error as ApiClientError).message}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsStudentModalOpen(false);
                setEditingStudent(null);
              }}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStudentMutation.isPending || updateStudentMutation.isPending}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createStudentMutation.isPending || updateStudentMutation.isPending
                ? 'Saving...'
                : editingStudent
                  ? 'Update student'
                  : 'Create student'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isImportPreviewOpen}
        onClose={closeImportPreview}
        title="Preview student import"
        description="Review the spreadsheet rows, then choose the academic year and class that should apply to every uploaded student."
        size="wide"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeImportPreview}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                !importCsv ||
                !importPreview ||
                !importAcademicYearId ||
                !importClassRoomId ||
                importPreview.summary.validRows === 0 ||
                previewImportMutation.isPending ||
                commitImportMutation.isPending
              }
              onClick={() =>
                commitImportMutation.mutate({
                  csv: importCsv,
                  defaultAcademicYearId: importAcademicYearId,
                  defaultClassRoomId: importClassRoomId,
                })
              }
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {commitImportMutation.isPending
                ? 'Importing...'
                : importPreview?.summary.validRows
                  ? `Import ${importPreview.summary.validRows} valid row${importPreview.summary.validRows === 1 ? '' : 's'}`
                  : 'No valid rows'}
            </button>
          </div>
        }
      >
          <div className="grid gap-5">
          <div className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50/70 p-4 md:grid-cols-3 md:items-end">
            <div className="grid gap-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{importFileName || 'Selected Excel file'}</p>
              <p>The current school will be applied to every imported student in this upload.</p>
            </div>

            <div className="rounded-lg border border-brand-100 bg-white px-3 py-3 text-sm text-slate-700">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">School</span>
              <span className="mt-1 block font-semibold text-slate-900">
                {auth.me?.school?.displayName || auth.me?.tenant.name || 'Current school'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:col-span-1">
              <label className="grid gap-1 text-sm font-semibold text-slate-800">
                Academic year
                <select
                  value={importAcademicYearId}
                  onChange={(event) => {
                    const nextAcademicYearId = event.target.value;
                    setImportAcademicYearId(nextAcademicYearId);
                    if (importCsv) {
                      runImportPreview(importCsv, nextAcademicYearId, importClassRoomId);
                    }
                  }}
                  className="h-11 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                >
                  <option value="">Select academic year</option>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-800">
                Class
                <select
                  value={importClassRoomId}
                  onChange={(event) => {
                    const nextClassRoomId = event.target.value;
                    setImportClassRoomId(nextClassRoomId);
                    if (importCsv) {
                      runImportPreview(importCsv, importAcademicYearId, nextClassRoomId);
                    }
                  }}
                  className="h-11 rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                >
                  <option value="">Select class</option>
                  {classRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.code} - {room.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {previewImportMutation.isPending ? (
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
                <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
                <div className="h-24 animate-pulse rounded-xl bg-brand-100" />
              </div>
              <div className="h-72 animate-pulse rounded-xl bg-brand-50" />
            </div>
          ) : null}

          {!previewImportMutation.isPending && !importPreview ? (
            <StateView
              title={importAcademicYearId && importClassRoomId ? 'Could not preview this file' : 'Choose academic year and class'}
              message={
                importAcademicYearId && importClassRoomId
                  ? 'Retry the preview after checking the selected academic year, class, and spreadsheet content.'
                  : 'Select the academic year and class that should be applied to all uploaded students.'
              }
              action={
                <button
                  type="button"
                  onClick={() =>
                    importCsv &&
                    runImportPreview(
                      importCsv,
                      importAcademicYearId,
                      importClassRoomId,
                    )
                  }
                  disabled={!importAcademicYearId || !importClassRoomId}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Retry preview
                </button>
              }
            />
          ) : null}

          {importPreview ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-brand-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total rows</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{importPreview.summary.totalRows}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Valid rows</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">{importPreview.summary.validRows}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Rows with issues</p>
                  <p className="mt-2 text-2xl font-bold text-amber-900">{importPreview.summary.invalidRows}</p>
                </div>
              </div>

              <div className="rounded-xl border border-brand-100 bg-white">
                <div className="border-b border-brand-100 px-4 py-3 text-sm text-slate-700">
                  Import target:{' '}
                  <span className="font-semibold text-slate-900">
                    {auth.me?.school?.displayName || auth.me?.tenant.name || 'Current school'}
                  </span>
                  <span className="mx-2 text-slate-400">•</span>
                  <span className="font-semibold text-slate-900">
                    {selectedImportAcademicYear?.name || 'No academic year selected'}
                  </span>
                  <span className="mx-2 text-slate-400">•</span>
                  <span className="font-semibold text-slate-900">
                    {selectedImportClassRoom
                      ? `${selectedImportClassRoom.code} - ${selectedImportClassRoom.name}`
                      : 'No class selected'}
                  </span>
                  {importPreview.summary.invalidRows > 0 ? (
                    <span className="ml-2 text-slate-600">Only valid rows will be created. Invalid rows will be skipped.</span>
                  ) : null}
                </div>

                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-brand-50/70 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Row</th>
                        <th className="px-3 py-2 font-semibold">Student</th>
                        <th className="px-3 py-2 font-semibold">Academic year</th>
                        <th className="px-3 py-2 font-semibold">Class</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row) => {
                        const academicYearLabel = selectedImportAcademicYear?.name || '-';
                        const classLabel = selectedImportClassRoom
                          ? `${selectedImportClassRoom.code} - ${selectedImportClassRoom.name}`
                          : '-';

                        return (
                          <tr key={row.rowNumber} className="border-t border-brand-50 align-top">
                            <td className="px-3 py-3 text-slate-600">{row.rowNumber}</td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-slate-900">
                                {row.firstName || '-'} {row.lastName || ''}
                              </p>
                              <p className="text-xs text-slate-500">{row.studentCode || 'Missing student code'}</p>
                            </td>
                            <td className="px-3 py-3 text-slate-700">{academicYearLabel}</td>
                            <td className="px-3 py-3 text-slate-700">{classLabel}</td>
                            <td className="px-3 py-3">
                              {row.errors.length ? (
                                <span className="text-xs font-semibold text-rose-700">{row.errors.join('; ')}</span>
                              ) : (
                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                                  Ready to import
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        title="Delete Student"
        description="This action will archive the student and remove active enrollment links."
      >
        <div className="grid gap-3">
          <p className="text-sm text-slate-800">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{studentToDelete?.name}</span>?
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStudentToDelete(null)}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteStudentMutation.isPending || !studentToDelete}
              onClick={() => {
                if (studentToDelete) {
                  deleteStudentMutation.mutate(studentToDelete.id);
                }
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {deleteStudentMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </SectionCard>
  );
}
