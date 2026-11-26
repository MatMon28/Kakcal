import { useSyncExternalStore } from 'react';
import type { FoodPortion } from '../types';

export const CUSTOM_PORTIONS_KEY = 'kcalsync_custom_portions';

const MAX_PORTIONS_PER_FOOD = 20;
const MAX_FOODS = 500;
const EMPTY: FoodPortion[] = [];

type PortionMap = Record<string, FoodPortion[]>;

let cache: PortionMap | null = null;
const listeners = new Set<() => void>();
let storageListenerInstalled = false;

function ensureStorageListener() {
  if (storageListenerInstalled || typeof window === 'undefined') return;
  storageListenerInstalled = true;
  window.addEventListener('storage', (event) => {
    if (event.key === CUSTOM_PORTIONS_KEY || event.key === null) {
      cache = null;
      notify();
    }
  });
}

function notify() {
  listeners.forEach((l) => l());
}

function normalizePortions(raw: unknown): FoodPortion[] {
  if (!Array.isArray(raw)) return [];
  const out: FoodPortion[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Partial<FoodPortion>;
    if (typeof p.id !== 'string' || !p.id || seen.has(p.id)) continue;
    const grams = typeof p.grams === 'number' ? Math.round(p.grams * 10) / 10 : NaN;
    if (!Number.isFinite(grams) || grams <= 0 || grams > 100_000 || Math.abs(grams - 100) <= 0.01) continue;
    const label = typeof p.label === 'string' && p.label.trim() ? p.label.trim().slice(0, 36) : 'Custom';
    seen.add(p.id);
    out.push({ id: p.id, grams, label, isCustom: true });
    if (out.length >= MAX_PORTIONS_PER_FOOD) break;
  }
  return out;
}

function read(): PortionMap {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_PORTIONS_KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clean: PortionMap = {};
      for (const [foodId, list] of Object.entries(parsed as Record<string, unknown>).slice(0, MAX_FOODS)) {
        if (!foodId || foodId.length > 200) continue;
        const normalized = normalizePortions(list);
        if (normalized.length > 0) clean[foodId] = normalized;
      }
      cache = clean;
      return cache;
    }
  } catch {
    /* ignore unreadable storage */
  }
  cache = {};
  return cache;
}

function persist(next: PortionMap) {
  cache = next;
  try {
    if (Object.keys(next).length === 0) localStorage.removeItem(CUSTOM_PORTIONS_KEY);
    else localStorage.setItem(CUSTOM_PORTIONS_KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable: kept in memory for this session */
  }
  notify();
}

export function getCustomPortions(foodId: string): FoodPortion[] {
  return read()[foodId] ?? EMPTY;
}

export function useCustomPortions(foodId: string): FoodPortion[] {
  ensureStorageListener();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    () => getCustomPortions(foodId),
    () => EMPTY,
  );
}

export function addCustomPortion(foodId: string, rawGrams: number, rawLabel?: string): FoodPortion | null {
  const grams = Math.round(rawGrams * 10) / 10;
  if (!foodId || !Number.isFinite(grams) || grams <= 0 || grams > 100_000 || Math.abs(grams - 100) <= 0.01) {
    return null;
  }
  const label = (rawLabel ?? '').trim().slice(0, 36) || 'Custom';
  const map = read();
  const existing = map[foodId] ?? [];
  const created: FoodPortion = {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    grams,
    label,
    isCustom: true,
  };
  const nextList = [...existing, created].slice(-MAX_PORTIONS_PER_FOOD);
  persist({ ...map, [foodId]: nextList });
  return created;
}

export function removeCustomPortion(foodId: string, portionId: string) {
  const map = read();
  const existing = map[foodId];
  if (!existing) return;
  const filtered = existing.filter((p) => p.id !== portionId);
  const next = { ...map };
  if (filtered.length > 0) next[foodId] = filtered;
  else delete next[foodId];
  persist(next);
}

export function exportCustomPortions(): PortionMap {
  const map = read();
  const out: PortionMap = {};
  for (const [k, v] of Object.entries(map)) out[k] = v.map((p) => ({ ...p }));
  return out;
}

export function importCustomPortions(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const next: PortionMap = {};
  for (const [foodId, list] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_FOODS)) {
    if (!foodId || foodId.length > 200) continue;
    const normalized = normalizePortions(list);
    if (normalized.length > 0) next[foodId] = normalized;
  }
  persist(next);
}

export function resetCustomPortionsForTests() {
  cache = {};
  try { localStorage.removeItem(CUSTOM_PORTIONS_KEY); } catch { /* ignore */ }
  notify();
}
