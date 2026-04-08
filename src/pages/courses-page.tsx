import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  FilePlus2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { hasRole } from '../features/auth/auth-helpers';
import {
  listAcademicYearsApi,
  listClassRoomsApi,
} from '../features/sprint1/sprint1.api';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';
import {
  createCourseApi,
  createLessonApi,
  deleteCourseApi,
  deleteLessonApi,
  getCourseDetailApi,
  listCourseSubjectOptionsApi,
  listCoursesApi,
  LessonContentType,
  publishLessonApi,
  updateCourseApi,
  updateLessonApi,
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

const COURSE_CARD_BACKGROUNDS = [
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

type EditableCourse = {
  id: string;
  title: string;
  description?: string | null;
  academicYear: { id: string; name: string };
  classRoom: { id: string; name: string };
  subject?: { id: string; name?: string } | null;
};

type EditableLesson = {
  id: string;
  title: string;
  summary: string | null;
  contentType: LessonContentType;
  body: string | null;
  externalUrl: string | null;
  sequence: number;
  isPublished: boolean;
  fileAsset: {
    secureUrl: string;
    mimeType: string | null;
    originalName: string;
  } | null;
};

type DeletableItem =
  | {
      type: 'course';
      id: string;
      title: string;
      description: string;
    }
  | {
      type: 'lesson';
      id: string;
      title: string;
      description: string;
    };

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
  lesson: {
    contentType: LessonContentType;
    externalUrl: string | null;
    fileAsset: {
      secureUrl: string;
      mimeType: string | null;
      originalName: string;
    } | null;
  },
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
  lesson: {
    contentType: LessonContentType;
    externalUrl: string | null;
    fileAsset: {
      secureUrl: string;
      mimeType: string | null;
      originalName: string;
    } | null;
  };
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
      className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-100"
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
  const isTeacherOnly =
    hasRole(auth.me, 'TEACHER') &&
    !hasRole(auth.me, 'SCHOOL_ADMIN') &&
    !hasRole(auth.me, 'SUPER_ADMIN');

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<'create' | 'edit'>('create');
  const [courseModalCourseId, setCourseModalCourseId] = useState('');
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [lessonModalMode, setLessonModalMode] = useState<'create' | 'edit'>('create');
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [lessonFileError, setLessonFileError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeletableItem | null>(null);

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
    queryKey: ['course-subject-options'],
    queryFn: () => listCourseSubjectOptionsApi(auth.accessToken!),
  });

  const coursesQuery = useQuery({
    queryKey: ['lms', 'courses', page],
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
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
      setIsCourseModalOpen(false);
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

  const updateCourseMutation = useMutation({
    mutationFn: (values: CourseFormValues) =>
      updateCourseApi(auth.accessToken!, courseModalCourseId, {
        title: values.title,
        description: values.description?.trim() ? values.description : null,
        academicYearId: values.academicYearId,
        classRoomId: values.classRoomId,
        subjectId: values.subjectId?.trim() ? values.subjectId : isTeacherOnly ? undefined : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      void queryClient.invalidateQueries({ queryKey: ['lms', 'course-detail', courseModalCourseId] });
      setIsCourseModalOpen(false);
      setCourseModalCourseId('');
      showToast({
        type: 'success',
        title: 'Course updated',
        message: 'Your course details were saved.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update course',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => deleteCourseApi(auth.accessToken!, courseId),
    onSuccess: (_result, courseId) => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      void queryClient.invalidateQueries({ queryKey: ['lms', 'course-detail', courseId] });
      setPendingDelete(null);
      if (selectedCourseId === courseId) {
        setSelectedCourseId('');
        setSelectedLessonId('');
      }
      showToast({
        type: 'success',
        title: 'Course deleted',
        message: 'The course was removed from your active list.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not delete course',
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
      setIsLessonModalOpen(false);
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

  const updateLessonMutation = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      let asset;
      if (lessonFile) {
        asset = await uploadFileToCloudinary(auth.accessToken!, 'lesson', lessonFile);
      }

      const shouldKeepUrl =
        values.contentType === 'LINK' ||
        (values.contentType === 'VIDEO' && Boolean(values.externalUrl?.trim()));
      const shouldKeepBody = values.contentType === 'TEXT';
      const shouldRemoveAsset =
        !asset &&
        Boolean(selectedLesson?.fileAsset) &&
        (values.contentType === 'TEXT' || values.contentType === 'LINK');

      return updateLessonApi(auth.accessToken!, selectedLessonId, {
        title: values.title,
        summary: values.summary?.trim() ? values.summary : null,
        contentType: values.contentType as LessonContentType,
        body: shouldKeepBody ? values.body || null : null,
        externalUrl: shouldKeepUrl ? values.externalUrl?.trim() || null : null,
        sequence: values.sequence,
        asset,
        removeAsset: shouldRemoveAsset || undefined,
      });
    },
    onSuccess: (lesson) => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'course-detail', selectedCourseId] });
      void queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      setLessonFile(null);
      setLessonFileError(null);
      setIsLessonModalOpen(false);
      setSelectedLessonId(lesson.id);
      showToast({
        type: 'success',
        title: 'Lesson updated',
        message: 'Your curriculum changes were saved.',
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

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => deleteLessonApi(auth.accessToken!, lessonId),
    onSuccess: (_result, lessonId) => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'course-detail', selectedCourseId] });
      void queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      setPendingDelete(null);
      if (selectedLessonId === lessonId) {
        setSelectedLessonId('');
      }
      showToast({
        type: 'success',
        title: 'Lesson deleted',
        message: 'The lesson was removed from this course.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not delete lesson',
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
  const selectedCourseSubjectId = courseForm.watch('subjectId');
  const isTeacherSubjectMissing = isTeacherOnly && !selectedCourseSubjectId?.trim();
  const isCourseSetupLookupError =
    yearsQuery.isError || classesQuery.isError || subjectsQuery.isError;
  const isCourseSetupMissing =
    !academicYears.length || !classRooms.length || (isTeacherOnly && !subjects.length);

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = coursesQuery.data?.items ?? [];
    return items.filter((course) => {
      const subjectName = course.subject?.name ?? '';
      const matchesSearch = q
        ? [course.title, course.classRoom.name, course.academicYear.name, subjectName]
            .join(' ')
            .toLowerCase()
            .includes(q)
        : true;
      const matchesSubject =
        subjectFilter === 'ALL' ? true : course.subject?.id === subjectFilter;

      return matchesSearch && matchesSubject;
    });
  }, [coursesQuery.data?.items, search, subjectFilter]);

  useEffect(() => {
    if (selectedCourseId && !visibleCourses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId('');
      setSelectedLessonId('');
    }
  }, [selectedCourseId, visibleCourses]);

  useEffect(() => {
    const lessons = courseDetailQuery.data?.lessons.items ?? [];
    if (selectedLessonId && !lessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId('');
    }
  }, [courseDetailQuery.data?.lessons.items, selectedLessonId]);

  function openCreateCourse() {
    setCourseModalMode('create');
    setCourseModalCourseId('');
    const currentAcademicYear = academicYears.find((item) => item.isCurrent) ?? academicYears[0];
    courseForm.reset({
      ...defaultCourseForm,
      academicYearId: currentAcademicYear?.id || '',
      classRoomId: classRooms[0]?.id || '',
      subjectId: subjects[0]?.id || '',
    });
    setIsCourseModalOpen(true);
  }

  function openEditCourse(course?: EditableCourse | null) {
    if (!course) {
      return;
    }

    setCourseModalMode('edit');
    setCourseModalCourseId(course.id);
    courseForm.reset({
      title: course.title,
      description: course.description ?? '',
      academicYearId: course.academicYear.id,
      classRoomId: course.classRoom.id,
      subjectId: course.subject?.id ?? '',
    });
    setIsCourseModalOpen(true);
  }

  function submitCourse(values: CourseFormValues) {
    if (isTeacherOnly && !values.subjectId?.trim()) {
      courseForm.setError('subjectId', {
        type: 'manual',
        message: 'Subject is required for teacher-created courses',
      });
      return;
    }

    if (courseModalMode === 'edit' && courseModalCourseId) {
      updateCourseMutation.mutate(values);
      return;
    }

    createCourseMutation.mutate(values);
  }

  function openCreateLesson() {
    setLessonModalMode('create');
    lessonForm.reset({
      ...defaultLessonForm,
      sequence:
        (courseDetailQuery.data?.lessons.items[courseDetailQuery.data.lessons.items.length - 1]
          ?.sequence ?? 0) + 1,
    });
    setLessonFile(null);
    setLessonFileError(null);
    setIsLessonModalOpen(true);
  }

  function openEditLesson(lesson?: EditableLesson | null) {
    if (!lesson) {
      return;
    }

    setSelectedLessonId(lesson.id);
    setLessonModalMode('edit');
    lessonForm.reset({
      title: lesson.title,
      summary: lesson.summary ?? '',
      contentType: lesson.contentType,
      body: lesson.body ?? '<p></p>',
      externalUrl: lesson.externalUrl ?? '',
      sequence: lesson.sequence,
    });
    setLessonFile(null);
    setLessonFileError(null);
    setIsLessonModalOpen(true);
  }

  async function submitLesson(values: LessonFormValues) {
    const hasExistingLessonAsset = Boolean(selectedLesson?.fileAsset);

    if (
      values.contentType === 'PDF' &&
      !lessonFile &&
      !(lessonModalMode === 'edit' && hasExistingLessonAsset)
    ) {
      setLessonFileError('PDF lessons require a file attachment.');
      return;
    }

    if (
      values.contentType === 'VIDEO' &&
      !lessonFile &&
      !values.externalUrl?.trim() &&
      !(lessonModalMode === 'edit' && hasExistingLessonAsset)
    ) {
      lessonForm.setError('externalUrl', {
        message: 'Provide a video URL or attach a video file.',
      });
      return;
    }

    setLessonFileError(null);
    if (lessonModalMode === 'edit' && selectedLessonId) {
      await updateLessonMutation.mutateAsync(values);
      return;
    }

    await createLessonMutation.mutateAsync(values);
  }

  function requestDeleteCourse(course?: Pick<EditableCourse, 'id' | 'title'> | null) {
    if (!course) {
      return;
    }

    setPendingDelete({
      type: 'course',
      id: course.id,
      title: course.title,
      description: `Delete "${course.title}"? Students will no longer see it in active courses.`,
    });
  }

  function requestDeleteLesson(lesson?: Pick<EditableLesson, 'id' | 'title'> | null) {
    if (!lesson) {
      return;
    }

    setPendingDelete({
      type: 'lesson',
      id: lesson.id,
      title: lesson.title,
      description: `Delete lesson "${lesson.title}" from this course?`,
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    if (pendingDelete.type === 'course') {
      await deleteCourseMutation.mutateAsync(pendingDelete.id).catch(() => undefined);
      return;
    }

    await deleteLessonMutation.mutateAsync(pendingDelete.id).catch(() => undefined);
  }

  const selectedCourse = courseDetailQuery.data?.course ?? null;
  const selectedLesson =
    courseDetailQuery.data?.lessons.items.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const isDeletePending = deleteCourseMutation.isPending || deleteLessonMutation.isPending;

  return (
    <div className="grid gap-5">
      <SectionCard
        title={selectedCourseId ? undefined : 'Courses'}
        subtitle={
          selectedCourseId
            ? undefined
            : 'Create class courses and publish lessons for students.'
        }
        action={
          selectedCourseId ? undefined : (
            <button
              type="button"
              onClick={openCreateCourse}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
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
              <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 p-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  <span>Search courses</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by title, class, or subject"
                    className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
                    aria-label="Search courses"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  <span>Subject</span>
                  <select
                    value={subjectFilter}
                    onChange={(event) => {
                      setSubjectFilter(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-400"
                  >
                    <option value="ALL">All subjects</option>
                    {subjects.map((item) => (
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
                        className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Retry
                      </button>
                    }
                  />
                ) : null}

                {!coursesQuery.isPending && !coursesQuery.isError ? (
                  visibleCourses.length ? (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-slate-700">
                        <div>
                          <span className="font-medium text-slate-800">
                            {visibleCourses.length} courses
                          </span>
                          <span className="ml-2 text-xs uppercase tracking-[0.16em] text-slate-500">
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

                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {visibleCourses.map((course, courseIndex) => {
                          const cover = COURSE_CARD_BACKGROUNDS[
                            courseIndex % COURSE_CARD_BACKGROUNDS.length
                          ];
                          const courseLabel = `${course.subject?.name ?? 'General Studies'} / ${course.classRoom.name}`;
                          const lastUpdated = new Intl.DateTimeFormat('en-RW', {
                            dateStyle: 'medium',
                          }).format(new Date(course.updatedAt));

                          return (
                            <article
                              key={course.id}
                              className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCourseId(course.id);
                                  setSelectedLessonId('');
                                }}
                                className="block w-full text-left"
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
                                <div className="space-y-3 px-4 py-4">
                                  <div className="space-y-1">
                                    <p className="text-lg font-semibold text-slate-900">
                                      {course.title}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      {course.description?.trim() || 'Open this course to review lessons and publish content.'}
                                    </p>
                                  </div>

                                  <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                                    <span>{course.academicYear.name}</span>
                                    <span>{course.counts.lessons} lessons</span>
                                    <span>
                                      {course.teacher.firstName} {course.teacher.lastName}
                                    </span>
                                    <span>Updated {lastUpdated}</span>
                                  </div>
                                </div>
                              </button>

                              <div className="grid grid-cols-3 gap-2 border-t border-brand-100 px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCourseId(course.id);
                                    setSelectedLessonId('');
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-100"
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditCourse(course)}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestDeleteCourse(course)}
                                  disabled={isDeletePending}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Delete
                                </button>
                              </div>
                            </article>
                          );
                        })}
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
                          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
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
                      className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Retry
                    </button>
                  }
                />
              ) : null}

              {selectedCourse && !courseDetailQuery.isPending && !courseDetailQuery.isError ? (
                <>
                  <SectionCard
                    action={
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourseId('');
                            setSelectedLessonId('');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                          Courses
                        </button>
                        {selectedLesson ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLessonId('')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            Lessons
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={openCreateLesson}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-2.5 py-2 text-xs font-semibold text-white hover:bg-brand-600"
                          >
                            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Add lesson
                          </button>
                        )}
                      </div>
                    }
                  >
                    {courseDetailQuery.data?.lessons.items.length ? (
                      selectedLesson ? (
                        <div className="grid gap-4">
                          <div>
                            <p className="text-lg font-semibold text-slate-900">
                              {selectedLesson.sequence}. {selectedLesson.title}
                            </p>
                            {selectedLesson.summary ? (
                              <p className="mt-1 text-sm text-slate-600">
                                {selectedLesson.summary}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill
                              label={selectedLesson.isPublished ? 'Published' : 'Draft'}
                              tone={selectedLesson.isPublished ? 'published' : 'draft'}
                            />
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {selectedLesson.contentType}
                            </span>
                          </div>

                          {selectedLesson.body ? (
                            <RichContent
                              html={selectedLesson.body}
                              className="rich-content rounded-2xl bg-brand-50 p-5 text-[15px] leading-7 text-slate-800"
                            />
                          ) : (
                            <div className="rounded-2xl border border-dashed border-brand-200 bg-white px-4 py-5 text-sm text-slate-600">
                              This lesson uses media or attached files instead of text content.
                            </div>
                          )}

                          <LessonMediaEmbed lesson={selectedLesson} />

                          <div className="flex flex-wrap gap-2">
                            {selectedLesson.externalUrl &&
                            !lessonHasInlineMedia(selectedLesson) ? (
                              <AttachmentLink
                                label="Open external content"
                                url={selectedLesson.externalUrl}
                              />
                            ) : null}
                            {selectedLesson.fileAsset ? (
                              <AttachmentLink
                                label={`Download ${selectedLesson.fileAsset.originalName}`}
                                url={selectedLesson.fileAsset.secureUrl}
                              />
                            ) : null}
                          </div>

                          <p className="text-xs text-slate-500">
                            Published: {formatDateTime(selectedLesson.publishedAt)}
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                          {courseDetailQuery.data.lessons.items.map((lesson, lessonIndex) => {
                            const cover =
                              COURSE_CARD_BACKGROUNDS[
                                lessonIndex % COURSE_CARD_BACKGROUNDS.length
                              ];

                            return (
                              <article
                                key={lesson.id}
                                className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedLessonId(lesson.id)}
                                  className="block w-full text-left"
                                >
                                  <div
                                    className="relative h-40 bg-[length:140px_140px]"
                                    style={cover}
                                  >
                                    <span className="absolute left-3 top-3 rounded-lg bg-[#184f8f] px-3 py-1 text-xs font-medium text-white shadow-sm">
                                      Lesson {lesson.sequence} / {lesson.contentType}
                                    </span>
                                    <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-md">
                                      {lesson.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                  </div>
                                  <div className="space-y-2 px-4 py-3">
                                    <p className="text-lg font-medium text-slate-800">
                                      {lesson.title}
                                    </p>
                                    <p className="line-clamp-2 text-sm text-slate-600">
                                      {lesson.summary ?? 'Open this lesson to read the content.'}
                                    </p>
                                  </div>
                                </button>

                                <div className="grid grid-cols-2 gap-2 border-t border-brand-100 px-4 py-3 xl:grid-cols-4">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLessonId(lesson.id)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-100"
                                  >
                                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                    Open
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditLesson(lesson)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      publishLessonMutation.mutate({
                                        lessonId: lesson.id,
                                        isPublished: !lesson.isPublished,
                                      })
                                    }
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    {lesson.isPublished ? (
                                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                    ) : (
                                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                    )}
                                    {lesson.isPublished ? 'Draft' : 'Publish'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteLesson(lesson)}
                                    disabled={deleteLessonMutation.isPending}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Delete
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <EmptyState
                        message="No lessons yet. Add the first lesson to start your course feed."
                        action={
                          <button
                            type="button"
                            onClick={openCreateLesson}
                            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
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
        open={isCourseModalOpen}
        title={courseModalMode === 'edit' ? 'Edit course' : 'Create course'}
        description={
          courseModalMode === 'edit'
            ? 'Update the class, academic year, and subject details for this course.'
            : 'Set the class, academic year, and subject first.'
        }
        onClose={() => {
          setIsCourseModalOpen(false);
          setCourseModalCourseId('');
        }}
      >
        <form className="grid gap-4" onSubmit={courseForm.handleSubmit(submitCourse)}>
          {isCourseSetupLookupError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load academic years, classes, or subjects. Refresh the page and try
              again.
            </div>
          ) : null}

          {!isCourseSetupLookupError && isCourseSetupMissing ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isTeacherOnly && !subjects.length
                ? 'No subject is assigned to your teaching load yet. Ask an administrator to assign at least one subject.'
                : 'Create at least one academic year and one class before creating a course.'}
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
              {isTeacherOnly ? <option value="">Select subject</option> : <option value="">No subject</option>}
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
              onClick={() => {
                setIsCourseModalOpen(false);
                setCourseModalCourseId('');
              }}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                createCourseMutation.isPending ||
                updateCourseMutation.isPending ||
                isCourseSetupLookupError ||
                isCourseSetupMissing ||
                isTeacherSubjectMissing
              }
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createCourseMutation.isPending || updateCourseMutation.isPending
                ? 'Saving...'
                : courseModalMode === 'edit'
                  ? 'Save changes'
                  : 'Create course'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        title={pendingDelete?.type === 'lesson' ? 'Delete lesson' : 'Delete course'}
        description={pendingDelete?.description}
        onClose={() => {
          if (!isDeletePending) {
            setPendingDelete(null);
          }
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              disabled={isDeletePending}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={isDeletePending}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              {isDeletePending ? 'Deleting...' : 'Confirm delete'}
            </button>
          </div>
        }
      >
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          This action cannot be undone.
        </div>
      </Modal>

      <Modal
        open={isLessonModalOpen}
        title={lessonModalMode === 'edit' ? 'Edit lesson' : 'Add lesson'}
        description={
          lessonModalMode === 'edit'
            ? 'Update lesson content, links, or attached media.'
            : 'Students only see lessons after you publish them.'
        }
        onClose={() => setIsLessonModalOpen(false)}
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
              className="rounded-xl border border-dashed border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-slate-700"
            />
            {lessonModalMode === 'edit' && selectedLesson?.fileAsset ? (
              <span className="text-xs text-slate-500">
                Current file: {selectedLesson.fileAsset.originalName}. Upload a new file to replace it.
              </span>
            ) : null}
          </FormField>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsLessonModalOpen(false)}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createLessonMutation.isPending || updateLessonMutation.isPending
                ? 'Saving...'
                : lessonModalMode === 'edit'
                  ? 'Save changes'
                  : 'Save lesson'}
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
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
