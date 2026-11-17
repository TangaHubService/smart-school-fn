export type ParentRelationship = 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';

export interface BulkParentInput {
  parentCode?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  createLogin: boolean;
  password?: string;
  studentCode?: string;
  relationship: ParentRelationship;
  isPrimary: boolean;
}

export interface ParsedParentImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  parentCode: string;
  studentCode: string;
  relationship: string;
  createLogin: boolean;
  errors: string[];
  payload: BulkParentInput | null;
}

export const MAX_PARENT_IMPORT_ROWS = 500;

const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ['firstname', 'first', 'givenname'],
  lastName: ['lastname', 'last', 'surname', 'familyname'],
  email: ['email', 'emailaddress', 'mail'],
  phone: ['phone', 'phonenumber', 'telephone', 'tel', 'mobile'],
  parentCode: ['parentcode', 'code', 'parentid'],
  createLogin: ['createlogin', 'portallogin', 'login', 'enablelogin'],
  password: ['password', 'initialpassword'],
  studentCode: ['studentcode', 'student', 'studentid', 'childcode'],
  relationship: ['relationship', 'relation'],
  isPrimary: ['isprimary', 'primary', 'primarycontact'],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RELATIONSHIPS: ParentRelationship[] = ['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'];

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
    ])
  ) as Record<keyof typeof HEADER_ALIASES, number>;
}

function getCell(row: unknown[], index: number) {
  return index < 0 ? '' : String(row[index] ?? '').trim();
}

function parseBoolean(value: string) {
  return ['yes', 'y', 'true', '1', 'x'].includes(value.trim().toLowerCase());
}

/** Validates already-extracted rows (header row first). Exported for testing. */
export function parseParentImportRows(rows: unknown[][]): ParsedParentImportRow[] {
  if (rows.length < 2) {
    throw new Error('Add a header row and at least one parent row to the Excel file.');
  }

  const idx = resolveColumnIndexes(rows[0]);
  if (idx.firstName < 0 || idx.lastName < 0) {
    throw new Error('The Excel file must include "firstName" and "lastName" columns.');
  }

  const dataRows = rows
    .slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => !isBlankRow(row));

  if (dataRows.length > MAX_PARENT_IMPORT_ROWS) {
    throw new Error(`You can import at most ${MAX_PARENT_IMPORT_ROWS} parents per file.`);
  }

  const seenEmails = new Map<string, number>();
  const seenCodes = new Map<string, number>();

  return dataRows.map(({ row, rowNumber }) => {
    const firstName = getCell(row, idx.firstName);
    const lastName = getCell(row, idx.lastName);
    const email = getCell(row, idx.email).toLowerCase();
    const phone = getCell(row, idx.phone);
    const parentCode = getCell(row, idx.parentCode);
    const createLogin = parseBoolean(getCell(row, idx.createLogin));
    const password = getCell(row, idx.password);
    const studentCode = getCell(row, idx.studentCode);
    const rawRelationship = getCell(row, idx.relationship).toUpperCase();
    const isPrimary = parseBoolean(getCell(row, idx.isPrimary));
    const errors: string[] = [];

    if (firstName.length < 2) errors.push('First name must be at least 2 characters.');
    if (lastName.length < 2) errors.push('Last name must be at least 2 characters.');
    if (email && !EMAIL_PATTERN.test(email)) errors.push('Email is not valid.');
    if (phone && phone.length < 6) errors.push('Phone must be at least 6 characters.');
    if (createLogin && !email) errors.push('Email is required when createLogin is yes.');
    if (createLogin && password.length < 8)
      errors.push('Password (8+ characters) is required when createLogin is yes.');

    const relationship = (rawRelationship || 'GUARDIAN') as ParentRelationship;
    if (!RELATIONSHIPS.includes(relationship)) {
      errors.push('Relationship must be MOTHER, FATHER, GUARDIAN or OTHER.');
    }

    if (email) {
      const firstRow = seenEmails.get(email);
      if (firstRow) errors.push(`Duplicate email (also on row ${firstRow}).`);
      else seenEmails.set(email, rowNumber);
    }
    if (parentCode) {
      const key = parentCode.toLowerCase();
      const firstRow = seenCodes.get(key);
      if (firstRow) errors.push(`Duplicate parent code (also on row ${firstRow}).`);
      else seenCodes.set(key, rowNumber);
    }

    const payload: BulkParentInput | null = errors.length
      ? null
      : {
          firstName,
          lastName,
          parentCode: parentCode || undefined,
          email: email || undefined,
          phone: phone || undefined,
          createLogin,
          password: createLogin ? password : undefined,
          studentCode: studentCode || undefined,
          relationship,
          isPrimary: studentCode ? isPrimary : false,
        };

    return {
      rowNumber,
      firstName,
      lastName,
      email,
      phone,
      parentCode,
      studentCode,
      relationship,
      createLogin,
      errors,
      payload,
    };
  });
}

export async function parseParentExcel(file: File) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The Excel file has no worksheet.');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  return parseParentImportRows(rows);
}

export async function downloadParentImportTemplate() {
  const XLSX = await import('xlsx');
  const rows = [
    [
      'firstName',
      'lastName',
      'email',
      'phone',
      'parentCode',
      'studentCode',
      'relationship',
      'isPrimary',
      'createLogin',
      'password',
    ],
    ['Jane', 'Uwase', 'jane.uwase@example.com', '0788000001', 'PAR-001', 'STU-001', 'MOTHER', 'yes', 'no', ''],
    ['Eric', 'Mugisha', 'eric.mugisha@example.com', '0788000002', 'PAR-002', '', 'FATHER', 'no', 'yes', 'ChangeMe123'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = rows[0].map(() => ({ wch: 18 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parents');

  // Kept as the second sheet: the importer only reads the first sheet.
  const instructions = [
    ['Column', 'Required?', 'What to enter'],
    ['firstName', 'Required', 'Parent first name (at least 2 characters).'],
    ['lastName', 'Required', 'Parent last name (at least 2 characters).'],
    ['email', 'Optional', 'Must be a valid email. Required if createLogin is yes. Must be unique.'],
    ['phone', 'Optional', 'At least 6 characters.'],
    ['parentCode', 'Optional', 'Your own reference code for the parent. Must be unique.'],
    ['studentCode', 'Optional', 'Student code to link this parent to (must already exist in the school).'],
    ['relationship', 'Optional', 'MOTHER, FATHER, GUARDIAN or OTHER. Defaults to GUARDIAN.'],
    ['isPrimary', 'Optional', 'yes / no. Marks the parent as the primary contact for the student.'],
    ['createLogin', 'Optional', 'yes / no. Creates a parent portal login.'],
    ['password', 'Optional', 'Initial portal password (8+ characters). Required if createLogin is yes.'],
    [],
    ['Notes'],
    ['• Fill in parents on the "Parents" sheet (keep it as the first sheet) and keep the header row.'],
    ['• Replace or delete the two example rows before importing.'],
    [`• Up to ${MAX_PARENT_IMPORT_ROWS} parents per file. Rows with errors are skipped and listed after import.`],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const url = URL.createObjectURL(
    new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'parents-import-template.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}
