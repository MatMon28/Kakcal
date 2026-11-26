import { useEffect, useState, type ReactNode } from 'react';
import { whenIdle } from '../../utils/idle';
import { onPageTransitionSettled } from '../../utils/pageTransition';

/**
 * Mounts `children` a moment AFTER the page transition settles and the browser is idle instead of in the same commit
 * as the page.
 *
 * A section that is open when the Custom page is shown (the user left it open) used to build its whole body - the
 * Meal diary walks and sorts the history, the planner / shopping list group the plans, the Photo diary sorts the
 * photos - before the first frame of the page change. Here the first frame only gets a skeleton of about the same
 * height (`.kc-body-skeleton`, src/styles/performance.css), and the real body fades in once any running page
 * transition finishes and the browser is idle (at most `MAX_WAIT_MS` later). Use it through `<LazyBody defer>`, which
 * applies it only to bodies that are open on the first render of their page: a body the user opens by tapping is
 * mounted at once, with no skeleton. See docs/performance.md.
 */
const MAX_WAIT_MS = 80;

export function DeferredBody({ children, className }: { children: ReactNode; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelIdle: (() => void) | undefined;
    const cancelSettle = onPageTransitionSettled(() => {
      cancelIdle = whenIdle(() => setReady(true), MAX_WAIT_MS);
    });
    return () => {
      cancelSettle();
      cancelIdle?.();
    };
  }, []);
  if (!ready) return <div className="kc-body-skeleton" aria-hidden="true" />;
  return <div className={className ? `kc-deferred-in ${className}` : 'kc-deferred-in'}>{children}</div>;
}
