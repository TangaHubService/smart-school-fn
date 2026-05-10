import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

export interface Column {
  header: string;
  key: string;
}

export interface ExportData {
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: Record<string, unknown>[];
}

export function exportToExcel(data: ExportData, filename?: string) {
  const workbook = XLSX.utils.book_new();

  const headerRows = [
    { A: data.title, B: '', C: '', D: '', E: '' },
    { A: data.subtitle || '', B: '', C: '', D: '', E: '' },
    { A: `Generated: ${formatDate(new Date())}`, B: '', C: '', D: '', E: '' },
    { A: '', B: '', C: '', D: '', E: '' },
  ];

  const dataRows = data.rows.map((row) => {
    const obj: Record<string, string> = {};
    data.columns.forEach((col) => {
      const value = row[col.key];
      obj[col.header] = value !== undefined && value !== null ? String(value) : '';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet([...headerRows, ...dataRows]);

  const colWidths = data.columns.map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

  const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([xlsxData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const exportFilename = filename || `${data.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.xlsx`;
  downloadBlob(blob, exportFilename);
}

export function exportToPDF(data: ExportData, filename?: string) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(18);
  doc.text(data.title, 14, 20);

  if (data.subtitle) {
    doc.setFontSize(12);
    doc.text(data.subtitle, 14, 28);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 35);
  } else {
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 28);
  }

  const tableData = data.rows.map((row) =>
    data.columns.map((col) => {
      const value = row[col.key];
      return value !== undefined && value !== null ? String(value) : '-';
    })
  );

  autoTable(doc, {
    head: [data.columns.map((col) => col.header)],
    body: tableData,
    startY: data.subtitle ? 40 : 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const pdfData = doc.output('arraybuffer');
  const blob = new Blob([pdfData], { type: 'application/pdf' });
  const exportFilename = filename || `${data.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  downloadBlob(blob, exportFilename);
}