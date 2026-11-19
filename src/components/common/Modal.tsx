import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SPRING } from '../../utils/spring';
import { prefersReducedMotion } from '../../utils/motion';
import { useApp } from '../../context/AppContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
}

const openModalStack: Array<() => void> = [];
let previousBodyOverflow = '';

export const getOpenModalCount = () => openModalStack.length;

export function closeTopModal(): boolean {
  const dismiss = openModalStack[openModalStack.length - 1];
  if (!dismiss) return false;
  dismiss();
  return true;
}

const focusSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  footer,
}) => {
  const { t } = useApp();
  const titleId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const overlay = viewportRef.current;
    if (!isOpen || !panel || !overlay) return;

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeHandler = () => onCloseRef.current();
    if (!openModalStack.length) previousBodyOverflow = document.body.style.overflow;
    openModalStack.push(closeHandler);
    document.dispatchEvent(new Event('kc:overlay-open'));
    document.body.style.overflow = 'hidden';

    // Refit to the visual viewport and reveal the active field when the keyboard opens.
    const viewport = window.visualViewport;
    let revealFrame = 0;
    const revealField = () => {
      const field = document.activeElement;
      if (!isTop() || !(field instanceof HTMLElement) || !panel.contains(field) ||
          !field.matches('input, textarea, select, [contenteditable]')) return;
      const scroller = field.closest<HTMLElement>('[data-dialog-scroll]');
      if (!scroller) return;
      const bounds = scroller.getBoundingClientRect();
      const input = field.getBoundingClientRect();
      if (input.top < bounds.top + 12) scroller.scrollTop += input.top - bounds.top - 12;
      else if (input.bottom > bounds.bottom - 12) scroller.scrollTop += input.bottom - bounds.bottom + 12;
    };
    const syncViewport = () => {
      if (!viewport) return;
      overlay.style.setProperty('--dialog-top', `${viewport.offsetTop}px`);
      overlay.style.setProperty('--dialog-left', `${viewport.offsetLeft}px`);
      overlay.style.setProperty('--dialog-width', `${viewport.width}px`);
      overlay.style.setProperty('--dialog-height', `${viewport.height}px`);
    };
    const isTop = () => openModalStack[openModalStack.length - 1] === closeHandler;
    const onViewportResize = () => {
      syncViewport();
      window.cancelAnimationFrame(revealFrame);
      revealFrame = window.requestAnimationFrame(revealField);
    };
    syncViewport();
    viewport?.addEventListener('resize', onViewportResize);
    viewport?.addEventListener('scroll', syncViewport);

    const focusFrame = window.requestAnimationFrame(() => {
      if (isTop() && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop() || e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeHandler();
      } else if (e.key === 'Tab') {
        const stops = Array.from(panel.querySelectorAll<HTMLElement>(focusSelector))
          .filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest('[inert]'));
        if (!stops.length) {
          e.preventDefault();
          return;
        }
        const focusedIdx = stops.indexOf(document.activeElement as HTMLElement);
        if (focusedIdx === -1 || (e.shiftKey ? focusedIdx === 0 : focusedIdx === stops.length - 1)) {
          e.preventDefault();
          stops[e.shiftKey ? stops.length - 1 : 0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      viewport?.removeEventListener('resize', onViewportResize);
      viewport?.removeEventListener('scroll', syncViewport);
      window.cancelAnimationFrame(focusFrame);
      window.cancelAnimationFrame(revealFrame);
      const wasTop = isTop();
      const idx = openModalStack.lastIndexOf(closeHandler);
      if (idx >= 0) openModalStack.splice(idx, 1);
      if (!openModalStack.length) document.body.style.overflow = previousBodyOverflow;
      if (wasTop && trigger?.isConnected && !panel.contains(trigger)) trigger.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Swipe the sheet down from its handle or title bar to close it. It follows the finger, then
  // springs back, or glides away and closes when released far enough or with a fast flick.
  const sheetDrag = useRef<{ id: number; startY: number; y: number; t: number; vy: number; base: number; active: boolean } | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const onSheetTouchStart = (e: React.TouchEvent) => {
    const finger = e.touches[0];
    sheetDrag.current = e.touches.length === 1 && finger
      ? { id: finger.identifier, startY: finger.clientY, y: finger.clientY, t: performance.now(), vy: 0, base: 0, active: false }
      : null;
  };
  const onSheetTouchMove = (e: React.TouchEvent) => {
    const d = sheetDrag.current;
    const finger = e.touches[0];
    if (!d || e.touches.length !== 1 || !finger) { sheetDrag.current = null; return; }
    const dy = finger.clientY - d.startY;
    if (!d.active) {
      if (dy < -8) { sheetDrag.current = null; return; }
      if (dy <= 8) return;
      d.active = true;
      d.base = dy;
    }
    const now = performance.now();
    d.vy = (finger.clientY - d.y) / Math.max(1, now - d.t);
    d.y = finger.clientY;
    d.t = now;
    const offset = Math.max(0, dy - d.base);
    if (panelRef.current) panelRef.current.style.transform = `translate3d(0, ${offset}px, 0)`;
    if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0.12, 1 - offset / 360));
  };
  const onSheetTouchEnd = () => {
    const d = sheetDrag.current;
    sheetDrag.current = null;
    const panel = panelRef.current;
    if (!d || !d.active || !panel) return;
    const offset = Math.max(0, d.y - d.startY - d.base);
    const backdrop = backdropRef.current;
    const closing = offset > 96 || d.vy > 0.6;
    if (prefersReducedMotion()) {
      if (closing) onCloseRef.current();
      return;
    }
    const toY = closing ? Math.max(offset, window.innerHeight - panel.getBoundingClientRect().top) + 48 : 0;
    const motion: Animation[] = [panel.animate(
      [{ transform: `translate3d(0, ${offset}px, 0)` }, { transform: `translate3d(0, ${toY}px, 0)` }],
      { duration: SPRING.soft.duration, easing: SPRING.soft.easing, fill: 'forwards' })];
    if (backdrop) {
      motion.push(backdrop.animate(
        [{ opacity: Number(backdrop.style.opacity || 1) }, { opacity: closing ? 0 : 1 }],
        { duration: SPRING.soft.duration, easing: 'linear', fill: 'forwards' }));
    }
    void Promise.all(motion.map((animation) => animation.finished.catch(() => undefined))).then(() => {
      if (closing) {
        onCloseRef.current();
        return;
      }
      motion.forEach((animation) => animation.cancel());
      panel.style.transform = '';
      if (backdrop) backdrop.style.opacity = '';
    });
  };
  const dragHandlers = {
    onTouchStart: onSheetTouchStart,
    onTouchMove: onSheetTouchMove,
    onTouchEnd: onSheetTouchEnd,
    onTouchCancel: onSheetTouchEnd,
  };

  if (!isOpen) return null;

  // Phones: a sheet anchored to the bottom of the visual viewport (so it stays above the
  // keyboard). Wider screens: centred. The backdrop blur is desktop-only; it is costly on mobile GPUs.
  return createPortal(
    <div ref={viewportRef} className="dialog-viewport fixed z-50 flex items-end sm:items-center justify-center" data-no-swipe>
      <div ref={backdropRef} className="absolute inset-0 bg-black/45 sm:backdrop-blur-xs anim-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? `${titleId}-description` : undefined}
        tabIndex={-1}
        className={`anim-dialog relative w-full ${maxWidth} max-h-full min-h-0 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl shadow-black/20 overflow-hidden`}
      >
        <div className="shrink-0 touch-none flex justify-center pt-2" aria-hidden="true" {...dragHandlers}>
          <span className="h-1.5 w-11 rounded-full bg-[var(--border)]" />
        </div>
        <div className="px-5 py-3.5 sm:py-4 border-b border-[var(--border)] flex items-center justify-between gap-3 shrink-0 touch-none" {...dragHandlers}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base sm:text-lg font-extrabold text-[var(--text)] tracking-tight break-words">
              {title}
            </h2>
            {subtitle && <p id={`${titleId}-description`} className="text-xs font-medium text-[var(--muted)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="pressable w-10 h-10 shrink-0 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
          >
            <X size={17} />
          </button>
        </div>
        <div data-dialog-scroll className="p-4 sm:p-5 overflow-y-auto overscroll-contain min-h-0 flex-1 text-[var(--text)]">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
