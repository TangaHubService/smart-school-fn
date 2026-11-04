import { tableFeatures as defineTableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table';

// Sorting, filtering and pagination happen on the server, so only the core row model is needed.
const dataTableFeatures = defineTableFeatures({});

export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumnDef<TData extends RowData> = ColumnDef<DataTableFeatures, TData, unknown>;

export function useDataTable<TData extends RowData>({
  data,
  columns,
}: {
  data: TData[];
  columns: Array<DataTableColumnDef<TData>>;
}) {
  return useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    data,
    columns,
  });
}
