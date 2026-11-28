import { STORAGE_KEYS } from '../context/appStorage';
import { loadDayLogs, replaceAllDays } from '../storage/dayStore';
import { STORE_PHOTOS, withStores } from '../storage/idb';
import { flushWrites } from '../storage/writeQueue';
import type { DayLog } from '../types';
import { FASTING_STORAGE_KEY } from './fastingStore';
import { JOURNAL_KEY } from './journalStore';

/**
 * Settings > Delete data: removes ONE kind of record at a time. Settings and the things they configure (custom
 * buttons, quick foods, notification times, theme, goals) are never touched. The caller confirms first and then
 * reloads the page, so every screen starts again from the stored data.
 */
export type DeleteCategory =
  | 'plans'
  | 'savedMeals'
  | 'recipes'
  | 'photos'
  | 'mealNotes'
  | 'foodLog'
  | 'activities'
  | 'water'
  | 'weight'
  | 'poop'
  | 'customTrackers'
  | 'period'
  | 'body'
  | 'fasting';

const PLANNER_DRAFT_KEY = 'kcak_planner_draft';
const BODY_KEY = 'kcalsync_body';

type Json = Record<string, unknown>;

function readObject(key: string): Json | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
  } catch {
    return null;
  }
}

function readArray(key: string): Json[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? (value as Json[]) : [];
  } catch {
    return [];
  }
}

/** Rewrites every stored journal day with `change` (IndexedDB or localStorage, whichever backend is in use). */
async function changeEveryDay(dayLogs: Record<string, DayLog> | undefined, change: (day: DayLog) => DayLog): Promise<void> {
  const next: Record<string, DayLog> = {};
  const logs = dayLogs ?? (await loadDayLogs()).logs;
  for (const date in logs) next[date] = change(logs[date]);
  await replaceAllDays(next);
}

/** Deletes one category. Resolves when the change is stored; throws when storage refuses the write. */
export async function deleteCategory(category: DeleteCategory, dayLogs?: Record<string, DayLog>): Promise<void> {
  // Nothing still queued may be written back over the deletion.
  await flushWrites().catch(() => undefined);

  switch (category) {
    case 'plans': {
      // Meal plans, plan names and shopping lists live in the meal journal record; the planner draft is separate.
      const journal = readObject(JOURNAL_KEY);
      if (journal) localStorage.setItem(JOURNAL_KEY, JSON.stringify({ ...journal, plans: [], planGroups: [], shoppingLists: [] }));
      localStorage.removeItem(PLANNER_DRAFT_KEY);
      return;
    }
    case 'savedMeals':
      localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify([]));
      return;
    case 'recipes': {
      // Recipes are foods created by the recipe builder (`isRecipe`); ordinary custom foods stay.
      const foods = readArray(STORAGE_KEYS.CUSTOM_FOODS).filter((food) => food.isRecipe !== true);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(foods));
      return;
    }
    case 'photos': {
      // Meal photos (photo diary): the journal keeps the notes list empty and the image blobs are cleared.
      const journal = readObject(JOURNAL_KEY);
      if (journal) localStorage.setItem(JOURNAL_KEY, JSON.stringify({ ...journal, photos: [] }));
      await withStores([STORE_PHOTOS], 'readwrite', (tx) => {
        tx.objectStore(STORE_PHOTOS).clear();
      });
      return;
    }
    case 'mealNotes': {
      // Diary notes written under each meal. Other fields of the same meal entry (favourites) are kept.
      const journal = readObject(JOURNAL_KEY);
      if (!journal) return;
      const memories = journal.memories && typeof journal.memories === 'object' ? (journal.memories as Record<string, Json>) : {};
      const kept: Record<string, Json> = {};
      for (const key in memories) {
        const { note: _note, ...rest } = memories[key] ?? {};
        if (Object.keys(rest).length > 0) kept[key] = rest;
      }
      localStorage.setItem(JOURNAL_KEY, JSON.stringify({ ...journal, memories: kept }));
      return;
    }
    case 'foodLog':
      await changeEveryDay(dayLogs, (day) => ({
        ...day,
        meals: Object.fromEntries(Object.keys(day.meals).map((slot) => [slot, []])) as unknown as DayLog['meals'],
      }));
      return;
    case 'activities':
      await changeEveryDay(dayLogs, (day) => ({ ...day, activities: [] }));
      return;
    case 'water':
      await changeEveryDay(dayLogs, (day) => ({ ...day, waterEntries: [], waterMl: undefined }));
      return;
    case 'weight':
      await changeEveryDay(dayLogs, (day) => ({ ...day, weightKg: undefined }));
      return;
    case 'poop':
      await changeEveryDay(dayLogs, (day) => ({ ...day, poops: [] }));
      return;
    case 'customTrackers':
      await changeEveryDay(dayLogs, (day) => ({ ...day, custom: {}, customEntries: {} }));
      return;
    case 'period': {
      // Period settings (cycle length, pill pack, tags) are kept; only the daily period records go.
      const period = readObject(STORAGE_KEYS.PERIOD);
      if (period) localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify({ ...period, logs: {} }));
      return;
    }
    case 'body':
      localStorage.removeItem(BODY_KEY);
      return;
    case 'fasting': {
      // Fasting settings (enabled switch and protocol) are kept; only sessions and notes go.
      const fasting = readObject(FASTING_STORAGE_KEY);
      if (fasting) {
        localStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify({ ...fasting, activeSession: null, sessions: [], notes: [] }));
      }
      return;
    }
  }
}
