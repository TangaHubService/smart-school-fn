import { useMemo, useState, useCallback, useRef } from 'react';
import {
  useTable,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { tableFeatures } from './table-features';

export interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  initialState?: {
    sorting?: SortingState;
    pagination?: PaginationState;
    columnFilters?: ColumnFiltersState;
  };
  /** External atoms / URL slices the app must own (optional) */
  state?: {
    sorting?: SortingState;
    pagination?: PaginationState;
    columnFilters?: ColumnFiltersState;
  };
  onStateChange?: (state: {
    sorting: SortingState;
    pagination: PaginationState;
    columnFilters: ColumnFiltersState;
  }) => void;
  pageCount?: number;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
}

export function useDataTable<TData>(options: UseDataTableOptions<TData>) {
  const {
    data,
    columns,
    initialState,
    state: externalState,
    onStateChange,
    pageCount,
    manualPagination = false,
    manualSorting = false,
    manualFiltering = false,
  } = options;

  // Internal TanStack Store-backed state; external atoms only for slices app owns
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    externalState?.sorting ?? initialState?.sorting ?? []
  );
  const [internalPagination, setInternalPagination] = useState<PaginationState>(
    externalState?.pagination ?? initialState?.pagination ?? { pageIndex: 0, pageSize: 10 }
  );
  const [internalFilters, setInternalFilters] = useState<ColumnFiltersState>(
    externalState?.columnFilters ?? initialState?.columnFilters ?? []
  );

  // Reactive selectors via TanStack table selectors / subscribe
  const table = useTable({
    data,
    columns,
    state: {
      sorting: externalState?.sorting ?? internalSorting,
      pagination: externalState?.pagination ?? internalPagination,
      columnFilters: externalState?.columnFilters ?? internalFilters,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(externalState?.sorting ?? internalSorting) : updater;
      if (!manualSorting) setInternalSorting(next);
      onStateChange?.({ sorting: next, pagination: externalState?.pagination ?? internalPagination, columnFilters: externalState?.columnFilters ?? internalFilters });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(externalState?.pagination ?? internalPagination) : updater;
      if (!manualPagination) setInternalPagination(next);
      onStateChange?.({ sorting: externalState?.sorting ?? internalSorting, pagination: next, columnFilters: externalState?.columnFilters ?? internalFilters });
    },
    onColumnFiltersChange: (updater) => {
      const next = typeof updater === 'function' ? updater(externalState?.columnFilters ?? internalFilters) : updater;
      if (!manualFiltering) setInternalFilters(next);
      onStateChange?.({ sorting: externalState?.sorting ?? internalSorting, pagination: externalState?.pagination ?? internalPagination, columnFilters: next });
    },
    manualSorting,
    manualFiltering,
    manualPagination,
    pageCount: pageCount ?? -1,
  });

  // Subscribe for reactive reads (TanStack Store pattern)
  const subscribe = useCallback(
    (selector: (state: ReturnType<typeof table.getState>) => unknown) => {
      return table.subscribe(selector as any);
    },
    [table]
  );

  return useMemo(
    () => ({
      table,
      features: tableFeatures,
      // Selectors exposing store-backed slices
      getSorting: () => table.getState().sorting,
      getPagination: () => table.getState().pagination,
      getFilters: () => table.getState().columnFilters,
      // Subscription helper for reactive reads
      subscribe,
      // Row model access (semantic render targets)
      getHeaderGroups: () => table.getHeaderGroups(),
      getRowModel: () => table.getRowModel(),
      getPageCount: () => table.getPageCount(),
      getCanPreviousPage: () => table.getCanPreviousPage(),
      getCanNextPage: () => table.getCanNextPage(),
      getState: () => table.getState(),
    }),
    [table, subscribe]
  );
}
