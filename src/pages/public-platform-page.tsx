const platformAreas = [
  {
    title: 'Super Admin',
    points: ['School onboarding', 'Tenant management', 'Governance visibility'],
  },
  {
    title: 'School Management',
    points: ['Staff operations', 'Academic setup', 'Attendance and conduct'],
  },
  {
    title: 'Teaching and Learning',
    points: ['Courses and lessons', 'Assignments and assessments', 'Exam management'],
  },
  {
    title: 'Student Experience',
    points: ['Course access', 'Assessments and submissions', 'Report cards'],
  },
  {
    title: 'Parent Experience',
    points: ['Child progress monitoring', 'Attendance visibility', 'Result access'],
  },
  {
    title: 'Security and Control',
    points: ['Permission-based access', 'Audit events', 'Tenant isolation'],
  },
];

export function PublicPlatformPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <section className="rounded-3xl border border-brand-100 bg-white/95 p-6 shadow-soft sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Platform Capabilities</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          SmartSchool is organized as one connected platform. Each role gets a focused experience while sharing the same secure
          system of record.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platformAreas.map((area) => (
          <article key={area.title} className="rounded-2xl border border-brand-100 bg-white/95 p-5 shadow-soft">
            <h2 className="text-base font-bold text-slate-900">{area.title}</h2>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              {area.points.map((point) => (
                <li key={point} className="rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
