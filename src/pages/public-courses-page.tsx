import { ArrowRight, BookOpen, Star, GraduationCap, Clock, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PublicCommunityCTA } from '../components/public/public-community-cta';
import { academyApi } from '../api/academy-api';

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
  const { data: academyPrograms, isLoading } = useQuery({
    queryKey: ['academy-programs'],
    queryFn: academyApi.getPrograms,
  });

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
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/academy"
              className="group flex items-center gap-2 rounded-2xl bg-brand-500 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              Professional Academy
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/tuition"
              className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white backdrop-blur-md transition hover:bg-white/20"
            >
              School Tuition
            </Link>
          </div>
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
                  to="/academy"
                  className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-brand-600"
                >
                  View in Academy
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>

      <div id="academy-section" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="mb-14 text-center">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-brand-600">Professional Development</p>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">Academy Programs</h2>
          <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-brand-500" />
          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-500">Fast-track your career with industry-recognized certifications.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {academyPrograms?.map((program) => (
              <article
                key={program.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.06)]"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <img
                    src={program.thumbnail}
                    alt={program.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700">
                      <GraduationCap className="h-3 w-3" />
                      Academy Program
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-brand-600">{program.title}</h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">{program.description}</p>
                  <div className="mt-6 flex items-center gap-6 border-t border-slate-50 pt-6">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-brand-500" />
                      {program.durationDays} Days
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Award className="h-3.5 w-3.5 text-brand-500" />
                      Professional Certification
                    </div>
                  </div>
                  <Link
                    to="/academy"
                    className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-brand-600"
                  >
                    View in Academy
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <PublicCommunityCTA />
    </main>
  );
}
