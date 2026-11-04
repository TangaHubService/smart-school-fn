import { ArrowRight, Award, Briefcase, Clock, Play, Star, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';

import heroInset from '../asset/hero-inset.jpg';
import backgroundImage from '../asset/background.jpg';
import { API_BASE_URL } from '../api/client';
import { useAuth } from '../features/auth/auth.context';
import { getDefaultLandingPath } from '../features/auth/auth-helpers';
import { PublicHero, SectionHeading } from '../components/public/program-browse';
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

  return (
    <main className="bg-white">
      <PublicHero
        title="Our Leading Exam Partner for Academic and Professional Success"
        description="Smart School gives learners practical, market-relevant skills on a digital platform that automates exams, standardizes marking, and delivers real-time insights, so teachers spend less time on paperwork and every learner gets fair results."
        image={backgroundImage}
        insetImage={heroInset}
      >
        <Link
          to="/programs#enroll"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Explore programs
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          to="/login?mode=student"
          className="rounded-lg border-[1.5px] border-brand-500 px-6 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
        >
          Student entry
        </Link>
        <Link
          to="/login?mode=staff"
          className="px-3 py-3 text-sm font-medium text-slate-700 underline-offset-4 transition hover:text-brand-600 hover:underline"
        >
          Staff login
        </Link>
      </PublicHero>

      <PublicStatsSection />

      <PublicAcademyPage />

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Why Choose Us"
            subtitle="Purpose-built design and practical workflows for institutions, educators, and learners."
          />
          <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((item) => (
              <article key={item.title} className="flex gap-4">
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

      <PublicCommunityCTA />

      <section className="bg-brand-700 py-14 sm:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ready to start learning?
            </h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/85">
              Create your account, choose a plan, and enroll in the classes you need.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
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
      </section>
    </main>
  );
}

function PublicStatsSection() {
  const statsQuery = useQuery({ queryKey: ['public-stats'], queryFn: fetchPublicStats, retry: 1 });
  const data = statsQuery.data;
  const rate = data?.studentSuccessRate?.rate;

  const items = [
    { label: 'Student success rate', value: rate != null ? `${rate}%` : '—' },
    { label: 'Active users', value: data ? formatCompact(data.activeUsers) : '—' },
    { label: 'Schools', value: data ? formatCompact(data.schools) : '—' },
    { label: 'Course modules', value: data ? formatCompact(data.courseModules) : '—' },
  ];

  return (
    <section aria-label="Platform statistics" className="border-y border-slate-100 bg-white">
      <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-y-6 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <dd className="text-2xl font-semibold tracking-tight text-brand-600 sm:text-3xl">
              {item.value}
            </dd>
            <dt className="mt-1 text-[13px] text-slate-600">{item.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
