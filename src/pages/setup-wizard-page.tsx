import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { LocationPicker, type LocationPickerValue } from '../features/location/location-picker';
import { schoolSetupStatusApi, setupSchoolApi } from '../features/sprint1/sprint1.api';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';
import { ApiClientError } from '../types/api';

const schoolProfileSchema = z.object({
  schoolDisplayName: z.string().trim().min(2).max(120),
  schoolEmail: z.string().trim().email().optional().or(z.literal('')),
  schoolPhone: z.string().trim().min(7).max(40),
  schoolAddressLine1: z.string().trim().max(200).optional().or(z.literal('')),
  schoolAddressLine2: z.string().trim().max(200).optional().or(z.literal('')),
  logoUrl: z.string().trim().url().optional().or(z.literal('')),
});

type SchoolProfileValues = z.infer<typeof schoolProfileSchema>;

const emptyLocation: LocationPickerValue = { adminCountryCode: '' };

function buildDefaultValues(tenantName: string): SchoolProfileValues {
  return {
    schoolDisplayName: tenantName,
    schoolEmail: '',
    schoolPhone: '',
    schoolAddressLine1: '',
    schoolAddressLine2: '',
    logoUrl: '',
  };
}

export function SetupWizardPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<SchoolProfileValues>({
    resolver: zodResolver(schoolProfileSchema),
    defaultValues: buildDefaultValues(auth.me?.tenant.name ?? ''),
  });

  const [location, setLocation] = useState<LocationPickerValue>(emptyLocation);

  const schoolSetupStatusQuery = useQuery({
    queryKey: ['school-setup-status'],
    queryFn: () => schoolSetupStatusApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });

  const saveProfileMutation = useMutation({
    mutationFn: (values: SchoolProfileValues) =>
      setupSchoolApi(auth.accessToken!, {
        school: {
          displayName: values.schoolDisplayName,
          email: values.schoolEmail || undefined,
          phone: values.schoolPhone,
          addressLine1: values.schoolAddressLine1 || undefined,
          addressLine2: values.schoolAddressLine2 || undefined,
          adminCountryCode: location.adminCountryCode || undefined,
          adminLevel1: location.adminLevel1,
          adminLevel2: location.adminLevel2,
          adminLevel3: location.adminLevel3,
          adminLevel4: location.adminLevel4,
          logoUrl: values.logoUrl || undefined,
        },
        markSetupComplete: true,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['school-setup-status'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
    },
  });

  useEffect(() => {
    const school = (schoolSetupStatusQuery.data as any)?.school;
    if (!school) {
      form.reset(buildDefaultValues(auth.me?.tenant.name ?? ''));
      return;
    }

    form.reset({
      schoolDisplayName: school.displayName ?? auth.me?.tenant.name ?? '',
      schoolEmail: school.email ?? '',
      schoolPhone: school.phone ?? '',
      schoolAddressLine1: school.addressLine1 ?? '',
      schoolAddressLine2: school.addressLine2 ?? '',
      logoUrl: school.logoUrl ?? '',
    });
  }, [schoolSetupStatusQuery.data, form, auth.me?.tenant.name]);

  const apiError = saveProfileMutation.error as ApiClientError | null;
  const setupComplete = Boolean((schoolSetupStatusQuery.data as any)?.isSetupComplete);
  const savedSchool = (schoolSetupStatusQuery.data as any)?.school;

  return (
    <SectionCard
      title="School Profile"
      subtitle="Complete school contact information and address details. Academic years, classes, subjects, and staff stay in the sidebar."
      action={
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-slate-800">
          {setupComplete ? 'Completed' : 'Action required'}
        </span>
      }
    >
      {schoolSetupStatusQuery.isPending ? (
        <div className="mb-4 h-8 animate-pulse rounded-lg bg-brand-100" />
      ) : null}

      {schoolSetupStatusQuery.isError ? (
        <StateView
          title="Could not load school profile"
          message="Retry to continue with the latest school details."
          action={
            <button
              type="button"
              onClick={() => void schoolSetupStatusQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!schoolSetupStatusQuery.isError ? (
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit((values) => saveProfileMutation.mutate(values))}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-brand-200 bg-slate-50">
              {form.watch('logoUrl') ? (
                <img
                  src={form.watch('logoUrl')}
                  alt="School logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  No Logo
                </div>
              )}
            </div>
            <div className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">School Logo</span>
              <p className="text-xs text-slate-500">Upload your logo (png, jpg, max 2MB)</p>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const asset = await uploadFileToCloudinary(auth.accessToken!, 'logo', file);
                    form.setValue('logoUrl', asset.secureUrl, { shouldDirty: true });
                  } catch (err: any) {
                    showToast({ type: 'error', title: 'Logo upload failed', message: err.message });
                  }
                }}
                className="mt-1 block text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            School display name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2"
              {...form.register('schoolDisplayName')}
            />
          </label>
          <FieldError message={form.formState.errors.schoolDisplayName?.message} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School email (optional)
              <input
                className="rounded-lg border border-brand-200 px-3 py-2"
                {...form.register('schoolEmail')}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              School phone
              <input
                className="rounded-lg border border-brand-200 px-3 py-2"
                {...form.register('schoolPhone')}
              />
            </label>
          </div>
          <FieldError message={form.formState.errors.schoolEmail?.message} />
          <FieldError message={form.formState.errors.schoolPhone?.message} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Address line (optional)
              <input
                className="rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Road, plot, or landmark"
                {...form.register('schoolAddressLine1')}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              Address line 2 (optional)
              <input
                className="rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Building or additional note"
                {...form.register('schoolAddressLine2')}
              />
            </label>
          </div>

          <LocationPicker
            key={schoolSetupStatusQuery.isPending ? 'pending' : 'ready'}
            initialValue={{
              adminCountryCode: savedSchool?.adminCountryCode ?? '',
              adminLevel1: savedSchool?.adminLevel1 ?? undefined,
              adminLevel2: savedSchool?.adminLevel2 ?? undefined,
              adminLevel3: savedSchool?.adminLevel3 ?? undefined,
              adminLevel4: savedSchool?.adminLevel4 ?? undefined,
            }}
            onChange={setLocation}
          />

          {apiError ? (
            <StateView title="Could not save school profile" message={apiError.message} />
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saveProfileMutation.isPending}
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saveProfileMutation.isPending ? 'Saving...' : 'Save school profile'}
            </button>
          </div>
        </form>
      ) : null}

      {saveProfileMutation.data ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          School profile saved successfully. Continue using the sidebar to configure academics,
          classes, subjects, staff, and students.
        </div>
      ) : null}
    </SectionCard>
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
