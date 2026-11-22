import softServe from '../../assets/kakcalculator_intro/animations/01-soft-serve.svg?raw';
import stackPlop from '../../assets/kakcalculator_intro/animations/02-stack-plop.svg?raw';
import jellyPress from '../../assets/kakcalculator_intro/animations/03-jelly-press.svg?raw';
import irisFlip from '../../assets/kakcalculator_intro/animations/04-iris-flip.svg?raw';
import swirl from '../../assets/kakcalculator_intro/animations/05-swirl.svg?raw';
import flushReturn from '../../assets/kakcalculator_intro/animations/06-flush-return.svg?raw';

export interface IntroAnimation {
  id: string;
  /** Phase-1 length in ms *after* the speed-up (the SVG file itself says `durationMs`, see below). */
  duration: number;
  svg: string;
}

/**
 * The SVGs run 2.0-2.4 s on their own (the previous six ran 1.06-1.28 s and were played 1.35 times faster). The
 * launch plays them this many times faster: every `NNNms` value in their embedded CSS is divided by it (they only
 * contain animation durations, no delays), so the keyframe percentages and the final frame (the brand icon) are
 * unchanged. 2.5 gives 0.80-0.96 s, the same as the previous 0.79-0.95 s.
 */
export const INTRO_SPEED = 2.5;

function speedUp(svg: string): string {
  return svg.replace(/(\d+(?:\.\d+)?)ms\b/g, (_, ms: string) => `${Math.round(Number(ms) / INTRO_SPEED)}ms`);
}

function entry(id: string, durationMs: number, svg: string): IntroAnimation {
  return { id, duration: Math.round(durationMs / INTRO_SPEED), svg: speedUp(svg) };
}

/** The six one-phase launch animations, in the order of intro_animation.md (`?intro=1` ... `?intro=6`). */
export const INTRO_ANIMATIONS: IntroAnimation[] = [
  entry('soft-serve', 2200, softServe),
  entry('stack-plop', 2000, stackPlop),
  entry('jelly-press', 2000, jellyPress),
  entry('iris-flip', 2100, irisFlip),
  entry('swirl', 2300, swirl),
  entry('flush-return', 2400, flushReturn),
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
