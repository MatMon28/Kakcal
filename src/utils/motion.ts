import { SPRING } from './spring';

/**
 * Lightweight motion helpers for the journal. They animate only `transform` and `opacity`, use the
 * shared spring curves from ./spring, and are skipped when the device asks for reduced motion.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Slide an element that is already on screen in from one side, without re-mounting it.
 * `direction` 1 = enters from the right (moving forward in time), -1 = enters from the left.
 */
export function slideIn(element: HTMLElement | null, direction: 1 | -1, distance = 24): void {
  if (!element || prefersReducedMotion() || typeof element.animate !== 'function') return;
  element.animate(
    [
      { opacity: 0.3, transform: `translate3d(${direction * distance}px, 0, 0)` },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ],
    { duration: SPRING.soft.duration, easing: SPRING.soft.easing },
  );
}
