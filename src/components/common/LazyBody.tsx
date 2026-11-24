import { useState, type ReactNode } from 'react';
import { DeferredBody } from './DeferredBody';

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

/**
 * Renders `children` only after `open` has been true at least once (see `useMountedOnce`).
 *
 * `defer`: when the body is already open on the very first render of this component (the page is being shown and the
 * user had left the section open), mount it after the first paint behind a skeleton (`DeferredBody`) so it does not
 * sit in the page-change frame. A body opened later, by a tap, is mounted immediately as before. Whether a body
 * defers is decided once, on the first render, so the tree never changes shape afterwards.
 */
export function LazyBody({ open, defer = false, children }: { open: boolean; defer?: boolean; children: ReactNode }) {
  const [openedWithPage] = useState(open);
  if (!useMountedOnce(open)) return null;
  return defer && openedWithPage ? <DeferredBody>{children}</DeferredBody> : <>{children}</>;
}
