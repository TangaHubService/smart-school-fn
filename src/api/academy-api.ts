import { apiRequest } from './client';

export interface Program {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  section?: string | null;
  price: number;
  durationDays: number;
  classRoomId?: string | null;
  className?: string | null;
  gradeLevelId?: string | null;
  gradeLevelName?: string | null;
  classSubjectCount?: number;
  classCourseCount?: number;
  classCourseTitles?: string[];
}

export interface AcademyCatalogSubject {
  id: string;
  name: string;
  courseCount: number;
}

export interface AcademyCatalogClassRoom {
  id: string;
  name: string;
  programId: string;
  price: number;
  thumbnail: string | null;
  enrolledCount: number;
  subjects: AcademyCatalogSubject[];
}

export interface AcademyCatalogGradeLevel {
  id: string;
  name: string;
  rank: number;
  classRooms: AcademyCatalogClassRoom[];
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

/**
 * Split catalog grades (already scoped to one academic year) into lower/upper
 * level bands by rank. Titles adapt to primary naming, with a generic fallback.
 */
export function splitCatalogGradesIntoBands(
  grades: AcademyCatalogGradeLevel[]
): CatalogLevelBand[] {
  const sorted = [...grades].sort((a, b) => a.rank - b.rank);
  if (!sorted.length) return [];
  const mid = Math.ceil(sorted.length / 2);
  const groups = [sorted.slice(0, mid), sorted.slice(mid)].filter((list) => list.length > 0);
  const isPrimary = sorted.every((grade) => /primary/i.test(grade.name));
  return groups.map((bandGrades, index) => {
    const first = bandGrades[0].name;
    const last = bandGrades[bandGrades.length - 1].name;
    const classes = bandGrades.reduce((sum, grade) => sum + grade.classRooms.length, 0);
    const courses = bandGrades.reduce(
      (sum, grade) =>
        sum +
        grade.classRooms.reduce(
          (inner, room) =>
            inner + room.subjects.reduce((total, subject) => total + subject.courseCount, 0),
          0
        ),
      0
    );
    const enrolled = bandGrades.reduce(
      (sum, grade) =>
        sum + grade.classRooms.reduce((inner, room) => inner + (room.enrolledCount ?? 0), 0),
      0
    );
    const thumbnail =
      bandGrades.flatMap((grade) => grade.classRooms).find((room) => room.thumbnail?.trim())
        ?.thumbnail ?? null;
    return {
      key: index === 0 ? 'lower' : 'upper',
      title: isPrimary ? (index === 0 ? 'Lower Primary' : 'Upper Primary') : `Levels ${first} – ${last}`,
      subtitle: bandGrades.map((grade) => grade.name).join(' · '),
      grades: bandGrades,
      classes,
      courses,
      enrolled,
      thumbnail,
    };
  });
}

export interface AcademyCatalogAcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
  gradeLevels: AcademyCatalogGradeLevel[];
}

export interface AcademyCatalogTree {
  academicYears: AcademyCatalogAcademicYear[];
}

export interface ProgramEnrollment {
  id: string;
  programId: string;
  userId: string;
  isActive: boolean;
  isTrial?: boolean;
  expiresAt: string | null;
  program: Program;
}

export interface PurchaseRequest {
  programId: string;
  phoneNumber: string;
  planId: string;
}

export interface PurchaseResponse {
  message: string;
  paymentId: string;
  paypackRef: string;
}

export interface ProgramContentResponse {
  programId: string;
  programTitle: string;
  course: any; // We can refine this type based on the Course model if needed
}

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
    programId: string;
    programTitle: string;
    expiresAt: string | null;
    isTrial: boolean;
    isLegacy: boolean;
  }>;
  accessibleClasses: Array<{
    classRoomId: string;
    className: string;
    gradeLevelName: string;
    thumbnail: string | null;
    programId: string;
    programTitle: string;
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
  getPrograms: () => apiRequest<Program[]>('/public-academy/programs'),

  getPlans: () =>
    apiRequest<{ plans: AcademyPlanRate[]; currency: string }>('/public-academy/plans'),

  getCatalogTree: () => apiRequest<AcademyCatalogTree>('/public-academy/catalog/tree'),

  getProgramById: (id: string) => apiRequest<Program>(`/public-academy/programs/${id}`),

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

  selectProgram: (programId: string) =>
    apiRequest<AcademySubscriptionSummary>('/public-academy/subscription/programs/select', {
      method: 'POST',
      body: { programId },
    }),

  removeProgram: (programId: string) =>
    apiRequest<AcademySubscriptionSummary>(`/public-academy/subscription/programs/${programId}`, {
      method: 'DELETE',
    }),

  purchaseProgram: (data: PurchaseRequest) =>
    apiRequest<PurchaseResponse>('/public-academy/purchase', {
      method: 'POST',
      body: data,
    }),

  getMyEnrollments: () => apiRequest<ProgramEnrollment[]>('/public-academy/my-enrollments'),

  getProgramContent: (id: string) =>
    apiRequest<ProgramContentResponse>(`/public-academy/programs/${id}/content`),

  getClassContent: (classRoomId: string) =>
    apiRequest<ProgramContentResponse>(`/public-academy/classes/${classRoomId}/content`),
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
