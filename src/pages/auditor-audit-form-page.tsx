import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  Loader2,
  Save,
  TrendingUp,
} from 'lucide-react';

import { StateView } from '../components/state-view';
import {
  ACADEMIC_AUDIT_MODULE_LABELS,
  getSchoolAttendanceApi,
  getSchoolCoursesApi,
  getSchoolLearningInsightsApi,
  getSchoolAssessmentsApi,
  getSchoolMarksApi,
  isAuditorAuditModule,
  submitAcademicAuditApi,
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
};

export function AuditorAuditFormPage() {
  const { schoolId, module } = useParams<{ schoolId: string; module: AcademicAuditModule }>();
  const navigate = useNavigate();
  const [score, setScore] = useState(50);
  const [comment, setComment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const moduleParam = module ?? null;
  const moduleEnum: AcademicAuditModule = isAuditorAuditModule(moduleParam)
    ? moduleParam
    : 'ATTENDANCE';
  const Icon = MODULE_ICONS[moduleEnum];

  const { data, isLoading, error } = useQuery<AcademicAuditModuleData>({
    queryKey: [`school-${moduleEnum.toLowerCase()}`, schoolId],
    queryFn: () => {
      switch (moduleEnum) {
        case 'ATTENDANCE':
          return getSchoolAttendanceApi(schoolId!);
        case 'COURSE_MANAGEMENT':
          return getSchoolCoursesApi(schoolId!);
        case 'LEARNING_INSIGHTS':
          return getSchoolLearningInsightsApi(schoolId!);
        case 'CONTINUOUS_ASSESSMENTS':
          return getSchoolAssessmentsApi(schoolId!);
        case 'MARKS':
          return getSchoolMarksApi(schoolId!);
        default:
          throw new Error('Unknown module');
      }
    },
    enabled: !!schoolId,
  });

  const submitMutation = useMutation({
    mutationFn: submitAcademicAuditApi,
    onSuccess: () => {
      navigate(`/auditor/schools?module=${moduleEnum}&schoolId=${schoolId}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        schoolId: schoolId!,
        module: moduleEnum,
        score,
        comment: comment.trim(),
        recommendation: recommendation.trim() || undefined,
      });
    } catch (err) {
      console.error('Failed to submit audit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <StateView title="Loading data..." loading />;
  }

  if (error) {
    return <StateView title="Error loading data" variant="error" />;
  }

  if (!data) {
    return <StateView title="No data" variant="empty" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {ACADEMIC_AUDIT_MODULE_LABELS[moduleEnum]}
              </h2>
              <p className="text-sm text-slate-500">{data.school.displayName}</p>
            </div>
          </div>

          <div className="space-y-4">{renderModuleSummary(moduleEnum, data)}</div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Submit Audit</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Score: {score}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                placeholder="Enter your observations and findings..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Recommendation (Optional)
              </label>
              <textarea
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                placeholder="Enter recommendations for improvement..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Submit Audit
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function renderModuleSummary(module: AcademicAuditModule, data: unknown) {
  switch (module) {
    case 'ATTENDANCE': {
      const d = data as { summary: { totalSessions: number; averageAttendance: number } };
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total Sessions</p>
              <p className="text-xl font-bold text-slate-900">{d.summary.totalSessions}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Average Attendance</p>
              <p className="text-xl font-bold text-slate-900">{d.summary.averageAttendance}%</p>
            </div>
          </div>
        </>
      );
    }
    case 'COURSE_MANAGEMENT': {
      const d = data as { totalCourses: number };
      return (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Total Courses</p>
          <p className="text-xl font-bold text-slate-900">{d.totalCourses}</p>
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
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total Students</p>
            <p className="text-xl font-bold text-slate-900">{d.summary.totalStudents}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Active Enrollments</p>
            <p className="text-xl font-bold text-slate-900">{d.summary.activeEnrollments}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total Courses</p>
            <p className="text-xl font-bold text-slate-900">{d.summary.totalCourses}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Completed Lessons</p>
            <p className="text-xl font-bold text-slate-900">{d.summary.completedLessons}</p>
          </div>
        </div>
      );
    }
    case 'CONTINUOUS_ASSESSMENTS': {
      const d = data as { totalAssessments: number; totalAttempts: number };
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total Assessments</p>
            <p className="text-xl font-bold text-slate-900">{d.totalAssessments}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total Attempts</p>
            <p className="text-xl font-bold text-slate-900">{d.totalAttempts}</p>
          </div>
        </div>
      );
    }
    case 'MARKS': {
      const d = data as { summary: { totalExams: number; marksCompletionRate: number } };
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total Exams</p>
            <p className="text-xl font-bold text-slate-900">{d.summary.totalExams}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Marks Completion</p>
            <p className="text-xl font-bold text-slate-900">{d.summary.marksCompletionRate}%</p>
          </div>
        </div>
      );
    }
    case 'TIMETABLE': {
      const d = data as { totalSlots: number; term: { name: string } | null };
      return (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Total Timetable Slots</p>
          <p className="text-xl font-bold text-slate-900">{d.totalSlots}</p>
          {d.term && <p className="text-xs text-slate-500 mt-1">Term: {d.term.name}</p>}
        </div>
      );
    }
    default:
      return null;
  }
}
