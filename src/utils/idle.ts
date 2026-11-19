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
