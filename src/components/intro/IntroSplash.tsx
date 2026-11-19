import { useEffect, useMemo, useState } from 'react';
import { pickIntroAnimation } from './introAnimations';
import './intro.css';

/** Safety cap: the finished icon stays on screen this long at most before the overlay fades (ms). */
const HOLD_MS = 220;
/** Fade when the animation ran to its end, and the quicker fade when loading finished first. */
const FADE_MS = 240;
const INTERRUPT_FADE_MS = 140;

/** Chosen once per launch (module scope keeps React StrictMode from picking twice). */
let launchAnimation: ReturnType<typeof pickIntroAnimation> | null = null;

/**
 * Launch animation overlay: plays one of the six phase-1 animations from
 * src/assets/kakcalculator_intro (a different one every launch), then reveals the app.
 * The SVG is inlined so the --kc-* tokens resolve against the current theme.
 *
 * The animation is a loading indicator, not a fixed delay: it is interrupted (a short fade, wherever the
 * animation is) as soon as `ready` turns true. Its own timeline is only the upper limit.
 */
export function IntroSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const animation = useMemo(() => (launchAnimation ??= pickIntroAnimation()), []);
  const [leaving, setLeaving] = useState<false | 'ended' | 'interrupted'>(false);
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';

  // Upper limit: the animation's own timeline, even if "ready" never arrives.
  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving((v) => v || 'ended'), animation.duration + HOLD_MS);
    return () => window.clearTimeout(leave);
  }, [animation]);

  // Loading finished: interrupt the animation now.
  useEffect(() => {
    if (ready) setLeaving((v) => v || 'interrupted');
  }, [ready]);

  // Remove the overlay once its fade is over.
  useEffect(() => {
    if (!leaving) return;
    const done = window.setTimeout(onDone, leaving === 'interrupted' ? INTERRUPT_FADE_MS : FADE_MS);
    return () => window.clearTimeout(done);
  }, [leaving, onDone]);

  // Tap to skip: the app is already mounted underneath.
  const skip = () => setLeaving((v) => v || 'interrupted');

  return (
    <div
      className="kc-intro"
      data-dark={dark}
      data-leaving={leaving !== false}
      data-fast={leaving === 'interrupted'}
      data-intro={animation.id}
      aria-hidden="true"
      onPointerDown={skip}
    >
      <div className="kc-intro__art" dangerouslySetInnerHTML={{ __html: animation.svg }} />
    </div>
  );
}
