import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import {
  buildAssessmentPdf,
  buildAssessmentWorkbook,
  buildStudyMaterialPdf,
  buildStudyMaterialWorkbook,
} from '../src/utils/ai-material-export';
import { markdownToPlainText, parseMarkdownBlocks, stripInlineMarkdown } from '../src/utils/markdown-blocks';

const glossary = `# Cells glossary

Key words for **Biology** Unit 1.

## Lesson 1

| Term | Meaning | Example |
|------|---------|---------|
| **Cell** | Smallest unit of life | A red blood cell |
| Nucleus | Holds the DNA | — |

- Learn the *bold* words
- Revise with \`flashcards\`
`;

const prep = {
  title: 'Cells quiz',
  instructions: 'Answer all questions.',
  totalPoints: 3,
  basedOnLessons: [],
  basedOnDocuments: [],
  usedWrittenContent: true,
  contentShortened: false,
  questions: [
    {
      type: 'MCQ_SINGLE' as const,
      prompt: 'What holds the DNA?',
      points: 1,
      explanation: 'The nucleus stores genetic material.',
      options: [
        { label: 'Cell wall', isCorrect: false },
        { label: 'Nucleus', isCorrect: true },
      ],
    },
    { type: 'OPEN_TEXT' as never, prompt: 'Describe a cell.', points: 2, options: [] },
  ],
};

describe('markdown blocks', () => {
  it('finds headings, tables and lists', () => {
    const types = parseMarkdownBlocks(glossary).map((b) => b.type);
    expect(types).toEqual(['heading', 'paragraph', 'heading', 'table', 'list']);
    const table = parseMarkdownBlocks(glossary).find((b) => b.type === 'table');
    expect(table).toMatchObject({ header: ['Term', 'Meaning', 'Example'] });
  });

  it('removes Markdown symbols', () => {
    expect(stripInlineMarkdown('**Cell** is *small*, see `x` and [link](https://a.b)')).toBe(
      'Cell is small, see x and link (https://a.b)'
    );
    const plain = markdownToPlainText(glossary);
    expect(plain).not.toMatch(/[#*`|]/);
    expect(plain).toContain('Cells glossary');
    expect(plain).toContain('Cell\tSmallest unit of life\tA red blood cell');
  });
});

describe('AI material export', () => {
  it('makes PDFs', () => {
    expect(buildStudyMaterialPdf('Cells glossary', glossary).getNumberOfPages()).toBeGreaterThan(0);
    // Questions, then the answer key on its own page.
    expect(buildAssessmentPdf(prep).getNumberOfPages()).toBe(2);
  });

  it('puts glossary tables into real spreadsheet columns', () => {
    const rows = XLSX.utils.sheet_to_json<string[]>(
      buildStudyMaterialWorkbook('Cells glossary', glossary).Sheets.Material,
      { header: 1 }
    );
    expect(rows).toContainEqual(['Term', 'Meaning', 'Example']);
    expect(rows).toContainEqual(['Cell', 'Smallest unit of life', 'A red blood cell']);
    expect(JSON.stringify(rows)).not.toMatch(/\*\*|\|/);
  });

  it('lists one question per row with the answer', () => {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(buildAssessmentWorkbook(prep).Sheets.Questions);
    expect(rows[0]).toMatchObject({
      Question: 'What holds the DNA?',
      'Option A': 'Cell wall',
      'Option B': 'Nucleus',
      'Correct answer': 'B',
    });
    expect(rows[1]).toMatchObject({ Question: 'Describe a cell.', Type: 'Written', Points: 2 });
  });
});
