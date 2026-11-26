import { getPrimaryStandardPortion } from '../data/standardPortions';

const KEY = 'kcalsync_last_amounts';

// Search rows ask for this on every render, so keep the parsed map instead of re-parsing the
// whole localStorage entry for each row.
let cache: Record<string, number> | null = null;

function read(): Record<string, number> {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    cache = {};
  }
  return cache!;
}

/** The remembered portions, for the JSON backup. */
export function exportLastAmounts(): Record<string, number> {
  return { ...read() };
}

/** Restores remembered portions from a backup (invalid entries are dropped) and refreshes the cache. */
export function importLastAmounts(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const next: Record<string, number> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0 && id.length <= 200) next[id] = v;
  }
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage full: the portions stay in memory for this session */ }
}

/** Last portion used for a key (food id, or `activity:<id>` for activity minutes). */
export function getLastAmount(foodId: string, fallback = 100): number {
  const v = read()[foodId];
  return typeof v === 'number' && v > 0 ? v : fallback;
}

export function setLastAmount(foodId: string, amount: number) {
  if (amount <= 0) return;
  const m = read();
  m[foodId] = amount;
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch { /* storage full or unavailable: the portion is simply not remembered */ }
}

/**
 * The portion to offer for a food: the standard portion of a recipe, otherwise the last weight the user logged for it, otherwise the
 * product's classic portion (when the data has one), otherwise 100 g/ml.
 */
export function getDefaultAmount(food: { id: string; portion?: number; portions?: { grams: number }[]; isRecipe?: boolean }): number {
  // A recipe with a standard portion (Custom > Recipes > Standard portion) always starts from that portion.
  if (food.isRecipe && typeof food.portion === 'number' && food.portion > 0) return food.portion;
  const last = read()[food.id];
  if (typeof last === 'number' && last > 0) return last;
  if (typeof food.portion === 'number' && food.portion > 0) return food.portion;
  const explicit = food.portions?.find((p) => p.grams > 0 && Math.abs(p.grams - 100) > 0.01)?.grams;
  if (explicit) return explicit;
  return getPrimaryStandardPortion(food.id) ?? 100;
}
