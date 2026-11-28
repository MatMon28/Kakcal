/**
 * Edge-fade for scrollable fields.
 *
 * When a scrollable element is partly hidden (there is more content before and / or after what is visible), a soft fade
 * is drawn on that edge so the user can tell it can be scrolled. The fade disappears again once the edge is reached or
 * when everything fits. It is a CSS mask (`[data-scroll-fade]` rules in `styles/motion.css`), so it works on any background,
 * theme and style.
 *
 * Usage: pass `scrollFadeX` (horizontal chip rows) or `scrollFadeY` (vertical lists, dialog bodies) as the `ref` of the
 * scrolling element. Both are stable functions, so React attaches them once per mount. To keep your own ref as well,
 * use `scrollFadeRef(axis, (el) => { myRef.current = el; })` (create it once, e.g. with `useCallback`).
 */

export type FadeAxis = 'x' | 'y';

/** Distance (px) from an edge that still counts as "at the edge". */
const EDGE_TOLERANCE = 2;

type RefCleanup = (() => void) | void;

function setFlag(el: HTMLElement, name: 'data-fade-start' | 'data-fade-end', on: boolean): void {
  const value = on ? 'true' : null;
  if (el.getAttribute(name) === value) return;
  if (value) el.setAttribute(name, value);
  else el.removeAttribute(name);
}

/** Starts watching `el`; returns the function that stops it and removes the attributes. */
export function attachScrollFade(el: HTMLElement, axis: FadeAxis): () => void {
  el.setAttribute('data-scroll-fade', axis);

  let rafId: number | null = null;
  let needsObserve = false;

  const update = () => {
    if (!el.isConnected) return;
    const pos = axis === 'x' ? el.scrollLeft : el.scrollTop;
    const size = axis === 'x' ? el.scrollWidth : el.scrollHeight;
    const view = axis === 'x' ? el.clientWidth : el.clientHeight;
    setFlag(el, 'data-fade-start', pos > EDGE_TOLERANCE);
    setFlag(el, 'data-fade-end', size - view - pos > EDGE_TOLERANCE);
  };

  // The element's own box rarely changes (fixed height / max-height), so its children are observed too: a growing or
  // animating child changes the scrollable size.
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => scheduleUpdate());
  const observeChildren = () => {
    if (!resizeObserver) return;
    resizeObserver.disconnect();
    resizeObserver.observe(el);
    for (const child of Array.from(el.children)) resizeObserver.observe(child);
  };

  const scheduleUpdate = (reobserve = false) => {
    if (reobserve) needsObserve = true;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (needsObserve) {
        needsObserve = false;
        observeChildren();
      }
      update();
    });
  };

  const mutationObserver =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => {
          scheduleUpdate(true);
        });

  const onScroll = () => scheduleUpdate();

  observeChildren();
  mutationObserver?.observe(el, { childList: true });
  el.addEventListener('scroll', onScroll, { passive: true });
  update();

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    el.removeEventListener('scroll', onScroll);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    el.removeAttribute('data-scroll-fade');
    el.removeAttribute('data-fade-start');
    el.removeAttribute('data-fade-end');
  };
}

/** Builds a ref callback that adds the edge-fade and also hands the element to `extra` (for components with a ref of their own). */
export function scrollFadeRef(axis: FadeAxis, extra?: (el: HTMLElement | null) => void) {
  return (el: HTMLElement | null): RefCleanup => {
    extra?.(el);
    if (!el) return undefined;
    const stop = attachScrollFade(el, axis);
    return () => {
      stop();
      extra?.(null);
    };
  };
}

/** Ready-made refs: `<div ref={scrollFadeY} className="max-h-72 overflow-y-auto">`. */
export const scrollFadeX = scrollFadeRef('x');
export const scrollFadeY = scrollFadeRef('y');
