import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import type { AssessmentPrepResult } from '../features/ai-assistant/ai-teacher.api';
import { type MarkdownBlock, parseMarkdownBlocks, stripInlineMarkdown } from './markdown-blocks';

const MARGIN = 16;
const LINE = 5.2;

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };

function newDoc() {
  return new jsPDF({ unit: 'mm', format: 'a4' }) as Doc;
}

/** Writes wrapped text, adding pages as needed; returns the next y. */
function writeText(
  doc: Doc,
  text: string,
  y: number,
  opts: { size?: number; bold?: boolean; indent?: number; color?: number; gap?: number } = {}
) {
  const size = opts.size ?? 10.5;
  const indent = opts.indent ?? 0;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageBottom = doc.internal.pageSize.getHeight() - MARGIN;
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(opts.color ?? 30);
  const lineHeight = (size / 10.5) * LINE;
  const lines = doc.splitTextToSize(text, pageWidth - MARGIN * 2 - indent) as string[];
  for (const line of lines) {
    if (y + lineHeight > pageBottom) {
      doc.addPage();
      y = MARGIN + 4;
    }
    doc.text(line, MARGIN + indent, y);
    y += lineHeight;
  }
  return y + (opts.gap ?? 1.5);
}

function ensureSpace(doc: Doc, y: number, needed: number) {
  if (y + needed > doc.internal.pageSize.getHeight() - MARGIN) {
    doc.addPage();
    return MARGIN + 4;
  }
  return y;
}

function addFooters(doc: Doc, label: string) {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const bottom = doc.internal.pageSize.getHeight() - 8;
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(label, MARGIN, bottom);
    doc.text(`Page ${p} of ${pages}`, width - MARGIN, bottom, { align: 'right' });
  }
}

function writeTitle(doc: Doc, title: string, subtitle?: string) {
  let y = writeText(doc, title, MARGIN + 6, { size: 17, bold: true, color: 15, gap: 1 });
  if (subtitle) y = writeText(doc, subtitle, y, { size: 9.5, color: 110, gap: 2 });
  doc.setDrawColor(210);
  doc.line(MARGIN, y, doc.internal.pageSize.getWidth() - MARGIN, y);
  return y + 6;
}

/** The AI often opens with the same title we already print at the top. */
function withoutRepeatedTitle(blocks: MarkdownBlock[], title: string) {
  const first = blocks[0];
  const same = (a: string) => stripInlineMarkdown(a).trim().toLowerCase() === title.trim().toLowerCase();
  return first?.type === 'heading' && same(first.text) ? blocks.slice(1) : blocks;
}

/** Study material (summary, notes, glossary…) as a clean PDF document. */
export function buildStudyMaterialPdf(title: string, content: string, subtitle?: string): jsPDF {
  const doc = newDoc();
  let y = writeTitle(doc, title, subtitle);

  for (const block of withoutRepeatedTitle(parseMarkdownBlocks(content), title)) {
    switch (block.type) {
      case 'heading': {
        const size = block.level === 1 ? 14 : block.level === 2 ? 12.5 : 11.5;
        y = ensureSpace(doc, y + 2, 12);
        y = writeText(doc, stripInlineMarkdown(block.text), y, { size, bold: true, color: 15, gap: 2 });
        break;
      }
      case 'list':
        block.items.forEach((item, idx) => {
          const marker = block.ordered ? `${idx + 1}.` : '•';
          const startY = ensureSpace(doc, y, LINE);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10.5);
          doc.setTextColor(30);
          doc.text(marker, MARGIN + 2, startY);
          y = writeText(doc, stripInlineMarkdown(item), startY, { indent: 8, gap: 0.8 });
        });
        y += 1.5;
        break;
      case 'table':
        autoTable(doc, {
          startY: y,
          head: [block.header.map(stripInlineMarkdown)],
          body: block.rows.map((row) => row.map(stripInlineMarkdown)),
          theme: 'grid',
          margin: { left: MARGIN, right: MARGIN },
          styles: { fontSize: 9, cellPadding: 2, lineColor: 200 },
          headStyles: { fillColor: [30, 64, 125], textColor: 255 },
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 5;
        break;
      case 'code':
        y = writeText(doc, block.text, y, { size: 9.5, indent: 4, color: 60, gap: 3 });
        break;
      case 'quote':
        y = writeText(doc, stripInlineMarkdown(block.text), y, { indent: 6, color: 90, gap: 3 });
        break;
      case 'rule':
        y = ensureSpace(doc, y, 6);
        doc.setDrawColor(220);
        doc.line(MARGIN, y, doc.internal.pageSize.getWidth() - MARGIN, y);
        y += 5;
        break;
      case 'paragraph':
        y = writeText(doc, block.lines.map(stripInlineMarkdown).join(' '), y, { gap: 3 });
        break;
    }
  }

  addFooters(doc, title);
  return doc;
}

/** Study material as a spreadsheet: tables keep their columns, other text one line per row. */
export function buildStudyMaterialWorkbook(title: string, content: string): XLSX.WorkBook {
  const rows: string[][] = [[title], []];
  for (const block of withoutRepeatedTitle(parseMarkdownBlocks(content), title)) {
    switch (block.type) {
      case 'heading':
        rows.push([stripInlineMarkdown(block.text)]);
        break;
      case 'list':
        block.items.forEach((item, idx) =>
          rows.push([`${block.ordered ? `${idx + 1}.` : '•'} ${stripInlineMarkdown(item)}`])
        );
        break;
      case 'table':
        rows.push(block.header.map(stripInlineMarkdown));
        block.rows.forEach((row) => rows.push(row.map(stripInlineMarkdown)));
        break;
      case 'code':
        block.text.split('\n').forEach((line) => rows.push([line]));
        break;
      case 'quote':
        rows.push([stripInlineMarkdown(block.text)]);
        break;
      case 'rule':
        break;
      case 'paragraph':
        rows.push([block.lines.map(stripInlineMarkdown).join(' ')]);
        break;
    }
    rows.push([]);
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const widest = Math.max(1, ...rows.map((r) => r.length));
  sheet['!cols'] = Array.from({ length: widest }, (_, i) => ({ wch: i === 0 ? 70 : 40 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Material');
  return book;
}

const letter = (i: number) => String.fromCharCode(65 + i);

/** Draft assessment: questions first, answer key on its own page (easy to print without it). */
export function buildAssessmentPdf(prep: AssessmentPrepResult): jsPDF {
  const doc = newDoc();
  let y = writeTitle(
    doc,
    prep.title,
    `${prep.questions.length} questions · ${prep.totalPoints} points`
  );
  if (prep.instructions) y = writeText(doc, prep.instructions, y, { color: 70, gap: 4 });

  prep.questions.forEach((q, i) => {
    y = ensureSpace(doc, y, 14);
    y = writeText(doc, `${i + 1}. ${q.prompt}  (${q.points} pt${q.points === 1 ? '' : 's'})`, y, {
      bold: true,
      gap: 1.5,
    });
    q.options.forEach((o, j) => {
      y = writeText(doc, `${letter(j)}. ${o.label}`, y, { indent: 6, gap: 0.8 });
    });
    if (!q.options.length) {
      // Space for a written answer.
      y = ensureSpace(doc, y, 22);
      doc.setDrawColor(215);
      for (let l = 0; l < 3; l += 1) {
        doc.line(MARGIN + 6, y + 5 + l * 7, doc.internal.pageSize.getWidth() - MARGIN, y + 5 + l * 7);
      }
      y += 24;
    }
    y += 3;
  });

  doc.addPage();
  y = writeTitle(doc, 'Answer key', prep.title);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Answer', 'Answer guide']],
    body: prep.questions.map((q, i) => {
      const correct = q.options.findIndex((o) => o.isCorrect);
      return [
        String(i + 1),
        correct >= 0 ? `${letter(correct)}. ${q.options[correct].label}` : 'Written answer',
        q.explanation ?? '',
      ];
    }),
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 2, lineColor: 200, valign: 'top' },
    headStyles: { fillColor: [30, 64, 125], textColor: 255 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 60 } },
  });

  addFooters(doc, prep.title);
  return doc;
}

/** Draft assessment as a spreadsheet: one row per question, options in columns, answer key included. */
export function buildAssessmentWorkbook(prep: AssessmentPrepResult): XLSX.WorkBook {
  const maxOptions = Math.max(0, ...prep.questions.map((q) => q.options.length));
  const header = [
    '#',
    'Question',
    'Type',
    'Points',
    ...Array.from({ length: maxOptions }, (_, i) => `Option ${letter(i)}`),
    'Correct answer',
    'Answer guide',
  ];
  const rows = prep.questions.map((q, i) => {
    const correct = q.options.findIndex((o) => o.isCorrect);
    return [
      i + 1,
      q.prompt,
      q.type === 'MCQ_SINGLE' ? 'Multiple choice' : 'Written',
      q.points,
      ...Array.from({ length: maxOptions }, (_, j) => q.options[j]?.label ?? ''),
      correct >= 0 ? letter(correct) : '',
      q.explanation ?? '',
    ];
  });
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = header.map((h) =>
    h === 'Question' || h === 'Answer guide' ? { wch: 60 } : h.startsWith('Option') ? { wch: 28 } : { wch: 14 }
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Questions');
  return book;
}

export function downloadPdf(doc: jsPDF, fileName: string) {
  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

export function downloadWorkbook(book: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(book, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
