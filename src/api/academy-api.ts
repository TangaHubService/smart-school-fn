import { apiRequest } from './client';

/** Public academy class — pricing lives on the class. */
export interface AcademyClass {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  price: number;
  durationDays: number;
  classRoomId: string;
  className: string;
  gradeLevelId?: string | null;
  gradeLevelName?: string | null;
  classSubjectCount?: number;
  classCourseCount?: number;
  classCourseTitles?: string[];
}

/** Legacy alias — programs were removed, classes carry the pricing. */
export type Program = AcademyClass;

export interface AcademyCatalogSubject {
  id: string;
  name: string;
  courseCount: number;
  courses?: Array<{ id: string; title: string }>;
}

export interface AcademyCatalogClassRoom {
  id: string;
  name: string;
  price: number;
  thumbnail: string | null;
  enrolledCount: number;
  subjects: AcademyCatalogSubject[];
}

export interface AcademyCatalogGradeLevel {
  id: string;
  name: string;
  rank: number;
  /** The admin-defined level group ("Lower Primary"…) this grade is in, if any. */
  levelGroupId?: string | null;
  classRooms: AcademyCatalogClassRoom[];
}

/** A level group the academy admin created, e.g. "Lower Primary". */
export interface AcademyCatalogLevelGroup {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  rank: number;
}

export interface CatalogLevelBand {
  key: string;
  title: string;
  subtitle: string;
  grades: AcademyCatalogGradeLevel[];
  classes: number;
  courses: number;
  enrolled: number;
  thumbnail: string | null;
}

function buildBand(
  key: string,
  title: string,
  bandGrades: AcademyCatalogGradeLevel[],
  extra: { subtitle?: string | null; thumbnail?: string | null } = {}
): CatalogLevelBand {
  const rooms = bandGrades.flatMap((grade) => grade.classRooms);
  const courses = rooms.reduce(
    (sum, room) => sum + room.subjects.reduce((total, subject) => total + subject.courseCount, 0),
    0
  );
  const enrolled = rooms.reduce((sum, room) => sum + (room.enrolledCount ?? 0), 0);
  const roomThumbnail = rooms.find((room) => room.thumbnail?.trim())?.thumbnail ?? null;
  return {
    key,
    title,
    subtitle: extra.subtitle?.trim() || bandGrades.map((grade) => grade.name).join(' · '),
    grades: bandGrades,
    classes: rooms.length,
    courses,
    enrolled,
    thumbnail: extra.thumbnail?.trim() || roomThumbnail,
  };
}

/** Old behaviour: split grades into two halves by rank. */
function splitInHalves(sorted: AcademyCatalogGradeLevel[]): CatalogLevelBand[] {
  const mid = Math.ceil(sorted.length / 2);
  const groups = [sorted.slice(0, mid), sorted.slice(mid)].filter((list) => list.length > 0);
  const isPrimary = sorted.every((grade) => /primary/i.test(grade.name));
  return groups.map((bandGrades, index) => {
    const first = bandGrades[0].name;
    const last = bandGrades[bandGrades.length - 1].name;
    return buildBand(
      index === 0 ? 'lower' : 'upper',
      isPrimary ? (index === 0 ? 'Lower Primary' : 'Upper Primary') : `Levels ${first} – ${last}`,
      bandGrades
    );
  });
}

export const UNGROUPED_BAND_KEY = 'other';

/**
 * Group catalog grades into the level groups the academy admin created
 * (e.g. "Lower Primary", "Upper Primary"), in the admin's order. Grades not
 * in any group go to a final "Other levels" group. Until the admin creates
 * groups, grades are split into two halves by rank as before.
 */
export function splitCatalogGradesIntoBands(
  grades: AcademyCatalogGradeLevel[],
  levelGroups: AcademyCatalogLevelGroup[] = []
): CatalogLevelBand[] {
  const sorted = [...grades].sort((a, b) => a.rank - b.rank);
  if (!sorted.length) return [];

  const known = new Set(levelGroups.map((group) => group.id));
  const usesGroups = sorted.some((grade) => grade.levelGroupId && known.has(grade.levelGroupId));
  if (!usesGroups) return splitInHalves(sorted);

  const bands = [...levelGroups]
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .map((group) => {
      const bandGrades = sorted.filter((grade) => grade.levelGroupId === group.id);
      return bandGrades.length
        ? buildBand(group.id, group.name, bandGrades, {
            subtitle: group.description,
            thumbnail: group.thumbnail,
          })
        : null;
    })
    .filter((band): band is CatalogLevelBand => band !== null);

  const ungrouped = sorted.filter(
    (grade) => !grade.levelGroupId || !known.has(grade.levelGroupId)
  );
  if (ungrouped.length) bands.push(buildBand(UNGROUPED_BAND_KEY, 'Other levels', ungrouped));
  return bands;
}

export interface AcademyCatalogAcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
  gradeLevels: AcademyCatalogGradeLevel[];
}

export interface AcademyCatalogTree {
  academicYears: AcademyCatalogAcademicYear[];
  /** Admin-defined level groups; older API responses leave this out. */
  levelGroups?: AcademyCatalogLevelGroup[];
}

/**
 * The catalog API groups courses by academic year, but a public visitor
 * browses classes, not years. Merge every year into one list of levels so no
 * published course is hidden just because it belongs to a non-current year.
 * Levels, classes and subjects are merged by id; courses are de-duplicated.
 */
export function mergeCatalogYears(
  academicYears: AcademyCatalogAcademicYear[]
): AcademyCatalogGradeLevel[] {
  const grades = new Map<string, AcademyCatalogGradeLevel>();
  const ordered = [
    ...academicYears.filter((year) => year.isCurrent),
    ...academicYears.filter((year) => !year.isCurrent),
  ];

  for (const year of ordered) {
    for (const grade of year.gradeLevels) {
      const gradeNode = grades.get(grade.id) ?? { ...grade, classRooms: [] };
      grades.set(grade.id, gradeNode);

      for (const room of grade.classRooms) {
        let roomNode = gradeNode.classRooms.find((item) => item.id === room.id);
        if (!roomNode) {
          roomNode = { ...room, subjects: [] };
          gradeNode.classRooms.push(roomNode);
        }
        roomNode.thumbnail = roomNode.thumbnail || room.thumbnail;
        roomNode.enrolledCount = Math.max(roomNode.enrolledCount ?? 0, room.enrolledCount ?? 0);

        for (const subject of room.subjects) {
          let subjectNode = roomNode.subjects.find((item) => item.id === subject.id);
          if (!subjectNode) {
            subjectNode = { ...subject, courseCount: 0, courses: [] };
            roomNode.subjects.push(subjectNode);
          }
          const known = new Set((subjectNode.courses ?? []).map((course) => course.id));
          const added = (subject.courses ?? []).filter((course) => !known.has(course.id));
          subjectNode.courses = [...(subjectNode.courses ?? []), ...added].sort((a, b) =>
            a.title.localeCompare(b.title)
          );
          // Older API responses send only a count; keep the larger figure.
          subjectNode.courseCount = Math.max(
            subjectNode.courses.length,
            subjectNode.courseCount + (subject.courses ? 0 : subject.courseCount)
          );
        }
      }
    }
  }

  return [...grades.values()]
    .map((grade) => ({
      ...grade,
      classRooms: [...grade.classRooms]
        .map((room) => ({
          ...room,
          subjects: [...room.subjects].sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.rank - b.rank);
}

export interface ClassEnrollment {
  id: string;
  classRoomId: string;
  userId: string;
  isActive: boolean;
  isTrial?: boolean;
  expiresAt: string | null;
  classRoom: AcademyClass;
}

/** Legacy alias. */
export type ProgramEnrollment = ClassEnrollment;

export interface ClassContentResponse {
  classRoomId: string;
  className: string;
  courses: any[];
}

/** Legacy alias. */
export type ProgramContentResponse = ClassContentResponse;

export type AcademyPlanId = 'trial' | 'test' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export const ACADEMY_PLANS = [
  {
    id: 'test',
    name: 'Test',
    durationDays: 1,
    price: 100,
    description: 'Quick verification plan for checkout and payment flow testing.',
  },
  {
    id: 'weekly',
    name: 'Weekly',
    durationDays: 7,
    price: 2000,
    description: 'Short sprint for focused revision and fast starts.',
  },
  {
    id: 'monthly',
    name: 'Monthly',
    durationDays: 30,
    price: 5000,
    description: 'The balanced option for consistent learning and practice.',
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    durationDays: 90,
    price: 10000,
    description: 'Longer runway for deeper progress across your selected classes.',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    durationDays: 365,
    price: 30000,
    description: 'Best value for extended access and uninterrupted momentum.',
  },
] as const satisfies Array<{
  id: Exclude<AcademyPlanId, 'trial'>;
  name: string;
  durationDays: number;
  price: number;
  description: string;
}>;

export type PurchasableAcademyPlan = (typeof ACADEMY_PLANS)[number];

/** Widened plan shape for backend-driven rates (ids match the plan union). */
export interface AcademyPlanOption {
  id: Exclude<AcademyPlanId, 'trial'>;
  name: string;
  durationDays: number;
  price: number;
  description: string;
}

/** Display copy only — prices and durations always come from GET /public-academy/plans. */
export const PLAN_DESCRIPTIONS: Record<string, string> = {
  test: 'Quick verification plan for checkout and payment flow testing.',
  weekly: 'Short sprint for focused revision and fast starts.',
  monthly: 'The balanced option for consistent learning and practice.',
  quarterly: 'Longer runway for deeper progress across your selected classes.',
  yearly: 'Best value for extended access and uninterrupted momentum.',
};

export function isPurchasablePlanId(value: string | null): value is PurchasableAcademyPlan['id'] {
  return ACADEMY_PLANS.some((plan) => plan.id === value);
}
export type AcademySubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PENDING_PAYMENT';

export interface AcademySubscriptionSummary {
  subscription: {
    id: string;
    planCode: AcademyPlanId;
    status: AcademySubscriptionStatus;
    isTrial: boolean;
    expiresAt: string | null;
    classLimit: number;
    remainingClassSlots: number;
  };
  selectedClasses: Array<{
    classRoomId: string;
    className: string;
    gradeLevelName: string;
    thumbnail: string | null;
    price: number;
    expiresAt: string | null;
    isTrial: boolean;
    isLegacy: boolean;
  }>;
  accessibleClasses: Array<{
    classRoomId: string;
    className: string;
    gradeLevelName: string;
    thumbnail: string | null;
    price: number;
    expiresAt: string | null;
    isTrial: boolean;
    isLegacy: boolean;
  }>;
  selectedPrograms: Array<{
    enrollmentId: string;
    programId: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    classRoomId: string | null;
    className: string | null;
    expiresAt: string | null;
    isTrial: boolean;
  }>;
  accessiblePrograms: Array<{
    enrollmentId: string;
    programId: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    classRoomId: string | null;
    className: string | null;
    expiresAt: string | null;
    isTrial: boolean;
    isLegacy: boolean;
  }>;
  pendingPayment: {
    id: string;
    planCode: AcademyPlanId;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    amount: number;
    currency: string;
    createdAt: string;
  } | null;
}

export interface AcademyPlanCheckoutRequest {
  planId: Exclude<AcademyPlanId, 'trial'>;
  phoneNumber: string;
}

export interface AcademyPlanCheckoutResponse {
  message: string;
  paymentId: string;
  paypackRef: string;
  planId: Exclude<AcademyPlanId, 'trial'>;
}

export interface AcademyPlanRate {
  id: string;
  name: string;
  amount: number;
  durationDays: number;
  currency: string;
}

export const academyApi = {
  getPrograms: () => apiRequest<AcademyClass[]>('/public-academy/classes'),

  getClasses: () => apiRequest<AcademyClass[]>('/public-academy/classes'),

  getPlans: () =>
    apiRequest<{ plans: AcademyPlanRate[]; currency: string }>('/public-academy/plans'),

  getCatalogTree: () => apiRequest<AcademyCatalogTree>('/public-academy/catalog/tree'),

  getProgramById: (id: string) => apiRequest<AcademyClass>(`/public-academy/classes/${id}`),

  getClassById: (id: string) => apiRequest<AcademyClass>(`/public-academy/classes/${id}`),

  getSubscriptionSummary: () =>
    apiRequest<AcademySubscriptionSummary>('/public-academy/subscription'),

  startPlanCheckout: (data: AcademyPlanCheckoutRequest) =>
    apiRequest<AcademyPlanCheckoutResponse>('/public-academy/subscription/checkout', {
      method: 'POST',
      body: data,
    }),

  selectClass: (classRoomId: string) =>
    apiRequest<AcademySubscriptionSummary>('/public-academy/subscription/classes/select', {
      method: 'POST',
      body: { classRoomId },
    }),

  removeClass: (classRoomId: string) =>
    apiRequest<AcademySubscriptionSummary>(`/public-academy/subscription/classes/${classRoomId}`, {
      method: 'DELETE',
    }),

  getMyEnrollments: () => apiRequest<ClassEnrollment[]>('/public-academy/my-enrollments'),

  getClassContent: (classRoomId: string) =>
    apiRequest<ClassContentResponse>(`/public-academy/classes/${classRoomId}/content`),
};

export interface AcademicYearSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
  terms: Array<{ id: string; name: string; sequence: number }>;
}

export interface TermSummary {
  id: string;
  name: string;
  sequence: number;
}

export interface AcademicYearPreference {
  academicYearId: string;
  termId: string | null;
  academicYear: { id: string; name: string; isCurrent: boolean } | null;
}

export function listAcademicYearsApi(accessToken: string, params?: { isActive?: boolean }) {
  const query = params?.isActive !== undefined ? `?isActive=${params.isActive}` : '';
  return apiRequest<AcademicYearSummary[]>(`/academic-years${query}`, {
    method: 'GET',
    accessToken,
  });
}

export function getAcademicYearPreferenceApi(accessToken: string) {
  return apiRequest<AcademicYearPreference | null>('/academic-years/preference', {
    method: 'GET',
    accessToken,
  });
}

export function setAcademicYearPreferenceApi(
  accessToken: string,
  payload: { academicYearId: string; termId?: string }
) {
  return apiRequest<AcademicYearPreference>('/academic-years/preference', {
    method: 'PUT',
    accessToken,
    body: payload,
  });
}

export function getFileViewUrlApi(accessToken: string, assetId: string) {
  return apiRequest<{
    id: string;
    secureUrl: string;
    originalName: string;
    mimeType: string | null;
  }>(`/files/${assetId}/view`, {
    method: 'GET',
    accessToken,
  });
}
