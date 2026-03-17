import { Filter, Search } from 'lucide-react';

interface DashboardFilterProps {
  academicYearOptions?: Array<{ id: string; name: string }>;
  termOptions?: Array<{ id: string; name: string; sequence: number }>;
  regionOptions?: string[];
  schoolOptions?: Array<{ id: string; name: string; province: string | null; isActive: boolean }>;
  academicYear?: string;
  term?: string;
  region?: string;
  school?: string;
  status?: string;
  classFilter?: string;
  findFilter?: string;
  onAcademicYearChange?: (value: string) => void;
  onTermChange?: (value: string) => void;
  onRegionChange?: (value: string) => void;
  onSchoolChange?: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onClassChange?: (value: string) => void;
  onFindChange?: (value: string) => void;
  onApply?: () => void;
  onReset?: () => void;
  variant?: 'super-admin' | 'school-admin';
}

export function DashboardFilter({
  academicYearOptions = [],
  termOptions = [],
  regionOptions = [],
  schoolOptions = [],
  academicYear = '2023/2024',
  term = 'First Term',
  region = 'All Regions',
  school = 'All Schools',
  status = 'active',
  classFilter = 'All Classes',
  findFilter = 'All Classes',
  onAcademicYearChange,
  onTermChange,
  onRegionChange,
  onSchoolChange,
  onStatusChange,
  onClassChange,
  onFindChange,
  onApply,
  onReset,
  variant = 'super-admin',
}: DashboardFilterProps) {
  const selectClass =
    'h-9 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none focus:border-blue-400';

  if (variant === 'school-admin') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className={selectClass}
            value={academicYear}
            onChange={(e) => onAcademicYearChange?.(e.target.value)}
          >
            <option value="2023/2024">Academic Year 2023/2024</option>
          </select>
          <select
            className={selectClass}
            value={term}
            onChange={(e) => onTermChange?.(e.target.value)}
          >
            <option value="first">Term: First Term</option>
          </select>
          <select
            className={selectClass}
            value={classFilter}
            onChange={(e) => onClassChange?.(e.target.value)}
          >
            <option value="all">Class: All Classes</option>
          </select>
          <select
            className={selectClass}
            value={findFilter}
            onChange={(e) => onFindChange?.(e.target.value)}
          >
            <option value="all">Find: All Classes</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Apply Filter
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Refresh"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-600" />
        <span className="text-xs font-semibold text-slate-700">Filter Section</span>
        <select
          className={selectClass}
          value={academicYear}
          onChange={(e) => onAcademicYearChange?.(e.target.value)}
        >
          <option value="">Academic Year: All</option>
          {academicYearOptions.map((ay) => (
            <option key={ay.id} value={ay.name}>
              Academic Year {ay.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={term}
          onChange={(e) => onTermChange?.(e.target.value)}
        >
          <option value="">Term: All Terms</option>
          {termOptions.map((t) => (
            <option key={t.id} value={t.name}>
              Term: {t.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={region}
          onChange={(e) => onRegionChange?.(e.target.value)}
        >
          <option value="all-regions">Region: All Regions</option>
          {regionOptions.map((r) => (
            <option key={r} value={r}>
              Region: {r}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={school}
          onChange={(e) => onSchoolChange?.(e.target.value)}
        >
          <option value="all-schools">School: All Schools</option>
          {schoolOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => onStatusChange?.(e.target.value)}
        >
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
          <option value="all">Status: All</option>
        </select>
        <button
          type="button"
          onClick={onApply}
          className="rounded bg-dashboard-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f2a5c]"
        >
          Apply Filter
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
