import type { AssessmentQuestionType } from './assessments.api';

export interface BulkAssessmentQuestionInput {
  prompt: string;
  imageUrl?: string | null;
  explanation?: string;
  type: AssessmentQuestionType;
  points: number;
  options?: Array<{
    label: string;
    isCorrect: boolean;
    sequence: number;
  }>;
}

export interface ParsedAssessmentQuestionImportRow {
  rowNumber: number;
  prompt: string;
  imageUrl: string;
  explanation: string;
  type: string;
  points: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  errors: string[];
  payload: BulkAssessmentQuestionInput | null;
}

const HEADER_ALIASES: Record<string, string[]> = {
  prompt: ['prompt', 'question', 'questionprompt', 'question_prompt'],
  imageUrl: ['imageurl', 'image_url', 'image', 'image link', 'imagelink'],
  explanation: ['explanation', 'answerexplanation'],
  type: ['type', 'questiontype', 'question_type'],
  points: ['points', 'marks', 'score'],
  optionA: ['optiona', 'option_a', 'a'],
  optionB: ['optionb', 'option_b', 'b'],
  optionC: ['optionc', 'option_c', 'c'],
  optionD: ['optiond', 'option_d', 'd'],
  correctOption: ['correctoption', 'correct_option', 'correctanswer', 'correct_answer', 'answer'],
};

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function isBlankRow(row: unknown[]) {
  return row.every((cell) => String(cell ?? '').trim() === '');
}

function resolveColumnIndexes(headerRow: unknown[]) {
  const normalizedHeaders = headerRow.map((cell) => normalizeHeader(cell));
  return Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      normalizedHeaders.findIndex((header) => aliases.includes(header)),
    ]),
  ) as Record<keyof typeof HEADER_ALIASES, number>;
}

function getCell(row: unknown[], index: number) {
  if (index < 0) {
    return '';
  }

  return String(row[index] ?? '').trim();
}

function parseQuestionType(value: string): AssessmentQuestionType | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return 'MCQ_SINGLE';
  }

  if (['mcq', 'mcqsingle', 'mcq_single', 'multiplechoice', 'multiple-choice'].includes(normalized)) {
    return 'MCQ_SINGLE';
  }

  if (['open', 'opentext', 'open_text', 'opentextresponse', 'text'].includes(normalized)) {
    return 'OPEN_TEXT';
  }

  return null;
}

function parseCorrectOption(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (['A', 'B', 'C', 'D'].includes(normalized)) {
    return normalized.charCodeAt(0) - 65;
  }

  if (['1', '2', '3', '4'].includes(normalized)) {
    return Number(normalized) - 1;
  }

  return null;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function parseAssessmentQuestionExcel(file: File) {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The Excel file has no worksheet.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (rows.length < 2) {
    throw new Error('Add a header row and at least one question row to the Excel file.');
  }

  const headerIndexes = resolveColumnIndexes(rows[0]);
  if (headerIndexes.prompt < 0) {
    throw new Error('The Excel file must include a "prompt" column.');
  }

  return rows
    .slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => !isBlankRow(row))
    .map(({ row, rowNumber }) => {
      const prompt = getCell(row, headerIndexes.prompt);
      const imageUrl = getCell(row, headerIndexes.imageUrl);
      const explanation = getCell(row, headerIndexes.explanation);
      const rawType = getCell(row, headerIndexes.type);
      const rawPoints = getCell(row, headerIndexes.points);
      const optionA = getCell(row, headerIndexes.optionA);
      const optionB = getCell(row, headerIndexes.optionB);
      const optionC = getCell(row, headerIndexes.optionC);
      const optionD = getCell(row, headerIndexes.optionD);
      const correctOption = getCell(row, headerIndexes.correctOption);

      const type = parseQuestionType(rawType);
      const points = rawPoints ? Number(rawPoints) : 1;
      const correctOptionIndex = parseCorrectOption(correctOption);
      const errors: string[] = [];

      if (prompt.length < 2) {
        errors.push('Prompt is required.');
      }

      if (!type) {
        errors.push('Type must be MCQ_SINGLE/MCQ or OPEN_TEXT.');
      }

      if (!Number.isInteger(points) || points < 1 || points > 100) {
        errors.push('Points must be a whole number between 1 and 100.');
      }

      if (imageUrl && !isValidHttpUrl(imageUrl)) {
        errors.push('Image URL must start with http:// or https://.');
      }

      if (type === 'MCQ_SINGLE') {
        if (!optionA || !optionB || !optionC || !optionD) {
          errors.push('MCQ rows require optionA, optionB, optionC, and optionD.');
        }

        if (correctOptionIndex == null) {
          errors.push('MCQ rows require correctOption as A, B, C, D, 1, 2, 3, or 4.');
        }
      }

      const payload =
        errors.length === 0 && type
          ? {
              prompt,
              imageUrl: imageUrl || null,
              explanation: explanation || undefined,
              type,
              points,
              options:
                type === 'MCQ_SINGLE'
                  ? [optionA, optionB, optionC, optionD].map((label, optionIndex) => ({
                      label,
                      isCorrect: correctOptionIndex === optionIndex,
                      sequence: optionIndex + 1,
                    }))
                  : undefined,
            }
          : null;

      return {
        rowNumber,
        prompt,
        imageUrl,
        explanation,
        type: rawType || 'MCQ_SINGLE',
        points: rawPoints || '1',
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        errors,
        payload,
      } satisfies ParsedAssessmentQuestionImportRow;
    });
}

export async function downloadAssessmentQuestionTemplate() {
  const XLSX = await import('xlsx');
  const rows = [
    ['prompt', 'imageUrl', 'type', 'points', 'explanation', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption'],
    [
      'Which organ pumps blood through the body?',
      'https://example.com/question-heart.png',
      'MCQ_SINGLE',
      2,
      'The heart pumps blood throughout the circulatory system.',
      'Lungs',
      'Heart',
      'Kidney',
      'Liver',
      'B',
    ],
    [
      'Describe one way communities can reduce plastic waste.',
      '',
      'OPEN_TEXT',
      5,
      'Learners can mention recycling, re-use, or reducing single-use plastics.',
      '',
      '',
      '',
      '',
      '',
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
  const blob = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const url = URL.createObjectURL(
    new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'assessment-questions-template.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
