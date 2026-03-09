import { ArrowLeft, Calendar, Clock, ExternalLink, Globe, MapPin, TriangleAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { findPublicJobBySlug, formatPublicJobDate } from './public-jobs.data';

export function PublicJobDetailPage() {
  const params = useParams<{ slug: string }>();
  const job = params.slug ? findPublicJobBySlug(params.slug) : null;

  if (!job) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-[0_24px_56px_rgba(0,0,0,0.05)]">
          <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
            <TriangleAlert className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Job Not Found</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            The job you requested is not available anymore. Please go back to the job listing page.
          </p>
          <Link
            to="/job-listing"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Link>
        </section>
      </main>
    );
  }

  const isExpired = new Date(job.dueDate) < new Date();
  const daysRemaining = Math.ceil((new Date(job.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <main className="pb-16">
      <section className="relative overflow-hidden border-b border-slate-100 bg-slate-50 pb-24 pt-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/job-listing"
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-600 transition hover:gap-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Job Listings
          </Link>

          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span
                  className={[
                    'rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                    isExpired ? 'border-red-100 bg-red-50 text-red-600' : 'border-brand-200 bg-brand-50 text-brand-600',
                  ].join(' ')}
                >
                  {isExpired ? 'Expired' : 'Active Recruitment'}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Posted {formatPublicJobDate(job.postedAt)}
                </span>
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-5xl">{job.title}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-2 text-brand-600">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                <span>{job.company}</span>
              </div>
            </div>

            <div className="h-24 w-24 overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 shadow-lg">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.company} className="h-full w-full rounded-2xl object-cover" />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-12 grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <article className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_28px_70px_rgba(0,0,0,0.05)] lg:col-span-8">
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Description & Responsibilities</h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">{job.description}</p>

          <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-brand-600">Key Responsibilities</h3>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600">
            {job.responsibilities.map((item) => (
              <li key={item} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>

          <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-brand-600">Requirements</h3>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600">
            {job.requirements.map((item) => (
              <li key={item} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <aside className="space-y-6 lg:col-span-4">
          <section className="rounded-3xl bg-brand-600 p-7 text-white shadow-[0_30px_60px_rgba(30,90,168,0.25)]">
            <h2 className="text-sm font-black uppercase tracking-[0.12em]">Apply Now</h2>
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-brand-200" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/70">Deadline</p>
                  <p className="text-sm font-bold">{formatPublicJobDate(job.dueDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-brand-200" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/70">Status</p>
                  <p className="text-sm font-bold">{isExpired ? 'Applications closed' : `${Math.max(daysRemaining, 0)} days left`}</p>
                </div>
              </div>
            </div>

            {!isExpired ? (
              <a
                href={job.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-brand-600"
              >
                Submit Application
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <div className="mt-7 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em]">
                This position is closed
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-7 shadow-[0_16px_44px_rgba(0,0,0,0.04)]">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">Company Website</h2>
            <a
              href={job.companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-600"
            >
              <span className="inline-flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Visit Website
              </span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </section>
        </aside>
      </section>
    </main>
  );
}
