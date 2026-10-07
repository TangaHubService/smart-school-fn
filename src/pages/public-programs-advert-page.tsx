import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import backgroundImage from '../asset/background.jpg';
import { PublicCommunityCTA } from '../components/public/public-community-cta';
import { PublicAcademyPage } from './public-academy-page';

export function PublicProgramsAdvertPage() {
  const location = useLocation();

  // Hash entries (#academy-levels, #enroll) jump straight to that section so
  // navigation continues from the right place, including on first load.
  useEffect(() => {
    if (!location.hash) {
      return;
    }
    const id = location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname]);

  return (
    <main className="bg-white">
      <section
        className="relative flex min-h-[42vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 flex justify-center">
            <ol className="flex items-center gap-1 text-xs font-semibold text-white/70">
              <li>
                <Link to="/" className="rounded hover:text-white hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-white">
                Programs
              </li>
            </ol>
          </nav>
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">
            Smart School
          </p>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">
            Program catalog
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base font-medium text-white/90 sm:text-lg">
            Browse every public program, activate a plan, then enroll in up to 3 classes. Each
            enrolled class unlocks every subject, course, and lesson inside it.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="#enroll"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand-900/30 transition hover:bg-brand-400"
            >
              View programs
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#enroll"
              className="rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-xs font-black uppercase tracking-widest text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Enroll in a class
            </a>
          </div>
        </div>
      </section>

      <div id="enroll">
        <PublicAcademyPage hideHero />
      </div>

      <PublicCommunityCTA />
    </main>
  );
}
