import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <main
      className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: 'url(/authbac.jpeg)' }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#173C7F]/60 via-black/40 to-black/70"
        aria-hidden="true"
      />
      <div className="absolute -top-48 left-8 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />
      <div
        className="absolute -bottom-56 right-8 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl"
        aria-hidden="true"
      />

      <section className="relative z-10 w-full max-w-md rounded-3xl border-white/30 bg-white/75 p-6 text-center shadow-[0_40px_120px_-40px_rgba(0,0,0,0.6)] ring-1 ring-white/20 backdrop-blur-xl sm:p-8">
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
