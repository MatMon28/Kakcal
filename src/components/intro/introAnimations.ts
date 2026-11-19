import sketchAndPlop from '../../assets/kakcalculator_intro/animations/01-sketch-and-plop.svg?raw';
import tactileKeypress from '../../assets/kakcalculator_intro/animations/02-tactile-keypress.svg?raw';
import swirlAndUnfold from '../../assets/kakcalculator_intro/animations/03-swirl-and-unfold.svg?raw';
import polarityIrisFlip from '../../assets/kakcalculator_intro/animations/04-polarity-iris-flip.svg?raw';
import flushVortexSpin from '../../assets/kakcalculator_intro/animations/05-flush-vortex-spin.svg?raw';
import modularStack from '../../assets/kakcalculator_intro/animations/06-modular-stack.svg?raw';

export interface IntroAnimation {
  id: string;
  /** Phase-1 length in ms *after* the speed-up (the SVG file itself says `durationMs`, see below). */
  duration: number;
  svg: string;
}

/**
 * The supplied SVGs run 1.06-1.28 s. The launch plays them this many times faster: every `NNNms` value in
 * their embedded CSS is divided by it (they only contain animation durations, no delays), so the keyframe
 * percentages and the final frame (the brand icon) are unchanged. 1.35 gives about 0.8-0.95 s.
 */
export const INTRO_SPEED = 1.35;

function speedUp(svg: string): string {
  return svg.replace(/(\d+(?:\.\d+)?)ms\b/g, (_, ms: string) => `${Math.round(Number(ms) / INTRO_SPEED)}ms`);
}

function entry(id: string, durationMs: number, svg: string): IntroAnimation {
  return { id, duration: Math.round(durationMs / INTRO_SPEED), svg: speedUp(svg) };
}

/** The six one-phase launch animations, in the order of intro_animation.md. */
export const INTRO_ANIMATIONS: IntroAnimation[] = [
  entry('sketch-and-plop', 1150, sketchAndPlop),
  entry('tactile-keypress', 1120, tactileKeypress),
  entry('swirl-and-unfold', 1280, swirlAndUnfold),
  entry('polarity-iris-flip', 1060, polarityIrisFlip),
  entry('flush-vortex-spin', 1220, flushVortexSpin),
  entry('modular-stack', 1240, modularStack),
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
