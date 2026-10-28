/**
 * Headless TanStack Table V9 feature registry.
 * Uses the library's built-in feature objects instead of importing
 * individual model constructors that Vite's pre-bundler may hide.
 */
export const featurePlugins = {
  core: 'coreRowModel',
  sorted: 'sortedRowModel',
  filtered: 'filteredRowModel',
  paginated: 'paginatedRowModel',
} as const;

export const tableRowModelSlots = [
  'coreRowModel',
  'sortedRowModel',
  'filteredRowModel',
  'paginatedRowModel',
] as const;

export const featureRegistries = {
  rowModels: tableRowModelSlots,
  filters: [],
  sorting: [],
};

export type TableFeatureKey = keyof typeof featurePlugins;
export { featurePlugins as tableFeatures };
