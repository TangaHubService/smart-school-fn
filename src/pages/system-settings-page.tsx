import { Lock, Mail, Save } from 'lucide-react';
import { useState } from 'react';

import { SectionCard } from '../components/section-card';

// TODO: Replace with API call when backend is ready
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { getSystemSettingsApi, updateSystemSettingsApi } from '../features/settings/settings.api';

export function SystemSettingsPage() {
  const [saved, setSaved] = useState(false);

  // TODO: Integrate with backend when API is available
  // const { data } = useQuery({
  //   queryKey: ['system-settings'],
  //   queryFn: () => getSystemSettingsApi(accessToken),
  // });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">System Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Platform-wide configuration. Ready for backend integration.
        </p>
      </div>

      <SectionCard title="General" subtitle="Basic platform settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Platform Name</label>
            <input
              type="text"
              defaultValue="Smart School Rwanda"
              className="mt-1 h-10 w-full max-w-md rounded-lg border border-brand-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Default Language</label>
            <select className="mt-1 h-10 w-full max-w-md rounded-lg border border-brand-200 px-3 text-sm">
              <option>English</option>
              <option>Kinyarwanda</option>
              <option>French</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Security" subtitle="Authentication and security settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Session Timeout (minutes)</label>
            <input
              type="number"
              defaultValue={30}
              className="mt-1 h-10 w-full max-w-md rounded-lg border border-brand-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Lock className="h-4 w-4" />
              Require 2FA for admins
            </label>
            <input type="checkbox" defaultChecked={false} className="mt-2" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Notifications" subtitle="Email and notification preferences">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Mail className="h-4 w-4" />
              System notification emails
            </label>
            <input type="checkbox" defaultChecked={true} className="mt-2" />
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </section>
  );
}
