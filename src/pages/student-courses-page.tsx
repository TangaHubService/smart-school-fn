import clsx from 'clsx';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Lock } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
} from '../features/sprint4/lms.api';

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

function getLessonAssignments(course: StudentCourseItem, lessonId: string) {
  return course.assignments.filter((assignment) => assignment.lesson?.id === lessonId);
}

function getGeneralAssignments(course: StudentCourseItem) {
  return course.assignments.filter((assignment) => !assignment.lesson?.id);
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
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
  const [activeCoursePanel, setActiveCoursePanel] = useState<CoursePanel>('lessons');
  const [submissionAssignment, setSubmissionAssignment] = useState<AssignmentItem | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

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
      showToast({
        type: 'success',
        title: 'Submission saved',
        message: 'Your assignment work has been sent to the teacher.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not save submission',
        message: error instanceof Error ? error.message : 'Request failed',
      });
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
    navigate(`/student/courses/${courseId}/tests/${assignmentId}`);
  }

  function openSubmission(assignment: AssignmentItem) {
    submissionForm.reset({
      textAnswer: assignment.mySubmission?.textAnswer ?? '',
      linkUrl: assignment.mySubmission?.linkUrl ?? '',
    });
    setSubmissionFile(null);
    setSubmissionAssignment(assignment);
  }

  const readerHeader = selectedAssignment
    ? {
        title: selectedAssignment.title,
        subtitle: `Test · Due ${formatDateTime(selectedAssignment.dueAt)} · ${selectedAssignment.maxPoints} pts`,
        badge: <StatusPill label={getAssignmentStatus(selectedAssignment).label} tone={getAssignmentStatus(selectedAssignment).tone} />,
      }
    : selectedLesson
      ? {
          title: selectedLesson.title,
          subtitle: `Lesson ${selectedLesson.sequence} · ${selectedLesson.contentType}`,
          badge: <StatusPill label="Published" tone="published" />,
        }
      : selectedCourse
        ? {
            title: selectedCourse.title,
            subtitle: `${selectedCourse.classRoom.name} · ${selectedCourse.academicYear.name}`,
            badge: selectedCourse.subject ? (
              <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {selectedCourse.subject.name}
              </span>
            ) : null,
          }
        : {
            title: 'Choose a course',
            subtitle: 'Open a subject card, choose a course, then select a lesson.',
            badge: null,
          };

  return (
    <div className="grid gap-5">
      {!activeCourseId ? (
        <SectionCard
          title="My learning"
          subtitle="Browse your available courses and open the content you need."
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
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
            <div className="inline-flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-slate-800">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-white shadow-soft">
                {`${myCoursesQuery.data?.student.firstName?.[0] ?? 'S'}${myCoursesQuery.data?.student.lastName?.[0] ?? ''}`}
              </span>
              <span>
                {myCoursesQuery.data?.student.firstName ?? 'Student'} ·{' '}
                {myCoursesQuery.data?.student.studentCode ?? 'No code'}
              </span>
            </div>
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
            />
          ) : (
            <EmptyState
              title="No courses available"
              message="Your active enrollment does not have any published course content yet."
            />
          )
        ) : selectedCourse ? (
          <section className="rounded-2xl border border-brand-100 bg-white shadow-soft">
            <div className="flex min-h-[560px] flex-col">
              <div className="border-b border-brand-100 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      <span>{selectedCourse.classRoom.name}</span>
                      <span className="text-brand-300">/</span>
                      <span>{selectedCourse.academicYear.name}</span>
                    </div>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      {readerHeader.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{readerHeader.subtitle}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {readerHeader.badge}
                    <button
                      type="button"
                      onClick={() => navigate('/student/courses')}
                      className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300"
                    >
                      Back to courses
                    </button>
                    {selectedLesson || selectedAssignment ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/student/courses/${selectedCourse.id}`)}
                        className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300"
                      >
                        Back to lessons
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {selectedAssignment ? (
                  <AssignmentDetailCard
                    assignment={selectedAssignment}
                    onOpenSubmission={openSubmission}
                  />
                ) : selectedLesson ? (
                  <LessonDetailCard
                    lesson={selectedLesson}
                    assignments={getLessonAssignments(selectedCourse, selectedLesson.id)}
                    onSelectAssignment={(assignmentId) =>
                      handleSelectAssignment(selectedCourse.id, assignmentId, selectedLesson.id)
                    }
                  />
                ) : (
                  <CourseContentSwitcher
                    course={selectedCourse}
                    activePanel={activeCoursePanel}
                    selectedLessonId={activeLessonId}
                    selectedAssignmentId={activeAssignmentId}
                    onSelectPanel={(panel) => setActiveCoursePanel(panel)}
                    onSelectLesson={(lessonId) => handleSelectLesson(selectedCourse.id, lessonId)}
                    onSelectAssignment={(assignmentId) =>
                      handleSelectAssignment(selectedCourse.id, assignmentId)
                    }
                  />
                )}
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
        description="Add text, a link, or a file. You can update it until the teacher grades it."
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
    </div>
  );
}

function ReaderBlock({
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

function SubjectCourseGallery({
  courses,
  onSelectCourse,
}: {
  courses: StudentCourseItem[];
  onSelectCourse: (courseId: string) => void;
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
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course, courseIndex) => {
        const cover = getCourseCoverGradient(courseIndex);
        const courseLabel = `${course.subject?.name ?? 'General Studies'} / ${course.classRoom.name}`;

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
                <Lock className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="space-y-2 px-4 py-3">
              <p className="text-lg font-medium text-slate-800">{course.title}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {course.academicYear.name} · {course.lessons.length} lessons
                </span>
                <span>
                  {course.teacher.firstName} {course.teacher.lastName}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CourseContentSwitcher({
  course,
  activePanel,
  selectedLessonId,
  selectedAssignmentId,
  onSelectPanel,
  onSelectLesson,
  onSelectAssignment,
}: {
  course: StudentCourseItem;
  activePanel: CoursePanel;
  selectedLessonId: string;
  selectedAssignmentId: string;
  onSelectPanel: (panel: CoursePanel) => void;
  onSelectLesson: (lessonId: string) => void;
  onSelectAssignment: (assignmentId: string) => void;
}) {
  const generalAssignments = getGeneralAssignments(course);

  return (
    <section className="mb-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Course content
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Switch between lessons and tests, then open any card to read the details.
          </p>
        </div>
        <div className="inline-flex rounded-2xl border border-brand-200 bg-white p-1">
          <button
            type="button"
            onClick={() => onSelectPanel('lessons')}
            className={clsx(
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              activePanel === 'lessons'
                ? 'bg-brand-500 text-white'
                : 'text-slate-700 hover:bg-brand-50',
            )}
          >
            Lessons
          </button>
          <button
            type="button"
            onClick={() => onSelectPanel('tests')}
            className={clsx(
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              activePanel === 'tests'
                ? 'bg-brand-500 text-white'
                : 'text-slate-700 hover:bg-brand-50',
            )}
          >
            Tests
          </button>
        </div>
      </div>

      {activePanel === 'lessons' ? (
        course.lessons.length ? (
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {course.lessons.map((lesson, lessonIndex) => {
              const assignmentCount = getLessonAssignments(course, lesson.id).length;
              const cover = getCourseCoverGradient(lessonIndex);
              const isSelected = selectedLessonId === lesson.id;

              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onSelectLesson(lesson.id)}
                  className={clsx(
                    'overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg',
                    isSelected ? 'border-brand-300 ring-2 ring-brand-200' : 'border-brand-100',
                  )}
                >
                  <div className="relative h-40 bg-[length:140px_140px]" style={cover}>
                    <span className="absolute left-3 top-3 rounded-lg bg-[#184f8f] px-3 py-1 text-xs font-medium text-white shadow-sm">
                      Lesson {lesson.sequence} / {lesson.contentType}
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-md">
                      {assignmentCount} test{assignmentCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    <p className="text-lg font-medium text-slate-800">{lesson.title}</p>
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {lesson.summary ?? 'Open this lesson to read the content.'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState message="No published lessons in this course yet." />
          </div>
        )
      ) : generalAssignments.length ? (
        <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {generalAssignments.map((assignment, assignmentIndex) => {
            const cover = getCourseCoverGradient(assignmentIndex);
            const status = getAssignmentStatus(assignment);
            const isSelected = selectedAssignmentId === assignment.id;

            return (
              <button
                key={assignment.id}
                type="button"
                onClick={() => onSelectAssignment(assignment.id)}
                className={clsx(
                  'overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg',
                  isSelected ? 'border-brand-300 ring-2 ring-brand-200' : 'border-brand-100',
                )}
              >
                <div className="relative h-40 bg-[length:140px_140px]" style={cover}>
                  <span className="absolute left-3 top-3 rounded-lg bg-[#184f8f] px-3 py-1 text-xs font-medium text-white shadow-sm">
                    Test / {status.label}
                  </span>
                  <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-md">
                    {assignment.maxPoints} pts
                  </span>
                </div>
                <div className="space-y-2 px-4 py-3">
                  <p className="text-lg font-medium text-slate-800">{assignment.title}</p>
                  <p className="line-clamp-2 text-sm text-slate-600">
                    Due {formatDateTime(assignment.dueAt)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState message="No general tests are available for this course yet." />
        </div>
      )}
    </section>
  );
}

function LessonDetailCard({
  lesson,
  assignments,
  onSelectAssignment,
}: {
  lesson: LessonItem;
  assignments: AssignmentItem[];
  onSelectAssignment: (assignmentId: string) => void;
}) {
  const showInlineMedia = lessonHasInlineMedia(lesson);

  return (
    <div className="grid gap-4">
      <ReaderBlock
        eyebrow="Lesson"
        title={lesson.title}
        subtitle={lesson.summary ?? `Lesson ${lesson.sequence} · ${lesson.contentType}`}
        action={<StatusPill label="Published" tone="published" />}
      >
        {lesson.body ? (
          <RichContent
            html={lesson.body}
            className="rich-content rounded-2xl bg-white p-5 text-[15px] leading-7 text-slate-700"
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-200 bg-white px-4 py-5 text-sm text-slate-600">
            This lesson uses links or files instead of text content.
          </div>
        )}

        <div className="mt-4">
          <LessonMediaEmbed lesson={lesson} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {lesson.externalUrl && !showInlineMedia ? (
            <AttachmentLink label="Open lesson link" url={lesson.externalUrl} />
          ) : null}
          {lesson.fileAsset ? (
            <AttachmentLink
              label={`Download ${lesson.fileAsset.originalName}`}
              url={lesson.fileAsset.secureUrl}
            />
          ) : null}
        </div>
      </ReaderBlock>
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
    <div className="grid gap-4">
      <ReaderBlock
        eyebrow="Test"
        title={assignment.title}
        subtitle={`Due ${formatDateTime(assignment.dueAt)} · ${assignment.maxPoints} pts`}
        action={<StatusPill label={status.label} tone={status.tone} />}
      >
        <RichContent
          html={assignment.instructions}
          className="rich-content rounded-2xl bg-white p-4 text-[15px] leading-7 text-slate-700"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {assignment.attachmentAsset ? (
            <AttachmentLink
              label={`Open ${assignment.attachmentAsset.originalName}`}
              url={assignment.attachmentAsset.secureUrl}
            />
          ) : null}
          {assignment.lesson ? (
            <span className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              Lesson: {assignment.lesson.title}
            </span>
          ) : null}
        </div>
      </ReaderBlock>

      <ReaderBlock
        eyebrow="My work"
        title={assignment.mySubmission ? 'Your current submission' : 'Submit your answer'}
        subtitle={
          assignment.mySubmission
            ? `Submitted ${formatDateTime(assignment.mySubmission.submittedAt)}`
            : 'Add text, a link, or a file before the due date.'
        }
        action={
          <button
            type="button"
            onClick={() => onOpenSubmission(assignment)}
            disabled={assignment.mySubmission?.status === 'GRADED'}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assignment.mySubmission ? 'Update submission' : 'Submit test'}
          </button>
        }
      >
        {assignment.mySubmission ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">
            {assignment.mySubmission.textAnswer ? (
              <p className="whitespace-pre-wrap">{assignment.mySubmission.textAnswer}</p>
            ) : null}
            {assignment.mySubmission.linkUrl ? (
              <div className="mt-3">
                <AttachmentLink label="Open submitted link" url={assignment.mySubmission.linkUrl} />
              </div>
            ) : null}
            {assignment.mySubmission.fileAsset ? (
              <div className="mt-3">
                <AttachmentLink
                  label={`Open ${assignment.mySubmission.fileAsset.originalName}`}
                  url={assignment.mySubmission.fileAsset.secureUrl}
                />
              </div>
            ) : null}
            {assignment.mySubmission.gradePoints !== null ? (
              <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
                <p className="font-semibold text-slate-900">
                  Grade: {assignment.mySubmission.gradePoints}/{assignment.maxPoints}
                </p>
                {assignment.mySubmission.feedback ? (
                  <p className="mt-2 text-slate-700">{assignment.mySubmission.feedback}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-200 bg-white px-4 py-5 text-sm text-slate-600">
            No submission yet. Open the test form and send your answer when ready.
          </div>
        )}
      </ReaderBlock>
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
