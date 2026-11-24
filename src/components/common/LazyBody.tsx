import { useState, type ReactNode } from 'react';

/**
 * `true` from the first moment `open` is true, and from then on for good.
 *
 * A collapsed accordion (`accordion-grid`, 0fr) still costs a full style + layout pass for everything inside it, plus
 * image decoding and every component's render. Mounting the body only once it has been opened keeps a page with many
 * collapsed cards (Custom: one card per saved meal / recipe, each with a photo, macro grid and ingredient list) cheap
 * to show, while a body that was opened once stays mounted so its closing animation, its state and the Go-to-the-meal
 * jump keep working. Decided while rendering (no extra commit), so opening is still a single render.
 */
export function useMountedOnce(open: boolean): boolean {
  const [seen, setSeen] = useState(open);
  if (open && !seen) setSeen(true);
  return open || seen;
}

/** Renders `children` only after `open` has been true at least once (see `useMountedOnce`). */
export function LazyBody({ open, children }: { open: boolean; children: ReactNode }) {
  return useMountedOnce(open) ? <>{children}</> : null;
}
