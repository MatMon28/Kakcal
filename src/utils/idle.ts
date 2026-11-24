/**
 * Runs `task` when the browser is idle (after the first frames), with a deadline so it can never starve.
 * Used for work the first screen does not need: native widget publishing, launch-colour sync and
 * notification scheduling. Returns a cancel function (use it as an effect cleanup).
 * Falls back to a short timer in WebViews without requestIdleCallback.
 */
export function whenIdle(task: () => void, timeoutMs = 2500): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(task, { timeout: timeoutMs });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 250);
  return () => window.clearTimeout(id);
}

/**
 * Runs `task` after the next frame has been painted (requestAnimationFrame, then a macrotask). A passive effect is
 * NOT enough for this: React flushes the effects of a discrete event (a tap) synchronously, before the browser
 * paints, so a layout read in it still lands in the critical frame. Returns a cancel function.
 */
export function afterPaint(task: () => void): () => void {
  let timer = 0;
  const frame = requestAnimationFrame(() => { timer = window.setTimeout(task, 0); });
  return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
}
