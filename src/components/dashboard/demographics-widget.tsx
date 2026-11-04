import { CHART_SERIES } from '../ui/chart-theme';
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
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-card">
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
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Student demographics</h2>

      <dl className="mt-3 grid grid-cols-3 gap-4">
        <div>
          <dt className="text-[13px] text-slate-500">Boys</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">
            {data.totalBoys.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-slate-500">Girls</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">
            {data.totalGirls.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-slate-500">With a disability</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">
            {data.studentsWithDisabilities.toLocaleString()}
            <span className="ml-1.5 text-xs font-normal text-slate-500">{disabilityPct}%</span>
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
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
            keys={['boys', 'girls']}
            colors={[CHART_SERIES[0], CHART_SERIES[1]]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2 pr-3">{SEGMENT_LABELS[segment]}</th>
                <th className="py-2 pr-3">Boys</th>
                <th className="py-2 pr-3">Girls</th>
                <th className="py-2 pr-3">With a disability</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => {
                // Students with a disability are already counted among boys and girls.
                const total = (row.boys as number) + (row.girls as number);
                return (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">{row.label}</td>
                    <td className="py-2 pr-3 text-slate-700">{(row.boys as number).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-slate-700">{(row.girls as number).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-slate-700">
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
