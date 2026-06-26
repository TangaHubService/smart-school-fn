import { CalendarDays, Filter } from 'lucide-react';

export interface GlobalFilterValue {
  academicYear: string;
  semester: string;
}

interface GlobalFilterBarProps {
  academicYearOptions: Array<{ id: string; name: string }>;
  semesterOptions: Array<{ id: string; name: string; sequence: number }>;
  value: GlobalFilterValue;
  onChange: (value: GlobalFilterValue) => void;
}

export function GlobalFilterBar({
  academicYearOptions,
  semesterOptions,
  value,
  onChange,
}: GlobalFilterBarProps) {
  const selectClass =
    'h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Scope</span>
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <select
            className={selectClass}
            value={value.academicYear}
            onChange={(e) => onChange({ ...value, academicYear: e.target.value })}
            aria-label="Academic Year"
          >
            <option value="">All Years</option>
            {academicYearOptions.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name}
              </option>
            ))}
          </select>
        </div>

        <select
          className={selectClass}
          value={value.semester}
          onChange={(e) => onChange({ ...value, semester: e.target.value })}
          aria-label="Semester"
        >
          <option value="">All Terms</option>
          {semesterOptions.map((s) => (
            <option key={s.id} value={String(s.sequence)}>
              Term {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
