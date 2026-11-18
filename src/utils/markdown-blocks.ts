/**
 * Splits AI-written text (which uses Markdown) into simple blocks, so it can be
 * shown on screen or exported to PDF/Excel without any Markdown symbols.
 */

export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'code'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'rule' }
  | { type: 'paragraph'; lines: string[] };

const LIST_ITEM = /^\s*([-*•]|\d+[.)])\s+/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

export function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Removes inline Markdown markers: **bold**, _italic_, `code`, [label](url). */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/(^|[\s(])_([^_\s][^_]*)_/g, '$1$2');
}

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const header = splitTableRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && LIST_ITEM.test(lines[i])) {
        items.push(lines[i].replace(LIST_ITEM, ''));
        i += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: 'rule' });
      i += 1;
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !LIST_ITEM.test(lines[i]) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].startsWith('>') &&
      !(TABLE_ROW.test(lines[i]) && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1]))
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'paragraph', lines: para });
  }

  return blocks;
}

/** Readable plain text with no Markdown symbols (for Copy). */
export function markdownToPlainText(content: string): string {
  const out: string[] = [];
  for (const block of parseMarkdownBlocks(content)) {
    switch (block.type) {
      case 'heading':
        out.push(stripInlineMarkdown(block.text));
        break;
      case 'list':
        block.items.forEach((item, idx) =>
          out.push(`${block.ordered ? `${idx + 1}.` : '•'} ${stripInlineMarkdown(item)}`)
        );
        break;
      case 'table':
        out.push(block.header.map(stripInlineMarkdown).join('\t'));
        block.rows.forEach((row) => out.push(row.map(stripInlineMarkdown).join('\t')));
        break;
      case 'code':
        out.push(block.text);
        break;
      case 'quote':
        out.push(stripInlineMarkdown(block.text));
        break;
      case 'rule':
        break;
      case 'paragraph':
        out.push(block.lines.map(stripInlineMarkdown).join('\n'));
        break;
    }
    out.push('');
  }
  return out.join('\n').trim();
}
