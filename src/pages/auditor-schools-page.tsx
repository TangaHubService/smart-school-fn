import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';

import { StateView } from '../components/state-view';
import { ListSkeleton, PageSkeleton } from '../components/skeleton-loader';
import {
  ACADEMIC_AUDIT_MODULE_LABELS,
  AUDITOR_AUDIT_MODULES,
  AUDITOR_FREEFORM_MODULES,
  getSchoolAttendanceApi,
  getSchoolCoursesApi,
  getSchoolLearningInsightsApi,
  getSchoolAssessmentsApi,
  getSchoolMarksApi,
  getSchoolTimetableApi,
  isAuditorAuditModule,
  isAuditorFreeformModule,
  listAuditorSchoolsApi,
  type AcademicAuditModule,
  type AcademicAuditModuleData,
} from '../features/audit/audit.api';

const MODULE_ICONS: Record<AcademicAuditModule, typeof ClipboardList> = {
  ATTENDANCE: ClipboardList,
  COURSE_MANAGEMENT: BookOpen,
  LEARNING_INSIGHTS: TrendingUp,
  CONTINUOUS_ASSESSMENTS: ClipboardCheck,
  MARKS: FileBarChart2,
  TIMETABLE: CalendarDays,
  FINANCE: ClipboardList,
  TEACHERS: Users,
  STUDENT_RECORDS: ClipboardList,
  INFRASTRUCTURE: ClipboardList,
  ICT: ClipboardList,
  SAFETY: ClipboardList,
  COMPLIANCE: ClipboardCheck,
};

export function AuditorSchoolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const moduleParam = searchParams.get('module');
  const selectedModule: AcademicAuditModule =
    isAuditorAuditModule(moduleParam) || isAuditorFreeformModule(moduleParam)
      ? moduleParam
      : 'ATTENDANCE';
  const isFreeform = isAuditorFreeformModule(selectedModule);
  const selectedSchoolId = searchParams.get('schoolId');
  const [search, setSearch] = useState('');

  const { data: schools, isLoading: loadingSchools } = useQuery({
    queryKey: ['auditor-schools'],
    queryFn: listAuditorSchoolsApi,
  });

  const filteredSchools = schools?.filter((s) =>
    s.displayName.toLowerCase().includes(search.toLowerCase())
  );
  const selectedSchoolInScope = selectedSchoolId
    ? (schools?.some((school) => school.id === selectedSchoolId) ?? false)
    : false;
  const activeSchoolId = selectedSchoolInScope ? selectedSchoolId : null;

  useEffect(() => {
    if (!schools?.length) {
      return;
    }

    if (selectedSchoolInScope) {
      return;
    }

    const randomSchool = schools[Math.floor(Math.random() * schools.length)];
    setSearchParams(
      {
        module: selectedModule,
        schoolId: randomSchool.id,
      },
      { replace: true }
    );
  }, [schools, selectedModule, selectedSchoolId, selectedSchoolInScope, setSearchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">School Audit</h1>
        <p className="text-sm text-slate-500 mt-1">Select a module and school to begin audit</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Data-backed audits
        </p>
        <div className="flex gap-2 flex-wrap">
          {AUDITOR_AUDIT_MODULES.map((module) => {
            const isActive = module === selectedModule;
            return (
              <button
                key={module}
                onClick={() => {
                  const nextParams: Record<string, string> = { module };
                  if (activeSchoolId) {
                    nextParams.schoolId = activeSchoolId;
                  }
                  setSearchParams(nextParams);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {ACADEMIC_AUDIT_MODULE_LABELS[module]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Compliance &amp; operations audits
        </p>
        <div className="flex gap-2 flex-wrap">
          {AUDITOR_FREEFORM_MODULES.map((module) => {
            const isActive = module === selectedModule;
            return (
              <button
                key={module}
                onClick={() => {
                  const nextParams: Record<string, string> = { module };
                  if (activeSchoolId) {
                    nextParams.schoolId = activeSchoolId;
                  }
                  setSearchParams(nextParams);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {ACADEMIC_AUDIT_MODULE_LABELS[module]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search schools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto p-2">
            {loadingSchools ? (
              <ListSkeleton rows={6} showAvatar={false} className="p-2" />
            ) : filteredSchools?.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500">No schools found</p>
            ) : (
              filteredSchools?.map((school) => (
                <button
                  key={school.id}
                  onClick={() => {
                    setSearchParams({ module: selectedModule, schoolId: school.id });
                  }}
                  className={`w-full rounded-lg p-3 text-left transition ${
                    activeSchoolId === school.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <p className="font-medium text-slate-900">{school.displayName}</p>
                  <p className="text-xs text-slate-500">
                    {[school.province, school.district, school.sector].filter(Boolean).join(' / ')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {activeSchoolId ? (
            isFreeform ? (
              <FreeformModuleView
                schoolId={activeSchoolId}
                module={selectedModule}
                schoolName={schools?.find((s) => s.id === activeSchoolId)?.displayName ?? ''}
              />
            ) : (
              <ModuleDataView schoolId={activeSchoolId} module={selectedModule} />
            )
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border bg-slate-50 p-8">
              <p className="text-slate-500">Select a school to view data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FreeformModuleView({
  schoolId,
  module,
  schoolName,
}: {
  schoolId: string;
  module: AcademicAuditModule;
  schoolName: string;
}) {
  const Icon = MODULE_ICONS[module];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border bg-white p-8 text-center">
      <div className="rounded-lg bg-blue-50 p-3">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {ACADEMIC_AUDIT_MODULE_LABELS[module]} audit
        </h2>
        <p className="mt-1 text-sm text-slate-500">{schoolName}</p>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          This category has no auto-pulled summary. Record your findings, score, and evidence
          directly on the audit form.
        </p>
      </div>
      <Link
        to={`/auditor/audit/${schoolId}/${module}`}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Start Audit
      </Link>
    </div>
  );
}

function ModuleDataView({ schoolId, module }: { schoolId: string; module: AcademicAuditModule }) {
  const Icon = MODULE_ICONS[module];

  const { data, isLoading, error } = useQuery<AcademicAuditModuleData>({
    queryKey: [`school-${module.toLowerCase()}`, schoolId],
    queryFn: () => {
      switch (module) {
        case 'ATTENDANCE':
          return getSchoolAttendanceApi(schoolId);
        case 'COURSE_MANAGEMENT':
          return getSchoolCoursesApi(schoolId);
        case 'LEARNING_INSIGHTS':
          return getSchoolLearningInsightsApi(schoolId);
        case 'CONTINUOUS_ASSESSMENTS':
          return getSchoolAssessmentsApi(schoolId);
        case 'MARKS':
          return getSchoolMarksApi(schoolId);
        case 'TIMETABLE':
          return getSchoolTimetableApi(schoolId);
        default:
          throw new Error('Unknown module');
      }
    },
  });

  if (isLoading) {
    return <PageSkeleton variant="table" />;
  }

  if (error) {
    return (
      <StateView
        title="Error loading data"
        description={(error as Error).message}
        variant="error"
      />
    );
  }

  if (!data) {
    return <StateView title="No data" variant="empty" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{data.school.displayName}</h2>
            {'academicYear' in data && data.academicYear && (
              <p className="text-sm text-slate-500">{data.academicYear.name}</p>
            )}
          </div>
        </div>
        <Link
          to={`/auditor/audit/${schoolId}/${module}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Start Audit
        </Link>
      </div>

      {renderModuleContent(module, data)}
    </div>
  );
}

function renderModuleContent(module: AcademicAuditModule, data: unknown) {
  switch (module) {
    case 'ATTENDANCE': {
      const d = data as {
        summary: { totalSessions: number; averageAttendance: number };
        data: Array<{ date: string; classRoom: string; status: string }>;
      };
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Sessions</p>
              <p className="text-2xl font-bold text-slate-900">{d.summary.totalSessions}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Average Attendance</p>
              <p className="text-2xl font-bold text-slate-900">{d.summary.averageAttendance}%</p>
            </div>
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Class</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.data.slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{item.classRoom}</td>
                    <td className="px-4 py-2">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case 'COURSE_MANAGEMENT': {
      const d = data as {
        totalCourses: number;
        data: Array<{
          name: string;
          subject: string;
          classRoom: string;
          teacher: string;
          lessonsCount: number;
          assignmentsCount: number;
        }>;
      };
      return (
        <div className="space-y-4">
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total Courses</p>
            <p className="text-2xl font-bold text-slate-900">{d.totalCourses}</p>
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Course</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Subject</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Class</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Teacher</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Lessons</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Assignments</th>
                </tr>
              </thead>
              <tbody>
                {d.data.slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.subject}</td>
                    <td className="px-4 py-2">{item.classRoom}</td>
                    <td className="px-4 py-2">{item.teacher}</td>
                    <td className="px-4 py-2 text-right">{item.lessonsCount}</td>
                    <td className="px-4 py-2 text-right">{item.assignmentsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case 'LEARNING_INSIGHTS': {
      const d = data as {
        summary: {
          totalStudents: number;
          totalCourses: number;
          activeEnrollments: number;
          completedLessons: number;
        };
      };
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Total Students</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{d.summary.totalStudents}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Total Courses</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{d.summary.totalCourses}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Active Enrollments</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{d.summary.activeEnrollments}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Completed Lessons</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{d.summary.completedLessons}</p>
          </div>
        </div>
      );
    }
    case 'CONTINUOUS_ASSESSMENTS': {
      const d = data as {
        totalAssessments: number;
        totalAttempts: number;
        data: Array<{
          title: string;
          type: string;
          status: string;
          questionsCount: number;
          attemptsCount: number;
        }>;
      };
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Assessments</p>
              <p className="text-2xl font-bold text-slate-900">{d.totalAssessments}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Attempts</p>
              <p className="text-2xl font-bold text-slate-900">{d.totalAttempts}</p>
            </div>
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Title</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Questions</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {d.data.slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{item.title}</td>
                    <td className="px-4 py-2">{item.type}</td>
                    <td className="px-4 py-2">{item.status}</td>
                    <td className="px-4 py-2 text-right">{item.questionsCount}</td>
                    <td className="px-4 py-2 text-right">{item.attemptsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case 'MARKS': {
      const d = data as {
        summary: { totalExams: number; marksCompletionRate: number };
        data: Array<{
          title: string;
          subject: string;
          classRoom: string;
          examType: string;
          totalMarks: number;
          marksEntered: number;
          status: string;
        }>;
      };
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Exams</p>
              <p className="text-2xl font-bold text-slate-900">{d.summary.totalExams}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Marks Completion</p>
              <p className="text-2xl font-bold text-slate-900">{d.summary.marksCompletionRate}%</p>
            </div>
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Exam</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Subject</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Class</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Total</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Entered</th>
                </tr>
              </thead>
              <tbody>
                {d.data.slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{item.title}</td>
                    <td className="px-4 py-2">{item.subject}</td>
                    <td className="px-4 py-2">{item.classRoom}</td>
                    <td className="px-4 py-2">{item.examType}</td>
                    <td className="px-4 py-2 text-right">{item.totalMarks}</td>
                    <td className="px-4 py-2 text-right">{item.marksEntered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case 'TIMETABLE': {
      const d = data as {
        term: { name: string } | null;
        totalSlots: number;
        data: Array<{
          dayOfWeek: string;
          startTime: string;
          endTime: string;
          classRoom: string;
          subject: string;
          teacher: string;
        }>;
      };
      const dayOrder = [
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY',
      ];
      return (
        <div className="space-y-4">
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total Timetable Slots</p>
            <p className="text-2xl font-bold text-slate-900">{d.totalSlots}</p>
            {d.term && <p className="text-sm text-slate-500">Term: {d.term.name}</p>}
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Day</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Class</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Subject</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Teacher</th>
                </tr>
              </thead>
              <tbody>
                {d.data.slice(0, 15).map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{item.dayOfWeek}</td>
                    <td className="px-4 py-2">
                      {item.startTime} - {item.endTime}
                    </td>
                    <td className="px-4 py-2">{item.classRoom}</td>
                    <td className="px-4 py-2">{item.subject}</td>
                    <td className="px-4 py-2">{item.teacher}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    default:
      return <p className="text-slate-500">No data available</p>;
  }
}
