/*
 * Logo-click poop animations.
 *
 * Only the poop of the wordmark moves (the K and the "kcal" letters stay put). The six
 * animations are inspired by the launch intro (src/assets/kakcalculator_intro, see
 * docs/launch-intro.md) but are new: they are played from CSS keyframes in `poop-anim.css`,
 * selected by the `data-poop-anim` attribute that `playPoopAnimation` puts on the wordmark.
 *
 * Rules (same motion grammar as the intro): transform / opacity / stroke-dashoffset only,
 * every animation ends exactly on the resting poop, nothing loops.
 */

export interface PoopAnimation {
  /** Value of `data-poop-anim` and suffix of the CSS keyframes. */
  id: string;
  /** Length in ms; the attribute is removed shortly after (the poop is already at rest). */
  duration: number;
}

export const POOP_ANIMATIONS: readonly PoopAnimation[] = [
  { id: 'plop', duration: 1150 }, // falls, squashes, bounces; creases redraw (Sketch & Plop)
  { id: 'flush', duration: 1250 }, // spins down a whirlpool, corkscrews back up (Flush Vortex)
  { id: 'jelly', duration: 1000 }, // squash & stretch wobble
  { id: 'flip', duration: 1100 }, // hops and does a front flip, lands with a squash
  { id: 'press', duration: 950 }, // pressed like a key, pops with burst ticks (Tactile Keypress)
  { id: 'sketch', duration: 1300 }, // draws itself stroke by stroke, then a happy pop
];

const CLEAR_MARGIN_MS = 60;

let lastIndex = -1;
let clearTimer = 0;

/** Random animation that is never the one just played. `forced` (1-based) is for review. */
export function pickPoopAnimation(forced?: number): PoopAnimation {
  if (forced && forced >= 1 && forced <= POOP_ANIMATIONS.length) {
    lastIndex = forced - 1;
    return POOP_ANIMATIONS[lastIndex];
  }
  let next = Math.floor(Math.random() * POOP_ANIMATIONS.length);
  if (next === lastIndex) {
    next = (next + 1 + Math.floor(Math.random() * (POOP_ANIMATIONS.length - 1))) % POOP_ANIMATIONS.length;
  }
  lastIndex = next;
  return POOP_ANIMATIONS[next];
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Plays a poop animation inside `root` (any element that contains the `.kc-wordmark`, or the
 * wordmark itself). A click while one is playing restarts with another animation.
 * Returns the animation that started, or null (reduced motion / no wordmark).
 */
export function playPoopAnimation(root: HTMLElement | null, forced?: number): PoopAnimation | null {
  if (!root || prefersReducedMotion()) return null;
  const mark = root.classList.contains('kc-wordmark')
    ? root
    : root.querySelector<HTMLElement>('.kc-wordmark');
  if (!mark) return null;

  const anim = pickPoopAnimation(forced);
  window.clearTimeout(clearTimer);
  mark.removeAttribute('data-poop-anim');
  void mark.getBoundingClientRect(); // flush styles so the same keyframes can restart
  mark.setAttribute('data-poop-anim', anim.id);
  clearTimer = window.setTimeout(
    () => mark.removeAttribute('data-poop-anim'),
    anim.duration + CLEAR_MARGIN_MS,
  );
  return anim;
}
