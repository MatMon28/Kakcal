import sketchAndPlop from '../../assets/kakcalculator_intro/animations/01-sketch-and-plop.svg?raw';
import tactileKeypress from '../../assets/kakcalculator_intro/animations/02-tactile-keypress.svg?raw';
import swirlAndUnfold from '../../assets/kakcalculator_intro/animations/03-swirl-and-unfold.svg?raw';
import polarityIrisFlip from '../../assets/kakcalculator_intro/animations/04-polarity-iris-flip.svg?raw';
import flushVortexSpin from '../../assets/kakcalculator_intro/animations/05-flush-vortex-spin.svg?raw';
import modularStack from '../../assets/kakcalculator_intro/animations/06-modular-stack.svg?raw';

export interface IntroAnimation {
  id: string;
  /** Phase-1 length in ms (see intro_animation.md §3). Phase 2 (wordmark) is deliberately not used. */
  duration: number;
  svg: string;
}

/** The six one-phase launch animations, in the order of intro_animation.md. */
export const INTRO_ANIMATIONS: IntroAnimation[] = [
  { id: 'sketch-and-plop', duration: 1150, svg: sketchAndPlop },
  { id: 'tactile-keypress', duration: 1120, svg: tactileKeypress },
  { id: 'swirl-and-unfold', duration: 1280, svg: swirlAndUnfold },
  { id: 'polarity-iris-flip', duration: 1060, svg: polarityIrisFlip },
  { id: 'flush-vortex-spin', duration: 1220, svg: flushVortexSpin },
  { id: 'modular-stack', duration: 1240, svg: modularStack },
];

const LAST_KEY = 'kcalsync_intro_last';

/**
 * Picks the animation for this launch: random, but never the one used on the previous launch,
 * so the intro changes every time. `?intro=1..6` forces one (handy for review); `?intro=0` skips it.
 */
export function pickIntroAnimation(): IntroAnimation {
  const forced = Number(new URLSearchParams(window.location.search).get('intro'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= INTRO_ANIMATIONS.length) {
    return INTRO_ANIMATIONS[forced - 1];
  }
  let last = -1;
  try {
    const stored = Number(window.localStorage.getItem(LAST_KEY));
    if (Number.isInteger(stored)) last = stored;
  } catch { /* storage may be unavailable; a plain random pick is fine */ }
  const choices = INTRO_ANIMATIONS.map((_, index) => index).filter((index) => index !== last);
  const next = choices[Math.floor(Math.random() * choices.length)];
  try { window.localStorage.setItem(LAST_KEY, String(next)); } catch { /* ignore */ }
  return INTRO_ANIMATIONS[next];
}

/** The intro only runs for a top-level launch: never inside the tour's iframes, never when asked off. */
export function shouldShowIntro(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.parent !== window) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('intro') === '0' || params.get('tour') === '1') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
