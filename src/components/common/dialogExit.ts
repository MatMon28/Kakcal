import { prefersReducedMotion } from '../../utils/motion';
import { getDockTarget } from './ActionDock';

/**
 * Closing animation of dialogs (see docs/motion.md > "Popup exit" and docs/search-and-animation-performance.md).
 *
 * Performance round: the dialog that is on screen is animated *itself*. The old code cloned the whole overlay
 * (`cloneNode(true)`: every row of the open dialog twice in the DOM), copied inputs and scroll positions across and
 * measured the clone. Now each `Modal` renders into its own small host element (`createDialogHost`). When React
 * removes the dialog (the dialog was closed, or its parent stopped rendering it), the host defers that one
 * `removeChild`, the real nodes stay where they are for 60-110 ms while they shrink into the bottom bar, and the host
 * removes them when the animation ends. Nothing is cloned, so typed text, scroll position and focus need no copying.
 *
 * Measurements are taken once, together, before anything is written (one style / layout flush instead of one per
 * property). Only `transform` and `opacity` are animated, on the compositor.
 */

/** Exit animations still on screen. Each entry ends its animation and removes its dialog at once. */
const activeExits = new Set<() => void>();
let inputGuardsInstalled = false;

/** After a swipe-dismiss, a tap that the browser drops (see below) is re-sent as a click until this time. */
let tapRescueUntil = 0;
const TAP_RESCUE_MS = 900;

/** Called by `Modal` when a swipe-down dismisses a dialog. */
export function armTapRescue() {
  installInputGuards();
  tapRescueUntil = performance.now() + TAP_RESCUE_MS;
}

/** Ends every closing animation immediately (any press, key, scroll or new dialog skips what is left of it). */
export function finishExitAnimations() {
  Array.from(activeExits).forEach((end) => end());
}

/**
 * Two document-level guards, installed once:
 * 1. *Skip the exit*: any new press, key, wheel or dialog opening finishes the closing animations at once, so
 *    the animation can never be in the way of the next action.
 * 2. *Tap rescue*: Chromium can swallow the click of the first taps that follow a drag on a `touch-action: none`
 *    handle (pointer events still arrive, the `click` never does), which felt like a "refractory period" after a
 *    swipe-down. For a short while after a swipe-dismiss, a quick tap whose `click` does not arrive within
 *    80 ms is re-sent as a click on the same element.
 */
export function installInputGuards() {
  if (inputGuardsInstalled || typeof document === 'undefined') return;
  inputGuardsInstalled = true;
  const skip = () => { if (activeExits.size) finishExitAnimations(); };
  (['pointerdown', 'touchstart', 'keydown', 'wheel'] as const).forEach((type) =>
    document.addEventListener(type, skip, { capture: true, passive: true }));
  document.addEventListener('kc:overlay-open', skip);

  let down: { target: EventTarget | null; x: number; y: number; time: number } | null = null;
  document.addEventListener('pointerdown', (e) => {
    down = { target: e.target, x: e.clientX, y: e.clientY, time: performance.now() };
  }, true);
  document.addEventListener('pointerup', (e) => {
    const d = down;
    down = null;
    const now = performance.now();
    if (!d || now > tapRescueUntil || e.pointerType === 'mouse' || d.target !== e.target) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || now - d.time > 700) return;
    const target = e.target as Element;
    let clicked = false;
    const sawClick = () => { clicked = true; };
    document.addEventListener('click', sawClick, true);
    window.setTimeout(() => {
      document.removeEventListener('click', sawClick, true);
      if (clicked || !target.isConnected || target.closest('[inert], :disabled')) return;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: e.clientX, clientY: e.clientY, view: window }));
    }, 80);
  }, true);
}

/** What the exit needs to know about the dialog that is closing, read at the moment React removes it. */
export interface ExitContext {
  /** Another dialog stays open underneath: leave through the bottom instead of the dock. */
  stacked: () => boolean;
  /** The dialog was dismissed by a swipe: start at speed. Reading it also clears it. */
  takeSwiped: () => boolean;
  /** Id of the bottom-bar button that opened the dialog. */
  dockId: () => string | undefined;
}

/**
 * Animates the live overlay out and calls `done` when it may be removed. Returns false (nothing was started) when
 * the overlay cannot be animated; the caller then removes it at once.
 */
function playExit(overlay: HTMLElement, context: ExitContext, done: () => void): boolean {
  const panel = overlay.querySelector<HTMLElement>('[data-sheet-panel]');
  const scrim = overlay.querySelector<HTMLElement>('[data-sheet-scrim]');
  if (!panel || !scrim || !panel.animate) return false;
  const swiped = context.takeSwiped();
  const target = context.stacked() ? null : getDockTarget(context.dockId());

  // 1. Every measurement, together, before any write. The sheet exactly as painted (dragged, or still opening):
  const panelStyle = getComputedStyle(panel);
  const startTransform = panelStyle.transform;
  const startOpacity = panelStyle.opacity;
  const startScrim = getComputedStyle(scrim).opacity;
  // ...and its resting box, from layout (offset*), which ignores the transform it is currently painted with.
  const box = overlay.getBoundingClientRect();
  const left = box.left + panel.offsetLeft;
  const top = box.top + panel.offsetTop;
  const width = Math.max(1, panel.offsetWidth);
  const height = Math.max(1, panel.offsetHeight);
  const visualViewport = window.visualViewport;
  const visibleBottom = (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight);

  // 2. Writes: the dialog stops being interactive and its own entry animation stops.
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('inert', '');
  overlay.style.pointerEvents = 'none';
  panel.style.animation = 'none';
  scrim.style.animation = 'none';

  let end: string;
  if (target) {
    const dx = target.x - (left + width / 2);
    const dy = target.y - (top + height / 2);
    end = `translate3d(${dx}px,${dy}px,0) scale(${Math.max(0.04, target.width / width)},${Math.max(0.04, target.height / height)})`;
  } else {
    end = `translate3d(0,${visibleBottom - top + 8}px,0)`;
  }
  // Released with the finger already moving: start at speed. The exit is deliberately barely perceivable
  // (60-90 ms): the dialog is gone almost at once, with just a hint of being swallowed by the button.
  const duration = target ? (swiped ? 70 : 90) : swiped ? 60 : 80;
  const easing = swiped ? 'cubic-bezier(.2,.25,.6,.5)' : target ? 'cubic-bezier(.45,.05,.7,.45)' : 'cubic-bezier(.4,0,.9,.6)';
  const options: KeyframeAnimationOptions = { duration, easing, fill: 'forwards' };
  const running: Animation[] = [
    panel.animate([
      { transform: startTransform, opacity: startOpacity },
      { opacity: startOpacity, offset: target ? 0.7 : 0.55 },
      { transform: end, opacity: 0 },
    ], options),
    scrim.animate([{ opacity: startScrim }, { opacity: 0 }], { duration, easing: 'linear', fill: 'forwards' }),
  ];

  let finished = false;
  let fallback = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(fallback);
    activeExits.delete(finish);
    running.forEach((a) => { a.onfinish = null; a.oncancel = null; a.cancel(); });
    done();
  };
  installInputGuards();
  activeExits.add(finish);
  running[0].onfinish = finish;
  running[0].oncancel = finish;
  // A hidden tab may never report the animation as finished: never leave a dialog behind.
  fallback = window.setTimeout(finish, duration + 300);

  // The button (or bar) swallows the dialog with a small pulse.
  if (target) {
    const isBar = target.pulse.hasAttribute('data-dock');
    running.push(target.pulse.animate(
      [{ transform: 'scale(1)' }, { transform: `scale(${isBar ? 1.05 : 1.2})`, offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 110, delay: duration * 0.7, easing: 'ease-out' },
    ));
  }
  return true;
}

export interface DialogHost {
  element: HTMLDivElement;
  /**
   * Call while rendering with the `isOpen` prop. When the dialog opens, the (still empty) host moves to the end of
   * `<body>`, so the newest dialog is on top and the dialog's layout effects already measure attached nodes.
   * Idempotent, so repeated or discarded renders are harmless.
   */
  sync: (open: boolean) => void;
  /** The `Modal` is (again) mounted: keep the host. */
  retain: () => void;
  /** The `Modal` is gone: drop the host as soon as nothing is left in it (an exit may still be running). */
  dispose: () => void;
}

/**
 * The element a `Modal` portals its overlay into. React removes the overlay with `host.removeChild(overlay)`;
 * the host answers that by animating the overlay out first and removing it itself afterwards.
 */
export function createDialogHost(context: ExitContext): DialogHost {
  const element = document.createElement('div');
  element.setAttribute('data-dialog-host', '');
  element.style.display = 'contents';
  let alive = true;
  let wasOpen = false;
  const dropIfEmpty = () => { if (!alive && !element.firstChild) element.remove(); };
  const nativeRemoveChild = element.removeChild.bind(element) as <T extends Node>(child: T) => T;

  element.removeChild = (<T extends Node>(child: T): T => {
    if (child instanceof HTMLElement && child.classList.contains('dialog-viewport') && !prefersReducedMotion()) {
      const started = playExit(child, context, () => { child.remove(); dropIfEmpty(); });
      if (started) return child;
    }
    const removed = nativeRemoveChild(child);
    dropIfEmpty();
    return removed;
  }) as typeof element.removeChild;

  return {
    element,
    sync(open) {
      if (open && !wasOpen) {
        alive = true;
        document.body.appendChild(element);
      }
      wasOpen = open;
    },
    retain() {
      alive = true;
    },
    dispose() {
      alive = false;
      dropIfEmpty();
    },
  };
}
