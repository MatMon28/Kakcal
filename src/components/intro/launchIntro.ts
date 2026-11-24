import { isReturningLaunch, markIntroSeen, pickIntroAnimation, shouldShowIntro, type IntroAnimation } from './introAnimations';
import './intro.css';

/**
 * Launch animation controller (plain DOM, no React). It exists so the animation can start as early as
 * possible: `earlyStart.ts` calls `startLaunchIntro()` from `main.tsx` before the heavy app modules are
 * evaluated and before React renders, so the plain background-colour screen only lasts until the bundle has
 * been parsed. React (`IntroSplash`) only reports "the app is ready" and learns when the overlay is gone.
 *
 * Rules: on the FIRST launch on a device the animation always plays to its last frame (the brand icon). On later
 * launches (`isReturningLaunch()`) it leaves as soon as the app is ready, with the quick fade, and a tap still skips it.
 * First launch: It leaves only when BOTH the
 * animation has finished (+ a short hold) AND the app is ready. If the app is slower than the animation
 * the finished icon simply stays until it is ready (capped by MAX_EXTRA_WAIT_MS).
 */

/** The finished icon stays this long before the overlay fades (ms). */
const HOLD_MS = 120;
/** Fade-out when the animation ran to its end, and the quicker one after a tap. */
const FADE_MS = 200;
const SKIP_FADE_MS = 120;
/** Safety net: never keep the overlay longer than the animation + this when "ready" never arrives (ms). */
const MAX_EXTRA_WAIT_MS = 3000;

type Phase = 'idle' | 'playing' | 'leaving' | 'done';

let phase: Phase = 'idle';
let overlay: HTMLElement | null = null;
let animationFinished = false;
let appReady = false;
let returning = false;
const endListeners = new Set<() => void>();

function removeBootLayer(): void {
  // The overlay is exactly the same plain colour, so the boot layer can go instantly (no cross-fade that
  // would delay the first animation frame).
  document.getElementById('kc-boot')?.remove();
}

function finish(): void {
  phase = 'done';
  overlay?.remove();
  overlay = null;
  endListeners.forEach((cb) => cb());
  endListeners.clear();
}

function leave(skipped: boolean): void {
  if (phase !== 'playing' || !overlay) return;
  phase = 'leaving';
  markIntroSeen();
  overlay.setAttribute('data-leaving', 'true');
  overlay.setAttribute('data-fast', String(skipped));
  window.setTimeout(finish, skipped ? SKIP_FADE_MS : FADE_MS);
}

function maybeLeave(): void {
  if (appReady && (returning || animationFinished)) leave(returning);
}

function build(animation: IntroAnimation): HTMLElement {
  const el = document.createElement('div');
  el.className = 'kc-intro';
  el.setAttribute('data-dark', String(document.documentElement.getAttribute('data-theme') !== 'light'));
  el.setAttribute('data-leaving', 'false');
  el.setAttribute('data-fast', 'false');
  el.setAttribute('data-intro', animation.id);
  el.setAttribute('aria-hidden', 'true');
  // The SVG is inlined (not an <img>) so the --kc-* tokens resolve against the current theme.
  el.innerHTML = `<div class="kc-intro__art">${animation.svg}</div>`;
  // Tap to skip: the app is mounting underneath anyway.
  el.addEventListener('pointerdown', () => leave(true));
  return el;
}

/**
 * Paints the launch animation right now. Safe to call more than once (only the first call does anything).
 * Returns false when the intro is not shown (tour iframes, ?intro=0, reduced motion).
 */
export function startLaunchIntro(): boolean {
  if (phase !== 'idle') return phase === 'playing' || phase === 'leaving';
  if (!shouldShowIntro()) { phase = 'done'; return false; }

  const animation = pickIntroAnimation();
  returning = isReturningLaunch();
  phase = 'playing';
  overlay = build(animation);
  document.body.appendChild(overlay);
  removeBootLayer();

  // The CSS animations start with the first frame, so the clock for "finished" starts there too.
  requestAnimationFrame(() => {
    window.setTimeout(() => { animationFinished = true; maybeLeave(); }, animation.duration + HOLD_MS);
  });
  window.setTimeout(() => leave(false), animation.duration + HOLD_MS + MAX_EXTRA_WAIT_MS);
  return true;
}

/** React calls this when the first screen is committed, fonts are loaded and frames are painted. */
export function markAppReady(): void {
  appReady = true;
  maybeLeave();
}

/** Runs `cb` once the overlay is gone (immediately when it already is or never showed). */
export function onLaunchIntroEnd(cb: () => void): () => void {
  if (phase === 'done' || phase === 'idle') { cb(); return () => {}; }
  endListeners.add(cb);
  return () => { endListeners.delete(cb); };
}

/**
 * Resolves right after the browser has painted a frame (so the animation's first frame is on screen), with a
 * timeout fallback for hidden tabs where requestAnimationFrame is paused. `main.tsx` awaits this before the
 * heavy first React render so that render cannot delay the animation's first frame.
 */
export function afterFirstPaint(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const go = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(() => window.setTimeout(go, 0));
    window.setTimeout(go, 150);
  });
}
