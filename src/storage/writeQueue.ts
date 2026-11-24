import { reportStorageError } from './status';

/**
 * Coalescing write queue (item 3). `schedule(key, task)` keeps only the LATEST task per key and runs it after a
 * short delay, so ten quick edits cost one write. Everything is flushed when the page is hidden or closed.
 * Persistence is always triggered from effects or event handlers, never from inside a React state updater.
 */
type Task = () => void | Promise<void>;

const DEFAULT_DELAY_MS = 250;
const pending = new Map<string, Task>();
let timer = 0;
let running: Promise<void> = Promise.resolve();

async function run(): Promise<void> {
  timer = 0;
  const batch = [...pending.entries()];
  pending.clear();
  for (const [key, task] of batch) {
    try { await task(); } catch (error) { reportStorageError(key, error); }
  }
}

export function scheduleWrite(key: string, task: Task, delay = DEFAULT_DELAY_MS): void {
  pending.set(key, task);
  if (timer) return;
  timer = window.setTimeout(() => { running = running.then(run); }, delay);
}

/** Runs every queued write now and resolves when all of them (including ones already running) are done. */
export function flushWrites(): Promise<void> {
  if (timer) { window.clearTimeout(timer); timer = 0; }
  running = running.then(run);
  return running;
}

export const pendingWriteCount = () => pending.size;

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { void flushWrites(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flushWrites(); });
}
