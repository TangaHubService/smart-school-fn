import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { SectionCard } from '../components/section-card';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { getMyProfileApi, updateMyProfileApi } from '../features/users/users.api';

const SEX_OPTIONS = ['', 'Male', 'Female', 'Other'];

export function ProfilePage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['me', 'profile'],
    queryFn: () => getMyProfileApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [sex, setSex] = useState('');
  const [hasDisability, setHasDisability] = useState(false);
  const [disabilityType, setDisabilityType] = useState('');

  useEffect(() => {
    const p = profileQuery.data;
    if (p) {
      setFirstName(p.firstName ?? '');
      setLastName(p.lastName ?? '');
      setPhone(p.phone ?? '');
      setSex(p.sex ?? '');
      setHasDisability(Boolean(p.hasDisability));
      setDisabilityType(p.disabilityType ?? '');
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateMyProfileApi(auth.accessToken!, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || null,
        sex: sex || null,
        hasDisability,
        disabilityType: hasDisability ? disabilityType.trim() || null : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'profile'] });
      showToast({ type: 'success', title: 'Profile updated' });
    },
    onError: (err: unknown) => {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">User Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Names, email, phone number, sex and disability information.
        </p>
      </div>

      <SectionCard title="Identification" subtitle="Visible only to you and authorized staff">
        {profileQuery.isPending && <p className="text-sm text-slate-500">Loading profile…</p>}
        {profileQuery.isError && (
          <div className="text-sm text-red-600">
            Could not load profile.{' '}
            <button className="underline" onClick={() => profileQuery.refetch()}>
              Retry
            </button>
          </div>
        )}
        {profileQuery.data && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-brand-200 px-3 text-sm"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-brand-200 px-3 text-sm"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                value={profileQuery.data.email}
                disabled
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250788123456"
                className="mt-1 h-10 w-full rounded-lg border border-brand-200 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-brand-200 px-3 text-sm"
              >
                {SEX_OPTIONS.map((o) => (
                  <option key={o || 'none'} value={o}>
                    {o || 'Prefer not to say'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                id="hasDisability"
                type="checkbox"
                checked={hasDisability}
                onChange={(e) => setHasDisability(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="hasDisability" className="text-sm font-medium text-slate-700">
                I have a disability
              </label>
            </div>
            {hasDisability && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Disability type (optional)
                </label>
                <input
                  value={disabilityType}
                  onChange={(e) => setDisabilityType(e.target.value)}
                  placeholder="e.g. visual, hearing, mobility"
                  className="mt-1 h-10 w-full rounded-lg border border-brand-200 px-3 text-sm"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </section>
  );
}
