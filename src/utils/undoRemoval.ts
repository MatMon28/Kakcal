/** Session-only inverse operations. Capture only the removed record, never a whole live draft. */
export const UNDO_REMOVAL_MS = 6500;

type Options = { scope?: symbol; onExpire?: () => void; scheduled?: boolean };
type Removal = { id: number; undo: () => void; timer: ReturnType<typeof setTimeout> } & Options;
let sequence = 0;
let pending: readonly Removal[] = [];
const listeners = new Set<() => void>();

export function subscribeToRemovals(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const getRemovals = () => pending;
const emit = () => listeners.forEach((listener) => listener());

function take(id: number) {
  const removal = pending.find((item) => item.id === id);
  if (!removal) return;
  clearTimeout(removal.timer);
  pending = pending.filter((item) => item.id !== id);
  emit();
  return removal;
}

export function offerRemovalUndo(undo: () => void, options: Options = {}) {
  const id = ++sequence;
  const timer = setTimeout(() => take(id)?.onExpire?.(), UNDO_REMOVAL_MS);
  pending = [{ ...options, id, undo, timer }, ...pending];
  emit();
}

export function undoRemoval(id: number) {
  take(id)?.undo();
}

export function clearRemovalScope(scope: symbol) {
  pending.filter((item) => item.scope === scope).forEach((item) => take(item.id));
}

/** For confirmed bulk erases that reload the app: don't erase or keep a second copy until Undo expires. */
export function scheduleRemoval(commit: () => void, onCancel: () => void) {
  if (pending.some((item) => item.scheduled)) return false;
  offerRemovalUndo(onCancel, { scheduled: true, onExpire: commit });
  return true;
}

export function restoreAt<T>(rows: readonly T[], row: T, index: number, same = (a: T, b: T) => a === b): T[] {
  if (rows.some((item) => same(item, row))) return [...rows];
  const result = [...rows];
  result.splice(index, 0, row);
  return result;
}

export function removeWithUndo<T>(
  rows: readonly T[],
  index: number,
  update: (change: (current: T[]) => T[]) => void,
  scope?: symbol,
  same = (a: T, b: T) => a === b,
) {
  if (index < 0 || index >= rows.length) return;
  const removed = rows[index];
  update((current) => {
    const at = current.findIndex((item) => same(item, removed));
    return at < 0 ? current : [...current.slice(0, at), ...current.slice(at + 1)];
  });
  offerRemovalUndo(() => update((current) => restoreAt(current, removed, index, same)), { scope });
}
