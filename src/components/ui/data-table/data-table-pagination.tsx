import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

import type { DataTablePaginationProps } from './types';

function getPageWindow(current: number, totalPages: number, window = 5): number[] {
  if (totalPages <= window) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const start = Math.max(1, Math.min(current - Math.floor(window / 2), totalPages - window + 1));
  return Array.from({ length: window }, (_, i) => start + i);
}

/**
 * Server-paginated footer: rows-per-page selector, range summary,
 * numbered pages where they fit and prev/next controls.
 */
export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const pages = getPageWindow(page, totalPages);

  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <label htmlFor="datatable-page-size" className="whitespace-nowrap">
          Rows per page:
        </label>
        <select
          id="datatable-page-size"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-brand-400"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="ml-2 whitespace-nowrap" aria-live="polite">
          {from}–{to} of {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === page ? 'page' : undefined}
            className={clsx(
              'h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition',
              pageNumber === page
                ? 'bg-brand-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
