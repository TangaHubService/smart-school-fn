import clsx from 'clsx';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Inbox,
  TriangleAlert,
} from 'lucide-react';
import { Fragment, useMemo, type ReactNode } from 'react';

import { DataTablePagination } from './data-table-pagination';
import type { DataTableColumn, DataTableProps, DataTableSort } from './types';

const ALIGN_CLASS: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function defaultCell<T>(row: T, column: DataTableColumn<T>): ReactNode {
  const value = (row as Record<string, unknown>)[column.key];
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function SortIcon({ direction }: { direction?: 'asc' | 'desc' | null }) {
  if (direction === 'asc') {
    return <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (direction === 'desc') {
    return <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
}

/**
 * Generic, reusable data table. Knows nothing about users, students,
 * payments or any other domain — only rows, columns, sorting,
 * pagination and the four render states (loading / empty / error / data).
 *
 * Desktop renders a semantic table; small screens automatically switch to
 * stacked cards driven by each column's `mobile` hint.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 6,
  error = null,
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
  sort = null,
  onSortChange,
  pagination,
  showIndex = false,
  rowActions,
  actionsHeader = 'Actions',
  actionsAlign = 'right',
  stickyHeader = false,
  minWidth = 760,
  className,
  ariaLabel = 'Data table',
}: DataTableProps<T>) {
  const hasActions = Boolean(rowActions);
  const colSpan = columns.length + (showIndex ? 1 : 0) + (hasActions ? 1 : 0);

  function handleSort(column: DataTableColumn<T>) {
    if (!onSortChange) return;
    const next: DataTableSort =
      sort?.sortBy === column.key
        ? sort.sortOrder === 'asc'
          ? { sortBy: column.key, sortOrder: 'desc' }
          : { sortBy: column.key, sortOrder: 'asc' }
        : { sortBy: column.key, sortOrder: 'asc' };
    onSortChange(next);
  }

  const mobilePrimary = useMemo(
    () => columns.find((column) => column.mobile === 'primary') ?? columns[0],
    [columns]
  );
  const mobileSecondary = useMemo(
    () => columns.filter((column) => column.mobile === 'secondary'),
    [columns]
  );
  const mobileDetail = useMemo(
    () =>
      columns.filter(
        (column) => column !== mobilePrimary && !mobileSecondary.includes(column)
      ),
    [columns, mobilePrimary, mobileSecondary]
  );

  return (
    <div
      className={clsx(
        'min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.055)]',
        className
      )}
    >
      {/* ---------- Mobile: stacked cards ---------- */}
      <ul role="list" className="divide-y divide-slate-100 md:hidden">
        {loading
          ? Array.from({ length: Math.min(skeletonRows, 4) }, (_, index) => (
              <li key={index} className="space-y-3 p-4" aria-hidden="true">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </li>
            ))
          : null}

        {!loading && error ? (
          <li className="p-6">
            <DataTableErrorState
              title={error.title}
              message={error.message}
              onRetry={onRetry}
            />
          </li>
        ) : null}

        {!loading && !error && data.length === 0 ? (
          <li className="p-6">
            <DataTableEmptyState title={emptyTitle} description={emptyDescription} />
          </li>
        ) : null}

        {!loading &&
          !error &&
          data.map((row, index) => (
            <li key={rowKey(row, index)} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {mobilePrimary ? (
                    <div className="min-w-0 text-sm font-semibold text-slate-900">
                      {mobilePrimary.render
                        ? mobilePrimary.render(row, index)
                        : defaultCell(row, mobilePrimary)}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {mobileSecondary.map((column) => (
                      <Fragment key={column.key}>
                        {column.render
                          ? column.render(row, index)
                          : defaultCell(row, column)}
                      </Fragment>
                    ))}
                  </div>
                </div>
                {showIndex ? (
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {(pagination ? (pagination.page - 1) * pagination.pageSize : 0) + index + 1}
                  </span>
                ) : null}
              </div>

              {mobileDetail.length ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {mobileDetail.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {column.header}
                      </dt>
                      <dd className="mt-0.5 truncate text-xs text-slate-700">
                        {column.render ? column.render(row, index) : defaultCell(row, column)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {rowActions ? (
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  {rowActions(row)}
                </div>
              ) : null}
            </li>
          ))}
      </ul>

      {/* ---------- Tablet/desktop: semantic table ---------- */}
      <div className="hidden overflow-x-auto md:block">
        <table
          aria-label={ariaLabel}
          className="w-full border-separate border-spacing-0 text-sm"
          style={{ minWidth }}
        >
          <thead className={clsx(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {showIndex ? (
                <th scope="col" className="w-14 border-b border-slate-200 px-4 py-3">
                  No
                </th>
              ) : null}
              {columns.map((column) => {
                const isActiveSort = sort?.sortBy === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      column.sortable && isActiveSort
                        ? sort?.sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={clsx(
                      'border-b border-slate-200 px-4 py-3',
                      ALIGN_CLASS[column.align ?? 'left'],
                      column.headerClassName
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className={clsx(
                          'inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                          isActiveSort && 'text-brand-600'
                        )}
                      >
                        {column.header}
                        <SortIcon
                          direction={isActiveSort ? sort?.sortOrder ?? null : null}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {hasActions ? (
                <th
                  scope="col"
                  className={clsx(
                    'border-b border-slate-200 px-4 py-3',
                    ALIGN_CLASS[actionsAlign]
                  )}
                >
                  {actionsHeader}
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} aria-hidden="true">
                    {Array.from({ length: colSpan }, (_, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border-b border-slate-100 px-4 py-4"
                      >
                        <div
                          className="h-4 animate-pulse rounded bg-slate-100"
                          style={{
                            width: `${45 + ((rowIndex * 13 + cellIndex * 29) % 45)}%`,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {!loading && error ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10">
                  <DataTableErrorState title={error.title} message={error.message} onRetry={onRetry} />
                </td>
              </tr>
            ) : null}

            {!loading && !error && data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10">
                  <DataTableEmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : null}

            {!loading &&
              !error &&
              data.map((row, index) => (
                <tr key={rowKey(row, index)} className="transition-colors hover:bg-brand-50/30">
                  {showIndex ? (
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold text-slate-400">
                      {(pagination ? (pagination.page - 1) * pagination.pageSize : 0) + index + 1}
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        'border-b border-slate-100 px-4 py-3.5 align-middle',
                        ALIGN_CLASS[column.align ?? 'left'],
                        column.className
                      )}
                    >
                      {column.render ? column.render(row, index) : defaultCell(row, column)}
                    </td>
                  ))}
                  {hasActions ? (
                    <td
                      className={clsx(
                        'border-b border-slate-100 px-4 py-3.5',
                        ALIGN_CLASS[actionsAlign]
                      )}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {rowActions
                          ? rowActions(row)
                          : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination ---------- */}
      {!loading && !error && pagination && data.length > 0 ? (
        <>
          <div className="md:hidden">
            <MobilePagination meta={pagination} />
          </div>
          <div className="hidden md:block">
            <DataTablePagination {...pagination} />
          </div>
        </>
      ) : null}
      {!loading && !error && pagination && data.length === 0 ? (
        <div className="hidden md:block">
          <DataTablePagination {...pagination} />
        </div>
      ) : null}
    </div>
  );
}

function MobilePagination({ meta }: { meta: DataTableProps<unknown>['pagination'] }) {
  if (!meta) return null;
  const totalPages = Math.max(1, Math.ceil(meta.totalItems / meta.pageSize));
  const from = meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.totalItems);

  return (
    <nav
      aria-label="Table pagination"
      className="flex items-center justify-between border-t border-slate-100 px-4 py-3"
    >
      <p className="text-xs text-slate-500" aria-live="polite">
        {from}–{to} of {meta.totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => meta.onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          aria-label="Previous page"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="text-xs font-semibold text-slate-600">
          {meta.page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => meta.onPageChange(meta.page + 1)}
          disabled={meta.page >= totalPages}
          aria-label="Next page"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export function DataTableEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="max-w-sm text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

export function DataTableErrorState({
  title = 'Failed to load data',
  message = 'Please try again later.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>
      <p className="max-w-sm text-xs text-slate-500">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
