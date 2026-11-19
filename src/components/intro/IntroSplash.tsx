import { useEffect } from 'react';
import { markAppReady, onLaunchIntroEnd, startLaunchIntro } from './launchIntro';

/**
 * React side of the launch animation. The overlay itself is plain DOM owned by `launchIntro.ts` and is
 * already on screen (started from `main.tsx` before the app was even evaluated); this component only
 *  - starts it as a fallback if nothing started it yet (dev / tests),
 *  - reports `ready` (first screen committed, fonts loaded, frames painted) so the overlay may leave
 *    once the animation has also played to its end,
 *  - calls `onDone` when the overlay is gone.
 * The animation is NOT interrupted by `ready`; it always runs to its last frame (the brand icon).
 */
export function IntroSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  useEffect(() => {
    startLaunchIntro();
    return onLaunchIntroEnd(onDone);
  }, [onDone]);

  useEffect(() => {
    if (ready) markAppReady();
  }, [ready]);

  return null;
}
