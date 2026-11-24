import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { loadDayLogs, persistDayChanges, replaceAllDays, DAY_SCHEMA_VERSION } from '../src/storage/dayStore';
import { flushWrites, scheduleWrite } from '../src/storage/writeQueue';
import { classifyStorageError, clearStorageError, getStorageStatus, reportStorageError } from '../src/storage/status';
import { dataUrlToBlob, getPhotoBlob, isPhotoRef, migrateInlinePhotos, photosForBackup, photosFromBackup, putPhotoBlob } from '../src/storage/photoStore';
import { normalizeMealJournal } from '../src/utils/journalStore';
import { STORAGE_KEYS } from '../src/context/appStorage';
import type { DayLog } from '../src/types';
import type { MealPhoto } from '../src/types/journal';

const emptyDay = (date: string, extra: Partial<DayLog> = {}): DayLog => ({
  date, meals: { breakfast: [], mid_morning: [], lunch: [], midday_snack: [], dinner: [], extra: [] },
  activities: [], waterEntries: [], poops: [], custom: {}, ...extra,
});
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

beforeEach(async () => {
  await flushWrites();
  await deleteDatabase();
  resetDbForTests();
  localStorage.clear();
  clearStorageError();
});

describe('day storage: per-record IndexedDB with a versioned migration', () => {
  it('migrates the legacy localStorage blob once and removes it after the commit', async () => {
    localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify({ '2026-02-01': emptyDay('2026-02-01', { weightKg: 70 }) }));
    const first = await loadDayLogs();
    expect(first.logs['2026-02-01'].weightKg).toBe(70);
    expect(first.initialised).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.DAY_LOGS)).toBeNull();
    resetDbForTests();
    const second = await loadDayLogs();
    expect(Object.keys(second.logs)).toEqual(['2026-02-01']);
    expect(DAY_SCHEMA_VERSION).toBe(2);
  });

  it('writes only the records that changed', async () => {
    const a = emptyDay('2026-03-01'), b = emptyDay('2026-03-02');
    persistDayChanges({}, { [a.date]: a, [b.date]: b });
    await flushWrites();
    const b2 = { ...b, weightKg: 71 };
    const put = vi.spyOn(IDBObjectStore.prototype, 'put');
    persistDayChanges({ [a.date]: a, [b.date]: b }, { [a.date]: a, [b.date]: b2 });
    await flushWrites();
    expect(put).toHaveBeenCalledTimes(1);
    put.mockRestore();
    resetDbForTests();
    expect((await loadDayLogs()).logs['2026-03-02'].weightKg).toBe(71);
  });

  it('deletes removed days and replaces everything on import', async () => {
    const a = emptyDay('2026-04-01');
    persistDayChanges({}, { [a.date]: a });
    await flushWrites();
    persistDayChanges({ [a.date]: a }, {});
    await flushWrites();
    expect(Object.keys((await loadDayLogs()).logs)).toEqual([]);
    await replaceAllDays({ '2026-05-01': emptyDay('2026-05-01') });
    resetDbForTests();
    expect(Object.keys((await loadDayLogs()).logs)).toEqual(['2026-05-01']);
  });
});

describe('write queue and failure reporting (item 3)', () => {
  it('coalesces writes per key and keeps only the latest', async () => {
    const task = vi.fn();
    scheduleWrite('k', () => task(1));
    scheduleWrite('k', () => task(2));
    scheduleWrite('k', () => task(3));
    await flushWrites();
    expect(task).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledWith(3);
  });
  it('reports a failed write instead of swallowing it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    scheduleWrite('boom', () => { throw new DOMException('full', 'QuotaExceededError'); });
    await flushWrites();
    expect(getStorageStatus().error).toBe('quota');
    expect(classifyStorageError(new Error('x'))).toBe('failed');
    expect(reportStorageError('x', new DOMException('n', 'SecurityError'))).toBe('unavailable');
  });
});

describe('photo blobs (item 4)', () => {
  it('stores blobs by reference and migrates inline base64 photos', async () => {
    const photo: MealPhoto = { id: 'p1', date: '2026-01-01', slot: 'lunch', src: PIXEL, note: '', createdAt: '' };
    const migrated = await migrateInlinePhotos([photo]);
    expect(migrated?.[0].src).toBe('idb:p1');
    expect(isPhotoRef(migrated![0].src)).toBe(true);
    expect((await getPhotoBlob('p1'))?.type).toBe('image/png');
    expect(await migrateInlinePhotos(migrated!)).toBeNull(); // idempotent
  });
  it('round-trips photos through a backup', async () => {
    await putPhotoBlob('p2', dataUrlToBlob(PIXEL));
    const backup = await photosForBackup([{ id: 'p2', date: '2026-01-01', slot: 'lunch', src: 'idb:p2', note: 'n', createdAt: '' }]);
    expect(backup[0].src.startsWith('data:image/png;base64,')).toBe(true);
    await deleteDatabase(); resetDbForTests();
    const restored = await photosFromBackup(backup);
    expect(restored[0].src).toBe('idb:p2');
    expect(await getPhotoBlob('p2')).not.toBeNull();
  });
  it('accepts photo references when validating a journal', () => {
    const journal = normalizeMealJournal({ plans: [], memories: {}, photos: [{ id: 'a', date: '2026-01-01', slot: 'lunch', src: 'idb:a', note: '', createdAt: '' }, { id: 'b', date: '2026-01-01', slot: 'lunch', src: 'idb:../x', note: '', createdAt: '' }] });
    expect(journal.photos.map((p) => p.id)).toEqual(['a']);
  });
});
