import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';

export function SubscriptionManagementPage() {
  return (
    <SectionCard
      title="Subscription Management"
      subtitle="Coming soon – manage plans, billing, and school subscriptions from a single place."
    >
      <div className="grid gap-4">
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Super Admin Workspace
          </p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            Central billing hub for all schools
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This screen will let you review active subscriptions, upcoming renewals, and plan usage across Rwanda schools.
          </p>
        </div>

        <StateView
          title="Design-first placeholder"
          message="Product and engineering are finalising subscription flows. Expect full functionality here soon."
        />
      </div>
    </SectionCard>
  );
}

