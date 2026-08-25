import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  Loader2,
  Save,
  Send,
  TrendingUp,
} from 'lucide-react';

import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { useToast } from '../components/toast';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';
import type { UploadedAssetPayload } from '../features/sprint4/lms.api';
import {
  ACADEMIC_AUDIT_MODULE_LABELS,
  getAuditByIdApi,
  getSchoolAttendanceApi,
  getSchoolCoursesApi,
  getSchoolLearningInsightsApi,
  getSchoolAssessmentsApi,
  getSchoolMarksApi,
  getSchoolTimetableApi,
  isAuditorAuditModule,
  isAuditorFreeformModule,
  listAuditorSchoolsApi,
  submitAcademicAuditApi,
  submitDraftAuditApi,
  updateAcademicAuditApi,
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
  TEACHERS: ClipboardList,
  STUDENT_RECORDS: ClipboardList,
  INFRASTRUCTURE: ClipboardList,
  ICT: ClipboardList,
  SAFETY: ClipboardList,
  COMPLIANCE: ClipboardCheck,
};

export function AuditorAuditFormPage() {
  const { schoolId, module } = useParams<{ schoolId: string; module: AcademicAuditModule }>();
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get('auditId');
  const navigate = useNavigate();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [score, setScore] = useState(50);
  const [comment, setComment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [pendingAction, setPendingAction] = useState<'draft' | 'submit' | null>(null);

  const moduleParam = module ?? null;
  const moduleEnum: AcademicAuditModule =
    isAuditorAuditModule(moduleParam) || isAuditorFreeformModule(moduleParam)
      ? moduleParam
      : 'ATTENDANCE';
  const isFreeform = isAuditorFreeformModule(moduleEnum);
  const Icon = MODULE_ICONS[moduleEnum];

  const existingAuditQuery = useQuery({
    queryKey: ['audit', auditId],
    queryFn: () => getAuditByIdApi(auditId!),
    enabled: Boolean(auditId),
  });

  useEffect(() => {
    const audit = existingAuditQuery.data;
    if (audit) {
      setScore(audit.score);
      setComment(audit.comment ?? '');
      setRecommendation(audit.recommendation ?? '');
    }
  }, [existingAuditQuery.data]);

  const schoolsQuery = useQuery({
    queryKey: ['auditor-schools'],
    queryFn: listAuditorSchoolsApi,
    enabled: isFreeform,
  });
  const schoolName = schoolsQuery.data?.find((s) => s.id === schoolId)?.displayName ?? '';

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
        case 'TIMETABLE':
          return getSchoolTimetableApi(schoolId!);
        default:
          throw new Error('Unknown module');
      }
    },
    enabled: !!schoolId && !isFreeform,
  });

  const onSaved = (asDraft: boolean) => {
    showToast({ type: 'success', title: asDraft ? 'Draft saved' : 'Audit submitted' });
    void queryClient.invalidateQueries({ queryKey: ['auditor-audits'] });
    navigate('/auditor/history');
  };

  const onSaveError = (err: unknown) => {
    showToast({
      type: 'error',
      title: 'Could not save audit',
      message: err instanceof Error ? err.message : 'Request failed',
    });
  };

  const createMutation = useMutation({
    mutationFn: submitAcademicAuditApi,
    onSuccess: (_, variables) => onSaved(Boolean(variables.asDraft)),
    onError: onSaveError,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...rest
    }: {
      id: string;
      score: number;
      comment?: string;
      recommendation?: string;
      attachments?: UploadedAssetPayload[];
    }) => updateAcademicAuditApi(id, rest),
    onError: onSaveError,
  });

  const submitDraftMutation = useMutation({
    mutationFn: submitDraftAuditApi,
    onError: onSaveError,
  });

  const handleSubmit = async (asDraft: boolean) => {
    if (!asDraft && !comment.trim()) {
      showToast({ type: 'error', title: 'Add findings before submitting' });
      return;
    }

    setPendingAction(asDraft ? 'draft' : 'submit');
    try {
      // Omit (rather than send `[]`) when no new files were picked, so editing a draft
      // without touching the file input doesn't wipe out previously uploaded evidence.
      const attachments = attachmentFiles.length
        ? await Promise.all(
            attachmentFiles.map((file) =>
              uploadFileToCloudinary(auth.accessToken!, 'audit-evidence', file)
            )
          )
        : undefined;

      if (auditId) {
        await updateMutation.mutateAsync({
          id: auditId,
          score,
          comment: comment.trim() || undefined,
          recommendation: recommendation.trim() || undefined,
          attachments,
        });
        if (!asDraft) {
          await submitDraftMutation.mutateAsync(auditId);
        }
        onSaved(asDraft);
        return;
      }

      await createMutation.mutateAsync({
        schoolId: schoolId!,
        module: moduleEnum,
        score,
        comment: comment.trim() || undefined,
        recommendation: recommendation.trim() || undefined,
        attachments: attachments ?? [],
        asDraft,
      });
    } catch (err) {
      console.error('Failed to save audit:', err);
    } finally {
      setPendingAction(null);
    }
  };

  if (!isFreeform && isLoading) {
    return <StateView title="Loading data..." loading skeletonVariant="form" />;
  }

  if (!isFreeform && error) {
    return <StateView title="Error loading data" variant="error" />;
  }

  if (!isFreeform && !data) {
    return <StateView title="No data" variant="empty" />;
  }

  const isBusy = pendingAction !== null;

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
              <p className="text-sm text-slate-500">
                {isFreeform ? schoolName : data!.school.displayName}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isFreeform ? (
              <p className="text-sm text-slate-500">
                This category has no auto-pulled summary. Record your on-site findings, score, and
                supporting evidence in the form.
              </p>
            ) : (
              renderModuleSummary(moduleEnum, data!)
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Audit Report</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit(false);
            }}
            className="space-y-4"
          >
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Evidence (photos, documents — optional)
              </label>
              {existingAuditQuery.data?.attachments?.length ? (
                <p className="mb-2 text-xs text-slate-500">
                  Already attached:{' '}
                  {existingAuditQuery.data.attachments.map((a) => a.originalName).join(', ')}.
                  Choosing new files below replaces these.
                </p>
              ) : null}
              <input
                type="file"
                multiple
                onChange={(e) => setAttachmentFiles(Array.from(e.target.files ?? []))}
                className="text-sm"
              />
              {attachmentFiles.length ? (
                <p className="mt-1 text-xs text-slate-500">
                  {attachmentFiles.length} file{attachmentFiles.length > 1 ? 's' : ''} selected
                </p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSubmit(true)}
                disabled={isBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === 'draft' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </button>
              <button
                type="submit"
                disabled={isBusy || !comment.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === 'submit' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Audit
              </button>
            </div>
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
