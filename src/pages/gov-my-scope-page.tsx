import { useQuery } from '@tanstack/react-query';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { EmptyState } from '../components/empty-state';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { listGovAuditorScopesApi } from '../features/gov/gov.api';
import { GovAuditorScope } from '../features/gov/gov.api';

export function GovMyScopePage() {
  const auth = useAuth();
  const { showToast } = useToast();

  const scopesQuery = useQuery({
    queryKey: ['my-scopes'],
    queryFn: () => listGovAuditorScopesApi(auth.accessToken!, auth.me?.id ?? ''),
  });

  if (scopesQuery.isPending) {
    return (
      <SectionCard title="My Scopes">
        <StateView
          title="Loading"
          message="Loading your assigned scopes..."
        />
      </SectionCard>
    );
  }

  if (scopesQuery.isError) {
    showToast({ type: 'error', title: 'Could not load scopes', message: 'Please try again later.' });
    return (
      <SectionCard title="My Scopes">
        <StateView
          title="Error"
          message="Failed to load your scopes."
        />
      </SectionCard>
    );
  }

  const scopes = scopesQuery.data?.items ?? [];

  if (!scopes.length) {
    return (
      <SectionCard title="My Scopes">
        <EmptyState title="No scope assigned" message="Your account has no active oversight region yet." />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="My Scopes">
      <div className="space-y-4">
        {scopes.map((s: GovAuditorScope) => (
          <div key={s.id} className="border rounded p-3">
            <h3 className="font-semibold">{s.scopeLevel}</h3>
            <p className="text-sm text-gray-700">
              {s.scopeLevel === 'COUNTRY' && s.country}
              {s.scopeLevel === 'PROVINCE' && `${s.province ?? '—'}, ${s.country}`}
              {s.scopeLevel === 'DISTRICT' && `${s.district ?? '—'}, ${s.province ?? '—'}, ${s.country}`}
              {s.scopeLevel === 'SECTOR' && `${s.sector ?? '—'}, ${s.district ?? '—'}, ${s.province ?? '—'}, ${s.country}`}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
