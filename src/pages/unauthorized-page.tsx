import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="max-w-md rounded-2xl border border-brand-100 bg-white p-6 text-center shadow-soft">
        <h1 className="text-xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-700">
          Your current role does not include permission for this page.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
