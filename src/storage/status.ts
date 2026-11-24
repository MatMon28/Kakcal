import { useSyncExternalStore } from 'react';

/**
 * Storage failures are never swallowed (item 3): every failed write lands here and `StorageNotice` shows it.
 * `quota` means the browser refused the write because the origin is full (limits vary by browser and device).
 */
export type StorageErrorKind = 'quota' | 'unavailable' | 'failed';
export interface StorageStatus { error: StorageErrorKind | null; scope: string; at: number }

const IDLE: StorageStatus = { error: null, scope: '', at: 0 };
let status: StorageStatus = IDLE;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function classifyStorageError(error: unknown): StorageErrorKind {
  const e = error as { name?: string; code?: number } | null;
  if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014)) return 'quota';
  if (e && (e.name === 'SecurityError' || e.name === 'InvalidStateError' || e.name === 'NotFoundError')) return 'unavailable';
  return 'failed';
}

export function reportStorageError(scope: string, error: unknown): StorageErrorKind {
  const kind = classifyStorageError(error);
  console.error(`[storage] ${scope} failed (${kind})`, error);
  status = { error: kind, scope, at: Date.now() };
  emit();
  return kind;
}

export function clearStorageError(): void {
  if (status === IDLE) return;
  status = IDLE;
  emit();
}

export const getStorageStatus = () => status;

export function useStorageStatus(): StorageStatus {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => status,
    () => IDLE,
  );
}
