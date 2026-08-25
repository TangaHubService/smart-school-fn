import type { ReactNode } from 'react';

export type SortOrder = 'asc' | 'desc';

export interface DataTableSort {
  sortBy: string;
  sortOrder: SortOrder;
}

export interface DataTablePaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages?: number;
}

export interface DataTableColumn<T> {
  /** Unique column key, also used as the sort field for sortable columns. */
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  /** Custom cell renderer. Falls back to String(row[key]). */
  render?: (row: T, index: number) => ReactNode;
  /**
   * Mobile card layout hints:
   * - primary: rendered as the card title row
   * - secondary: rendered directly under the title
   * - hidden on mobile by default unless primary/secondary
   */
  mobile?: 'primary' | 'secondary' | 'hidden';
}

export interface DataTableFilterConfig {
  id: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}

export interface DataTablePaginationProps extends DataTablePaginationMeta {
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  rowKey: (row: T, index: number) => string;

  loading?: boolean;
  skeletonRows?: number;

  error?: { title?: string; message?: string } | null;
  onRetry?: () => void;

  emptyTitle?: string;
  emptyDescription?: string;

  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort) => void;

  pagination?: DataTablePaginationProps;

  /** Renders the No. index column when true. */
  showIndex?: boolean;
  /** Row action renderer; renders an Actions column when provided. */
  rowActions?: (row: T) => ReactNode;
  actionsHeader?: string;
  actionsAlign?: 'left' | 'center' | 'right';

  stickyHeader?: boolean;
  /** Minimum table width on desktop/tablet before horizontal scroll kicks in. */
  minWidth?: number;

  className?: string;
  ariaLabel?: string;
}
