import { useAuth } from '../features/auth/auth.context';
import { StateView } from '../components/state-view';

export function DashboardPage() {
  const auth = useAuth();

  return (
    <section className="grid gap-4">
      <StateView
        title="Welcome"
        message={`Hello ${auth.me?.firstName ?? 'User'}, your foundation workspace is ready.`}
      />
      <StateView
        title="No data yet"
        message="Student, classes, and attendance modules are intentionally deferred to Sprint 1."
      />
    </section>
  );
}
