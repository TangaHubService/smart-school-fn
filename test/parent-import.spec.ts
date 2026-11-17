import { describe, expect, it } from 'vitest';

import { parseParentImportRows } from '../src/features/sprint2/parent-import';

const header = [
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Parent Code',
  'Student Code',
  'Relationship',
  'Is Primary',
  'Create Login',
  'Password',
];

describe('parseParentImportRows', () => {
  it('builds payloads for valid rows and normalizes values', () => {
    const [row] = parseParentImportRows([
      header,
      ['Grace', 'Uwase', 'Grace@Example.com', '0788100001', 'P1', 'STU-1', 'mother', 'yes', 'no', ''],
    ]);
    expect(row.errors).toEqual([]);
    expect(row.payload).toEqual({
      firstName: 'Grace',
      lastName: 'Uwase',
      email: 'grace@example.com',
      phone: '0788100001',
      parentCode: 'P1',
      studentCode: 'STU-1',
      relationship: 'MOTHER',
      isPrimary: true,
      createLogin: false,
      password: undefined,
    });
  });

  it('flags invalid rows, duplicates and skips blank rows', () => {
    const rows = parseParentImportRows([
      header,
      ['Ann', 'Ok', 'a@x.com', '', 'C1', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['Bob', '', 'bad-email', '', 'c1', '', 'AUNT', '', 'yes', 'short'],
      ['Cy', 'Dup', 'A@x.com', '', '', '', '', '', '', ''],
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[1].rowNumber).toBe(4);
    expect(rows[1].payload).toBeNull();
    expect(rows[1].errors.join(' ')).toMatch(/Last name/);
    expect(rows[1].errors.join(' ')).toMatch(/Email is not valid/);
    expect(rows[1].errors.join(' ')).toMatch(/Password/);
    expect(rows[1].errors.join(' ')).toMatch(/Relationship/);
    expect(rows[1].errors.join(' ')).toMatch(/Duplicate parent code \(also on row 2\)/);
    expect(rows[2].errors).toEqual(['Duplicate email (also on row 2).']);
  });

  it('requires firstName and lastName columns', () => {
    expect(() => parseParentImportRows([['email'], ['a@x.com']])).toThrow(/firstName/);
  });
});
