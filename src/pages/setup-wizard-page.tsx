import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import {
  inviteStaffApi,
  schoolSetupStatusApi,
  setupSchoolApi,
} from '../features/sprint1/sprint1.api';
import { ApiClientError } from '../types/api';

const wizardSchema = z.object({
  schoolDisplayName: z.string().trim().min(2).max(120),
  schoolEmail: z.string().trim().email().optional().or(z.literal('')),
  schoolPhone: z.string().trim().max(40).optional(),

  academicYearName: z.string().trim().min(2).max(100),
  academicYearStart: z.string().min(10),
  academicYearEnd: z.string().min(10),
  term1Name: z.string().trim().min(2).max(100),
  term1Start: z.string().min(10),
  term1End: z.string().min(10),
  term2Name: z.string().trim().max(100).optional(),
  term2Start: z.string().optional(),
  term2End: z.string().optional(),

  gradeCode: z.string().trim().min(1).max(30),
  gradeName: z.string().trim().min(2).max(80),
  classCode: z.string().trim().min(1).max(30),
  className: z.string().trim().min(1).max(80),
  classCapacity: z.coerce.number().int().min(1).max(200).optional(),

  subjectCode: z.string().trim().min(1).max(30),
  subjectName: z.string().trim().min(2).max(100),
  subjectIsCore: z.boolean().default(true),

  inviteEmail: z.string().trim().email().optional().or(z.literal('')),
  inviteRoleName: z.string().trim().min(2).max(60).default('TEACHER'),
});

type WizardValues = z.infer<typeof wizardSchema>;

const stepFields: Array<Array<keyof WizardValues>> = [
  ['schoolDisplayName', 'schoolEmail', 'schoolPhone'],
  [
    'academicYearName',
    'academicYearStart',
    'academicYearEnd',
    'term1Name',
    'term1Start',
    'term1End',
    'term2Name',
    'term2Start',
    'term2End',
  ],
  ['gradeCode', 'gradeName', 'classCode', 'className', 'classCapacity'],
  ['subjectCode', 'subjectName', 'subjectIsCore'],
  ['inviteEmail', 'inviteRoleName'],
];

const steps = [
  'School profile',
  'Academic year & terms',
  'Grade level & class',
  'Subjects',
  'Invite staff',
];

function buildDefaultWizardValues(tenantName: string): WizardValues {
  return {
    schoolDisplayName: tenantName,
    schoolEmail: '',
    schoolPhone: '',

    academicYearName: '2026/2027',
    academicYearStart: '2026-09-01',
    academicYearEnd: '2027-07-15',
    term1Name: 'Term 1',
    term1Start: '2026-09-01',
    term1End: '2026-12-15',
    term2Name: 'Term 2',
    term2Start: '2027-01-10',
    term2End: '2027-04-20',

    gradeCode: 'G1',
    gradeName: 'Grade 1',
    classCode: 'G1-A',
    className: 'Grade 1 A',
    classCapacity: 40,

    subjectCode: 'MATH',
    subjectName: 'Mathematics',
    subjectIsCore: true,

    inviteEmail: '',
    inviteRoleName: 'TEACHER',
  };
}

export function SetupWizardPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const draftKey = useMemo(
    () => `ssr_setup_wizard_draft_${auth.me?.tenant.id ?? 'unknown'}`,
    [auth.me?.tenant.id],
  );

  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: buildDefaultWizardValues(auth.me?.tenant.name ?? ''),
  });

  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<WizardValues>;
      form.reset({
        ...buildDefaultWizardValues(auth.me?.tenant.name ?? ''),
        ...parsed,
      });
    } catch (_error) {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, form, auth.me?.tenant.name]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(draftKey, JSON.stringify(values));
      setLastDraftSavedAt(new Date().toLocaleTimeString());
    });

    return () => subscription.unsubscribe();
  }, [draftKey, form]);

  const setupStatusQuery = useQuery({
    queryKey: ['school-setup-status'],
    queryFn: () => schoolSetupStatusApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });

  const completeMutation = useMutation({
    mutationFn: async (values: WizardValues) => {
      const terms = [
        {
          name: values.term1Name,
          sequence: 1,
          startDate: values.term1Start,
          endDate: values.term1End,
        },
      ];

      if (values.term2Name && values.term2Start && values.term2End) {
        terms.push({
          name: values.term2Name,
          sequence: 2,
          startDate: values.term2Start,
          endDate: values.term2End,
        });
      }

      const setupResult = await setupSchoolApi(auth.accessToken!, {
        school: {
          displayName: values.schoolDisplayName,
          email: values.schoolEmail || undefined,
          phone: values.schoolPhone || undefined,
          country: 'Rwanda',
          timezone: 'Africa/Kigali',
        },
        academicYear: {
          name: values.academicYearName,
          startDate: values.academicYearStart,
          endDate: values.academicYearEnd,
          isCurrent: true,
          terms,
        },
        gradeLevels: [
          {
            code: values.gradeCode,
            name: values.gradeName,
            rank: 1,
            classes: [
              {
                code: values.classCode,
                name: values.className,
                capacity: values.classCapacity,
              },
            ],
          },
        ],
        subjects: [
          {
            code: values.subjectCode,
            name: values.subjectName,
            isCore: values.subjectIsCore,
          },
        ],
        markSetupComplete: true,
      });

      let inviteResult: unknown = null;
      if (values.inviteEmail) {
        inviteResult = await inviteStaffApi(auth.accessToken!, {
          email: values.inviteEmail,
          roleName: values.inviteRoleName,
          expiresInDays: 7,
        });
      }

      return { setupResult, inviteResult };
    },
    onSuccess: async (_result, values) => {
      localStorage.removeItem(draftKey);
      setLastDraftSavedAt(null);
      form.reset(values);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['school-setup-status'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
    },
  });

  const apiError = completeMutation.error as ApiClientError | null;

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  async function onNextStep() {
    const isValid = await form.trigger(stepFields[step]);
    if (!isValid) {
      return;
    }

    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function onPreviousStep() {
    setStep((prev) => Math.max(prev - 1, 0));
  }

  function onSaveDraft() {
    localStorage.setItem(draftKey, JSON.stringify(form.getValues()));
    setLastDraftSavedAt(new Date().toLocaleTimeString());
  }

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty || completeMutation.isPending) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [form.formState.isDirty, completeMutation.isPending]);

  return (
    <SectionCard
      title="School Setup Wizard"
      subtitle="Complete onboarding in less than 10 minutes."
      action={
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">
          Step {step + 1}/{steps.length}
        </span>
      }
    >
      <div className="mb-4 h-2 rounded-full bg-brand-100">
        <div
          className="h-2 rounded-full bg-brand-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mb-4 grid gap-2 text-xs text-brand-700 sm:grid-cols-5">
        {steps.map((name, index) => (
          <li
            key={name}
            className={index === step ? 'font-bold text-brand-900' : undefined}
          >
            {index + 1}. {name}
          </li>
        ))}
      </ol>

      {setupStatusQuery.isPending ? (
        <div className="mb-4 h-8 animate-pulse rounded-lg bg-brand-100" />
      ) : null}

      {setupStatusQuery.isError ? (
        <StateView
          title="Could not load setup status"
          message="Retry to continue with the latest setup state."
          action={
            <button
              type="button"
              onClick={() => void setupStatusQuery.refetch()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {setupStatusQuery.data ? (
        <p className="mb-4 text-xs text-brand-700">
          Setup completed: {String((setupStatusQuery.data as any).isSetupComplete)}
        </p>
      ) : null}

      <form
        className="grid gap-3"
        onSubmit={form.handleSubmit((values) => completeMutation.mutate(values))}
      >
        {step === 0 ? <StepSchoolProfile form={form} /> : null}
        {step === 1 ? <StepAcademicYear form={form} /> : null}
        {step === 2 ? <StepClasses form={form} /> : null}
        {step === 3 ? <StepSubjects form={form} /> : null}
        {step === 4 ? <StepInvite form={form} /> : null}

        {apiError ? (
          <StateView title="Setup failed" message={apiError.message} />
        ) : null}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPreviousStep}
              disabled={step === 0}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onSaveDraft}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
            >
              Save draft
            </button>
          </div>

          <div className="flex items-center gap-2">
            {lastDraftSavedAt ? (
              <p className="text-xs text-brand-600" aria-live="polite">
                Draft saved at {lastDraftSavedAt}
              </p>
            ) : null}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={onNextStep}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Next step
              </button>
            ) : (
              <button
                type="submit"
                disabled={completeMutation.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {completeMutation.isPending ? 'Completing setup...' : 'Complete setup'}
              </button>
            )}
          </div>
        </div>
      </form>

      {completeMutation.data ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Setup completed successfully.
        </div>
      ) : null}
    </SectionCard>
  );
}

function StepSchoolProfile({ form }: { form: UseFormReturn<WizardValues> }) {
  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-brand-800">
        School display name
        <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('schoolDisplayName')} />
      </label>
      <FieldError message={form.formState.errors.schoolDisplayName?.message} />

      <label className="grid gap-1 text-sm font-semibold text-brand-800">
        School email (optional)
        <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('schoolEmail')} />
      </label>
      <FieldError message={form.formState.errors.schoolEmail?.message} />

      <label className="grid gap-1 text-sm font-semibold text-brand-800">
        School phone (optional)
        <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('schoolPhone')} />
      </label>
    </>
  );
}

function StepAcademicYear({ form }: { form: UseFormReturn<WizardValues> }) {
  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-brand-800">
        Academic year label
        <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('academicYearName')} />
      </label>
      <FieldError message={form.formState.errors.academicYearName?.message} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Year start
          <input type="date" className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('academicYearStart')} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Year end
          <input type="date" className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('academicYearEnd')} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Term 1 name
          <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('term1Name')} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Term 2 name (optional)
          <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('term2Name')} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Term 1 start
          <input type="date" className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('term1Start')} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Term 1 end
          <input type="date" className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('term1End')} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Term 2 start
          <input type="date" className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('term2Start')} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Term 2 end
          <input type="date" className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('term2End')} />
        </label>
      </div>
    </>
  );
}

function StepClasses({ form }: { form: UseFormReturn<WizardValues> }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Grade code
          <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('gradeCode')} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Grade name
          <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('gradeName')} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Class code
          <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('classCode')} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Class name
          <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('className')} />
        </label>
      </div>

      <label className="grid gap-1 text-sm font-semibold text-brand-800">
        Class capacity
        <input type="number" className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('classCapacity', { valueAsNumber: true })} />
      </label>
    </>
  );
}

function StepSubjects({ form }: { form: UseFormReturn<WizardValues> }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Subject code
          <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('subjectCode')} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-brand-800">
          Subject name
          <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('subjectName')} />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800">
        <input type="checkbox" {...form.register('subjectIsCore')} />
        Core subject
      </label>
    </>
  );
}

function StepInvite({ form }: { form: UseFormReturn<WizardValues> }) {
  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-brand-800">
        Staff email (optional)
        <input type="email" className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('inviteEmail')} />
      </label>
      <FieldError message={form.formState.errors.inviteEmail?.message} />

      <label className="grid gap-1 text-sm font-semibold text-brand-800">
        Role name
        <input className="rounded-lg border border-brand-200 px-3 py-2" {...form.register('inviteRoleName')} />
      </label>
    </>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-xs text-red-700" aria-live="polite">
      {message}
    </p>
  );
}
