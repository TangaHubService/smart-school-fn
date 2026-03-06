import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileBadge2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { verifyReportCardPublicApi } from '../features/sprint5/exams.api';

export function ReportCardVerificationPage() {
  const { snapshotId = '' } = useParams();

  const verificationQuery = useQuery({
    queryKey: ['report-card-verification', snapshotId],
    queryFn: () => verifyReportCardPublicApi(snapshotId),
    enabled: Boolean(snapshotId),
    retry: 1,
  });

  const data = verificationQuery.data;

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-10">
      <div className="mx-auto grid max-w-4xl gap-6">
        <section className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                <FileBadge2 className="h-4 w-4" aria-hidden="true" />
                Report Card Verification
              </div>
              <div className="grid gap-1">
                <h1 className="text-3xl font-black text-brand-950">Smart School Rwanda</h1>
                <p className="max-w-2xl text-sm text-brand-700 sm:text-base">
                  Scan results from the QR code land here. This page only confirms whether a
                  published report card is authentic.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800"
            >
              Back to login
            </Link>
          </div>
        </section>

        {verificationQuery.isPending ? (
          <section className="rounded-[28px] border border-brand-100 bg-white p-8 shadow-soft">
            <div className="h-64 animate-pulse rounded-3xl bg-brand-50" />
          </section>
        ) : verificationQuery.isError || !data ? (
          <section className="rounded-[28px] border border-red-200 bg-white p-8 shadow-soft">
            <div className="grid gap-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                <ShieldAlert className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="grid gap-1">
                <h2 className="text-2xl font-black text-brand-950">Verification failed</h2>
                <p className="text-sm text-brand-700 sm:text-base">
                  This report card could not be verified. Check that the QR code is complete or ask
                  the school to regenerate the document.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <article className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-soft sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="grid gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Verified
                  </p>
                  <h2 className="text-2xl font-black text-brand-950">This report card is authentic</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-brand-100 bg-brand-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Student</p>
                  <p className="mt-2 text-lg font-bold text-brand-950">{data.student.name}</p>
                  <p className="text-sm text-brand-700">{data.student.studentCode}</p>
                </div>
                <div className="rounded-3xl border border-brand-100 bg-brand-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">School</p>
                  <p className="mt-2 text-lg font-bold text-brand-950">{data.school.name}</p>
                  <p className="text-sm text-brand-700">
                    {data.school.code ? `Code ${data.school.code}` : 'School code unavailable'}
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-100 bg-brand-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Scope</p>
                  <p className="mt-2 text-lg font-bold text-brand-950">{data.term.name}</p>
                  <p className="text-sm text-brand-700">
                    {data.classRoom.name} · {data.academicYear.name}
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-100 bg-brand-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Result</p>
                  <p className="mt-2 text-lg font-bold text-brand-950">
                    {data.totals.averagePercentage.toFixed(1)}% · {data.totals.grade}
                  </p>
                  <p className="text-sm text-brand-700">
                    Position {data.totals.position} / {data.totals.classSize}
                  </p>
                </div>
              </div>
            </article>

            <aside className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-soft sm:p-8">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-semibold">{data.message}</span>
                </div>
                <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                    Verification Code
                  </p>
                  <p className="mt-2 text-lg font-black text-brand-950">{data.verificationCode}</p>
                </div>
                <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                    Issued
                  </p>
                  <p className="mt-2 text-base font-semibold text-brand-900">
                    {new Date(data.issuedAt).toLocaleString('en-RW')}
                  </p>
                  <p className="text-sm text-brand-700">
                    District: {data.school.district ?? 'Not specified'}
                  </p>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
