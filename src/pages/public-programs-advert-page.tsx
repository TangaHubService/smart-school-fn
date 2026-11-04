import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import heroInset from '../asset/hero-inset.jpg';
import backgroundImage from '../asset/background.jpg';
import { PublicCommunityCTA } from '../components/public/public-community-cta';
import { PublicHero } from '../components/public/program-browse';
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
      <PublicHero
        title="Smart School Academy"
        description="Browse every public class, activate a plan, then enroll in up to 3 classes. Each enrolled class unlocks every subject, course, and lesson inside it."
        image={backgroundImage}
        insetImage={heroInset}
      >
        <a
          href="#enroll"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Explore programs
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </PublicHero>

      <div id="enroll" className="scroll-mt-16">
        <PublicAcademyPage />
      </div>

      <PublicCommunityCTA />
    </main>
  );
}
