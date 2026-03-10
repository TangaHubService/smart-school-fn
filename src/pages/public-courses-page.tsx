import { ArrowRight, BookOpen, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicCommunityCTA } from '../components/public/public-community-cta';

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

export function PublicCoursesPage() {
  return (
    <main className="bg-white">
      <section
        className="relative flex h-[55vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">Our Programs</p>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">Courses</h1>
          <p className="mx-auto mt-6 hidden max-w-3xl text-lg font-medium text-gray-100 md:block">
            Explore structured learning categories tailored for practical careers and institutional needs.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">Learning Tracks</h2>
          <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-brand-500" />
          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-500">Select your focus area and continue with tuition plans.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {courses.map((course, index) => {
            const wide = index % 2 === 0;
            return (
              <article
                key={course.title}
                className={[
                  'rounded-3xl border border-slate-100 bg-slate-50 p-8 transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_60px_rgba(0,0,0,0.06)]',
                  wide ? 'lg:col-span-7' : 'lg:col-span-5',
                ].join(' ')}
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600">
                  {index % 3 === 0 ? <BookOpen className="h-5 w-5" /> : <Star className="h-5 w-5" />}
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">{course.title}</h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">{course.description}</p>
                <Link
                  to="/tuition"
                  className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-brand-600"
                >
                  View tuition
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
      <PublicCommunityCTA />
    </main>
  );
}
