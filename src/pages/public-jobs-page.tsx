import { ArrowRight, Briefcase, Calendar, Clock, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { formatPublicJobDate, publicJobCategories, publicJobs } from './public-jobs.data';

export function PublicJobsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Jobs');

  const filtered = useMemo(() => {
    return publicJobs.filter((job) => {
      const matchesCategory = category === 'All Jobs' || job.category === category;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || `${job.title} ${job.company} ${job.category}`.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  return (
    <main className="min-h-screen bg-white">
      <section className="relative overflow-hidden border-b border-slate-100 bg-slate-50 py-20">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-accent-100/30 blur-3xl" />

        <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-900 sm:text-5xl">Job Opportunities</h1>
          <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-brand-500" />
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-slate-500">
            Discover current openings and apply for your next role.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-8 w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, company, or category..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-brand-300"
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-2">
            {publicJobCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={[
                  'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em]',
                  category === item ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          {filtered.length ? (
            filtered.map((job) => (
              <Link
                key={job.id}
                to={`/job-listing/${job.slug}`}
                className="group rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-[0_24px_56px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      {job.companyLogo ? (
                        <img src={job.companyLogo} alt={job.company} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-brand-500">
                          <Briefcase className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-brand-600">{job.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-brand-600">{job.company}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          Posted {formatPublicJobDate(job.postedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-red-600">
                          <Clock className="h-4 w-4" />
                          Deadline {formatPublicJobDate(job.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-brand-600"
                    >
                      View job
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-16 text-center">
              <p className="text-xl font-semibold text-slate-700">No jobs found</p>
              <p className="mt-2 text-sm text-slate-500">Try adjusting search or category filters.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
