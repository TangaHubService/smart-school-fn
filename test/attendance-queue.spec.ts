import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../src/types/api';

const { saveAttendanceBulkApiMock } = vi.hoisted(() => ({
  saveAttendanceBulkApiMock: vi.fn(),
}));

vi.mock('../src/features/sprint3/attendance.api', async () => {
  const actual = await vi.importActual<typeof import('../src/features/sprint3/attendance.api')>(
    '../src/features/sprint3/attendance.api',
  );

  return {
    ...actual,
    saveAttendanceBulkApi: saveAttendanceBulkApiMock,
  };
});

import {
  clearFailedAttendanceQueueItems,
  enqueueAttendance,
  getAttendanceQueueStats,
  listAttendanceQueueItems,
  syncAttendanceQueue,
} from '../src/features/sprint3/attendance-queue';

function deleteQueueDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('smart-school-attendance');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete test database'));
    request.onblocked = () => resolve();
  });
}

describe('attendance queue', () => {
  beforeEach(async () => {
    saveAttendanceBulkApiMock.mockReset();
    await deleteQueueDb();
  });

  afterEach(async () => {
    await deleteQueueDb();
  });

  it('stores queued attendance and reports pending stats', async () => {
    await enqueueAttendance({
      classRoomId: 'e1f7d8d2-3a16-48ce-a2d9-6e405235d123',
      date: '2026-03-06',
      records: [
        {
          studentId: 'af659f47-d2da-4f0c-b954-043d6f995e51',
          status: 'ABSENT',
          remarks: 'Sick',
        },
      ],
    });

    const stats = await getAttendanceQueueStats();
    const items = await listAttendanceQueueItems();

    expect(stats).toEqual({
      total: 1,
      pending: 1,
      failed: 0,
    });
    expect(items).toHaveLength(1);
    expect(items[0].payload.records[0].status).toBe('ABSENT');
  });

  it('syncs queued attendance successfully and removes synced items', async () => {
    saveAttendanceBulkApiMock.mockResolvedValue({
      session: {
        id: 'session-1',
        classRoomId: 'class-1',
        academicYear: null,
        date: '2026-03-06',
        status: 'OPEN',
        createdAt: '2026-03-06T08:00:00.000Z',
        updatedAt: '2026-03-06T08:00:00.000Z',
      },
      savedCount: 1,
      editedCount: 0,
    });

    await enqueueAttendance({
      classRoomId: 'e1f7d8d2-3a16-48ce-a2d9-6e405235d123',
      date: '2026-03-06',
      records: [
        {
          studentId: 'af659f47-d2da-4f0c-b954-043d6f995e51',
          status: 'PRESENT',
        },
      ],
    });

    const result = await syncAttendanceQueue('token-1');
    const stats = await getAttendanceQueueStats();

    expect(result).toEqual({
      synced: 1,
      failed: 0,
      remaining: 0,
    });
    expect(stats).toEqual({
      total: 0,
      pending: 0,
      failed: 0,
    });
    expect(saveAttendanceBulkApiMock).toHaveBeenCalledTimes(1);
  });

  it('marks failed sync items and allows clearing them later', async () => {
    saveAttendanceBulkApiMock.mockRejectedValue(
      new ApiClientError(
        400,
        'ATTENDANCE_STUDENT_NOT_FOUND',
        'Some students do not exist or are inactive',
      ),
    );

    await enqueueAttendance({
      classRoomId: 'e1f7d8d2-3a16-48ce-a2d9-6e405235d123',
      date: '2026-03-06',
      records: [
        {
          studentId: 'af659f47-d2da-4f0c-b954-043d6f995e51',
          status: 'LATE',
        },
      ],
    });

    const syncResult = await syncAttendanceQueue('token-1');
    const itemsAfterFailure = await listAttendanceQueueItems();
    const statsAfterFailure = await getAttendanceQueueStats();

    expect(syncResult).toEqual({
      synced: 0,
      failed: 1,
      remaining: 1,
    });
    expect(itemsAfterFailure).toHaveLength(1);
    expect(itemsAfterFailure[0].status).toBe('FAILED');
    expect(itemsAfterFailure[0].attempts).toBe(1);
    expect(itemsAfterFailure[0].lastError).toContain('ATTENDANCE_STUDENT_NOT_FOUND');
    expect(statsAfterFailure).toEqual({
      total: 1,
      pending: 0,
      failed: 1,
    });

    await clearFailedAttendanceQueueItems();

    const statsAfterClear = await getAttendanceQueueStats();
    expect(statsAfterClear).toEqual({
      total: 0,
      pending: 0,
      failed: 0,
    });
  });
});
