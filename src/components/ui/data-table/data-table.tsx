import clsx from 'clsx';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import type { RowData } from '@tanstack/react-table';
import { Fragment, useMemo, type ReactNode } from 'react';

import { DataTablePagination } from './data-table-pagination';
import type { DataTableColumn, DataTableProps, DataTableSort } from './types';
import { useDataTable, type DataTableColumnDef } from './use-data-table';

const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

function defaultCell<TData>(row: TData, column: DataTableColumn<TData>): ReactNode {
  const value = (row as Record<string, unknown>)[column.key];
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function SortIcon({ direction }: { direction?: 'asc' | 'desc' | null }) {
  if (direction === 'asc') return <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />;
  if (direction === 'desc') return <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 6,
  error = null,
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
  showIndex = false,
  rowActions,
  actionsHeader = 'Actions',
  actionsAlign = 'right',
  stickyHeader = false,
  minWidth = 760,
  className,
  ariaLabel = 'Data table',
  sort = null,
  onSortChange,
  pagination,
}: DataTableProps<TData>) {
  const hasActions = Boolean(rowActions);
  const colSpan = columns.length + (showIndex ? 1 : 0) + (hasActions ? 1 : 0);

  const rowOffset = pagination ? (pagination.page - 1) * pagination.pageSize : 0;

  const tableColumns = useMemo<Array<DataTableColumnDef<TData>>>(
    () => columns.map((column) => ({ id: column.key, header: column.header })),
    [columns]
  );
  const table = useDataTable({ data, columns: tableColumns });
  const rows = table.getRowModel().rows;

  // Mobile cards: title comes from the column marked primary, or the first column.
  const primaryColumn = columns.find((column) => column.mobile === 'primary') ?? columns[0];
  const secondaryColumns = columns.filter(
    (column) => column.mobile === 'secondary' && column !== primaryColumn
  );
  const detailColumns = columns.filter(
    (column) =>
      column !== primaryColumn && column.mobile !== 'secondary' && column.mobile !== 'hidden'
  );

  function handleSort(column: DataTableColumn<TData>) {
    if (!onSortChange) return;
    const next: DataTableSort = {
      sortBy: column.key,
      sortOrder: sort?.sortBy === column.key && sort.sortOrder === 'asc' ? 'desc' : 'asc',
    };
    onSortChange(next);
  }

  return (
    <div
      className={clsx(
        'min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card',
        className
      )}
    >
      {/* Mobile stacked cards */}
      <ul role="list" className="divide-y divide-slate-100 md:hidden">
        {loading ? (
          Array.from({ length: Math.min(skeletonRows, 4) }, (_, i) => (
            <li key={i} className="space-y-3 p-4" aria-hidden="true">
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
        ) : null}

        {!loading && error ? (
          <li className="p-6">
            <DataTableErrorState title={error.title} message={error.message} onRetry={onRetry} />
          </li>
        ) : null}

        {!loading && !error && data.length === 0 ? (
          <li className="p-6">
            <DataTableEmptyState title={emptyTitle} description={emptyDescription} />
          </li>
        ) : null}

        {!loading && !error && data.map((row, index) => (
          <li key={rowKey(row, index)} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {primaryColumn ? (
                  <div className="min-w-0 text-sm font-semibold text-slate-900">
                    {primaryColumn.render ? primaryColumn.render(row, index) : defaultCell(row, primaryColumn)}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {secondaryColumns.map((col) => (
                    <Fragment key={col.key}>
                      {col.render ? col.render(row, index) : defaultCell(row, col)}
                    </Fragment>
                  ))}
                </div>
              </div>
              {showIndex ? (
                <span className="shrink-0 text-xs font-semibold text-slate-400">
                  {rowOffset + index + 1}
                </span>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {detailColumns.map((col) => (
                <div key={col.key} className="min-w-0">
                  <dt className="text-[11px] font-medium text-slate-500">{col.header}</dt>
                  <dd className="mt-0.5 truncate text-xs text-slate-700">
                    {col.render ? col.render(row, index) : defaultCell(row, col)}
                  </dd>
                </div>
              ))}
            </dl>
            {rowActions ? (
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                {rowActions(row)}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Desktop / tablet semantic table */}
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
                          'inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500',
                          isActiveSort && 'text-brand-600'
                        )}
                      >
                        {column.header}
                        <SortIcon direction={isActiveSort ? sort?.sortOrder ?? null : null} />
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
                  className={clsx('border-b border-slate-200 px-4 py-3', ALIGN_CLASS[actionsAlign])}
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
                      <td key={cellIndex} className="border-b border-slate-100 px-4 py-4">
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

            {!loading && !error && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10">
                  <DataTableEmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : null}

            {!loading && !error && rows.map((row) => (
              <tr key={rowKey(row.original, row.index)} className="transition-colors hover:bg-brand-50/30">
                {showIndex ? (
                  <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold text-slate-400">
                    {rowOffset + row.index + 1}
                  </td>
                ) : null}
                {columns.map((col) => {
                  return (
                    <td
                      key={col.key}
                      className={clsx(
                        'border-b border-slate-100 px-4 py-3.5 align-middle',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        col.className
                      )}
                    >
                      {col.render ? col.render(row.original, row.index) : defaultCell(row.original, col)}
                    </td>
                  );
                })}
                {hasActions ? (
                  <td
                    className={clsx(
                      'border-b border-slate-100 px-4 py-3.5',
                      actionsAlign === 'right' ? 'text-right' : actionsAlign === 'center' ? 'text-center' : 'text-left'
                    )}
                  >
                    <div className="flex items-center justify-end gap-2">
                      {rowActions ? rowActions(row.original) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && !loading && !error ? <DataTablePagination {...pagination} /> : null}
    </div>
  );
}

export function DataTableEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      </span>
      <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="max-w-sm text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

export function DataTableErrorState({ title = 'Failed to load data', message = 'Please try again later.', onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
      </span>
      <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>
      <p className="max-w-sm text-xs text-slate-500">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600">Retry</button>
      ) : null}
    </div>
  );
}
