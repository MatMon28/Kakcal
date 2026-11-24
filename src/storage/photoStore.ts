import { useEffect, useState } from 'react';
import type { MealPhoto } from '../types/journal';
import { getMeta, openDb, requestResult, setMeta, STORE_PHOTOS, withStores, type StoredPhoto } from './idb';

/**
 * Photos as IndexedDB blobs (item 4). A journal entry keeps only a reference, `idb:<id>`, in `MealPhoto.src`,
 * so the journal JSON stays small and no base64 string is ever stored. Legacy `data:` URLs and bundled demo
 * images still work and are migrated (or left alone) by `migrateInlinePhotos`.
 */
export const PHOTO_REF_PREFIX = 'idb:';
const PHOTO_SCHEMA_META = 'photoSchema';

export const isPhotoRef = (src: string) => src.startsWith(PHOTO_REF_PREFIX);
export const photoRef = (id: string) => PHOTO_REF_PREFIX + id;
export const photoIdOf = (src: string) => src.slice(PHOTO_REF_PREFIX.length);
export const PHOTO_REF_PATTERN = /^idb:[A-Za-z0-9_-]{1,80}$/;

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const type = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? 'image/jpeg';
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`;
}

/** Stores the blob; rejects (QuotaExceededError etc.) so the caller can tell the user instead of pretending. */
export async function putPhotoBlob(id: string, blob: Blob): Promise<void> {
  const record: StoredPhoto = { blob, type: blob.type, size: blob.size, createdAt: new Date().toISOString() };
  await withStores([STORE_PHOTOS], 'readwrite', (tx) => { tx.objectStore(STORE_PHOTOS).put(record, id); });
}

export async function getPhotoBlob(id: string): Promise<Blob | null> {
  const record = await withStores([STORE_PHOTOS], 'readonly', (tx) => requestResult<StoredPhoto | undefined>(tx.objectStore(STORE_PHOTOS).get(id)));
  return record?.blob ?? null;
}

export async function deletePhotoBlob(id: string): Promise<void> {
  const url = urls.get(id);
  if (url) { URL.revokeObjectURL(url); urls.delete(id); }
  await withStores([STORE_PHOTOS], 'readwrite', (tx) => { tx.objectStore(STORE_PHOTOS).delete(id); });
}

/** Bytes of any supported photo source (reference, data URL or bundled image), for the ZIP export. */
export async function photoBytes(src: string): Promise<Uint8Array> {
  if (isPhotoRef(src)) {
    const blob = await getPhotoBlob(photoIdOf(src));
    if (!blob) throw new Error('photo-missing');
    return new Uint8Array(await blob.arrayBuffer());
  }
  const response = await fetch(src);
  if (!response.ok) throw new Error('photo-read');
  return new Uint8Array(await response.arrayBuffer());
}

// One object URL per stored photo, created on first use and revoked when the photo is deleted.
const urls = new Map<string, string>();
export async function photoObjectUrl(src: string): Promise<string> {
  if (!isPhotoRef(src)) return src;
  const id = photoIdOf(src);
  const cached = urls.get(id);
  if (cached) return cached;
  const blob = await getPhotoBlob(id);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

/** `src` for an <img>: the value itself for data / bundled images, the blob's object URL for references. */
export function usePhotoSrc(src: string): string {
  const [resolved, setResolved] = useState<{ src: string; url: string }>({ src, url: isPhotoRef(src) ? '' : src });
  useEffect(() => {
    if (!isPhotoRef(src)) return;
    let alive = true;
    photoObjectUrl(src).then((url) => { if (alive) setResolved({ src, url }); }, () => undefined);
    return () => { alive = false; };
  }, [src]);
  if (!isPhotoRef(src)) return src;
  return resolved.src === src ? resolved.url : '';
}

/**
 * Moves legacy base64 photos into blobs. Idempotent and safe: a photo's reference replaces its data URL only
 * after the blob was committed, and a failure keeps the data URL (still displayed and backed up).
 */
export async function migrateInlinePhotos(photos: MealPhoto[]): Promise<MealPhoto[] | null> {
  if (!photos.some((p) => p.src.startsWith('data:image/'))) return null;
  if (!(await openDb())) return null;
  let changed = false;
  const next: MealPhoto[] = [];
  for (const photo of photos) {
    if (!photo.src.startsWith('data:image/')) { next.push(photo); continue; }
    try {
      await putPhotoBlob(photo.id, dataUrlToBlob(photo.src));
      next.push({ ...photo, src: photoRef(photo.id) });
      changed = true;
    } catch (error) {
      console.error('Photo migration kept the inline image', error);
      next.push(photo);
    }
  }
  if (changed) await setMeta(PHOTO_SCHEMA_META, 2).catch(() => undefined);
  return changed ? next : null;
}

/** Backups embed photos as data URLs so they stay self-contained and restorable on any device. */
export async function photosForBackup(photos: MealPhoto[]): Promise<MealPhoto[]> {
  const out: MealPhoto[] = [];
  for (const photo of photos) {
    if (!isPhotoRef(photo.src)) { out.push(photo); continue; }
    const blob = await getPhotoBlob(photoIdOf(photo.src)).catch(() => null);
    if (blob) out.push({ ...photo, src: await blobToDataUrl(blob) });
  }
  return out;
}

/** Inverse of `photosForBackup`: data URLs become blobs + references. Throws (nothing half-imported) on failure. */
export async function photosFromBackup(photos: MealPhoto[]): Promise<MealPhoto[]> {
  const out: MealPhoto[] = [];
  for (const photo of photos) {
    if (!photo.src.startsWith('data:image/')) { out.push(photo); continue; }
    if (!(await openDb())) { out.push(photo); continue; }
    await putPhotoBlob(photo.id, dataUrlToBlob(photo.src));
    out.push({ ...photo, src: photoRef(photo.id) });
  }
  return out;
}

export async function schemaVersions() { return { photos: await getMeta<number>(PHOTO_SCHEMA_META).catch(() => undefined) }; }

export interface StorageInfo { usage: number | null; quota: number | null; persisted: boolean | null; photoCount: number; photoBytes: number }

/** Storage information for Settings. Quotas differ per browser and device: never treated as a fixed limit. */
export async function readStorageInfo(): Promise<StorageInfo> {
  let usage: number | null = null, quota: number | null = null, persisted: boolean | null = null;
  try {
    const estimate = await navigator.storage?.estimate?.();
    usage = estimate?.usage ?? null;
    quota = estimate?.quota ?? null;
    persisted = (await navigator.storage?.persisted?.()) ?? null;
  } catch { /* the estimate API is optional */ }
  let photoCount = 0, bytes = 0;
  try {
    const rows = await withStores([STORE_PHOTOS], 'readonly', (tx) => requestResult<StoredPhoto[]>(tx.objectStore(STORE_PHOTOS).getAll()));
    photoCount = rows.length;
    bytes = rows.reduce((sum, row) => sum + (row.size || 0), 0);
  } catch { /* IndexedDB unavailable */ }
  return { usage, quota, persisted, photoCount, photoBytes: bytes };
}

/** Asks the browser not to evict this origin's data under storage pressure (best effort). */
export async function requestPersistentStorage(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}
