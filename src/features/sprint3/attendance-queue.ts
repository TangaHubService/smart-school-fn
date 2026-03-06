import { ApiClientError } from '../../types/api';
import {
  SaveAttendanceBulkPayload,
  saveAttendanceBulkApi,
} from './attendance.api';

const DB_NAME = 'smart-school-attendance';
const DB_VERSION = 1;
const STORE_NAME = 'attendance_queue';

export type AttendanceQueueStatus = 'PENDING' | 'FAILED';

export interface AttendanceQueueItem {
  id: string;
  payload: SaveAttendanceBulkPayload;
  status: AttendanceQueueStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
}

export interface AttendanceQueueStats {
  total: number;
  pending: number;
  failed: number;
}

function ensureIndexedDb() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not supported in this environment');
  }
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `queue-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function openDb(): Promise<IDBDatabase> {
  ensureIndexedDb();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Failed to open queue database'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const database = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    Promise.resolve(handler(store))
      .then((result) => {
        transaction.oncomplete = () => {
          database.close();
          resolve(result);
        };
      })
      .catch((error) => {
        database.close();
        reject(error);
      });

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Queue transaction failed'));
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export async function enqueueAttendance(
  payload: SaveAttendanceBulkPayload,
): Promise<AttendanceQueueItem> {
  const now = new Date().toISOString();
  const item: AttendanceQueueItem = {
    id: randomId(),
    payload,
    status: 'PENDING',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    lastError: null,
  };

  await withStore('readwrite', async (store) => {
    await requestToPromise(store.put(item));
  });

  return item;
}

export async function listAttendanceQueueItems(): Promise<AttendanceQueueItem[]> {
  const items = await withStore('readonly', async (store) =>
    requestToPromise<AttendanceQueueItem[]>(store.getAll()),
  );

  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAttendanceQueueStats(): Promise<AttendanceQueueStats> {
  const items = await listAttendanceQueueItems();
  const pending = items.filter((item) => item.status === 'PENDING').length;
  const failed = items.filter((item) => item.status === 'FAILED').length;

  return {
    total: items.length,
    pending,
    failed,
  };
}

async function updateAttendanceQueueItem(item: AttendanceQueueItem): Promise<void> {
  await withStore('readwrite', async (store) => {
    await requestToPromise(store.put(item));
  });
}

async function removeAttendanceQueueItem(id: string): Promise<void> {
  await withStore('readwrite', async (store) => {
    await requestToPromise(store.delete(id));
  });
}

export async function clearFailedAttendanceQueueItems(): Promise<void> {
  const items = await listAttendanceQueueItems();
  const failedIds = items
    .filter((item) => item.status === 'FAILED')
    .map((item) => item.id);

  await withStore('readwrite', async (store) => {
    for (const id of failedIds) {
      await requestToPromise(store.delete(id));
    }
  });
}

export interface SyncAttendanceQueueResult {
  synced: number;
  failed: number;
  remaining: number;
}

export async function syncAttendanceQueue(
  accessToken: string,
): Promise<SyncAttendanceQueueResult> {
  const items = await listAttendanceQueueItems();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await saveAttendanceBulkApi(accessToken, item.payload);
      await removeAttendanceQueueItem(item.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof ApiClientError
          ? `${error.code}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Sync failed';

      await updateAttendanceQueueItem({
        ...item,
        status: 'FAILED',
        attempts: item.attempts + 1,
        updatedAt: new Date().toISOString(),
        lastError: message,
      });
    }
  }

  const remaining = (await listAttendanceQueueItems()).length;

  return {
    synced,
    failed,
    remaining,
  };
}

