import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import backgroundImage from '../asset/background.jpg';
import { PublicAcademyProgramsShowcase } from '../components/public/public-academy-showcase';
import { PublicCommunityCTA } from '../components/public/public-community-cta';

export function PublicProgramsAdvertPage() {
  return (
    <main className="bg-white">
      <section
        className="relative flex min-h-[42vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">Smart School</p>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">Program catalog</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base font-medium text-white/90 sm:text-lg">
            Browse every public program from our academy catalog. Enroll and pay securely on the academy page.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="#catalog"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand-900/30 transition hover:bg-brand-400"
            >
              View programs
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/academy"
              className="rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-xs font-black uppercase tracking-widest text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Go to academy
            </Link>
          </div>
        </div>
      </section>

      <div id="catalog">
        <PublicAcademyProgramsShowcase
          eyebrow="Live listings"
          title="All public programs"
          subtitle="Same data as the API and the academy checkout—ideal for ads, QR codes, and shared links."
          limit={null}
          ctaHref="/academy"
          ctaLabel="Open academy to enroll"
          className="pt-12 pb-8"
        />
      </div>

      <PublicCommunityCTA />
    </main>
  );
}
