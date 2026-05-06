import { z } from 'zod';

import { AuditorLevel, GovAuditType } from './gov.api';

export const auditorLevelOptions = ['NATIONAL', 'PROVINCE', 'DISTRICT', 'SECTOR'] as const;
export const govAuditTypeOptions = [
  'ACADEMIC',
  'FINANCIAL',
  'INFRASTRUCTURE',
  'COMPLIANCE',
] as const;

const isoDateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date');

function validateAuditorLocation(
  value: {
    level: AuditorLevel;
    province: string;
    district: string;
    sector: string;
  },
  context: z.RefinementCtx
) {
  if (value.level === 'PROVINCE' && !value.province.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['province'],
      message: 'Province is required for province level.',
    });
  }

  if (value.level === 'DISTRICT') {
    if (!value.province.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['province'],
        message: 'Province is required for district level.',
      });
    }

    if (!value.district.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['district'],
        message: 'District is required for district level.',
      });
    }
  }

  if (value.level === 'SECTOR') {
    if (!value.province.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['province'],
        message: 'Province is required for sector level.',
      });
    }

    if (!value.district.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['district'],
        message: 'District is required for sector level.',
      });
    }

    if (!value.sector.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sector'],
        message: 'Sector is required for sector level.',
      });
    }
  }
}

const assignmentLocationShape = {
  level: z.enum(auditorLevelOptions),
  country: z.string().trim().min(2, 'Country is required.').max(80),
  province: z.string().trim().max(80),
  district: z.string().trim().max(80),
  sector: z.string().trim().max(80),
};

export const govAuditorCreateFormSchema = z
  .object({
    ...assignmentLocationShape,
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
    firstName: z.string().trim().min(2, 'First name is too short.').max(80),
    lastName: z.string().trim().min(2, 'Last name is too short.').max(80),
    phone: z.string().trim().max(40),
  })
  .superRefine((value, context) => {
    validateAuditorLocation(value, context);
  });

export type GovAuditorCreateFormValue = z.infer<typeof govAuditorCreateFormSchema>;

export const defaultGovAuditorCreateForm: GovAuditorCreateFormValue = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  level: 'NATIONAL',
  country: 'Rwanda',
  province: '',
  district: '',
  sector: '',
};

export const govAuditorAssignmentFormSchema = z
  .object({
    ...assignmentLocationShape,
    notes: z.string().trim().max(400),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .superRefine((value, context): void => {
    validateAuditorLocation(value, context);

    if (value.startsAt && !isoDateInputSchema.safeParse(value.startsAt).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startsAt'],
        message: 'Choose a valid start date.',
      });
    }

    if (value.endsAt && !isoDateInputSchema.safeParse(value.endsAt).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'Choose a valid end date.',
      });
    }

    if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startsAt'],
        message: 'Start date must be before end date.',
      });
    }
  });

export type GovAuditorAssignmentFormValue = z.infer<typeof govAuditorAssignmentFormSchema>;

export const defaultGovAuditorAssignmentForm: GovAuditorAssignmentFormValue = {
  level: 'NATIONAL',
  country: 'Rwanda',
  province: '',
  district: '',
  sector: '',
  notes: '',
  startsAt: '',
  endsAt: '',
};

export const govPlanAuditFormSchema = z.object({
  schoolId: z.string().uuid('Select a school in scope.'),
  auditorUserId: z.string(),
  auditType: z.enum(govAuditTypeOptions),
  plannedDate: isoDateInputSchema,
  planNotes: z.string().trim().max(800),
});

export type GovPlanAuditFormValue = z.infer<typeof govPlanAuditFormSchema>;

export function buildDefaultGovPlanAuditForm(schoolId?: string): GovPlanAuditFormValue {
  return {
    schoolId: schoolId ?? '',
    auditorUserId: '',
    auditType: 'ACADEMIC',
    plannedDate: new Date().toISOString().slice(0, 10),
    planNotes: '',
  };
}

export const govAuditReportFormSchema = z.object({
  teachingQuality: z.number().int().min(1).max(5),
  infrastructure: z.number().int().min(1).max(5),
  discipline: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3, 'Comment is required.').max(1200),
  findings: z.string().trim().min(3, 'Findings are required.').max(2000),
  recommendations: z.string().trim().min(3, 'Recommendations are required.').max(2000),
});

export type GovAuditReportFormValue = z.infer<typeof govAuditReportFormSchema>;

export const defaultGovAuditReportForm: GovAuditReportFormValue = {
  teachingQuality: 3,
  infrastructure: 3,
  discipline: 3,
  comment: '',
  findings: '',
  recommendations: '',
};

export const govIncidentFeedbackFormSchema = z.object({
  body: z.string().trim().min(3, 'Feedback is required.').max(1200),
});

export type GovIncidentFeedbackFormValue = z.infer<typeof govIncidentFeedbackFormSchema>;

export const defaultGovIncidentFeedbackForm: GovIncidentFeedbackFormValue = {
  body: '',
};

export function resetLocationForLevel<
  T extends { level: AuditorLevel; province: string; district: string; sector: string },
>(level: AuditorLevel, value: T): T {
  return {
    ...value,
    province: level === 'NATIONAL' ? '' : value.province,
    district: level === 'NATIONAL' || level === 'PROVINCE' ? '' : value.district,
    sector: level === 'SECTOR' ? value.sector : '',
  };
}

export function getFirstFormErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Please review the form fields and try again.';
}
