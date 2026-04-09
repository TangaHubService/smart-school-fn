import { ArrowRight, Award, Clock, Play, Star, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import backgroundImage from '../asset/background.jpg';
import { useAuth } from '../features/auth/auth.context';
import { getDefaultLandingPath } from '../features/auth/auth-helpers';
import { PublicCommunityCTA } from '../components/public/public-community-cta';
import { PublicAcademyProgramsShowcase } from '../components/public/public-academy-showcase';

const programs = [
  {
    title: 'Governance, Administration & Policy',
    description:
      'Administrative assistants, accountants, HR officers, project staff, and policy support roles that keep institutions operating effectively.',
  },
  {
    title: 'Education, Research & Training',
    description:
      'Primary and secondary teaching, TVET instruction, tutoring, research support, and curriculum development for modern learning.',
  },
  {
    title: 'Health, Social Services & Welfare',
    description:
      'Nursing, community health, welfare support, and frontline service skills that strengthen social well-being and care delivery.',
  },
  {
    title: 'ICT, Technology & Innovation',
    description:
      'IT support, software practice, data operations, and digital innovation paths for Rwanda’s expanding technology economy.',
  },
  {
    title: 'Infrastructure, Construction & Manufacturing',
    description:
      'Engineering support, site supervision, technical trades, and production quality competencies for infrastructure growth.',
  },
  {
    title: 'Business, Finance, Trade & Hospitality',
    description:
      'Customer service, sales, accounting, credit, and business operations capabilities across retail, service, and enterprise sectors.',
  },
];

const reasons = [
  { icon: Award, title: 'Reliable Solution', desc: 'Designed for real school operations and governance workflows.' },
  { icon: Users, title: 'Expert Support', desc: 'Guidance for onboarding, setup, and institutional adoption.' },
  { icon: Clock, title: 'Always Available', desc: 'Cloud-based access for administrators, staff, and learners.' },
  { icon: Star, title: 'Clear Outcomes', desc: 'Track progress with attendance, assessments, and reports.' },
  { icon: Play, title: 'Interactive Learning', desc: 'Practical course content and assignment workflows in one place.' },
  { icon: ArrowRight, title: 'Career Readiness', desc: 'Build practical capabilities aligned to market demand.' },
];

export function PublicHomePage() {
  const auth = useAuth();

  if (auth.isAuthenticated && auth.me) {
    return <Navigate to={getDefaultLandingPath(auth.me)} replace />;
  }

  if (auth.isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="bg-white">
      <section
        className="relative flex h-[78vh] items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">Smart School Rwanda</p>
            <h1 className="text-3xl font-bold font-display leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Rwanda's Leading Exam Partner for Academic and Professional Success
            </h1>
            <p className="mx-auto mt-6 hidden max-w-4xl text-lg font-medium leading-relaxed text-gray-100 md:block">
              Smart School Rwanda empowers learners with practical, market-relevant skills through a digital platform that automates exams, standardizes marking, and delivers real-time insights, reducing teachers’ workload while improving fairness, learning outcomes, and access to quality, lifelong education across Rwanda for all.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/login?mode=staff"
                className="group rounded-full bg-brand-500 px-9 py-3 text-[13px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-brand-600"
              >
                Staff Login
              </Link>
              <Link
                to="/login?mode=student"
                className="rounded-full border border-white/40 bg-emerald-600 px-9 py-3 text-[13px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-700"
              >
                Student Entry
              </Link>
              <Link
                to="/courses"
                className="rounded-full border border-white/40 bg-white/10 px-9 py-3 text-[13px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-white/20"
              >
                Explore courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicAcademyProgramsShowcase
        eyebrow="Open enrollment"
        title="Featured academy programs"
        subtitle="Real offerings from your catalog. Activate a plan on the academy page, then choose up to 3 subjects."
        limit={6}
        ctaHref="/academy"
        ctaLabel="Full catalog & plans"
      />

      <section className="bg-slate-50 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">Featured Programs</h2>
            <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-brand-500" />
            <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-500">
              Industry-relevant pathways focused on employability, productivity, and lifelong learning.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {programs.map((program, index) => {
              const wide = index % 2 === 0;
              return (
                <article
                  key={program.title}
                  className={[
                    'rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(0,0,0,0.08)]',
                    wide ? 'lg:col-span-7' : 'lg:col-span-5',
                  ].join(' ')}
                >
                  <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Star className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">{program.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">{program.description}</p>
                  <Link to="/courses" className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-brand-600">
                    Explore details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">Why Choose Us</h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-500">
              Purpose-built design and practical workflows for institutions, educators, and learners.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((item) => (
              <article
                key={item.title}
                className="group rounded-3xl border border-slate-100 bg-slate-50 p-7 transition hover:-translate-y-1 hover:bg-brand-500 hover:text-white"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 transition-colors group-hover:text-white/85">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-300 py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto inline-block rounded-[36px] border border-white/35 bg-white/15 p-2 backdrop-blur-sm">
            <div className="rounded-[32px] border border-white/35 bg-white/15 px-10 py-12">
              <p className="text-7xl font-black italic leading-none text-white sm:text-8xl">98%</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.26em] text-white">Student Success Rate</p>
            </div>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 text-white md:grid-cols-3">
            <div>
              <p className="text-3xl font-bold tracking-tight">25K+</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">85+</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Global Partners</p>
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">450+</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Course Modules</p>
            </div>
          </div>
        </div>
      </section>

      <PublicCommunityCTA />

      <section className="bg-white py-20">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand-500 p-12 text-center text-white shadow-[0_30px_60px_rgba(30,90,168,0.30)]">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-400 to-brand-500 opacity-70" />
            <div className="relative">
              <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-4xl">Ready to Start Learning?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
                Join thousands of learners already transforming their careers through practical digital education.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/login?tab=register&returnTo=/academy"
                  className="rounded-full bg-white px-9 py-3 text-xs font-black uppercase tracking-[0.14em] text-brand-600"
                >
                  Create account now
                </Link>
                <Link
                  to="/contact"
                  className="rounded-full border border-white/40 bg-white/10 px-9 py-3 text-xs font-black uppercase tracking-[0.14em] text-white"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
