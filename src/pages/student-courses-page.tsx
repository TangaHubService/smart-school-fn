import clsx from 'clsx';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

const COURSE_TREE_ACCENTS = [
  {
    icon: 'border-amber-200 bg-amber-50 text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    rail: 'border-amber-200/80',
  },
  {
    icon: 'border-sky-200 bg-sky-50 text-sky-700',
    badge: 'bg-sky-100 text-sky-800',
    rail: 'border-sky-200/80',
  },
  {
    icon: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    rail: 'border-emerald-200/80',
  },
  {
    icon: 'border-rose-200 bg-rose-50 text-rose-700',
    badge: 'bg-rose-100 text-rose-800',
    rail: 'border-rose-200/80',
  },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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

function getCourseTreeAccent(index: number) {
  return COURSE_TREE_ACCENTS[index % COURSE_TREE_ACCENTS.length];
}

function getCourseSubjectKey(course: StudentCourseItem) {
  return course.subject?.id ?? '__general_subject__';
}

export function StudentCoursesPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [expandedSubjectKey, setExpandedSubjectKey] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [submissionAssignment, setSubmissionAssignment] = useState<AssignmentItem | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  const submissionForm = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: defaultSubmissionForm,
  });

  const myCoursesQuery = useQuery({
    queryKey: ['lms', 'student-courses', page],
    queryFn: () =>
      listMyCoursesApi(auth.accessToken!, {
        page,
        pageSize: 10,
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

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = myCoursesQuery.data?.items ?? [];
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
  }, [myCoursesQuery.data?.items, search]);

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

  const selectedCourse = visibleCourses.find((course) => course.id === selectedCourseId) ?? null;
  const selectedLesson =
    selectedCourse?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const selectedAssignment =
    selectedCourse?.assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null;

  useEffect(() => {
    if (selectedCourseId && !visibleCourses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId('');
      setExpandedSubjectKey('');
      setSelectedLessonId('');
      setSelectedAssignmentId('');
    }
  }, [selectedCourseId, visibleCourses]);

  useEffect(() => {
    if (!selectedCourse) {
      return;
    }

    const subjectKey = getCourseSubjectKey(selectedCourse);
    if (expandedSubjectKey !== subjectKey) {
      setExpandedSubjectKey(subjectKey);
    }
  }, [expandedSubjectKey, selectedCourse]);

  useEffect(() => {
    if (selectedCourseId) {
      return;
    }

    if (!subjectGroups.length) {
      setExpandedSubjectKey('');
      return;
    }

    if (!subjectGroups.some((group) => group.key === expandedSubjectKey)) {
      setExpandedSubjectKey(subjectGroups[0].key);
    }
  }, [expandedSubjectKey, selectedCourseId, subjectGroups]);

  useEffect(() => {
    if (
      selectedCourse &&
      selectedLessonId &&
      !selectedCourse.lessons.some((lesson) => lesson.id === selectedLessonId)
    ) {
      setSelectedLessonId('');
    }
  }, [selectedCourse, selectedLessonId]);

  useEffect(() => {
    if (
      selectedCourse &&
      selectedAssignmentId &&
      !selectedCourse.assignments.some((assignment) => assignment.id === selectedAssignmentId)
    ) {
      setSelectedAssignmentId('');
    }
  }, [selectedCourse, selectedAssignmentId]);

  function handleSelectCourse(courseId: string, subjectKey?: string) {
    setSelectedCourseId(courseId);
    if (subjectKey) {
      setExpandedSubjectKey(subjectKey);
    }
    setSelectedLessonId('');
    setSelectedAssignmentId('');
  }

  function handleSelectLesson(courseId: string, lessonId: string) {
    setSelectedCourseId(courseId);
    const course = visibleCourses.find((item) => item.id === courseId);
    if (course) {
      setExpandedSubjectKey(getCourseSubjectKey(course));
    }
    setSelectedLessonId(lessonId);
    setSelectedAssignmentId('');
  }

  function handleSelectAssignment(courseId: string, assignmentId: string, lessonId?: string) {
    setSelectedCourseId(courseId);
    const course = visibleCourses.find((item) => item.id === courseId);
    if (course) {
      setExpandedSubjectKey(getCourseSubjectKey(course));
    }
    setSelectedAssignmentId(assignmentId);

    if (lessonId) {
      setSelectedLessonId(lessonId);
      return;
    }

    setSelectedLessonId('');
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
      <SectionCard
        title="My learning"
        subtitle="Start with a subject, choose a course, then move through lessons with simple navigation."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject, course, or class"
              className="h-12 w-full rounded-2xl border border-brand-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
              aria-label="Search my courses"
            />
          </div>
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
        visibleCourses.length ? (
          !selectedCourse ? (
            <SubjectCourseGallery
              groups={subjectGroups}
              expandedSubjectKey={expandedSubjectKey}
              onToggleSubject={(subjectKey) =>
                setExpandedSubjectKey((current) => (current === subjectKey ? '' : subjectKey))
              }
              onSelectCourse={(courseId, subjectKey) =>
                handleSelectCourse(courseId, subjectKey)
              }
            />
          ) : (
            <section className="rounded-2xl border border-brand-100 bg-white shadow-soft">
              <div className="flex min-h-[680px] flex-col">
                <div className="border-b border-brand-100 px-5 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        <span>Learning workspace</span>
                        <span className="text-brand-300">/</span>
                        <span>{selectedCourse.classRoom.name}</span>
                        <span className="text-brand-300">/</span>
                        <span>{selectedCourse.academicYear.name}</span>
                      </div>
                      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                        {readerHeader.title}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">{readerHeader.subtitle}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {readerHeader.badge}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourseId('');
                          setSelectedLessonId('');
                          setSelectedAssignmentId('');
                        }}
                        className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300"
                      >
                        Back to courses
                      </button>
                      {selectedLesson || selectedAssignment ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLessonId('');
                            setSelectedAssignmentId('');
                          }}
                          className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300"
                        >
                          Back to lessons
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
                  {selectedCourse ? (
                    <CourseLearningNavigator
                      course={selectedCourse}
                      selectedLessonId={selectedLessonId}
                      selectedAssignmentId={selectedAssignmentId}
                      onOpenOverview={() => {
                        setSelectedLessonId('');
                        setSelectedAssignmentId('');
                      }}
                      onSelectLesson={(lessonId) =>
                        handleSelectLesson(selectedCourse.id, lessonId)
                      }
                      onSelectAssignment={(assignmentId) =>
                        handleSelectAssignment(selectedCourse.id, assignmentId)
                      }
                    />
                  ) : null}

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
                    <CourseOverviewCard
                      course={selectedCourse}
                      onSelectLesson={(lessonId) => handleSelectLesson(selectedCourse.id, lessonId)}
                      onSelectAssignment={(assignmentId) =>
                        handleSelectAssignment(selectedCourse.id, assignmentId)
                      }
                    />
                  )}
                </div>
              </div>
            </section>
          )
        ) : (
          <EmptyState
            title="No courses available"
            message="Your active enrollment does not have any published course content yet."
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
  groups,
  expandedSubjectKey,
  onToggleSubject,
  onSelectCourse,
}: {
  groups: SubjectCourseGroup[];
  expandedSubjectKey: string;
  onToggleSubject: (subjectKey: string) => void;
  onSelectCourse: (courseId: string, subjectKey: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {groups.map((group, subjectIndex) => {
        const accent = getCourseTreeAccent(subjectIndex);
        const isExpanded = expandedSubjectKey === group.key;

        return (
          <section
            key={group.key}
            className="rounded-2xl border border-brand-100 bg-white shadow-soft"
          >
            <button
              type="button"
              onClick={() => onToggleSubject(group.key)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              aria-expanded={isExpanded}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={clsx(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-2xl border',
                    accent.icon,
                  )}
                >
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-lg font-bold text-slate-900">{group.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {group.code}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {group.courses.length} courses
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {group.totalLessons} lessons
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
                )}
              </span>
            </button>

            {isExpanded ? (
              <div className="border-t border-brand-100 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.courses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => onSelectCourse(course.id, group.key)}
                      className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <p className="text-base font-bold text-slate-900">{course.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {course.classRoom.name} · {course.academicYear.name}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {course.lessons.length} lessons
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                          {course.assignments.length} tests
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function CourseLearningNavigator({
  course,
  selectedLessonId,
  selectedAssignmentId,
  onOpenOverview,
  onSelectLesson,
  onSelectAssignment,
}: {
  course: StudentCourseItem;
  selectedLessonId: string;
  selectedAssignmentId: string;
  onOpenOverview: () => void;
  onSelectLesson: (lessonId: string) => void;
  onSelectAssignment: (assignmentId: string) => void;
}) {
  const generalAssignments = getGeneralAssignments(course);
  const selectedLessonIndex = course.lessons.findIndex((lesson) => lesson.id === selectedLessonId);
  const previousLesson =
    selectedLessonIndex > 0 ? course.lessons[selectedLessonIndex - 1] : null;
  const nextLesson =
    selectedLessonIndex >= 0 && selectedLessonIndex < course.lessons.length - 1
      ? course.lessons[selectedLessonIndex + 1]
      : null;

  return (
    <section className="mb-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Study path
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Select a lesson in order, or jump to any topic.
          </p>
        </div>
        {selectedLessonId ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => previousLesson && onSelectLesson(previousLesson.id)}
              disabled={!previousLesson}
              className="rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Previous lesson
            </button>
            <button
              type="button"
              onClick={() => nextLesson && onSelectLesson(nextLesson.id)}
              disabled={!nextLesson}
              className="rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Next lesson
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenOverview}
          className={clsx(
            'rounded-xl border px-3 py-2 text-xs font-semibold transition',
            !selectedLessonId && !selectedAssignmentId
              ? 'border-brand-300 bg-white text-slate-900'
              : 'border-brand-200 bg-white/80 text-slate-700 hover:border-brand-300',
          )}
        >
          Course overview
        </button>
        {course.lessons.map((lesson) => {
          const isSelected = selectedLessonId === lesson.id;
          const assignmentCount = getLessonAssignments(course, lesson.id).length;
          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => onSelectLesson(lesson.id)}
              className={clsx(
                'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                isSelected
                  ? 'border-brand-300 bg-white text-slate-900'
                  : 'border-brand-200 bg-white/80 text-slate-700 hover:border-brand-300',
              )}
            >
              Lesson {lesson.sequence}
              {assignmentCount ? ` · ${assignmentCount} test${assignmentCount === 1 ? '' : 's'}` : ''}
            </button>
          );
        })}
      </div>

      {generalAssignments.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {generalAssignments.map((assignment) => {
            const isSelected = selectedAssignmentId === assignment.id;
            const status = getAssignmentStatus(assignment);
            return (
              <button
                key={assignment.id}
                type="button"
                onClick={() => onSelectAssignment(assignment.id)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                  isSelected
                    ? 'border-brand-300 bg-white text-slate-900'
                    : 'border-brand-200 bg-white/80 text-slate-700 hover:border-brand-300',
                )}
              >
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{assignment.title}</span>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700">
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function CourseOverviewCard({
  course,
  onSelectLesson,
  onSelectAssignment,
}: {
  course: StudentCourseItem;
  onSelectLesson: (lessonId: string) => void;
  onSelectAssignment: (assignmentId: string) => void;
}) {
  const generalAssignments = getGeneralAssignments(course);

  return (
    <div className="grid gap-4">
      <ReaderBlock
        eyebrow="Course overview"
        title={course.title}
        subtitle={course.description ?? 'Open a lesson from the list below to start learning.'}
        action={
          course.subject ? (
            <span className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {course.subject.name}
            </span>
          ) : null
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile label="Lessons" value={String(course.lessons.length)} />
          <MetricTile label="Tests" value={String(course.assignments.length)} />
          <MetricTile label="Teacher" value={`${course.teacher.firstName} ${course.teacher.lastName}`} />
        </div>
      </ReaderBlock>

      <ReaderBlock
        eyebrow="Course map"
        title="Lessons in this course"
        subtitle="Select a lesson to read the content and see tests linked to it."
      >
        {course.lessons.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {course.lessons.map((lesson) => {
              const lessonAssignments = getLessonAssignments(course, lesson.id);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onSelectLesson(lesson.id)}
                  className="rounded-2xl border border-brand-100 bg-white p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {lesson.sequence}. {lesson.title}
                      </p>
                      {lesson.summary ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{lesson.summary}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {lessonAssignments.length} tests
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No published lessons in this course yet." />
        )}
      </ReaderBlock>

      {generalAssignments.length ? (
        <ReaderBlock
          eyebrow="Course tests"
          title="General tests"
          subtitle="These tests are attached to the course directly, not to a single lesson."
        >
          <div className="grid gap-3">
            {generalAssignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              return (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => onSelectAssignment(assignment.id)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{assignment.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Due {formatDateTime(assignment.dueAt)}
                    </p>
                  </div>
                  <StatusPill label={status.label} tone={status.tone} />
                </button>
              );
            })}
          </div>
        </ReaderBlock>
      ) : null}
    </div>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {lesson.externalUrl ? <AttachmentLink label="Open lesson link" url={lesson.externalUrl} /> : null}
          {lesson.fileAsset ? (
            <AttachmentLink
              label={`Open ${lesson.fileAsset.originalName}`}
              url={lesson.fileAsset.secureUrl}
            />
          ) : null}
        </div>
      </ReaderBlock>

      <ReaderBlock
        eyebrow="Lesson tests"
        title="Tests linked to this lesson"
        subtitle="Open a test to read instructions and submit your answer."
      >
        {assignments.length ? (
          <div className="grid gap-3">
            {assignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              return (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => onSelectAssignment(assignment.id)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{assignment.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Due {formatDateTime(assignment.dueAt)} · {assignment.maxPoints} pts
                    </p>
                  </div>
                  <StatusPill label={status.label} tone={status.tone} />
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No tests are linked to this lesson yet." />
        )}
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
          className="rich-content rounded-2xl bg-white p-5 text-[15px] leading-7 text-slate-700"
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
          <div className="rounded-2xl bg-white p-5 text-sm text-slate-700 shadow-sm">
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

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
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
