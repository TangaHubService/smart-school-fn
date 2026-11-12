/**
 * Number formatting for dashboards.
 *
 * Values are shown exactly as stored: thousands separators are added, but no
 * rounding, truncation or abbreviation (no "1.2K", no dropped decimals).
 */

const exactFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 20,
});

/** Exact value with grouping, e.g. 1234567.5 -> "1,234,567.5". */
export function formatExact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return exactFormatter.format(value);
}

/**
 * Percentage of `part` in `whole`, one decimal place (trailing ".0" dropped),
 * computed from the raw counts — matches what the backend returns.
 */
export function percentOf(part: number, whole: number): number {
  if (!whole) return 0;
  return Number(((part / whole) * 100).toFixed(1));
}

/** "33.3%" style label for a part/whole pair. */
export function formatPercentOf(part: number, whole: number): string {
  return `${percentOf(part, whole)}%`;
}
