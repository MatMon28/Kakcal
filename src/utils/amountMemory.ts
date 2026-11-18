const KEY = 'kcalsync_last_amounts';

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
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
