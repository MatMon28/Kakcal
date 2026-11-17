const KEY = 'kcalsync_last_amounts';

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function getLastAmount(foodId: string): number {
  const v = read()[foodId];
  return typeof v === 'number' && v > 0 ? v : 100;
}

export function setLastAmount(foodId: string, amount: number) {
  if (amount <= 0) return;
  const m = read();
  m[foodId] = amount;
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {}
}
