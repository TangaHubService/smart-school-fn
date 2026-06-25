import { Loader2 } from 'lucide-react';
import { useAcademicYear } from '../contexts/academic-year-context';

export function AcademicYearSelector() {
  const {
    academicYearId,
    termId,
    setAcademicYear,
    setTerm,
    availableYears,
    availableTerms,
    isLoading,
  } = useAcademicYear();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!availableYears.length) return null;

  return (
    <div className="flex items-center gap-2">
      <select
        value={academicYearId ?? ''}
        onChange={(e) => {
          const yearId = e.target.value;
          if (yearId) void setAcademicYear(yearId);
        }}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-400"
        aria-label="Select academic year"
      >
        <option value="" disabled>
          Academic Year
        </option>
        {availableYears.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
          </option>
        ))}
      </select>

      {availableTerms.length > 0 && (
        <select
          value={termId ?? ''}
          onChange={(e) => {
            const tId = e.target.value;
            void setTerm(tId || null);
          }}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-400"
          aria-label="Select term"
        >
          <option value="">All Terms</option>
          {availableTerms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
