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
  } catch {}
}

/**
 * The portion to offer for a food: the last weight the user logged for it, otherwise the
 * product's classic portion (when the data has one), otherwise 100 g/ml.
 */
export function getDefaultAmount(food: { id: string; portion?: number }): number {
  const last = read()[food.id];
  if (typeof last === 'number' && last > 0) return last;
  return typeof food.portion === 'number' && food.portion > 0 ? food.portion : 100;
}
