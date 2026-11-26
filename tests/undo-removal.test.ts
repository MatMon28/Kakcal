import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRemovalScope, dismissRemoval, getRemovals, offerRemovalUndo, removeWithUndo, scheduleRemoval, undoRemoval, UNDO_REMOVAL_MS } from '../src/utils/undoRemoval';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

describe('temporary undo', () => {
  it('restores only the removed row after unrelated edits and preserves identity', () => {
    let rows = [{ id: 'a', amount: 1 }, { id: 'b', amount: 2 }];
    const update = (change: (current: typeof rows) => typeof rows) => { rows = change(rows); };
    removeWithUndo(rows, 0, update, undefined, (a, b) => a.id === b.id);
    rows = [{ id: 'b', amount: 3 }, { id: 'c', amount: 4 }];
    undoRemoval(getRemovals()[0].id);
    expect(rows).toEqual([{ id: 'a', amount: 1 }, { id: 'b', amount: 3 }, { id: 'c', amount: 4 }]);
    expect(getRemovals()).toHaveLength(0);
  });

  it('tracks successive removals, each with its own 2-second timeout', () => {
    expect(UNDO_REMOVAL_MS).toBe(2000);
    let rows = ['a', 'b', 'c'];
    const update = (change: (current: string[]) => string[]) => { rows = change(rows); };
    removeWithUndo(rows, 0, update);
    vi.advanceTimersByTime(800);
    removeWithUndo(rows, 1, update);
    expect(getRemovals()).toHaveLength(2);
    vi.advanceTimersByTime(UNDO_REMOVAL_MS - 800);
    expect(getRemovals()).toHaveLength(1);
    undoRemoval(getRemovals()[0].id);
    expect(rows).toEqual(['b', 'c']);
  });

  it('clears an ingredient draft’s undo when the draft closes', () => {
    const scope = Symbol();
    let rows = ['draft'];
    removeWithUndo(rows, 0, (change) => { rows = change(rows); }, scope);
    const id = getRemovals()[0].id;
    clearRemovalScope(scope);
    undoRemoval(id);
    expect(rows).toEqual([]);
  });

  it('only commits a bulk erase after the full interval, unless cancelled', () => {
    const erase = vi.fn();
    const cancel = vi.fn();
    expect(scheduleRemoval(erase, cancel)).toBe(true);
    expect(scheduleRemoval(erase, cancel)).toBe(false);
    vi.advanceTimersByTime(UNDO_REMOVAL_MS - 1);
    expect(erase).not.toHaveBeenCalled();
    undoRemoval(getRemovals()[0].id);
    vi.advanceTimersByTime(5);
    expect(cancel).toHaveBeenCalledOnce();
    expect(erase).not.toHaveBeenCalled();
    scheduleRemoval(erase, cancel);
    vi.advanceTimersByTime(UNDO_REMOVAL_MS);
    expect(erase).toHaveBeenCalledOnce();
  });

  it('dismissRemoval removes normal undo immediately and commits scheduled erases immediately', () => {
    const undo = vi.fn();
    offerRemovalUndo(undo);
    dismissRemoval(getRemovals()[0].id);
    expect(getRemovals()).toHaveLength(0);
    expect(undo).not.toHaveBeenCalled();

    const erase = vi.fn();
    const cancel = vi.fn();
    scheduleRemoval(erase, cancel);
    dismissRemoval(getRemovals()[0].id);
    expect(getRemovals()).toHaveLength(0);
    expect(erase).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
  });
});
