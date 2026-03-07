declare module 'rwanda' {
  export function Provinces(): string[];
  export function Districts(province?: string): string[] | undefined;
  export function Sectors(province?: string, district?: string): string[] | undefined;
  export function Cells(
    province?: string,
    district?: string,
    sector?: string,
  ): string[] | undefined;
  export function Villages(
    province?: string,
    district?: string,
    sector?: string,
    cell?: string,
  ): string[] | undefined;
}
