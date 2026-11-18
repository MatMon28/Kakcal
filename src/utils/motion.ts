/**
 * Lightweight motion helpers for the journal. Everything here animates only `transform` and
 * `opacity`, runs for well under a quarter of a second, and is skipped when the device asks
 * for reduced motion, so it stays cheap on low-end Android WebViews.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Slide an element that is already on screen in from one side, without re-mounting it
 * (re-mounting the whole Today page just to animate it would cost far more than the effect).
 * `direction` 1 = enters from the right (moving forward in time), -1 = enters from the left.
 */
export function slideIn(element: HTMLElement | null, direction: 1 | -1, distance = 18): void {
  if (!element || prefersReducedMotion() || typeof element.animate !== 'function') return;
  element.animate(
    [
      { opacity: 0, transform: `translateX(${direction * distance}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ],
    { duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  );
}
