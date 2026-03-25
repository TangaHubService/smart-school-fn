import { ArrowRight, BookOpen, Check, Star, TrendingUp, Users, Award } from 'lucide-react';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PublicCommunityCTA } from '../components/public/public-community-cta';
import { PublicAcademyProgramsShowcase } from '../components/public/public-academy-showcase';

import backgroundImage from '../asset/background.jpg';

const courses = [
  {
    title: 'Governance, Administration & Policy',
    description: 'Roles in administration, accounting, HR, procurement, and policy execution.',
  },
  {
    title: 'Education, Research & Training',
    description: 'Teaching, tutoring, curriculum design, and institutional learning improvement.',
  },
  {
    title: 'Health, Social Services & Welfare',
    description: 'Care-focused skills for health support, welfare, and community service.',
  },
  {
    title: 'ICT, Technology & Innovation',
    description: 'Digital operations, software foundations, IT support, and modern tech practice.',
  },
  {
    title: 'Infrastructure & Manufacturing',
    description: 'Technical pathways for construction, production environments, and quality systems.',
  },
  {
    title: 'Business, Finance, Trade & Hospitality',
    description: 'Business growth skills for finance, sales, customer service, and operations.',
  },
];

const plans = [
  {
    id: 'Weekly',
    price: 2000,
    icon: BookOpen,
    description: 'Perfect for beginners starting their journey.',
    features: ['Access to 3 selected courses', 'Support 24/7', 'Job listings', 'Exam preparation'],
  },
  {
    id: 'Monthly',
    price: 5000,
    icon: TrendingUp,
    popular: true,
    description: 'Most popular choice for consistent progress.',
    features: ['Access to 3 selected courses', 'Support 24/7', 'Job listings', 'Exam preparation'],
  },
  {
    id: 'Quarterly',
    price: 10000,
    icon: Award,
    description: 'Extended learning with deeper support.',
    features: ['Access to 3 selected courses', 'Support 24/7', 'Job listings', 'Exam preparation', 'Mentor session'],
  },
  {
    id: 'Yearly',
    price: 30000,
    icon: Users,
    description: 'Best value for long-term growth.',
    features: ['Access to 3 selected courses', 'Support 24/7', 'Job listings', 'Exam preparation', 'Mentor session'],
  },
];

const cpaPlans = [
  { title: 'CPA Foundation', price: 30000, items: ['Financial Accounting', 'Business Management', 'Taxation', 'Information Systems'] },
  { title: 'CPA Intermediate', price: 40000, items: ['Managerial Finance', 'Financial Reporting', 'Company Law', 'Auditing'] },
  { title: 'CPA Advanced', price: 50000, items: ['Strategic Leadership', 'Advanced Taxation', 'Corporate Finance', 'Performance Management'] },
  { title: 'CAT', price: 30000, items: ['Basic Accounts', 'Costing Principles', 'Financial Accounting', 'Public Finance'] },
];

export function PublicCoursesPage() {
  const [showTuition, setShowTuition] = useState(false);
  const tuitionRef = useRef<HTMLDivElement>(null);

  const handleViewTuition = () => {
    setShowTuition(true);
    setTimeout(() => {
      tuitionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <main className="bg-white">
      <section
        className="relative flex h-[65vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">Our Programs</p>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">Welcome to Smart School Rwanda After Class Programs!</h1>
          <p className="mx-auto mt-6 hidden max-w-3xl text-lg font-medium text-gray-100 md:block">
            Explore, learn, and grow beyond the classroom. Engage with skilled instructors, collaborate with peers, and develop practical skills through interactive activities. Let’s make learning inspiring, fun, and full of opportunities!
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/academy"
              className="group flex items-center gap-2 rounded-2xl bg-brand-500 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              Professional Academy
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={handleViewTuition}
              className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white backdrop-blur-md transition hover:bg-white/20"
            >
              View Tuition Plans
            </button>
          </div>
        </div>
      </section>

      <PublicAcademyProgramsShowcase
        eyebrow="Advertised this week"
        title="Enroll in live programs"
        subtitle="These listings are public—they match what buyers see on the academy checkout."
        limit={9}
        ctaHref="/academy"
        ctaLabel="Go to academy"
      />

      {showTuition && (
        <div ref={tuitionRef} className="animate-in fade-in slide-in-from-bottom-10 duration-700">
          <section className="py-20 border-t border-slate-100">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-14 text-center">
                <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">Main Tuition Plans</h2>
                <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-brand-500" />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => (
                  <article
                    key={plan.id}
                    className={[
                      'relative flex h-full flex-col rounded-3xl border p-7',
                      plan.popular
                        ? 'border-brand-500 bg-white shadow-[0_30px_60px_rgba(30,90,168,0.12)]'
                        : 'border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)]',
                    ].join(' ')}
                  >
                    {plan.popular ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white">
                        Most Popular
                      </span>
                    ) : null}
                    <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-brand-600">
                      <plan.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900">{plan.id}</h3>
                    <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                    <p className="mt-5 text-3xl font-black text-brand-600">
                      {plan.price}
                      <span className="ml-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Frw</span>
                    </p>
                    <div className="mt-6 grid gap-3">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="mt-0.5 h-4 w-4 text-brand-600" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      to="/login"
                      className="mt-7 rounded-full bg-brand-500 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-brand-600"
                    >
                      Choose {plan.id}
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-slate-50 py-20">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-14 text-center">
                <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">CPA Specialized Plans</h2>
                <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-500">
                  Professional preparation tracks for accounting certification.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {cpaPlans.map((plan) => (
                  <article key={plan.title} className="rounded-3xl border border-slate-100 bg-white p-7 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                    <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900">{plan.title}</h3>
                    <p className="mt-3 text-3xl font-black text-brand-600">
                      {plan.price}
                      <span className="ml-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Frw / Quarter</span>
                    </p>
                    <div className="mt-5 grid gap-2">
                      {plan.items.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-[13px] text-slate-600">
                          <Check className="mt-0.5 h-4 w-4 text-brand-600" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <PublicCommunityCTA />
    </main>
  );
}
