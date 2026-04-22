import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface UserRow {
  name: string;
  email: string;
  phone: string;
  school: string;
  roles: string;
  status: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getExcelBlob(data: UserRow[]): Blob {
  const workbook = XLSX.utils.book_new();
  
  const worksheet = XLSX.utils.json_to_sheet([
    { name: 'Users Report', email: '', phone: '', school: '', roles: '', status: '' },
    { name: `Generated: ${formatDate(new Date())}`, email: '', phone: '', school: '', roles: '', status: '' },
    { name: '', email: '', phone: '', school: '', roles: '', status: '' },
    ...data.map(d => ({ name: d.name, email: d.email, phone: d.phone, school: d.school, roles: d.roles, status: d.status })),
  ]);
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
  
  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
  ];
  
  const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function getPDFBlob(data: UserRow[]): Blob {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  doc.setFontSize(18);
  doc.text('Users Report', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate(new Date())}`, 14, 28);
  
  const tableData = data.map(row => [row.name, row.email, row.phone, row.school, row.roles, row.status]);
  
  autoTable(doc, {
    head: [['Name', 'Email', 'Phone', 'School', 'Roles', 'Status']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  const pdfData = doc.output('arraybuffer');
  return new Blob([pdfData], { type: 'application/pdf' });
}

export async function exportToExcel(data: UserRow[], filename: string = 'users.xlsx') {
  const blob = getExcelBlob(data);
  downloadBlob(blob, filename);
}

export async function exportToPDF(data: UserRow[], filename: string = 'users.pdf') {
  const blob = getPDFBlob(data);
  downloadBlob(blob, filename);
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