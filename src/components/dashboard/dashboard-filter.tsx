import { Filter, Search } from 'lucide-react';

interface DashboardFilterProps {
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
  academicYear = '2023/2024',
  term = 'First Term',
  region = 'All Regions',
  school = 'All Schools',
  status = 'Active',
  classFilter = 'All Classes',
  findFilter = 'All Classes',
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
          <select className={selectClass} defaultValue={academicYear}>
            <option>Academic Year 2023/2024</option>
          </select>
          <select className={selectClass} defaultValue={term}>
            <option>Term: First Term</option>
          </select>
          <select className={selectClass} defaultValue={classFilter}>
            <option>Class: All Classes</option>
          </select>
          <select className={selectClass} defaultValue={findFilter}>
            <option>Find: All Classes</option>
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
        <select className={selectClass} defaultValue={academicYear}>
          <option>Academic Year 2023/2024</option>
        </select>
        <select className={selectClass} defaultValue={term}>
          <option>Term: First Term</option>
        </select>
        <select className={selectClass} defaultValue={region}>
          <option>Region: All Regions</option>
        </select>
        <select className={selectClass} defaultValue={school}>
          <option>School: All Schools</option>
        </select>
        <select className={selectClass} defaultValue={status}>
          <option>Status: Active</option>
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
