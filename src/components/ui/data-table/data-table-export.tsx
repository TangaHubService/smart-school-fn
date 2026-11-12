import { Download, FileSpreadsheet, FileText, Loader2, Sheet } from 'lucide-react';
import { isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';

import { exportToCSV, exportToExcel, exportToPDF, type ExportData } from '../../../utils/report-export';
import type { DataTableColumn } from './types';

/** Best-effort plain text of a rendered cell (badges, spans, links…). */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).filter(Boolean).join(' ');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode; label?: ReactNode; title?: ReactNode };
    return nodeToText(props.children ?? props.label ?? props.title ?? null);
  }
  return '';
}

function rawValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.name === 'string') return v.name;
    if (typeof v.firstName === 'string') return `${v.firstName} ${v.lastName ?? ''}`.trim();
    return '';
  }
  return String(value);
}

export function cellExportValue<T>(row: T, column: DataTableColumn<T>, index: number): string {
  if (column.exportValue) return rawValue(column.exportValue(row));
  if (column.render) {
    const text = nodeToText(column.render(row, index)).replace(/\s+/g, ' ').trim();
    if (text && text !== '—') return text;
  }
  return rawValue((row as Record<string, unknown>)[column.key]);
}

export function DataTableExport<T>({
  title,
  columns,
  rows,
  isPaginated,
  onExportAll,
}: {
  title: string;
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  isPaginated: boolean;
  onExportAll?: () => Promise<T[]>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function run(kind: 'excel' | 'csv' | 'pdf') {
    setOpen(false);
    setBusy(true);
    try {
      const source = onExportAll ? await onExportAll() : rows;
      const cols = columns.filter((c) => c.exportable !== false && c.header);
      const data: ExportData = {
        title,
        subtitle: `${source.length} ${source.length === 1 ? 'record' : 'records'}`,
        columns: cols.map((c) => ({ header: c.header, key: c.key })),
        rows: source.map((row, index) =>
          Object.fromEntries(cols.map((c) => [c.key, cellExportValue(row, c, index)]))
        ),
      };
      const base = `${title.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;
      if (kind === 'excel') exportToExcel(data, `${base}.xlsx`);
      else if (kind === 'csv') exportToCSV(data, `${base}.csv`);
      else exportToPDF(data, `${base}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  const items: Array<{ kind: 'excel' | 'csv' | 'pdf'; label: string; icon: typeof Sheet }> = [
    { kind: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
    { kind: 'csv', label: 'CSV (.csv)', icon: Sheet },
    { kind: 'pdf', label: 'PDF (.pdf)', icon: FileText },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy || rows.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Export
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {isPaginated && !onExportAll ? (
            <p className="px-3 pb-1 pt-1.5 text-[11px] text-slate-500">Exports the rows on this page.</p>
          ) : null}
          {items.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              onClick={() => void run(kind)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 text-slate-500" /> {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
