import { useEffect, useMemo, useState } from 'react';
import { pickIntroAnimation } from './introAnimations';
import './intro.css';

/** Time the finished icon stays on screen before the overlay fades (ms). */
const HOLD_MS = 220;
const FADE_MS = 240;

/** Chosen once per launch (module scope keeps React StrictMode from picking twice). */
let launchAnimation: ReturnType<typeof pickIntroAnimation> | null = null;

/**
 * Launch animation overlay: plays one of the six phase-1 animations from
 * src/assets/kakcalculator_intro (a different one every launch), then reveals the app.
 * The SVG is inlined so the --kc-* tokens resolve against the current theme.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const animation = useMemo(() => (launchAnimation ??= pickIntroAnimation()), []);
  const [leaving, setLeaving] = useState(false);
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), animation.duration + HOLD_MS);
    const done = window.setTimeout(onDone, animation.duration + HOLD_MS + FADE_MS);
    return () => { window.clearTimeout(leave); window.clearTimeout(done); };
  }, [animation, onDone]);

  // Tap to skip: the app is already mounted underneath.
  const skip = () => {
    setLeaving(true);
    window.setTimeout(onDone, FADE_MS);
  };

  return (
    <div
      className="kc-intro"
      data-dark={dark}
      data-leaving={leaving}
      data-intro={animation.id}
      aria-hidden="true"
      onPointerDown={skip}
    >
      <div className="kc-intro__art" dangerouslySetInnerHTML={{ __html: animation.svg }} />
    </div>
  );
}
