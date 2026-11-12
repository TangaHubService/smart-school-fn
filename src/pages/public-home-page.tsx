import { ArrowRight, Award, Briefcase, Clock, Play, Sparkles, Star, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';

import backgroundImage from '../asset/background.jpg';
import { API_BASE_URL } from '../api/client';
import { useAuth } from '../features/auth/auth.context';
import { getDefaultLandingPath } from '../features/auth/auth-helpers';
import { PublicHero } from '../components/public/program-browse';
import { PublicCommunityCTA } from '../components/public/public-community-cta';
import { PageSkeleton } from '../components/skeleton-loader';
import { PublicAcademyPage } from './public-academy-page';

interface PublicStats {
  studentSuccessRate: { rate: number; passed: number; eligible: number } | null;
  activeUsers: number;
  schools: number;
  courseModules: number;
}

async function fetchPublicStats(): Promise<PublicStats> {
  const response = await fetch(`${API_BASE_URL}/public-academy/stats`);
  if (!response.ok) throw new Error('Could not load platform stats');
  const envelope = (await response.json()) as { data: PublicStats };
  return envelope.data;
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K+`;
  return String(n);
}

const reasons = [
  {
    icon: Award,
    title: 'Reliable Solution',
    desc: 'Designed for real school operations and governance workflows.',
  },
  {
    icon: Users,
    title: 'Expert Support',
    desc: 'Guidance for onboarding, setup, and institutional adoption.',
  },
  {
    icon: Clock,
    title: 'Always Available',
    desc: 'Cloud-based access for administrators, staff, and learners.',
  },
  {
    icon: Star,
    title: 'Clear Outcomes',
    desc: 'Track progress with attendance, assessments, and reports.',
  },
  {
    icon: Play,
    title: 'Interactive Learning',
    desc: 'Practical course content and assignment workflows in one place.',
  },
  {
    icon: Briefcase,
    title: 'Career Readiness',
    desc: 'Build practical capabilities aligned to market demand.',
  },
];

export function PublicHomePage() {
  const auth = useAuth();

  if (auth.isAuthenticated && auth.me) {
    return <Navigate to={getDefaultLandingPath(auth.me)} replace />;
  }

  if (auth.isLoadingSession) {
    return <PageSkeleton variant="public" fullScreen />;
  }

  return <PublicHomeContent />;
}

export function PublicHomeContent() {
  return (
    <main className="bg-white">
      <HomeHero />

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-6 sm:mb-12 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Why <span className="text-brand-500">Choose Us</span>
              </h2>
              <Link
                to="/programs#enroll"
                className="mt-5 inline-flex items-center gap-2 rounded-lg border-[1.5px] border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
              >
                Explore programs
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="flex max-w-sm items-start gap-2.5 text-sm leading-6 text-slate-600">
              <Sparkles className="mt-1 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
              Purpose-built design and practical workflows for institutions, educators, and learners.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((item) => (
              <article
                key={item.title}
                className="flex gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,39,72,0.06),0_8px_24px_rgba(15,39,72,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(15,39,72,0.08),0_14px_30px_rgba(15,39,72,0.1)] motion-reduce:transform-none"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicCommunityCTA layout="carousel" />

      <PublicAcademyPage />

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div
              className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border-[28px] border-white/10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/5"
              aria-hidden="true"
            />
            <div className="relative">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Ready to start learning?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">
                Create your account, choose a plan, and enroll in the classes you need.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  to="/login?tab=register&returnTo=/programs"
                  className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
                >
                  Create account
                </Link>
                <Link
                  to="/contact"
                  className="rounded-lg border-[1.5px] border-white/60 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
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

/** Landing hero: the shared brand hero with live platform stats under the actions. */
function HomeHero() {
  const statsQuery = useQuery({ queryKey: ['public-stats'], queryFn: fetchPublicStats, retry: 1 });
  const data = statsQuery.data;
  const rate = data?.studentSuccessRate?.rate;

  const stats = [
    { label: 'Student success rate', value: rate != null ? `${rate}%` : '—' },
    { label: 'Active users', value: data ? formatCompact(data.activeUsers) : '—' },
    { label: 'Schools', value: data ? formatCompact(data.schools) : '—' },
    { label: 'Course modules', value: data ? formatCompact(data.courseModules) : '—' },
  ];

  return (
    <PublicHero
      title="Our Leading Exam Partner for Academic and Professional Success"
      description="Smart School gives learners practical, market-relevant skills on a digital platform that automates exams, standardizes marking, and delivers real-time insights, so teachers spend less time on paperwork and every learner gets fair results."
      image={backgroundImage}
      extra={
        <dl
          aria-label="Platform statistics"
          className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 sm:flex sm:flex-wrap sm:items-center sm:gap-0 sm:divide-x sm:divide-white/25"
        >
          {stats.map((item) => (
            <div key={item.label} className="sm:px-5 sm:first:pl-0">
              <dd className="text-xl font-semibold tracking-tight sm:text-2xl">{item.value}</dd>
              <dt className="mt-0.5 text-[12px] text-white/70">{item.label}</dt>
            </div>
          ))}
        </dl>
      }
    >
      <Link
        to="/programs#enroll"
        className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
      >
        Explore programs
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <Link
        to="/login?mode=student"
        className="rounded-lg border-[1.5px] border-white/70 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Student entry
      </Link>
      <Link
        to="/login?mode=staff"
        className="px-3 py-3 text-sm font-medium text-white/90 underline-offset-4 transition hover:text-white hover:underline"
      >
        Staff login
      </Link>
    </PublicHero>
  );
}
