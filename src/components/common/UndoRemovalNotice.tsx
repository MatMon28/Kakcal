import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type React from 'react';
import { RotateCcw } from 'lucide-react';
import { useJournalText } from '../../i18n/journal';
import { clearRemovalScope, dismissRemoval, getRemovals, subscribeToRemovals, undoRemoval } from '../../utils/undoRemoval';

/** Draft-only deletions stop being undoable once the draft closes or is saved. */
export function useRemovalScope() {
  const [scope] = useState(() => Symbol('draft removals'));
  useEffect(() => () => clearRemovalScope(scope), [scope]);
  return scope;
}

interface ToastDrag {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  time: number;
  active: boolean;
}

/** Mounted on the active sheet (inside its focus trap) or above the page dock. */
export function UndoRemovalNotice({ floating = false }: { floating?: boolean }) {
  const j = useJournalText();
  const removals = useSyncExternalStore(subscribeToRemovals, getRemovals, getRemovals);
  // A confirmed bulk erase has priority so another action cannot cover its cancellation window.
  const removal = removals.find((item) => item.scheduled) ?? removals[0];
  const pillRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ToastDrag | null>(null);

  useEffect(() => {
    dragRef.current = null;
    const el = pillRef.current;
    if (el) {
      el.style.transition = '';
      el.style.transform = '';
      el.style.opacity = '';
    }
  }, [removal?.id]);

  if (!removal) return null;

  const resetVisual = (animate: boolean) => {
    const el = pillRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 160ms ease, opacity 160ms ease' : '';
    el.style.transform = '';
    el.style.opacity = '';
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = dragRef.current;
    if (!d || d.id !== event.pointerId) return;
    dragRef.current = null;
    if (!d.active) return;
    const speed = Math.hypot(d.vx, d.vy);
    const dist = Math.hypot(d.dx, d.dy);
    const shouldDismiss = !cancelled && (
      Math.abs(d.dx) >= 48 ||
      d.dy >= 36 ||
      (dist >= 16 && speed >= 0.28)
    );
    if (shouldDismiss) {
      dismissRemoval(removal.id);
      return;
    }
    resetVisual(true);
  };

  return (
    <div
      data-undo-removal
      data-no-swipe
      className={floating
        ? 'fixed z-40 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2'
        : 'shrink-0 px-4 py-2 sm:px-5 border-t border-[var(--border)]'}
    >
      <div
        ref={pillRef}
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          if ((event.target as Element | null)?.closest('button')) return;
          const el = pillRef.current;
          if (el) el.style.transition = '';
          dragRef.current = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            x: event.clientX,
            y: event.clientY,
            dx: 0,
            dy: 0,
            vx: 0,
            vy: 0,
            time: event.timeStamp,
            active: false,
          };
        }}
        onPointerMove={(event) => {
          const d = dragRef.current;
          if (!d || d.id !== event.pointerId) return;
          const dx = event.clientX - d.startX;
          const dy = Math.max(0, event.clientY - d.startY);
          if (!d.active) {
            if (Math.abs(dx) <= 6 && dy <= 6) return;
            d.active = true;
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer already released */ }
          }
          if (event.cancelable) event.preventDefault();
          const dt = Math.max(1, event.timeStamp - d.time);
          const ix = (event.clientX - d.x) / dt;
          const iy = (event.clientY - d.y) / dt;
          d.vx = d.vx * 0.35 + ix * 0.65;
          d.vy = d.vy * 0.35 + iy * 0.65;
          d.x = event.clientX;
          d.y = event.clientY;
          d.dx = dx;
          d.dy = dy;
          d.time = event.timeStamp;
          const el = pillRef.current;
          if (el) {
            el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
            el.style.opacity = String(Math.max(0.15, 1 - Math.hypot(dx, dy) / 140));
          }
        }}
        onPointerUp={(event) => finishDrag(event, false)}
        onPointerCancel={(event) => finishDrag(event, true)}
        onLostPointerCapture={(event) => {
          if (event.target === event.currentTarget) finishDrag(event, true);
        }}
        className="select-none flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 shadow-lg text-[var(--text)] cursor-grab active:cursor-grabbing"
      >
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
