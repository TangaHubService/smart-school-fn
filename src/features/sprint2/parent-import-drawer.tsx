import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { DrawerForm } from '../../components/drawer-form';
import { useToast } from '../../components/toast';
import { useAuth } from '../auth/auth.context';
import {
  downloadParentImportTemplate,
  parseParentExcel,
  type ParsedParentImportRow,
} from './parent-import';
import { bulkCreateParentsApi, type BulkCreateParentsResponse } from './sprint2.api';

interface ParentImportDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ParentImportDrawer({ open, onClose }: ParentImportDrawerProps) {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedParentImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkCreateParentsResponse | null>(null);

  const validRows = rows.filter((row) => row.payload);
  const invalidCount = rows.length - validRows.length;

  const importMutation = useMutation({
    mutationFn: () =>
      bulkCreateParentsApi(
        auth.accessToken!,
        validRows.map((row) => row.payload!)
      ),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      showToast({
        type: data.failed ? 'error' : 'success',
        title: `Imported ${data.created} of ${data.total} parents`,
        message: data.failed ? `${data.failed} row(s) failed — see details.` : undefined,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  function reset() {
    setFileName('');
    setRows([]);
    setParseError(null);
    setResult(null);
    importMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File | undefined) {
    setResult(null);
    setParseError(null);
    setRows([]);
    if (!file) return;
    setFileName(file.name);
    try {
      setRows(await parseParentExcel(file));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Could not read the file.');
    }
  }

  // Map server result rows (1-based index into the submitted valid rows) back to Excel row numbers.
  const serverRowToExcelRow = (serverRow: number) => validRows[serverRow - 1]?.rowNumber ?? serverRow;

  return (
    <DrawerForm
      open={open}
      size="wide"
      title="Import Parents from Excel"
      description="Upload an .xlsx or .csv file to add many parents at once."
      onCancel={handleClose}
      isLoading={importMutation.isPending}
      submitLabel={
        result ? 'Done' : `Import ${validRows.length} parent${validRows.length === 1 ? '' : 's'}`
      }
      onSubmit={(event) => {
        event.preventDefault();
        if (result) {
          handleClose();
          return;
        }
        if (!validRows.length) {
          setParseError('There are no valid rows to import.');
          return;
        }
        importMutation.mutate();
      }}
    >
      <div className="grid gap-1 text-sm font-semibold text-slate-800">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="parent-import-file">Excel file</label>
          <button
            type="button"
            onClick={() => void downloadParentImportTemplate()}
            className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-brand-100"
          >
            Download template
          </button>
        </div>
        <input
          id="parent-import-file"
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          aria-label="Parents Excel file"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          disabled={importMutation.isPending}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-1 file:text-white"
        />
      </div>

      {parseError ? <p className="text-sm text-red-700">{parseError}</p> : null}

      {rows.length && !result ? (
        <div className="grid gap-2">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">{fileName}</span>: {rows.length} row(s),{' '}
            <span className="text-emerald-700">{validRows.length} valid</span>
            {invalidCount ? (
              <>
                , <span className="text-red-700">{invalidCount} with errors (will be skipped)</span>
              </>
            ) : null}
          </p>
          <div className="max-h-80 overflow-auto rounded-lg border border-brand-100">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 whitespace-nowrap bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1.5">Row</th>
                  <th className="px-2 py-1.5">First name</th>
                  <th className="px-2 py-1.5">Last name</th>
                  <th className="px-2 py-1.5">Email</th>
                  <th className="px-2 py-1.5">Phone</th>
                  <th className="px-2 py-1.5">Code</th>
                  <th className="px-2 py-1.5">Student</th>
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={`border-t border-brand-50 align-top ${row.errors.length ? 'bg-red-50/60' : ''}`}
                  >
                    <td className="px-2 py-1.5 tabular-nums text-slate-500">{row.rowNumber}</td>
                    <td className="px-2 py-1.5 font-medium text-slate-800">{row.firstName || '—'}</td>
                    <td className="px-2 py-1.5 font-medium text-slate-800">{row.lastName || '—'}</td>
                    <td className="px-2 py-1.5 text-slate-600">{row.email || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-600">
                      {row.phone || '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">
                      {row.parentCode || '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">
                      {row.studentCode ? (
                        <>
                          <span className="block">{row.studentCode}</span>
                          <span className="block text-slate-400">{row.relationship || 'GUARDIAN'}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="min-w-[160px] px-2 py-1.5">
                      {row.errors.length ? (
                        <span className="text-red-700">{row.errors.join(' ')}</span>
                      ) : (
                        <span className="text-emerald-700">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-2" data-testid="parent-import-result">
          <p className="text-sm text-slate-800">
            <span className="font-semibold text-emerald-700">{result.created} created</span>
            {result.linked ? `, ${result.linked} linked to students` : ''}
            {result.failed ? (
              <>
                , <span className="font-semibold text-red-700">{result.failed} failed</span>
              </>
            ) : null}
            {invalidCount ? `, ${invalidCount} skipped (invalid in file)` : ''}.
          </p>
          {result.results.some((r) => r.status === 'failed' || r.warning) ? (
            <ul className="max-h-60 overflow-auto rounded-lg border border-red-100 bg-red-50/50 p-2 text-xs">
              {result.results
                .filter((r) => r.status === 'failed' || r.warning)
                .map((r) => (
                  <li key={r.row} className="py-0.5 text-red-700">
                    Row {serverRowToExcelRow(r.row)}: {r.error ?? r.warning}
                  </li>
                ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="justify-self-start rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-brand-100"
          >
            Import another file
          </button>
        </div>
      ) : null}
    </DrawerForm>
  );
}
