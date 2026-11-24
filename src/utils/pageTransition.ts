import { prefersReducedMotion } from './motion';

/**
 * Page change by tap / Back / opening the food catalogue: a short "fade through" along the horizontal axis.
 *
 * The outgoing page stays mounted for a moment (PageSwiper keeps it, inert and absolutely positioned) and the two
 * pages are played one after the other with a small overlap, so there is no hard cut and no half-transparent
 * ghosting of two pages of text:
 *   - outgoing: opacity 1 -> 0 while drifting 8 px away from the incoming side, 110 ms, ease-in;
 *   - incoming: starts 60 ms later, opacity 0 -> 1 while moving 14 px in from its side, 240 ms, decelerating.
 * Only `opacity` and `transform` are animated (compositor), `fill: backwards` on the incoming page keeps it hidden
 * during its delay and nothing is left behind when it ends. Swipes never use this: the page is already on screen
 * under the finger. Disabled with `prefers-reduced-motion`.
 */
export const PAGE_OUT_MS = 110;
export const PAGE_IN_MS = 240;
export const PAGE_IN_DELAY_MS = 60;
const SHIFT_IN = 14; // px the incoming page travels
const SHIFT_OUT = 8; // px the outgoing page drifts
const EASE_IN = 'cubic-bezier(.4,0,1,1)';
const EASE_OUT = 'cubic-bezier(.2,0,0,1)';

/** True when the transition may play (feature present and the user has not asked for reduced motion). */
export const canAnimatePages = (): boolean =>
  !prefersReducedMotion() && typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

const shift = (px: number) => `translate3d(${px}px,0,0)`;

/**
 * Plays the change. `side` is 1 when the incoming page belongs to the right of the outgoing one (forward / catalogue),
 * -1 for the left. Returns the incoming page's animation (the longest one); its `finish` marks the end of the change.
 */
export function playPageChange(incoming: HTMLElement, outgoing: HTMLElement | null, side: number): Animation {
  outgoing?.animate(
    [{ opacity: 1, transform: shift(0) }, { opacity: 0, transform: shift(-side * SHIFT_OUT) }],
    { duration: PAGE_OUT_MS, easing: EASE_IN, fill: 'forwards' },
  );
  return incoming.animate(
    [{ opacity: 0, transform: shift(side * SHIFT_IN) }, { opacity: 1, transform: shift(0) }],
    { duration: PAGE_IN_MS, delay: outgoing ? PAGE_IN_DELAY_MS : 0, easing: EASE_OUT, fill: 'backwards' },
  );
}
