import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
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
  gender: '',
  dateOfBirth: '',
  academicYearId: '',
  classRoomId: '',
};

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

  const years = ((yearsQuery.data as any[]) ?? []) as any[];
  const classRooms = ((classesQuery.data as any[]) ?? []) as any[];

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
      gender: student.gender ?? '',
      dateOfBirth: toDateInput(student.dateOfBirth),
      academicYearId: student.currentEnrollment?.academicYear.id ?? years[0]?.id ?? '',
      classRoomId: student.currentEnrollment?.classRoom.id ?? classRooms[0]?.id ?? '',
    });
    setIsStudentModalOpen(true);
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
      const csvLines = rows.map((row) =>
        (row as (string | number)[])
          .map((cell) => {
            const s = String(cell ?? '');
            if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(','),
      );
      const csv = csvLines.join('\r\n');
      const result = await importStudentsApi(auth.accessToken!, {
        csv,
        mode: 'commit',
        allowPartial: true,
      });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast({
        type: 'success',
        title: 'Import complete',
        message: `${result.summary.importedRows ?? result.summary.validRows ?? 0} students imported. ${result.summary.invalidRows ?? 0} row(s) had errors.`,
      });
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
      'academicYearName',
      'classCode',
      'enrolledAt',
    ];
    const exampleRow = [
      'STU-001',
      'Alice',
      'Uwase',
      'FEMALE',
      '2014-05-20',
      '2025-2026',
      'P5-A',
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
      message: 'Fill in the Excel file and upload it. Use academic year name and class code.',
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
            disabled={isImporting}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Upload Excel'}
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
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full table-auto text-left text-sm">
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
                  <td className="px-2 py-2 align-middle">{student.parents.length}</td>
                  <td className="px-2 py-2 align-middle">
                    <div className="flex gap-2">
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
