import React, { useLayoutEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SPRING } from '../../utils/spring';
import { prefersReducedMotion } from '../../utils/motion';
import { useSettings } from '../../context/AppContext';
import { armTapRescue, createDialogHost, finishExitAnimations, type ExitContext } from './dialogExit';
import { scrollFadeY } from '../../utils/scrollFade';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
  /** Id of the bottom-bar button that opens this dialog: on close the dialog is sucked into it. */
  dockId?: string;
}

const openModalStack: Array<() => void> = [];
let previousBodyOverflow = '';
let anchor: { page: Element | null; x: number; y: number } | null = null;

export const getOpenModalCount = () => openModalStack.length;

export function closeTopModal(): boolean {
  const dismiss = openModalStack[openModalStack.length - 1];
  if (!dismiss) return false;
  dismiss();
  return true;
}

export { finishExitAnimations };

const focusSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  footer,
  dockId,
}) => {
  const { t } = useSettings();
  const titleId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dockIdRef = useRef(dockId);
  dockIdRef.current = dockId;
  const swiped = useRef(false);
  const closeHandlerRef = useRef<(() => void) | null>(null);
  // The overlay is portalled into its own host so that closing animates the live dialog instead of a clone
  // (dialogExit.ts). The host reads what it needs at the moment React removes the dialog.
  const [host] = useState(() => createDialogHost({
    stacked: () => openModalStack.some((dismiss) => dismiss !== closeHandlerRef.current),
    takeSwiped: () => { const was = swiped.current; swiped.current = false; return was; },
    dockId: () => dockIdRef.current,
  } satisfies ExitContext));
  useLayoutEffect(() => {
    host.retain();
    return () => host.dispose();
  }, [host]);
  // Newest dialog last in <body> (above the ones opened earlier), attached before the children first render.
  host.sync(isOpen);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const overlay = viewportRef.current;
    if (!isOpen || !panel || !overlay) return;

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeHandler = () => onCloseRef.current();
    closeHandlerRef.current = closeHandler;
    if (!openModalStack.length) {
      previousBodyOverflow = document.body.style.overflow;
      anchor = { page: document.querySelector('[data-journal-page]:not([inert])'), x: window.scrollX, y: window.scrollY };
      document.documentElement.classList.add('kc-sheet-open');
    }
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
      // Closed for any reason (X, backdrop, swipe, Back, or the parent after saving): the exit animation is played by
      // the dialog host when React removes the overlay (dialogExit.ts). `swiped` is read and cleared there.
      if (!openModalStack.length) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.classList.remove('kc-sheet-open');
        if (anchor?.page?.isConnected && !anchor.page.hasAttribute('inert') && (window.scrollX !== anchor.x || window.scrollY !== anchor.y)) {
          window.scrollTo({ left: anchor.x, top: anchor.y, behavior: 'instant' });
        }
        anchor = null;
      }
      if (wasTop && trigger?.isConnected && !panel.contains(trigger)) trigger.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetDrag = useRef<{ id: number; start: number; y: number; time: number; velocity: number; offset: number; active: boolean } | null>(null);
  const animations = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    swiped.current = false;
    return () => {
      sheetDrag.current = null;
      animations.current.forEach((a) => { a.onfinish = null; a.cancel(); });
      animations.current = [];
    };
  }, [isOpen]);

  // A dismissal the parent refused (or that did not unmount the dialog): spring back to rest.
  const settleBack = (from: number) => {
    const panel = panelRef.current;
    const scrim = backdropRef.current;
    if (!panel || !scrim) return;
    const opacity = scrim.style.opacity || '1';
    panel.style.transform = '';
    scrim.style.opacity = '';
    if (prefersReducedMotion() || !panel.animate || from < 0.5) return;
    const options = { duration: 220, easing: SPRING.soft.easing };
    animations.current = [
      panel.animate([{ transform: `translate3d(0,${from}px,0)` }, { transform: 'translate3d(0,0,0)' }], options),
      scrim.animate([{ opacity }, { opacity: 1 }], options),
    ];
  };

  // Sensitive on purpose: a short pull, or a quick flick, is enough to dismiss.
  const DISMISS_DISTANCE = 56;
  const DISMISS_FLICK_DISTANCE = 10;
  const DISMISS_FLICK_SPEED = 0.3; // px/ms
  const DRAG_START = 2; // px

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = sheetDrag.current;
    if (!d || d.id !== event.pointerId) return;
    sheetDrag.current = null;
    if (!d.active) return;
    const dismiss = !cancelled && (d.offset > DISMISS_DISTANCE ||
      (d.offset > DISMISS_FLICK_DISTANCE && event.timeStamp - d.time < 120 && d.velocity > DISMISS_FLICK_SPEED));
    if (!dismiss) { settleBack(d.offset); return; }
    // Closing is just unmounting: the dialog host (dialogExit.ts) continues from the painted position, with the finger's speed.
    swiped.current = true;
    armTapRescue();
    onCloseRef.current();
    window.setTimeout(() => {
      if (!swiped.current || !panelRef.current?.isConnected) return;
      swiped.current = false;
      settleBack(d.offset);
    }, 120);
  };

  const dragHandlers = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary || event.button !== 0 || swiped.current || (event.target as Element).closest('button')) return;
      const panel = panelRef.current;
      const scrim = backdropRef.current;
      if (!panel || !scrim) return;
      const matrix = getComputedStyle(panel).transform;
      const offset = matrix === 'none' ? 0 : Math.max(0, new DOMMatrixReadOnly(matrix).m42);
      const opacity = getComputedStyle(scrim).opacity;
      animations.current.forEach((a) => { a.onfinish = null; a.cancel(); });
      animations.current = [];
      // Pick up an opening or returning sheet at its painted position, without a jump.
      panel.style.animation = 'none';
      scrim.style.animation = 'none';
      panel.style.transform = offset ? `translate3d(0,${offset}px,0)` : '';
      scrim.style.opacity = opacity;
      sheetDrag.current = { id: event.pointerId, start: event.clientY - offset, y: event.clientY, time: event.timeStamp, velocity: 0, offset, active: offset > 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const d = sheetDrag.current;
      if (!d || event.pointerId !== d.id) return;
      d.offset = Math.max(0, event.clientY - d.start);
      if (!d.active && d.offset < DRAG_START) return;
      d.active = true;
      event.preventDefault();
      // Smoothed release speed, so one jittery last sample cannot cancel or fake a flick.
      const instant = (event.clientY - d.y) / Math.max(1, event.timeStamp - d.time);
      d.velocity = d.velocity * 0.35 + instant * 0.65;
      d.y = event.clientY;
      d.time = event.timeStamp;
      if (panelRef.current) panelRef.current.style.transform = `translate3d(0,${d.offset}px,0)`;
      if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0.1, 1 - d.offset / 300));
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => finishDrag(event, false),
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => finishDrag(event, true),
    onLostPointerCapture: (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) finishDrag(event, true);
    },
  };

  if (!isOpen) return null;

  // Phones: a sheet anchored to the bottom of the visual viewport (so it stays above the
  // keyboard). Wider screens: centred. The backdrop blur is desktop-only; it is costly on mobile GPUs.
  return createPortal(
    <div ref={viewportRef} className="dialog-viewport fixed z-50 flex items-end sm:items-center justify-center" data-no-swipe>
      <div ref={backdropRef} data-sheet-scrim className="absolute inset-0 bg-black/45 sm:backdrop-blur-xs anim-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        data-sheet-panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? `${titleId}-description` : undefined}
        tabIndex={-1}
        className={`anim-dialog relative w-full ${maxWidth} max-h-full min-h-0 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl shadow-black/20 overflow-hidden`}
      >
        <div className="shrink-0 touch-none flex justify-center pt-2.5 pb-1.5" aria-hidden="true" data-sheet-handle {...dragHandlers}>
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
        <div ref={scrollFadeY} data-dialog-scroll className="p-4 sm:p-5 overflow-y-auto overscroll-contain min-h-0 flex-1 text-[var(--text)]">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    host.element
  );
};
