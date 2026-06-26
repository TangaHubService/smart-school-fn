import { Accessibility, Mars, Venus } from 'lucide-react';

import { BarChart } from './bar-chart';

export interface DemographicsData {
  totalStudents: number;
  totalBoys: number;
  totalGirls: number;
  studentsWithDisabilities: number;
  disabilitiesBreakdown?: {
    visual: number;
    hearing: number;
    mobility: number;
    intellectual: number;
    other: number;
  };
  bySector: Array<{ sector: string; boys: number; girls: number; disabilities: number }>;
  byGrade: Array<{ grade: string; boys: number; girls: number; disabilities: number }>;
  byAcademicYear: Array<{ year: string; boys: number; girls: number; disabilities: number }>;
}

interface DemographicsWidgetProps {
  data: DemographicsData;
  isLoading?: boolean;
  segment: 'sector' | 'grade' | 'academicYear';
  onSegmentChange: (seg: 'sector' | 'grade' | 'academicYear') => void;
}

const SEGMENT_LABELS: Record<string, string> = {
  sector: 'Sector',
  grade: 'Grade Level',
  academicYear: 'Academic Year',
};

export function DemographicsWidget({
  data,
  isLoading,
  segment,
  onSegmentChange,
}: DemographicsWidgetProps) {
  const disabilityPct =
    data.totalStudents > 0
      ? ((data.studentsWithDisabilities / data.totalStudents) * 100).toFixed(1)
      : '0.0';

  const chartData = (() => {
    switch (segment) {
      case 'sector':
        return data.bySector.map((d) => ({
          label: d.sector,
          boys: d.boys,
          girls: d.girls,
          disabilities: d.disabilities,
        }));
      case 'grade':
        return data.byGrade.map((d) => ({
          label: d.grade,
          boys: d.boys,
          girls: d.girls,
          disabilities: d.disabilities,
        }));
      case 'academicYear':
        return data.byAcademicYear.map((d) => ({
          label: d.year,
          boys: d.boys,
          girls: d.girls,
          disabilities: d.disabilities,
        }));
    }
  })();

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="mt-4 h-8 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-slate-100" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Student Demographics</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Mars className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Boys</p>
              <p className="text-2xl font-bold tabular-nums text-blue-950">
                {data.totalBoys.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-pink-100 bg-pink-50/50 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 text-pink-700">
              <Venus className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-pink-800">Girls</p>
              <p className="text-2xl font-bold tabular-nums text-pink-950">
                {data.totalGirls.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 ring-2 ring-amber-200/60">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Accessibility className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Students with Disabilities
              </p>
              <p className="text-2xl font-bold tabular-nums text-amber-950">
                {data.studentsWithDisabilities.toLocaleString()}
              </p>
              <p className="text-xs text-amber-700/80">{disabilityPct}% of total enrollment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['sector', 'grade', 'academicYear'] as const).map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => onSegmentChange(seg)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                segment === seg
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By {SEGMENT_LABELS[seg]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-48">
          <BarChart
            data={chartData}
            height={160}
            stacked
            keys={['boys', 'girls', 'disabilities']}
            colors={['#2563EB', '#EC4899', '#F59E0B']}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2 pr-3">{SEGMENT_LABELS[segment]}</th>
                <th className="py-2 pr-3">Boys</th>
                <th className="py-2 pr-3">Girls</th>
                <th className="py-2 pr-3">Disabilities</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => {
                const total = (row.boys as number) + (row.girls as number) + (row.disabilities as number);
                return (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">{row.label}</td>
                    <td className="py-2 pr-3 text-slate-700">{(row.boys as number).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-slate-700">{(row.girls as number).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-amber-700 font-medium">
                      {(row.disabilities as number).toLocaleString()}
                    </td>
                    <td className="py-2 font-semibold text-slate-900">{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {data.disabilitiesBreakdown && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Disabilities Breakdown</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                { key: 'visual', label: 'Visual' },
                { key: 'hearing', label: 'Hearing' },
                { key: 'mobility', label: 'Mobility' },
                { key: 'intellectual', label: 'Intellectual' },
                { key: 'other', label: 'Other' },
              ] as const
            ).map(({ key, label }) => {
              const val = (data.disabilitiesBreakdown as Record<string, number>)[key] ?? 0;
              return (
                <div key={key} className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {val.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
