import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { TimetableSlot } from '../features/timetable/timetable.api';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface TimetablePdfOptions {
  slots: TimetableSlot[];
  /** Shown at the top, e.g. the school name. */
  schoolName?: string | null;
  /** Main heading, e.g. "S2A - Senior 2 A" or "Timetable of Jane Doe". */
  title: string;
  /** Extra lines under the title, e.g. academic year and term. */
  details?: string[];
  /**
   * What the second line of each cell shows: the teacher (a class timetable)
   * or the class (a teacher's own schedule).
   */
  cellDetail: 'teacher' | 'class';
  fileName: string;
}

export interface TimetablePdfGrid {
  days: number[];
  rows: Array<{ period: number; time: string; cells: string[] }>;
}

function cellText(slot: TimetableSlot, cellDetail: 'teacher' | 'class') {
  const subject = slot.course?.subject?.name ?? slot.course?.title ?? '';
  const detail =
    cellDetail === 'teacher'
      ? `${slot.course?.teacherUser?.firstName ?? ''} ${slot.course?.teacherUser?.lastName ?? ''}`.trim()
      : slot.classRoom?.name ?? '';
  return detail ? `${subject}\n${detail}` : subject;
}

/** Periods as rows, school days as columns; Saturday/Sunday only when used. */
export function buildTimetablePdfGrid(
  slots: TimetableSlot[],
  cellDetail: 'teacher' | 'class'
): TimetablePdfGrid {
  const weekend = [6, 7].filter((day) => slots.some((s) => s.dayOfWeek === day));
  const days = [1, 2, 3, 4, 5, ...weekend];
  const periods = [...new Set(slots.map((s) => s.periodNumber))].sort((a, b) => a - b);

  const rows = periods.map((period) => {
    const inPeriod = slots.filter((s) => s.periodNumber === period);
    // Times can differ by day; show the most common one for the row.
    const timeCounts = new Map<string, number>();
    for (const s of inPeriod) {
      const key = `${s.startTime} - ${s.endTime}`;
      timeCounts.set(key, (timeCounts.get(key) ?? 0) + 1);
    }
    const time = [...timeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

    const cells = days.map((day) =>
      inPeriod
        .filter((s) => s.dayOfWeek === day)
        .map((s) => {
          const own = `${s.startTime} - ${s.endTime}`;
          const text = cellText(s, cellDetail);
          return own === time ? text : `${text}\n(${own})`;
        })
        .join('\n\n')
    );
    return { period, time, cells };
  });

  return { days, rows };
}

export function exportTimetablePdf(options: TimetablePdfOptions) {
  buildTimetablePdf(options).save(options.fileName);
}

export function buildTimetablePdf(options: Omit<TimetablePdfOptions, 'fileName'>): jsPDF {
  const { days, rows } = buildTimetablePdfGrid(options.slots, options.cellDetail);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  if (options.schoolName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(options.schoolName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(options.title, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80);
  for (const line of options.details ?? []) {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['Period', 'Time', ...days.map((d) => DAY_NAMES[d - 1])]],
    body: rows.map((row) => [`P${row.period}`, row.time, ...row.cells]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.2, valign: 'middle', halign: 'center', lineColor: 180 },
    headStyles: { fillColor: [30, 64, 125], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold', fillColor: [241, 245, 249] },
      1: { cellWidth: 28, fillColor: [241, 245, 249] },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 1 && !data.cell.raw) {
        data.cell.text = ['—'];
        data.cell.styles.textColor = 170;
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  const generated = `Generated ${new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`;
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    const bottom = doc.internal.pageSize.getHeight() - 8;
    doc.text(generated, 14, bottom);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, bottom, { align: 'right' });
  }

  return doc;
}

/** Safe file name piece: "S2 A / 2026" -> "S2-A-2026". */
export function timetableFileSlug(...parts: Array<string | null | undefined>) {
  return parts
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}
