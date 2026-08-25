import { RotateCcw, Search } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { DataTableFilterConfig } from './types';

/**
 * Reusable data-table toolbar: debounced search input, dropdown filters,
 * reset button (visible only while a filter is active) and a slot for
 * extra actions such as export buttons.
 *
 * The search value is debounced before it reaches the parent so pages get
 * one settled value to feed into their query keys.
 */
export function DataTableToolbar({
  searchPlaceholder = 'Search…',
  search,
  onSearchChange,
  searchAriaLabel,
  filters = [],
  onReset,
  children,
  className,
}: {
  searchPlaceholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchAriaLabel?: string;
  filters?: DataTableFilterConfig[];
  onReset?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const DEBOUNCE_MS = 300;

  const [inputValue, setInputValue] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local input in sync when the parent resets/clears the value.
  useEffect(() => {
    setInputValue((current) => (current === search ? current : search));
  }, [search]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  function handleSearchInput(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), DEBOUNCE_MS);
  }

  const hasActiveFilters =
    inputValue !== '' || filters.some((filter) => filter.value !== filter.options[0]?.value);

  return (
    <div
      className={className ??
        'flex flex-wrap items-center gap-3 border-b border-slate-100 p-4'}
      role="search"
    >
      <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          role="searchbox"
          aria-label={searchAriaLabel ?? searchPlaceholder}
          value={inputValue}
          onChange={(event) => handleSearchInput(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {filters.map((filter) => (
        <div key={filter.id}>
          <label className="sr-only" htmlFor={`datatable-filter-${filter.id}`}>
            {filter.label}
          </label>
          <select
            id={`datatable-filter-${filter.id}`}
            aria-label={filter.label}
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {hasActiveFilters && onReset ? (
        <button
          type="button"
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setInputValue('');
            onReset();
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset
        </button>
      ) : null}

      {children ? <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
