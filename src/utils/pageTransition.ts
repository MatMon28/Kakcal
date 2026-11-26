import { prefersReducedMotion } from './motion';

/**
 * Page change by tap / Back / opening the food catalogue: a short "fade through" along the horizontal axis.
 *
 * The outgoing page stays mounted for the transition (PageSwiper keeps it, inert and absolutely positioned) and the two
 * pages are played one after the other with a small overlap, so there is no hard cut and no half-transparent
 * ghosting of two pages of text:
 *   - outgoing: opacity 1 -> 0 while drifting 6 px away from the incoming side, 75 ms, ease-in (`fill: forwards` keeps
 *     it invisible until the incoming animation finishes and unmounts it);
 *   - incoming: starts 40 ms later, opacity 0 -> 1 while moving 12 px in from its side, 160 ms, decelerating.
 * Only `opacity` and `transform` are animated (compositor), `fill: backwards` on the incoming page keeps it hidden
 * during its delay and nothing is left behind when it ends. Swipes never use this: the page is already on screen
 * under the finger. Disabled with `prefers-reduced-motion`.
 */
export const PAGE_OUT_MS = 75;
export const PAGE_IN_MS = 160;
export const PAGE_IN_DELAY_MS = 40;
const SHIFT_IN = 12; // px the incoming page travels
const SHIFT_OUT = 6; // px the outgoing page drifts
const EASE_IN = 'cubic-bezier(.4,0,1,1)';
const EASE_OUT = 'cubic-bezier(.2,0,0,1)';

let transitioning = false;
const settledListeners = new Set<() => void>();

/** True while a tap / Back page-change animation is running. */
export const isPageTransitioning = (): boolean => transitioning;

/** Updates the active transition flag and notifies deferred bodies once the transition settles. */
export function setPageTransitioning(next: boolean): void {
  if (transitioning === next) return;
  transitioning = next;
  if (!next && settledListeners.size > 0) {
    const listeners = Array.from(settledListeners);
    settledListeners.clear();
    for (const listener of listeners) listener();
  }
}

/**
 * Runs `listener` once no page transition is active (immediately if already idle, otherwise when the running
 * transition ends or after a safety timeout). Returns a cancel function.
 */
export function onPageTransitionSettled(listener: () => void): () => void {
  if (!transitioning) {
    listener();
    return () => {};
  }
  let done = false;
  let timer = 0;
  const fire = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    settledListeners.delete(fire);
    listener();
  };
  settledListeners.add(fire);
  timer = window.setTimeout(fire, PAGE_IN_DELAY_MS + PAGE_IN_MS + 60);
  return () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    settledListeners.delete(fire);
  };
}

/** True when the transition may play (feature present and the user has not asked for reduced motion). */
export const canAnimatePages = (): boolean =>
  !prefersReducedMotion() && typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

const shift = (px: number) => `translate3d(${px}px,0,0)`;

/**
 * Plays the change. `side` is 1 when the incoming page belongs to the right of the outgoing one (forward / catalogue),
 * -1 for the left. Returns BOTH animations: the incoming page's (the longest one; its `finish` marks the end of the
 * change) and the outgoing page's (its `finish`, after `PAGE_OUT_MS`, is the moment the invisible old page can be
 * unmounted - it must not be kept for the whole incoming animation, see docs/performance.md).
 */
export interface PageChangeAnimations { incoming: Animation; outgoing: Animation | null }

export function playPageChange(incoming: HTMLElement, outgoing: HTMLElement | null, side: number): PageChangeAnimations {
  const out = outgoing?.animate(
    [{ opacity: 1, transform: shift(0) }, { opacity: 0, transform: shift(-side * SHIFT_OUT) }],
    { duration: PAGE_OUT_MS, easing: EASE_IN, fill: 'forwards' },
  ) ?? null;
  const into = incoming.animate(
    [{ opacity: 0, transform: shift(side * SHIFT_IN) }, { opacity: 1, transform: shift(0) }],
    { duration: PAGE_IN_MS, delay: outgoing ? PAGE_IN_DELAY_MS : 0, easing: EASE_OUT, fill: 'backwards' },
  );
  return { incoming: into, outgoing: out };
}
