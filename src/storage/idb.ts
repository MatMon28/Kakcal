/** Minimal promise wrapper around IndexedDB (no dependency). One database, three stores. */
export const DB_NAME = 'kakcal';
export const DB_VERSION = 1;
export const STORE_DAYS = 'days';     // keyPath `date`: one record per journal day
export const STORE_PHOTOS = 'photos'; // out-of-line key = photo id, value `StoredPhoto`
export const STORE_META = 'meta';     // out-of-line key, small values (schema versions)

export interface StoredPhoto { blob: Blob; type: string; size: number; createdAt: string }

let dbPromise: Promise<IDBDatabase | null> | null = null;

/** Resolves `null` when IndexedDB is missing or blocked (private mode, old webviews): callers fall back. */
export function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(DB_NAME, DB_VERSION); } catch { resolve(null); return; }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DAYS)) db.createObjectStore(STORE_DAYS, { keyPath: 'date' });
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) db.createObjectStore(STORE_PHOTOS);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

export const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });

/** Runs `work` in one transaction and resolves when it has COMMITTED (not merely when the requests were queued). */
export async function withStores<T>(names: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => Promise<T> | T): Promise<T> {
  const db = await openDb();
  if (!db) throw new DOMException('IndexedDB is unavailable', 'NotFoundError');
  return new Promise<T>((resolve, reject) => {
    let result: T;
    let tx: IDBTransaction;
    try { tx = db.transaction(names, mode); } catch (error) { reject(error); return; }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
    Promise.resolve(work(tx)).then((value) => { result = value; }, (error) => { try { tx.abort(); } catch { /* already done */ } reject(error); });
  });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return withStores([STORE_META], 'readonly', (tx) => requestResult<T | undefined>(tx.objectStore(STORE_META).get(key)));
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await withStores([STORE_META], 'readwrite', (tx) => { tx.objectStore(STORE_META).put(value, key); });
}

/** Closes the connection and deletes the whole database (Settings > Delete all data). */
export async function deleteDatabase(): Promise<void> {
  const db = await openDb();
  db?.close();
  dbPromise = null;
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch { resolve(); }
  });
}

/** Test helper: forget the cached connection so a fresh fake database can be opened. */
export function resetDbForTests(): void { dbPromise = null; }
