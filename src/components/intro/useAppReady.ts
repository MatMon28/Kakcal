import { useEffect, useState } from 'react';

/**
 * True once loading has finished: the first screen is committed and laid out, the web fonts it asked for
 * are loaded, and two frames have painted with them. The launch intro stops as soon as this is true instead
 * of always running to the end of its timeline.
 */
export function useAppReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    let frame = 0;
    const finish = () => {
      // Two frames so the first screen has really been painted (not only committed).
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => { if (alive) setReady(true); }); });
    };
    // One frame first: layout is what triggers the font downloads that document.fonts.ready waits for.
    frame = requestAnimationFrame(() => {
      const fonts = document.fonts?.ready;
      if (fonts) void fonts.then(finish, finish);
      else finish();
    });
    return () => { alive = false; cancelAnimationFrame(frame); };
  }, []);
  return ready;
}
