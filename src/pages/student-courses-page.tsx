import clsx from 'clsx';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, ChevronRight, ClipboardCheck, Lock, Play, CheckCircle2, Circle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ProgressRing } from '../components/progress-ring';
import { CourseOverviewPanel } from '../components/student-learning/course-overview-panel';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useSetStudentHeaderActions } from '../contexts/student-header-actions.context';
import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { RichContent } from '../components/rich-content';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';
import {
  AssignmentItem,
  LessonItem,
  MyCoursesResponse,
  listMyCoursesApi,
  submitAssignmentApi,
  markLessonCompleteApi,
} from '../features/sprint4/lms.api';
import {
  addPendingLessonComplete,
  getPendingLessonIds,
  removePendingLessonComplete,
} from '../utils/offline-learning-cache';
import { getCourseProgressMetrics, getResumeLessonId } from '../utils/course-progress';
const submissionSchema = z
  .object({
    textAnswer: z.string().trim().max(10000).optional(),
    linkUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  })
  .superRefine((value, context) => {
    if (!value.textAnswer?.trim() && !value.linkUrl?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['textAnswer'],
        message: 'Add an answer or a link. You can also attach a file.',
      });
    }
  });

type SubmissionFormValues = z.infer<typeof submissionSchema>;
type StudentCourseItem = MyCoursesResponse['items'][number];
type CoursePanel = 'lessons' | 'tests';
type SubjectCourseGroup = {
  key: string;
  id: string | null;
  name: string;
  code: string;
  courses: StudentCourseItem[];
  totalLessons: number;
  totalAssignments: number;
};

const defaultSubmissionForm: SubmissionFormValues = {
  textAnswer: '',
  linkUrl: '',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isAudioAsset(url: string | null | undefined, mimeType?: string | null) {
  const value = `${mimeType ?? ''} ${url ?? ''}`.toLowerCase();
  return value.includes('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/.test(value);
}

function getYouTubeEmbedUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const videoId =
        parsed.searchParams.get('v') ??
        parsed.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ??
        null;

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function lessonHasInlineMedia(
  lesson: Pick<LessonItem, 'contentType' | 'externalUrl' | 'fileAsset'>,
) {
  const mediaUrl = lesson.fileAsset?.secureUrl ?? lesson.externalUrl ?? null;
  if (!mediaUrl) {
    return false;
  }

  return Boolean(
    getYouTubeEmbedUrl(mediaUrl) ||
      lesson.contentType === 'VIDEO' ||
      lesson.contentType === 'PDF' ||
      lesson.fileAsset?.mimeType?.startsWith('video/') ||
      isAudioAsset(mediaUrl, lesson.fileAsset?.mimeType),
  );
}

function LessonMediaEmbed({
  lesson,
}: {
  lesson: Pick<LessonItem, 'contentType' | 'externalUrl' | 'fileAsset'>;
}) {
  const mediaUrl = lesson.fileAsset?.secureUrl ?? lesson.externalUrl ?? null;

  if (!mediaUrl) {
    return null;
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(mediaUrl);
  if (youtubeEmbedUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-black">
        <iframe
          title={lesson.fileAsset?.originalName ?? 'Lesson video'}
          src={youtubeEmbedUrl}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  if (lesson.contentType === 'VIDEO' || lesson.fileAsset?.mimeType?.startsWith('video/')) {
    return (
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-black">
        <video controls className="h-auto w-full" src={mediaUrl}>
          Your browser does not support embedded video playback.
        </video>
      </div>
    );
  }

  if (isAudioAsset(mediaUrl, lesson.fileAsset?.mimeType)) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <audio controls className="w-full" src={mediaUrl}>
          Your browser does not support embedded audio playback.
        </audio>
      </div>
    );
  }

  if (lesson.contentType === 'PDF') {
    return (
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white">
        <iframe
          title={lesson.fileAsset?.originalName ?? 'Lesson PDF'}
          src={mediaUrl}
          className="h-[560px] w-full"
        />
      </div>
    );
  }

  return null;
}

function AttachmentLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-100"
    >
      {label}
    </a>
  );
}

function getAssignmentStatus(assignment: AssignmentItem) {
  if (assignment.mySubmission?.status === 'GRADED') {
    return {
      label: 'Graded',
      tone: 'graded' as const,
    };
  }

  if (assignment.mySubmission) {
    return {
      label: 'Submitted',
      tone: 'submitted' as const,
    };
  }

  return {
    label: 'Published',
    tone: 'published' as const,
  };
}

const STUDENT_HEADER_ACTION_BTN =
  'rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 sm:text-sm';

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'published' | 'submitted' | 'graded';
}) {
  const toneClass: Record<typeof tone, string> = {
    published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    submitted: 'border-sky-200 bg-sky-50 text-sky-800',
    graded: 'border-brand-200 bg-brand-100 text-slate-800',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
}

function getCourseSubjectKey(course: StudentCourseItem) {
  return course.subject?.id ?? '__general_subject__';
}

const COURSE_COVER_GRADIENTS = [
  {
    backgroundColor: '#6c5ce7',
    backgroundImage:
      'radial-gradient(circle at 18% 24%, rgba(255,255,255,0.18) 0 16%, transparent 17%), radial-gradient(circle at 48% 28%, rgba(255,255,255,0.12) 0 18%, transparent 19%), radial-gradient(circle at 72% 22%, rgba(255,255,255,0.14) 0 14%, transparent 15%), radial-gradient(circle at 30% 72%, rgba(255,255,255,0.12) 0 19%, transparent 20%), radial-gradient(circle at 68% 78%, rgba(255,255,255,0.12) 0 18%, transparent 19%), linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0))',
  },
  {
    backgroundColor: '#1d8cf2',
    backgroundImage:
      'radial-gradient(circle at 16% 18%, rgba(255,255,255,0.16) 0 16%, transparent 17%), radial-gradient(circle at 46% 18%, rgba(255,255,255,0.11) 0 18%, transparent 19%), radial-gradient(circle at 78% 16%, rgba(255,255,255,0.12) 0 14%, transparent 15%), radial-gradient(circle at 28% 66%, rgba(255,255,255,0.12) 0 18%, transparent 19%), radial-gradient(circle at 74% 70%, rgba(255,255,255,0.12) 0 18%, transparent 19%), linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0))',
  },
  {
    backgroundColor: '#20c997',
    backgroundImage:
      'linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.08) 75%, transparent 75%, transparent), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.06) 75%, transparent 75%, transparent)',
  },
];

function getCourseCoverGradient(index: number) {
  return COURSE_COVER_GRADIENTS[index % COURSE_COVER_GRADIENTS.length];
}

export function StudentCoursesPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const setHeaderActions = useSetStudentHeaderActions();
  const params = useParams<{
    courseId?: string;
    lessonId?: string;
    assignmentId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const legacyCourseId = searchParams.get('courseId');
  const legacyAssignmentId = searchParams.get('assignmentId');
  const activeCourseId = params.courseId ?? legacyCourseId ?? '';
  const activeLessonId = params.lessonId ?? '';
  const activeAssignmentId = params.assignmentId ?? legacyAssignmentId ?? '';

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCoursePanel, setActiveCoursePanel] = useState<CoursePanel>('lessons');
  const [submissionAssignment, setSubmissionAssignment] = useState<AssignmentItem | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [completionCourse, setCompletionCourse] = useState<StudentCourseItem | null>(null);

  const submissionForm = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: defaultSubmissionForm,
  });

  const myCoursesQuery = useQuery({
    queryKey: ['lms', 'student-courses', page, activeCourseId],
    queryFn: () =>
      listMyCoursesApi(auth.accessToken!, {
        page: activeCourseId ? 1 : page,
        pageSize: activeCourseId ? 50 : 10,
      }),
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: async (values: SubmissionFormValues) => {
      let asset;
      if (submissionFile) {
        asset = await uploadFileToCloudinary(auth.accessToken!, 'submission', submissionFile);
      }

      return submitAssignmentApi(auth.accessToken!, submissionAssignment!.id, {
        textAnswer: values.textAnswer || undefined,
        linkUrl: values.linkUrl || undefined,
        asset,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
      setSubmissionAssignment(null);
      setSubmissionFile(null);
      submissionForm.reset(defaultSubmissionForm);
    },
    onError: (error) => {
      console.error('Submission error:', error);
    },
  });

  const allCourses = myCoursesQuery.data?.items ?? [];

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = allCourses;
    if (!q) {
      return items;
    }

    return items.filter((course) =>
      [
        course.title,
        course.classRoom.name,
        course.academicYear.name,
        course.subject?.name ?? '',
        course.subject?.code ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [allCourses, search]);

  const subjectGroups = useMemo<SubjectCourseGroup[]>(() => {
    const groups = new Map<string, SubjectCourseGroup>();

    for (const course of visibleCourses) {
      const key = getCourseSubjectKey(course);
      const current = groups.get(key);
      if (!current) {
        groups.set(key, {
          key,
          id: course.subject?.id ?? null,
          name: course.subject?.name ?? 'General Studies',
          code: course.subject?.code ?? 'GEN',
          courses: [course],
          totalLessons: course.lessons.length,
          totalAssignments: course.assignments.length,
        });
        continue;
      }

      current.courses.push(course);
      current.totalLessons += course.lessons.length;
      current.totalAssignments += course.assignments.length;
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        courses: [...group.courses].sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => {
        if (!a.id && b.id) {
          return 1;
        }
        if (a.id && !b.id) {
          return -1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [visibleCourses]);

  const filteredCourses = useMemo(() => {
    if (subjectFilter === 'ALL') {
      return visibleCourses;
    }

    if (subjectFilter === '__general_subject__') {
      return visibleCourses.filter((course) => !course.subject?.id);
    }

    return visibleCourses.filter((course) => course.subject?.id === subjectFilter);
  }, [subjectFilter, visibleCourses]);

  const selectedCourse = allCourses.find((course) => course.id === activeCourseId) ?? null;
  const selectedLesson =
    selectedCourse?.lessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  const selectedAssignment =
    selectedCourse?.assignments.find((assignment) => assignment.id === activeAssignmentId) ?? null;

  const sortedLessons = selectedCourse?.lessons.slice().sort((a, b) => a.sequence - b.sequence) ?? [];
  const currentLessonIndex = selectedLesson
    ? sortedLessons.findIndex((lesson) => lesson.id === selectedLesson.id)
    : -1;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < sortedLessons.length - 1
      ? sortedLessons[currentLessonIndex + 1]
      : null;
  const previousLesson =
    currentLessonIndex > 0 ? sortedLessons[currentLessonIndex - 1] : null;

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  const selectedCourseProgress = selectedCourse
    ? getCourseProgressMetrics(selectedCourse, completedLessonIds)
    : null;

  const isLessonCompleted = (lessonId: string) => completedLessonIds.includes(lessonId);

  const markLessonCompleted = (lessonId: string) => {
    setCompletedLessonIds((prev) => (prev.includes(lessonId) ? prev : [...prev, lessonId]));
  };

  // Hydrate completed lessons from backend when course data loads
  useEffect(() => {
    if (!selectedCourse) {
      return;
    }

    const courseData = allCourses.find((c) => c.id === selectedCourse.id);
    if (courseData?.completedLessonIds) {
      setCompletedLessonIds(courseData.completedLessonIds);
    }
  }, [selectedCourse?.id, allCourses]);

  const markLessonMutation = useMutation({
    mutationFn: (lessonId: string) => markLessonCompleteApi(auth.accessToken!, lessonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'student'] });
    },
  });

  const flushPendingLessonCompletes = useCallback(async () => {
    const token = auth.accessToken;
    if (!token) {
      return;
    }
    const ids = [...getPendingLessonIds()];
    if (!ids.length) {
      return;
    }
    for (const lid of ids) {
      try {
        await markLessonCompleteApi(token, lid);
        removePendingLessonComplete(lid);
      } catch {
        break;
      }
    }
    void queryClient.invalidateQueries({ queryKey: ['lms', 'student-courses'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'student'] });
  }, [auth.accessToken, queryClient]);

  useEffect(() => {
    const onOnline = () => void flushPendingLessonCompletes();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushPendingLessonCompletes]);

  useEffect(() => {
    if (!auth.accessToken) {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void flushPendingLessonCompletes();
    }
  }, [auth.accessToken, flushPendingLessonCompletes]);

  const handleCompleteAndGoNext = async (courseId: string, lessonId: string) => {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (offline) {
      addPendingLessonComplete(lessonId);
      showToast({
        type: 'info',
        title: 'Saved on this device',
        message: 'Lesson marked complete locally. It will sync to the server when you are back online.',
      });
    } else {
      try {
        await markLessonMutation.mutateAsync(lessonId);
        removePendingLessonComplete(lessonId);
      } catch (error) {
        console.error('Failed to mark lesson complete:', error);
        addPendingLessonComplete(lessonId);
        showToast({
          type: 'info',
          title: 'Queued for sync',
          message: 'We could not reach the server. This lesson will sync automatically when your connection is stable.',
        });
      }
    }

    markLessonCompleted(lessonId);

    const lessons = (selectedCourse?.lessons ?? []).slice().sort((a, b) => a.sequence - b.sequence);
    const index = lessons.findIndex((lesson) => lesson.id === lessonId);
    if (index === -1) {
      return;
    }

    const nextLesson = lessons[index + 1];
    if (nextLesson) {
      handleSelectLesson(courseId, nextLesson.id);
    } else {
      const updatedCompletedIds = completedLessonIds.includes(lessonId)
        ? completedLessonIds
        : [...completedLessonIds, lessonId];
      maybeShowCourseCompletion(courseId, updatedCompletedIds);
      navigate(`/student/courses/${courseId}`);
    }
  };

  const maybeShowCourseCompletion = useCallback(
    (courseId: string, updatedCompletedIds: string[]) => {
      const c = allCourses.find((x) => x.id === courseId);
      if (!c) {
        return;
      }
      const m = getCourseProgressMetrics(c, updatedCompletedIds);
      if (m.overallProgress >= 100) {
        setCompletionCourse(c);
      }
    },
    [allCourses],
  );

  const handleMarkLessonCompleteOnly = async (courseId: string, lessonId: string) => {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const mergedIds = completedLessonIds.includes(lessonId)
      ? completedLessonIds
      : [...completedLessonIds, lessonId];

    if (offline) {
      addPendingLessonComplete(lessonId);
      markLessonCompleted(lessonId);
      maybeShowCourseCompletion(courseId, mergedIds);
      showToast({
        type: 'info',
        title: 'Saved on this device',
        message: 'Lesson marked complete locally. It will sync when you are back online.',
      });
      return;
    }

    try {
      await markLessonMutation.mutateAsync(lessonId);
      removePendingLessonComplete(lessonId);
    } catch {
      addPendingLessonComplete(lessonId);
      showToast({
        type: 'info',
        title: 'Queued for sync',
        message: 'We could not reach the server. This lesson will sync when your connection is stable.',
      });
    }
    markLessonCompleted(lessonId);
    maybeShowCourseCompletion(courseId, mergedIds);
  };

  function handleGoNextLesson(courseId: string, lessonId: string) {
    const lessons = (selectedCourse?.lessons ?? []).slice().sort((a, b) => a.sequence - b.sequence);
    const index = lessons.findIndex((lesson) => lesson.id === lessonId);
    const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
    if (next) {
      navigate(`/student/courses/${courseId}/lessons/${next.id}`);
      return;
    }
    navigate(`/student/courses/${courseId}`);
  }

  useEffect(() => {
    if (!legacyCourseId) {
      return;
    }

    if (legacyAssignmentId) {
      navigate(`/student/courses/${legacyCourseId}/tests/${legacyAssignmentId}`, { replace: true });
      return;
    }

    navigate(`/student/courses/${legacyCourseId}`, { replace: true });
  }, [legacyAssignmentId, legacyCourseId, navigate]);

  useEffect(() => {
    if (activeAssignmentId) {
      setActiveCoursePanel('tests');
      return;
    }

    setActiveCoursePanel('lessons');
  }, [activeAssignmentId, activeCourseId, activeLessonId]);

  function handleSelectCourse(courseId: string) {
    navigate(`/student/courses/${courseId}`);
  }

  function handleSelectLesson(courseId: string, lessonId: string) {
    navigate(`/student/courses/${courseId}/lessons/${lessonId}`);
  }

  function handleSelectAssignment(courseId: string, assignmentId: string, lessonId?: string) {
    void lessonId;
    setActiveCoursePanel('tests');
    navigate(`/student/courses/${courseId}/tests/${assignmentId}`);
  }

  function handleGoPrevious(courseId: string, lessonId: string) {
    const lessons = selectedCourse?.lessons.slice().sort((a, b) => a.sequence - b.sequence) ?? [];
    const index = lessons.findIndex((lesson) => lesson.id === lessonId);
    const prevLesson = index > 0 ? lessons[index - 1] : null;

    if (prevLesson) {
      navigate(`/student/courses/${courseId}/lessons/${prevLesson.id}`);
    }
  }

  function openSubmission(assignment: AssignmentItem) {
    submissionForm.reset({
      textAnswer: assignment.mySubmission?.textAnswer ?? '',
      linkUrl: assignment.mySubmission?.linkUrl ?? '',
    });
    setSubmissionFile(null);
    setSubmissionAssignment(assignment);
  }

  useEffect(() => {
    if (!setHeaderActions) {
      return;
    }
    if (!activeCourseId || !selectedCourse) {
      setHeaderActions(null);
      return;
    }

    const assignmentStatus = selectedAssignment ? getAssignmentStatus(selectedAssignment) : null;

    setHeaderActions(
      <>
        {selectedAssignment && assignmentStatus ? (
          <StatusPill label={assignmentStatus.label} tone={assignmentStatus.tone} />
        ) : selectedLesson ? (
          <StatusPill label="Published" tone="published" />
        ) : selectedCourse.subject ? (
          <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {selectedCourse.subject.name}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className={STUDENT_HEADER_ACTION_BTN}
        >
          {sidebarCollapsed ? 'Show curriculum' : 'Hide curriculum'}
        </button>
        <button type="button" onClick={() => navigate('/student/courses')} className={STUDENT_HEADER_ACTION_BTN}>
          Back to courses
        </button>
        {selectedLesson || selectedAssignment ? (
          <button
            type="button"
            onClick={() => navigate(`/student/courses/${selectedCourse.id}`)}
            className={STUDENT_HEADER_ACTION_BTN}
          >
            Back to overview
          </button>
        ) : null}
      </>,
    );

    return () => setHeaderActions(null);
  }, [
    setHeaderActions,
    activeCourseId,
    selectedCourse,
    selectedLesson,
    selectedAssignment,
    sidebarCollapsed,
    navigate,
  ]);

  return (
    <div className="grid gap-5">
      {!activeCourseId ? (
        <SectionCard
          title="My learning"
          subtitle=""
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search subject, course, or class"
                className="h-11 w-full rounded-2xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
                aria-label="Search my courses"
              />
            </div>
            <select
              value={subjectFilter}
              onChange={(event) => {
                setSubjectFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-2xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-brand-400"
              aria-label="Filter courses by subject"
            >
              <option value="ALL">All subjects</option>
              {subjectGroups.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </SectionCard>
      ) : null}

      {myCoursesQuery.isPending ? (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="h-[680px] animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
          <div className="h-[680px] animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
        </div>
      ) : null}

      {myCoursesQuery.isError ? (
        <StateView
          title="Could not load courses"
          message="Retry to load your class lessons and tests."
          action={
            <button
              type="button"
              onClick={() => void myCoursesQuery.refetch()}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!myCoursesQuery.isPending && !myCoursesQuery.isError ? (
        !activeCourseId ? (
          visibleCourses.length ? (
            <SubjectCourseGallery
              courses={filteredCourses}
              onSelectCourse={(courseId) => handleSelectCourse(courseId)}
              completedLessonIds={completedLessonIds}
            />
          ) : (
            <div className="flex min-h-[60vh] items-center justify-center">
              <EmptyState
                title="No courses available"
                message="Your active enrollment does not have any published course content yet."
              />
            </div>
          )
        ) : selectedCourse ? (
          <section className="-mx-5 w-[calc(100%+2.5rem)] min-w-0 max-w-none bg-transparent md:-mx-6 md:w-[calc(100%+3rem)]">
            <div className="flex min-h-[480px] flex-col">
              <div className="border-b border-slate-200/60 bg-transparent px-5 py-3 md:px-6 md:py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{selectedCourse.classRoom.name}</span>
                  <span className="text-brand-300">/</span>
                  <span>{selectedCourse.academicYear.name}</span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden px-0 sm:px-0">
                <div className={clsx(
                  "grid h-[calc(100vh-180px)] min-h-[520px] gap-0 transition-all duration-300",
                  sidebarCollapsed ? "grid-cols-1" : "lg:grid-cols-[380px_1fr]"
                )}>
                  {/* Collapsible/Minimal Sidebar */}
                  {!sidebarCollapsed && (
                    <aside className="relative flex min-h-0 flex-col border-r border-slate-200/50 bg-content-bg transition-all duration-300">
                    <div
                      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 md:px-6 md:py-6"
                      data-student-scroll-root
                    >
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">{selectedCourse.title}</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {selectedCourse.teacher.firstName} {selectedCourse.teacher.lastName}
                        </p>
                        <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50/90 p-2.5">
                          <ProgressRing
                            percentage={selectedCourseProgress?.overallProgress ?? 0}
                            size={52}
                            strokeWidth={5}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {selectedCourseProgress?.overallProgress ?? 0}% complete
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {selectedCourseProgress?.completedLessons ?? 0}/{selectedCourseProgress?.totalLessons ?? 0}{' '}
                              lessons · {selectedCourseProgress?.completedAssignments ?? 0}/
                              {selectedCourseProgress?.totalAssignments ?? 0} tests
                            </p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                                style={{ width: `${selectedCourseProgress?.overallProgress ?? 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    <div className="mt-4 space-y-1">
                      <p className="text-xs font-medium text-slate-500">Curriculum</p>
                      {sortedLessons.map((lesson, index) => {
                        const isCompleted = isLessonCompleted(lesson.id);
                        const previousLesson = index > 0 ? sortedLessons[index - 1] : null;
                        const isLocked =
                          index > 0 && Boolean(previousLesson && !isLessonCompleted(previousLesson.id));

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            disabled={isLocked}
                            onClick={() => !isLocked && handleSelectLesson(selectedCourse.id, lesson.id)}
                            className={`group relative flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                              activeLessonId === lesson.id && activeCoursePanel === 'lessons'
                                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                                : isLocked
                                  ? 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                                  : 'bg-transparent text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="mt-0.5 flex-shrink-0">
                              {isLocked ? (
                                <Lock className="h-4 w-4" />
                              ) : activeLessonId === lesson.id ? (
                                <Play className="h-4 w-4" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-slate-300" />
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`truncate font-medium ${
                                activeLessonId === lesson.id ? 'text-white' : 'text-slate-900'
                              }`}>
                                {lesson.title}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span
                                  className={`text-xs ${
                                    activeLessonId === lesson.id ? 'text-brand-100/90' : 'text-slate-400'
                                  }`}
                                >
                                  Lesson {lesson.sequence}
                                </span>
                                {isLocked && (
                                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                    Locked
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-xs font-medium text-slate-500">Assessments</p>
                      <div className="mt-3 space-y-1.5">
                        {selectedCourse.assignments.map((assignment) => {
                          const isCompleted = Boolean(assignment.mySubmission);
                          const isSelected = activeAssignmentId === assignment.id;
                          return (
                            <button
                              key={assignment.id}
                              type="button"
                              onClick={() => handleSelectAssignment(selectedCourse.id, assignment.id)}
                              className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                                isSelected
                                  ? 'bg-slate-900 text-white shadow-lg'
                                  : 'bg-transparent text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="mt-0.5 flex-shrink-0">
                                {isCompleted ? (
                                  <CheckCircle2 className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                                ) : (
                                  <Circle className="h-4 w-4 text-slate-300" />
                                )}{' '}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`truncate font-medium ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                  {assignment.title}
                                </p>
                                <p className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                  {isCompleted ? 'Completed' : 'Pending'}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    </div>
                  </aside>
                  )}

                  <main
                    className="relative flex min-h-0 flex-col overflow-y-auto bg-content-bg lg:h-[calc(100vh-180px)]"
                    data-student-scroll-root
                  >
                    <div className="w-full max-w-none px-5 py-5 md:px-6 md:py-6">
                      {selectedAssignment ? (
                        <AssignmentDetailCard
                          assignment={selectedAssignment}
                          onOpenSubmission={openSubmission}
                        />
                      ) : selectedLesson ? (
                        <LessonDetailCard
                          lesson={selectedLesson}
                          onMarkCompleteOnly={() =>
                            handleMarkLessonCompleteOnly(selectedCourse.id, selectedLesson.id)
                          }
                          onMarkCompleteAndContinue={() =>
                            handleCompleteAndGoNext(selectedCourse.id, selectedLesson.id)
                          }
                          onGoPrevious={() => handleGoPrevious(selectedCourse.id, selectedLesson.id)}
                          onGoNext={() => handleGoNextLesson(selectedCourse.id, selectedLesson.id)}
                          nextLesson={nextLesson}
                          previousLesson={previousLesson}
                          isCompleted={isLessonCompleted(selectedLesson.id)}
                        />
                      ) : (
                        <CourseOverviewPanel
                          course={selectedCourse}
                          completedLessonIds={completedLessonIds}
                          onResume={() => {
                            const id = getResumeLessonId(selectedCourse, completedLessonIds);
                            if (id) {
                              handleSelectLesson(selectedCourse.id, id);
                            }
                          }}
                          onStartBeginning={() => {
                            const first = sortedLessons[0];
                            if (first) {
                              handleSelectLesson(selectedCourse.id, first.id);
                            }
                          }}
                          onOpenLesson={(lessonId) => handleSelectLesson(selectedCourse.id, lessonId)}
                          onOpenTests={() => {
                            setActiveCoursePanel('tests');
                            const next =
                              selectedCourse.assignments.find((a) => !a.mySubmission) ??
                              selectedCourse.assignments[0];
                            if (next) {
                              handleSelectAssignment(selectedCourse.id, next.id);
                            }
                          }}
                        />
                      )}
                    </div>
                  </main>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <StateView
            title="Course not found"
            message="The selected course or lesson could not be loaded."
            action={
              <button
                type="button"
                onClick={() => navigate('/student/courses')}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Back to courses
              </button>
            }
          />
        )
      ) : null}

      {myCoursesQuery.data?.pagination.totalPages && myCoursesQuery.data.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl border border-brand-100 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-soft">
          <span>
            Page {myCoursesQuery.data.pagination.page} of {myCoursesQuery.data.pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-brand-200 px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= myCoursesQuery.data.pagination.totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(myCoursesQuery.data!.pagination.totalPages, current + 1),
                )
              }
              className="rounded-xl border border-brand-200 px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(submissionAssignment)}
        title={submissionAssignment ? `Submit · ${submissionAssignment.title}` : 'Submit assignment'}
        description=""
        onClose={() => {
          setSubmissionAssignment(null);
          setSubmissionFile(null);
          submissionForm.reset(defaultSubmissionForm);
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={submissionForm.handleSubmit((values) => submitAssignmentMutation.mutate(values))}
        >
          <FormField
            label="Text answer"
            error={submissionForm.formState.errors.textAnswer?.message}
          >
            <textarea
              {...submissionForm.register('textAnswer')}
              rows={6}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </FormField>
          <FormField label="Link" error={submissionForm.formState.errors.linkUrl?.message}>
            <input
              {...submissionForm.register('linkUrl')}
              placeholder="https://..."
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </FormField>
          <FormField label="Attachment">
            <input
              type="file"
              onChange={(event) => setSubmissionFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-dashed border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-slate-700"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSubmissionAssignment(null);
                setSubmissionFile(null);
                submissionForm.reset(defaultSubmissionForm);
              }}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitAssignmentMutation.isPending}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitAssignmentMutation.isPending ? 'Submitting...' : 'Save submission'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(completionCourse)}
        title="🎉 Course Completed!"
        description=""
        onClose={() => setCompletionCourse(null)}
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Congratulations! You've completed {completionCourse?.title}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            You've successfully finished all lessons and assignments in this course.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCompletionCourse(null);
                if (completionCourse) {
                  navigate(`/student/courses/${completionCourse.id}`);
                }
              }}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Review Course
            </button>
            <button
              type="button"
              onClick={() => {
                setCompletionCourse(null);
                navigate('/student/courses');
              }}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Courses
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ReaderBlock({
  eyebrow,
  title,
  subtitle,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-4 transition-all duration-500">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {eyebrow && (
            <span className="text-xs font-medium text-brand-600">{eyebrow}</span>
          )}
          {action}
        </div>
        <div className="space-y-1.5">
          <h1 className="text-balance text-2xl font-semibold leading-snug tracking-tight text-slate-900 lg:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{subtitle}</p>
          )}
        </div>
      </header>
      <div className="lms-reader-content rich-content">{children}</div>
    </div>
  );
}

function SubjectCourseGallery({
  courses,
  onSelectCourse,
  completedLessonIds,
}: {
  courses: StudentCourseItem[];
  onSelectCourse: (courseId: string) => void;
  completedLessonIds: string[];
}) {
  if (!courses.length) {
    return (
      <EmptyState
        title="No courses found"
        message="Try a different subject filter or search term."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course, courseIndex) => {
        const cover = getCourseCoverGradient(courseIndex);
        const courseLabel = `${course.subject?.name ?? 'General Studies'} / ${course.classRoom.name}`;
        const progress = getCourseProgressMetrics(course, course.completedLessonIds ?? []);

        return (
          <button
            key={course.id}
            type="button"
            onClick={() => onSelectCourse(course.id)}
            className="overflow-hidden rounded-2xl border border-brand-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
          >
            <div
              className="relative h-40 bg-[length:140px_140px]"
              style={cover}
            >
              <span className="absolute left-3 top-3 rounded-lg bg-[#184f8f] px-3 py-1 text-xs font-medium text-white shadow-sm">
                {courseLabel}
              </span>
              <span className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-xl bg-white text-[#184f8f] shadow-md">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="space-y-3 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-medium text-slate-800">{course.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{course.academicYear.name}</span>
                    <span>·</span>
                    <span>{course.lessons.length} lessons</span>
                    {progress.overallProgress >= 100 ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                        Done
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressRing
                    percentage={progress.overallProgress}
                    size={44}
                    strokeWidth={5}
                    className="flex-shrink-0"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    {progress.overallProgress}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {course.teacher.firstName} {course.teacher.lastName}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectCourse(course.id);
                  }}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  {progress.overallProgress >= 100 ? 'Review' : progress.overallProgress > 0 ? 'Resume' : 'Open'}
                </button>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function LessonDetailCard({
  lesson,
  onMarkCompleteOnly,
  onMarkCompleteAndContinue,
  onGoPrevious,
  onGoNext,
  nextLesson,
  previousLesson,
  isCompleted,
}: {
  lesson: LessonItem;
  onMarkCompleteOnly: () => void;
  onMarkCompleteAndContinue: () => void;
  onGoPrevious: () => void;
  onGoNext: () => void;
  nextLesson: LessonItem | null;
  previousLesson: LessonItem | null;
  isCompleted: boolean;
}) {
  const showInlineMedia = lessonHasInlineMedia(lesson);
  const canGoNext = isCompleted;

  return (
    <div className="min-w-0 space-y-4">
        <div className="bg-transparent py-0">
          <ReaderBlock
            eyebrow={`Lesson ${lesson.sequence} · ${lesson.contentType}`}
            title={lesson.title}
            subtitle={lesson.summary ?? 'Study the material below, then mark this lesson complete.'}
            action={
              isCompleted ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  <Play className="h-3 w-3" aria-hidden /> In progress
                </span>
              )
            }
          >
            <div className="mt-3">
              <LessonMediaEmbed lesson={lesson} />
            </div>

            {lesson.body ? (
              <RichContent html={lesson.body} className="lms-reader-content mt-4" />
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {lesson.externalUrl && !showInlineMedia ? (
                <AttachmentLink label="Open Lesson Source" url={lesson.externalUrl} />
              ) : null}
              {lesson.fileAsset ? (
                <AttachmentLink
                  label={`Resource: ${lesson.fileAsset.originalName}`}
                  url={lesson.fileAsset.secureUrl}
                />
              ) : null}
            </div>
          </ReaderBlock>
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/40 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {previousLesson ? (
              <button
                type="button"
                onClick={onGoPrevious}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Previous
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {!isCompleted ? (
              <button
                type="button"
                onClick={onMarkCompleteOnly}
                className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-800 transition hover:bg-brand-50"
              >
                Mark complete
              </button>
            ) : null}
            <button
              type="button"
              onClick={onGoNext}
              disabled={!canGoNext}
              title={!canGoNext ? 'Mark this lesson complete to continue' : undefined}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {nextLesson ? 'Next lesson' : 'Back to course'}
            </button>
            {!isCompleted ? (
              <button
                type="button"
                onClick={onMarkCompleteAndContinue}
                className="rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {nextLesson ? 'Mark complete & next' : 'Mark complete & finish'}
              </button>
            ) : null}
          </div>
        </footer>
    </div>
  );
}

function AssignmentDetailCard({
  assignment,
  onOpenSubmission,
}: {
  assignment: AssignmentItem;
  onOpenSubmission: (assignment: AssignmentItem) => void;
}) {
  const status = getAssignmentStatus(assignment);

  return (
    <div className="space-y-5">
      <ReaderBlock
        eyebrow="Test requirements"
        title={assignment.title}
        subtitle={`Due ${formatDateTime(assignment.dueAt)} · ${assignment.maxPoints} points`}
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              status.tone === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
            }`}
          >
            {status.label}
          </span>
        }
      >
        <div className="bg-slate-50/80 py-3 sm:py-4">
          <RichContent html={assignment.instructions} className="lms-reader-content" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {assignment.attachmentAsset && (
            <AttachmentLink
              label={`Test Attachment: ${assignment.attachmentAsset.originalName}`}
              url={assignment.attachmentAsset.secureUrl}
            />
          )}
          {assignment.lesson && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-600">
              <BookOpen className="h-4 w-4 text-brand-500" />
              Related Lesson: {assignment.lesson.title}
            </div>
          )}
        </div>
      </ReaderBlock>

      <div className="border-t border-slate-100 bg-transparent pt-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your submission</h2>
            <p className="text-sm text-slate-500">
              {assignment.mySubmission
                ? `Successfully submitted on ${formatDateTime(assignment.mySubmission.submittedAt)}`
                : 'Turn in your work before the deadline'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenSubmission(assignment)}
            disabled={assignment.mySubmission?.status === 'GRADED'}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {assignment.mySubmission ? 'Edit submission' : 'Submit work'}
          </button>
        </div>

        {assignment.mySubmission ? (
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-50 p-4 text-slate-700">
              {assignment.mySubmission.textAnswer && (
                <p className="whitespace-pre-wrap leading-relaxed">{assignment.mySubmission.textAnswer}</p>
              )}
              {assignment.mySubmission.linkUrl && (
                <div className="mt-6">
                  <AttachmentLink label="View Submitted Link" url={assignment.mySubmission.linkUrl} />
                </div>
              )}
              {assignment.mySubmission.fileAsset && (
                <div className="mt-4">
                  <AttachmentLink
                    label={`Attached: ${assignment.mySubmission.fileAsset.originalName}`}
                    url={assignment.mySubmission.fileAsset.secureUrl}
                  />
                </div>
              )}
            </div>

            {assignment.mySubmission.gradePoints !== null && (
              <div className="rounded-lg bg-brand-50/50 p-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
                    <span className="text-lg font-semibold">{assignment.mySubmission.gradePoints}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-brand-700">Grade</p>
                    <p className="text-sm font-medium text-slate-900">Out of {assignment.maxPoints} points</p>
                  </div>
                </div>
                {assignment.mySubmission.feedback && (
                  <div className="mt-4 border-t border-brand-100 pt-4">
                    <p className="mb-1 text-xs font-medium text-slate-500">Teacher feedback</p>
                    <p className="text-sm italic text-slate-700">"{assignment.mySubmission.feedback}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-slate-50/50 py-8 text-center">
            <ClipboardCheck className="mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">No work submitted yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
