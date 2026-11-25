import { useEffect, useState, useSyncExternalStore } from 'react';
import { RotateCcw } from 'lucide-react';
import { useJournalText } from '../../i18n/journal';
import { clearRemovalScope, getRemovals, subscribeToRemovals, undoRemoval } from '../../utils/undoRemoval';

/** Draft-only deletions stop being undoable once the draft closes or is saved. */
export function useRemovalScope() {
  const [scope] = useState(() => Symbol('draft removals'));
  useEffect(() => () => clearRemovalScope(scope), [scope]);
  return scope;
}

/** Mounted on the active sheet (inside its focus trap) or above the page dock. */
export function UndoRemovalNotice({ floating = false }: { floating?: boolean }) {
  const j = useJournalText();
  const removals = useSyncExternalStore(subscribeToRemovals, getRemovals, getRemovals);
  // A confirmed bulk erase has priority so another action cannot cover its cancellation window.
  const removal = removals.find((item) => item.scheduled) ?? removals[0];
  if (!removal) return null;
  return (
    <div
      data-undo-removal
      className={floating
        ? 'fixed z-40 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2'
        : 'shrink-0 px-4 py-2 sm:px-5 border-t border-[var(--border)]'}
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 shadow-lg text-[var(--text)]">
        <span role="status" className="text-xs font-bold" key={removal.id}>
          {removal.scheduled ? j('Deletion scheduled', 'Eliminazione programmata') : j('Item removed', 'Elemento rimosso')}
        </span>
        <button
          type="button"
          onClick={() => undoRemoval(removal.id)}
          className="pressable inline-flex items-center gap-1.5 rounded-xl bg-[#C9EFD3] px-3 min-h-9 font-extrabold text-xs text-[#174A2B]"
        >
          <RotateCcw size={14} /> {j('Undo', 'Annulla')}
        </button>
      </div>
    </div>
  );
}
