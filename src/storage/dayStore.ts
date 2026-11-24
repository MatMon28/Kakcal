import type { DayLog } from '../types';
import { normalizeDayLogs, STORAGE_KEYS } from '../context/appStorage';
import { getMeta, openDb, requestResult, setMeta, STORE_DAYS, withStores } from './idb';
import { scheduleWrite } from './writeQueue';

/**
 * Journal days, one IndexedDB record per date (items 3 and 11).
 *
 * - Schema versions live in `meta.daySchema`. Version 1 was the single `kcalsync_day_logs` localStorage blob;
 *   version 2 is per-record IndexedDB. The legacy blob is normalised ONCE during the migration and deleted only
 *   after the IndexedDB transaction has committed. After that, startup does not normalise history at all: records are
 *   written already normalised, and `looksValid` is a cheap structural check (anything odd is repaired individually).
 * - Writes are per record: a change to one day writes one record, not the whole journal.
 * - When IndexedDB is unavailable the store falls back to the old localStorage blob (coalesced).
 */
export const DAY_SCHEMA_VERSION = 2;
const META_KEY = 'daySchema';

export interface LoadedDays {
  logs: Record<string, DayLog>;
  /** false on a brand-new install (the demo build seeds sample days only then). */
  initialised: boolean;
  backend: 'idb' | 'local';
}

let backend: 'idb' | 'local' = 'idb';

const looksValid = (value: unknown, key?: string): value is DayLog => {
  const day = value as Partial<DayLog> | null;
  return Boolean(day && typeof day.date === 'string' && (key === undefined || day.date === key) &&
    day.meals && typeof day.meals === 'object' && Array.isArray(day.activities));
};

function readLegacy(): Record<string, DayLog> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DAY_LOGS);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? normalizeDayLogs(parsed) : null;
  } catch (error) {
    console.error('Failed to parse day logs', error);
    return null;
  }
}

export async function loadDayLogs(): Promise<LoadedDays> {
  const db = await openDb();
  if (!db) {
    backend = 'local';
    const legacy = readLegacy();
    return { logs: legacy ?? {}, initialised: legacy !== null, backend };
  }
  backend = 'idb';
  const version = await getMeta<number>(META_KEY).catch(() => undefined);
  if (version === undefined || version < DAY_SCHEMA_VERSION) {
    const legacy = readLegacy();
    const existing = await withStores([STORE_DAYS], 'readonly', (tx) => requestResult<DayLog[]>(tx.objectStore(STORE_DAYS).getAll()));
    const logs: Record<string, DayLog> = {};
    for (const day of existing) logs[day.date] = day;
    if (legacy) for (const date in legacy) if (!logs[date]) logs[date] = legacy[date];
    try {
      await withStores([STORE_DAYS, 'meta'], 'readwrite', (tx) => {
        const store = tx.objectStore(STORE_DAYS);
        for (const date in logs) store.put(logs[date]);
        tx.objectStore('meta').put(DAY_SCHEMA_VERSION, META_KEY);
      });
      if (legacy) localStorage.removeItem(STORAGE_KEYS.DAY_LOGS); // only after the commit succeeded
    } catch (error) {
      // Could not migrate (e.g. quota): keep the legacy blob untouched and run this session from memory.
      console.error('Day migration failed; legacy data kept', error);
    }
    return { logs, initialised: legacy !== null || existing.length > 0, backend };
  }
  const rows = await withStores([STORE_DAYS], 'readonly', (tx) => requestResult<unknown[]>(tx.objectStore(STORE_DAYS).getAll()));
  const logs: Record<string, DayLog> = {};
  const repair: Record<string, DayLog> = {};
  for (const row of rows) {
    if (looksValid(row)) logs[row.date] = row;
    else if (row && typeof (row as { date?: unknown }).date === 'string') {
      const date = (row as { date: string }).date;
      Object.assign(repair, normalizeDayLogs({ [date]: row as DayLog }));
    }
  }
  Object.assign(logs, repair);
  for (const date in repair) persistDay(date, repair[date]);
  return { logs, initialised: true, backend };
}

function persistDay(date: string, day: DayLog | undefined): void {
  scheduleWrite(`day:${date}`, () => withStores([STORE_DAYS], 'readwrite', (tx) => {
    if (day) tx.objectStore(STORE_DAYS).put(day);
    else tx.objectStore(STORE_DAYS).delete(date);
  }));
}

/** Writes only the days whose record changed between `prev` and `next` (compared by reference). */
export function persistDayChanges(prev: Record<string, DayLog>, next: Record<string, DayLog>): void {
  if (backend === 'local') {
    scheduleWrite('days-local', () => localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(next)));
    return;
  }
  for (const date in next) if (prev[date] !== next[date]) persistDay(date, next[date]);
  for (const date in prev) if (!(date in next)) persistDay(date, undefined);
}

/** Replaces every stored day (backup import). Resolves once committed; throws when the write fails. */
export async function replaceAllDays(logs: Record<string, DayLog>): Promise<void> {
  if (backend === 'local') { localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(logs)); return; }
  await withStores([STORE_DAYS], 'readwrite', (tx) => {
    const store = tx.objectStore(STORE_DAYS);
    store.clear();
    for (const date in logs) store.put(logs[date]);
  });
  await setMeta(META_KEY, DAY_SCHEMA_VERSION);
}

/** Which backend is in use (shown in the storage information). */
export const dayBackend = () => backend;
