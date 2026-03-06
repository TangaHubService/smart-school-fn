import { z } from 'zod';

export function htmlToPlainText(value: string | undefined) {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatAssessmentDateTime(value: string | null | undefined) {
  if (!value) {
    return 'No due date';
  }

  return new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export const assessmentFormSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  lessonId: z.string().optional(),
  type: z.enum(['GENERAL', 'OPENENDED', 'PSYCHOMETRIC', 'INTERVIEW']),
  title: z.string().trim().min(2, 'Assessment title is required').max(160),
  instructions: z.string().max(20000).optional(),
  dueAt: z.string().optional(),
  timeLimitMinutes: z.coerce.number().int().min(1).max(240).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(5),
  isPublished: z.boolean().default(false),
});

export const questionFormSchema = z
  .object({
    prompt: z.string().trim().min(2, 'Question prompt is required').max(5000),
    explanation: z.string().trim().max(5000).optional(),
    type: z.enum(['MCQ_SINGLE', 'OPEN_TEXT']),
    points: z.coerce.number().int().min(1).max(100),
    correctOptionIndex: z.coerce.number().int().min(0).max(3).optional(),
    optionA: z.string().trim().max(500).optional(),
    optionB: z.string().trim().max(500).optional(),
    optionC: z.string().trim().max(500).optional(),
    optionD: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.type === 'MCQ_SINGLE') {
      const optionFields = [value.optionA, value.optionB, value.optionC, value.optionD];
      optionFields.forEach((option, index) => {
        if (!option?.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [`option${String.fromCharCode(65 + index)}`],
            message: `Option ${String.fromCharCode(65 + index)} is required`,
          });
        }
      });

      if (value.correctOptionIndex == null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctOptionIndex'],
          message: 'Choose the correct option',
        });
      }
    }
  });

export type AssessmentFormValues = z.infer<typeof assessmentFormSchema>;
export type QuestionFormValues = z.infer<typeof questionFormSchema>;

export const defaultAssessmentForm: AssessmentFormValues = {
  courseId: '',
  lessonId: '',
  type: 'GENERAL',
  title: '',
  instructions: '<p></p>',
  dueAt: '',
  timeLimitMinutes: undefined,
  maxAttempts: 1,
  isPublished: false,
};

export const defaultQuestionForm: QuestionFormValues = {
  prompt: '',
  explanation: '',
  type: 'MCQ_SINGLE',
  points: 1,
  correctOptionIndex: 0,
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
};

export const assessmentTypeOptions = [
  { value: 'GENERAL', label: 'General' },
  { value: 'OPENENDED', label: 'Open-ended' },
  { value: 'PSYCHOMETRIC', label: 'Psychometric' },
  { value: 'INTERVIEW', label: 'Interview' },
] as const;

export function formatAssessmentTypeLabel(value: string) {
  return assessmentTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function AssessmentStatusPill({ isPublished }: { isPublished: boolean }) {
  return (
    <span
      className={isPublished
        ? 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800'
        : 'inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800'
      }
    >
      {isPublished ? 'Published' : 'Draft'}
    </span>
  );
}
