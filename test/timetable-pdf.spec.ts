import { describe, expect, it } from 'vitest';

import type { TimetableSlot } from '../src/features/timetable/timetable.api';
import { buildTimetablePdfGrid, timetableFileSlug } from '../src/utils/timetable-pdf';

function slot(day: number, period: number, subject: string, start = '8:00', end = '8:45'): TimetableSlot {
  return {
    id: `${day}-${period}`,
    academicYearId: 'y',
    termId: 't',
    classRoomId: 'c',
    courseId: 'co',
    dayOfWeek: day,
    periodNumber: period,
    startTime: start,
    endTime: end,
    academicYear: { id: 'y', name: '2026' },
    term: { id: 't', name: 'Term 1', sequence: 1 },
    classRoom: { id: 'c', code: 'S2A', name: 'Senior 2 A', gradeLevel: { id: 'g', code: 'S2', name: 'Senior 2' } },
    course: {
      id: 'co',
      title: `${subject} S2A`,
      subject: { id: subject, code: subject, name: subject },
      teacherUser: { id: 'u', firstName: 'Jane', lastName: 'Doe' },
    },
  };
}

describe('buildTimetablePdfGrid', () => {
  it('lays periods out as rows and Monday–Friday as columns', () => {
    const grid = buildTimetablePdfGrid(
      [slot(1, 1, 'Math'), slot(3, 1, 'English'), slot(2, 2, 'Physics', '8:45', '9:30')],
      'teacher'
    );
    expect(grid.days).toEqual([1, 2, 3, 4, 5]);
    expect(grid.rows.map((r) => r.period)).toEqual([1, 2]);
    expect(grid.rows[0].time).toBe('8:00 - 8:45');
    expect(grid.rows[0].cells).toEqual(['Math\nJane Doe', '', 'English\nJane Doe', '', '']);
    expect(grid.rows[1].cells[1]).toBe('Physics\nJane Doe');
  });

  it('shows the class instead of the teacher for a teacher schedule, and adds Saturday when used', () => {
    const grid = buildTimetablePdfGrid([slot(6, 1, 'Math')], 'class');
    expect(grid.days).toEqual([1, 2, 3, 4, 5, 6]);
    expect(grid.rows[0].cells[5]).toBe('Math\nSenior 2 A');
  });

  it('notes a different time when one day runs off the usual schedule', () => {
    const grid = buildTimetablePdfGrid(
      [slot(1, 1, 'Math'), slot(2, 1, 'Art'), slot(3, 1, 'Music', '8:10', '8:55')],
      'teacher'
    );
    expect(grid.rows[0].time).toBe('8:00 - 8:45');
    expect(grid.rows[0].cells[2]).toBe('Music\nJane Doe\n(8:10 - 8:55)');
  });
});

describe('timetableFileSlug', () => {
  it('builds a safe file name', () => {
    expect(timetableFileSlug('timetable', 'S2 A', '2025/2026', undefined)).toBe('timetable-S2-A-2025-2026');
  });
});
