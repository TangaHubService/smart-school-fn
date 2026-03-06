import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilePlus2,
  Plus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { RichContent } from '../components/rich-content';
import { RichTextEditor } from '../components/rich-text-editor';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
  listSubjectsApi,
} from '../features/sprint1/sprint1.api';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';
import {
  createCourseApi,
  createLessonApi,
  getCourseDetailApi,
  listCoursesApi,
  LessonContentType,
  publishLessonApi,
} from '../features/sprint4/lms.api';

interface AcademicYearOption {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface ClassRoomOption {
  id: string;
  code: string;
  name: string;
}

interface SubjectOption {
  id: string;
  code: string;
  name: string;
}

function htmlToPlainText(value: string | undefined) {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const courseFormSchema = z.object({
  title: z.string().trim().min(2, 'Course title is required').max(120),
  description: z.string().trim().max(2000).optional(),
  academicYearId: z.string().min(1, 'Academic year is required'),
  classRoomId: z.string().min(1, 'Class is required'),
  subjectId: z.string().optional(),
});

const lessonFormSchema = z
  .object({
    title: z.string().trim().min(2, 'Lesson title is required').max(120),
    summary: z.string().trim().max(500).optional(),
    contentType: z.enum(['TEXT', 'PDF', 'VIDEO', 'LINK']),
    body: z.string().max(40000).optional(),
    externalUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
    sequence: z.coerce.number().int().min(1, 'Sequence must be at least 1').optional(),
  })
  .superRefine((value, context) => {
    if (value.contentType === 'TEXT' && !htmlToPlainText(value.body)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body'],
        message: 'Text lessons require lesson content',
      });
    }

    if (value.contentType === 'LINK' && !value.externalUrl?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['externalUrl'],
        message: 'Link lessons require a valid URL',
      });
    }
  });

type CourseFormValues = z.infer<typeof courseFormSchema>;
type LessonFormValues = z.infer<typeof lessonFormSchema>;

const defaultCourseForm: CourseFormValues = {
  title: '',
  description: '',
  academicYearId: '',
  classRoomId: '',
  subjectId: '',
};

const defaultLessonForm: LessonFormValues = {
  title: '',
  summary: '',
  contentType: 'TEXT',
  body: '<p></p>',
  externalUrl: '',
  sequence: undefined,
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

function AttachmentLink({
  label,
  url,
}: {
  label: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
    >
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'draft' | 'published';
}) {
  const toneClass: Record<typeof tone, string> = {
    draft: 'border-amber-200 bg-amber-50 text-amber-800',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
}

export function CoursesPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [lessonFileError, setLessonFileError] = useState<string | null>(null);

  const courseForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: defaultCourseForm,
  });
  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: defaultLessonForm,
  });

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const classesQuery = useQuery({
    queryKey: ['class-rooms'],
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => listSubjectsApi(auth.accessToken!),
  });

  const coursesQuery = useQuery({
    queryKey: ['lms', 'courses', yearFilter || null, classFilter || null, page],
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        academicYearId: yearFilter || undefined,
        classId: classFilter || undefined,
        page,
        pageSize: 12,
      }),
  });

  const courseDetailQuery = useQuery({
    queryKey: ['lms', 'course-detail', selectedCourseId],
    enabled: Boolean(selectedCourseId),
    queryFn: () =>
      getCourseDetailApi(auth.accessToken!, selectedCourseId, {
        lessonsPage: 1,
        lessonsPageSize: 50,
      }),
  });

  const createCourseMutation = useMutation({
    mutationFn: (values: CourseFormValues) =>
      createCourseApi(auth.accessToken!, {
        title: values.title,
        description: values.description || undefined,
        academicYearId: values.academicYearId,
        classRoomId: values.classRoomId,
        subjectId: values.subjectId || undefined,
      }),
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      setSelectedCourseId(course.id);
      setIsCreateCourseOpen(false);
      courseForm.reset(defaultCourseForm);
      showToast({
        type: 'success',
        title: 'Course created',
        message: 'You can now add lessons.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not create course',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      let asset;
      if (lessonFile) {
        asset = await uploadFileToCloudinary(auth.accessToken!, 'lesson', lessonFile);
      }

      return createLessonApi(auth.accessToken!, selectedCourseId, {
        title: values.title,
        summary: values.summary || undefined,
        contentType: values.contentType as LessonContentType,
        body: values.body || undefined,
        externalUrl: values.externalUrl || undefined,
        sequence: values.sequence,
        asset,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'course-detail', selectedCourseId] });
      void queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      setLessonFile(null);
      setLessonFileError(null);
      setIsCreateLessonOpen(false);
      lessonForm.reset(defaultLessonForm);
      showToast({
        type: 'success',
        title: 'Lesson saved',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not save lesson',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const publishLessonMutation = useMutation({
    mutationFn: ({ lessonId, isPublished }: { lessonId: string; isPublished: boolean }) =>
      publishLessonApi(auth.accessToken!, lessonId, isPublished),
    onSuccess: (_lesson, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'course-detail', selectedCourseId] });
      showToast({
        type: 'success',
        title: variables.isPublished ? 'Lesson published' : 'Lesson moved back to draft',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update lesson',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const academicYears = ((yearsQuery.data as AcademicYearOption[] | undefined) ?? []).slice();
  const classRooms = ((classesQuery.data as ClassRoomOption[] | undefined) ?? []).slice();
  const subjects = ((subjectsQuery.data as SubjectOption[] | undefined) ?? []).slice();
  const isCourseSetupLookupError =
    yearsQuery.isError || classesQuery.isError || subjectsQuery.isError;
  const isCourseSetupMissing = !academicYears.length || !classRooms.length;

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = coursesQuery.data?.items ?? [];
    if (!q) {
      return items;
    }

    return items.filter((course) => {
      const subjectName = course.subject?.name ?? '';
      return [course.title, course.classRoom.name, course.academicYear.name, subjectName]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [coursesQuery.data?.items, search]);

  useEffect(() => {
    if (!yearFilter && academicYears.length) {
      const currentYear = academicYears.find((item) => item.isCurrent) ?? academicYears[0];
      setYearFilter(currentYear.id);
    }
  }, [academicYears, yearFilter]);

  useEffect(() => {
    if (selectedCourseId && !visibleCourses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId('');
    }
  }, [selectedCourseId, visibleCourses]);

  function openCreateCourse() {
    courseForm.reset({
      ...defaultCourseForm,
      academicYearId: yearFilter || academicYears[0]?.id || '',
      classRoomId: classFilter || classRooms[0]?.id || '',
      subjectId: subjects[0]?.id || '',
    });
    setIsCreateCourseOpen(true);
  }

  function openCreateLesson() {
    lessonForm.reset({
      ...defaultLessonForm,
      sequence:
        (courseDetailQuery.data?.lessons.items[courseDetailQuery.data.lessons.items.length - 1]
          ?.sequence ?? 0) + 1,
    });
    setLessonFile(null);
    setLessonFileError(null);
    setIsCreateLessonOpen(true);
  }

  async function submitLesson(values: LessonFormValues) {
    if (values.contentType === 'PDF' && !lessonFile) {
      setLessonFileError('PDF lessons require a file attachment.');
      return;
    }

    if (values.contentType === 'VIDEO' && !lessonFile && !values.externalUrl?.trim()) {
      lessonForm.setError('externalUrl', {
        message: 'Provide a video URL or attach a video file.',
      });
      return;
    }

    setLessonFileError(null);
    await createLessonMutation.mutateAsync(values);
  }

  const selectedCourse = courseDetailQuery.data?.course ?? null;

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Courses"
        subtitle={
          selectedCourseId
            ? 'Review lessons and publish course content.'
            : 'Create class courses and publish lessons for students.'
        }
        action={
          selectedCourseId ? (
            <button
              type="button"
              onClick={() => setSelectedCourseId('')}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back to courses
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateCourse}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create course
            </button>
          )
        }
      >
        <div className="grid gap-4">
          {!selectedCourseId ? (
            <>
              <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 p-3 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:items-end">
                <label className="grid gap-1 text-sm font-medium text-brand-700">
                  <span>Search courses</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by title, class, or subject"
                    className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-900 outline-none placeholder:text-brand-400 focus:border-brand-400"
                    aria-label="Search courses"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-brand-700">
                  <span>Academic year</span>
                  <select
                    value={yearFilter}
                    onChange={(event) => {
                      setYearFilter(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-900 outline-none focus:border-brand-400"
                  >
                    <option value="">All years</option>
                    {academicYears.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-medium text-brand-700">
                  <span>Class</span>
                  <select
                    value={classFilter}
                    onChange={(event) => {
                      setClassFilter(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-900 outline-none focus:border-brand-400"
                  >
                    <option value="">All classes</option>
                    {classRooms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4">
                {coursesQuery.isPending ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-28 animate-pulse rounded-2xl border border-brand-100 bg-brand-50"
                      />
                    ))}
                  </div>
                ) : null}

                {coursesQuery.isError ? (
                  <StateView
                    title="Could not load courses"
                    message="Retry the course list after checking your connection."
                    action={
                      <button
                        type="button"
                        onClick={() => void coursesQuery.refetch()}
                        className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Retry
                      </button>
                    }
                  />
                ) : null}

                {!coursesQuery.isPending && !coursesQuery.isError ? (
                  visibleCourses.length ? (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-brand-700">
                        <div>
                          <span className="font-medium text-brand-800">
                            {coursesQuery.data?.pagination.totalItems ?? visibleCourses.length} courses
                          </span>
                          <span className="ml-2 text-xs uppercase tracking-[0.16em] text-brand-500">
                            Filtered view
                          </span>
                        </div>
                        {coursesQuery.data?.pagination.totalPages &&
                        coursesQuery.data.pagination.totalPages > 1 ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={page <= 1}
                              onClick={() => setPage((current) => Math.max(1, current - 1))}
                              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                              Previous
                            </button>
                            <button
                              type="button"
                              disabled={page >= coursesQuery.data.pagination.totalPages}
                              onClick={() =>
                                setPage((current) =>
                                  Math.min(coursesQuery.data!.pagination.totalPages, current + 1),
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {visibleCourses.map((course) => (
                          <button
                            type="button"
                            key={course.id}
                            onClick={() => setSelectedCourseId(course.id)}
                            className="rounded-2xl border border-brand-100 bg-white p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="flex items-center gap-2 text-sm font-bold text-brand-900">
                                  <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
                                  {course.title}
                                </p>
                                <p className="mt-1 text-sm text-brand-600">
                                  {course.classRoom.name} · {course.academicYear.name}
                                </p>
                              </div>
                              <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                                {course.counts.lessons} lessons
                              </span>
                            </div>
                            {course.subject ? (
                              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-brand-500">
                                {course.subject.name}
                              </p>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="No courses yet"
                      message="Create the first class course to start publishing lessons."
                      action={
                        <button
                          type="button"
                          onClick={openCreateCourse}
                          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Create course
                        </button>
                      }
                    />
                  )
                ) : null}
              </div>
            </>
          ) : (
            <div className="grid gap-4">
              {courseDetailQuery.isPending ? (
                <div className="grid gap-4">
                  <div className="h-40 animate-pulse rounded-2xl border border-brand-100 bg-brand-50" />
                  <div className="h-72 animate-pulse rounded-2xl border border-brand-100 bg-brand-50" />
                </div>
              ) : null}

              {courseDetailQuery.isError ? (
                <StateView
                  title="Could not load course"
                  message="Retry loading the course details to manage lessons."
                  action={
                    <button
                      type="button"
                      onClick={() => void courseDetailQuery.refetch()}
                      className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Retry
                    </button>
                  }
                />
              ) : null}

              {selectedCourse && !courseDetailQuery.isPending && !courseDetailQuery.isError ? (
                <>
                  <SectionCard
                    title={selectedCourse.title}
                    subtitle={`${selectedCourse.classRoom.name} · ${selectedCourse.academicYear.name}`}
                    action={
                      <button
                        type="button"
                        onClick={openCreateLesson}
                        className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
                      >
                        <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                        Add lesson
                      </button>
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <InfoBox
                        label="Teacher"
                        value={`${selectedCourse.teacher.firstName} ${selectedCourse.teacher.lastName}`}
                      />
                      <InfoBox label="Subject" value={selectedCourse.subject?.name ?? 'Not linked'} />
                      <InfoBox
                        label="Last update"
                        value={new Intl.DateTimeFormat('en-RW', {
                          dateStyle: 'medium',
                        }).format(new Date(selectedCourse.updatedAt))}
                      />
                    </div>
                    {selectedCourse.description ? (
                      <p className="mt-4 text-sm leading-6 text-brand-700">
                        {selectedCourse.description}
                      </p>
                    ) : null}
                  </SectionCard>

                  <SectionCard
                    title="Lessons"
                    subtitle="Draft content first, then publish it when ready for students."
                  >
                    {courseDetailQuery.data?.lessons.items.length ? (
                      <div className="grid gap-3">
                        {courseDetailQuery.data.lessons.items.map((lesson) => (
                          <article
                            key={lesson.id}
                            className="rounded-2xl border border-brand-100 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-brand-900">
                                  {lesson.sequence}. {lesson.title}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <StatusPill
                                    label={lesson.isPublished ? 'Published' : 'Draft'}
                                    tone={lesson.isPublished ? 'published' : 'draft'}
                                  />
                                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
                                    {lesson.contentType}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  publishLessonMutation.mutate({
                                    lessonId: lesson.id,
                                    isPublished: !lesson.isPublished,
                                  })
                                }
                                className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
                              >
                                {lesson.isPublished ? 'Move to draft' : 'Publish'}
                              </button>
                            </div>
                            {lesson.summary ? (
                              <p className="mt-3 text-sm text-brand-700">{lesson.summary}</p>
                            ) : null}
                            {lesson.body ? (
                              <RichContent
                                html={lesson.body}
                                className="rich-content mt-3 rounded-xl bg-brand-50 p-3 text-sm leading-6 text-brand-800"
                              />
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {lesson.externalUrl ? (
                                <AttachmentLink
                                  label="Open external content"
                                  url={lesson.externalUrl}
                                />
                              ) : null}
                              {lesson.fileAsset ? (
                                <AttachmentLink
                                  label={`Open ${lesson.fileAsset.originalName}`}
                                  url={lesson.fileAsset.secureUrl}
                                />
                              ) : null}
                            </div>
                            <p className="mt-3 text-xs text-brand-500">
                              Published: {formatDateTime(lesson.publishedAt)}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        message="No lessons yet. Add the first lesson to start your course feed."
                        action={
                          <button
                            type="button"
                            onClick={openCreateLesson}
                            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Add lesson
                          </button>
                        }
                      />
                    )}
                  </SectionCard>
                </>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>

      <Modal
        open={isCreateCourseOpen}
        title="Create course"
        description="Set the class, academic year, and subject first."
        onClose={() => setIsCreateCourseOpen(false)}
      >
        <form
          className="grid gap-4"
          onSubmit={courseForm.handleSubmit((values) => createCourseMutation.mutate(values))}
        >
          {isCourseSetupLookupError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load academic years, classes, or subjects. Refresh the page and try
              again.
            </div>
          ) : null}

          {!isCourseSetupLookupError && isCourseSetupMissing ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Create at least one academic year and one class before creating a course.
            </div>
          ) : null}

          <FormField label="Course title" error={courseForm.formState.errors.title?.message}>
            <input
              {...courseForm.register('title')}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </FormField>

          <FormField label="Description" error={courseForm.formState.errors.description?.message}>
            <textarea
              {...courseForm.register('description')}
              rows={4}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Academic year"
              error={courseForm.formState.errors.academicYearId?.message}
            >
              <select
                {...courseForm.register('academicYearId')}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              >
                <option value="">Select academic year</option>
                {academicYears.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Class" error={courseForm.formState.errors.classRoomId?.message}>
              <select
                {...courseForm.register('classRoomId')}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              >
                <option value="">Select class</option>
                {classRooms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Subject" error={courseForm.formState.errors.subjectId?.message}>
            <select
              {...courseForm.register('subjectId')}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            >
              <option value="">No subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateCourseOpen(false)}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCourseMutation.isPending || isCourseSetupLookupError || isCourseSetupMissing}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createCourseMutation.isPending ? 'Saving...' : 'Create course'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isCreateLessonOpen}
        title="Add lesson"
        description="Students only see lessons after you publish them."
        onClose={() => setIsCreateLessonOpen(false)}
      >
        <form className="grid gap-4" onSubmit={lessonForm.handleSubmit(submitLesson)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Lesson title" error={lessonForm.formState.errors.title?.message}>
              <input
                {...lessonForm.register('title')}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </FormField>
            <FormField label="Sequence" error={lessonForm.formState.errors.sequence?.message}>
              <input
                type="number"
                min={1}
                {...lessonForm.register('sequence')}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </FormField>
          </div>

          <FormField label="Summary" error={lessonForm.formState.errors.summary?.message}>
            <textarea
              {...lessonForm.register('summary')}
              rows={3}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Content type"
              error={lessonForm.formState.errors.contentType?.message}
            >
              <select
                {...lessonForm.register('contentType')}
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              >
                <option value="TEXT">Text</option>
                <option value="PDF">PDF file</option>
                <option value="VIDEO">Video</option>
                <option value="LINK">External link</option>
              </select>
            </FormField>

            <FormField
              label="External URL"
              error={lessonForm.formState.errors.externalUrl?.message}
            >
              <input
                {...lessonForm.register('externalUrl')}
                placeholder="https://..."
                className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </FormField>
          </div>

          <FormField label="Body" error={lessonForm.formState.errors.body?.message}>
            <Controller
              control={lessonForm.control}
              name="body"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? '<p></p>'}
                  onChange={field.onChange}
                  placeholder="Write the lesson content, examples, and key steps."
                />
              )}
            />
          </FormField>

          <FormField label="Attachment" error={lessonFileError ?? undefined}>
            <input
              type="file"
              onChange={(event) => {
                setLessonFile(event.target.files?.[0] ?? null);
                setLessonFileError(null);
              }}
              className="rounded-xl border border-dashed border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-700"
            />
          </FormField>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateLessonOpen(false)}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLessonMutation.isPending}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createLessonMutation.isPending ? 'Saving...' : 'Save lesson'}
            </button>
          </div>
        </form>
      </Modal>

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
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-brand-700">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-brand-900">{value}</p>
    </div>
  );
}
