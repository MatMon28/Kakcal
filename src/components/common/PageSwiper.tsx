import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ActiveTab } from '../../types';
import { SPRING } from '../../utils/spring';
import { prefersReducedMotion } from '../../utils/motion';
import { getOpenModalCount } from './Modal';

interface PageSwiperProps {
  tabs: ActiveTab[];
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  renderTab: (tab: ActiveTab) => React.ReactNode;
  disabled?: boolean;
  /** Swipe right on a page that is not in the tab order (the food catalogue) to go back. */
  onSwipeBack?: () => void;
}

/** Start following the finger almost immediately; keep the system's few edge pixels free. */
const FOLLOW_PX = 4;
const EDGE_PX = 8;
/** A short drag is enough to change page; a flick can be even shorter. */
const COMMIT_PX = 28;
const FLICK_PX_PER_MS = 0.28;

interface Gesture {
  id: number;
  origin: Element;
  x0: number;
  y0: number;
  x: number;
  lastX: number;
  lastT: number;
  vx: number;
  width: number;
  axis: 'x' | 'y' | null;
  dir: 1 | -1;
  target: ActiveTab | null;
  pos: number;
}

/** A transition in flight. Any new touch cancels it instead of waiting for it to finish. */
interface Pending {
  tab: ActiveTab | null;
  animations: Animation[];
}

/** Horizontal scrollers keep their own gesture when they can still move in the drag direction. */
function scrollerTakesGesture(origin: Element, track: Element, dx: number): boolean {
  for (let el: Element | null = origin; el && el !== track; el = el.parentElement) {
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1) {
      const overflow = getComputedStyle(el).overflowX;
      if (overflow !== 'auto' && overflow !== 'scroll') continue;
      if (dx < 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
      if (dx > 0 && el.scrollLeft > 1) return true;
    }
  }
  return false;
}

/**
 * The main pages. The page follows the finger and the next page slides in beside it; release
 * completes or cancels the change with a short spring. Transitions are interruptible: a new touch
 * anywhere (including on a button) snaps the previous one to its destination before it begins.
 */
export function PageSwiper({ tabs, activeTab, onChange, renderTab, disabled = false, onSwipeBack }: PageSwiperProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const shownTab = useRef(activeTab);
  /** The tab the gesture logic is working with, even before React commits the deferred change. */
  const logicalTab = useRef(activeTab);
  const pending = useRef<Pending | null>(null);
  /** Tab change held back until the finger leaves the screen. */
  const deferredCommit = useRef<ActiveTab | null>(null);
  const activeRef = useRef(activeTab);
  activeRef.current = activeTab;
  if (!pending.current) logicalTab.current = activeTab;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSwipeBackRef = useRef(onSwipeBack);
  onSwipeBackRef.current = onSwipeBack;
  const [peek, setPeek] = useState<{ tab: ActiveTab; dir: 1 | -1 } | null>(null);

  const clearStyles = useCallback(() => {
    for (const el of [currentRef.current, peekRef.current]) {
      if (!el) continue;
      el.getAnimations().forEach((animation) => animation.cancel());
      el.style.transform = '';
      el.style.opacity = '';
    }
  }, []);

  const commitDeferred = useCallback(() => {
    const tab = deferredCommit.current;
    deferredCommit.current = null;
    if (!tab) return;
    flushSync(() => {
      setPeek(null);
      onChangeRef.current(tab);
    });
  }, []);

  /**
   * Snap an in-flight transition to its destination. A touch that interrupts it must not replace
   * the DOM under the finger until that new gesture ends, so the tab change can be held back.
   */
  const finishInFlight = useCallback((defer = false) => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    job.animations.forEach((animation) => animation.cancel());
    const targetTab = job.tab ?? deferredCommit.current ?? logicalTab.current;
    logicalTab.current = targetTab;
    activeRef.current = targetTab;
    // The tab change itself is already represented by the animation; don't replay the tab-tap slide.
    shownTab.current = targetTab;
    clearStyles();
    if (defer && job.tab) deferredCommit.current = job.tab;
    else {
      deferredCommit.current = null;
      queueMicrotask(() => {
        flushSync(() => {
          if (!gesture.current) setPeek(null);
          if (targetTab) onChangeRef.current(targetTab);
        });
      });
    }
  }, [clearStyles]);

  // Capture phase: this runs before the button's own click/touch handlers, so an animation can be
  // interrupted by a tap or by a second swipe without the tap landing on a moving page.
  useEffect(() => {
    const interrupt = () => {
      finishInFlight(true);
      // If this touch did not start a swipe (a button tap, for example), commit straight away.
      queueMicrotask(() => { if (!gesture.current) commitDeferred(); });
    };
    window.addEventListener('touchstart', interrupt, { capture: true, passive: true });
    window.addEventListener('pointerdown', interrupt, { capture: true });
    return () => {
      window.removeEventListener('touchstart', interrupt, true);
      window.removeEventListener('pointerdown', interrupt, true);
    };
  }, [finishInFlight, commitDeferred]);

  const animate = (tab: ActiveTab | null, moves: { el: HTMLElement | null; from: number; to: number }[]) => {
    const animations: Animation[] = [];
    for (const { el, from, to } of moves) {
      if (!el || prefersReducedMotion() || typeof el.animate !== 'function') continue;
      // Duration scales with distance; both stay well below the previous ~460 ms.
      const duration = Math.min(220, 90 + Math.abs(to - from) * 0.35);
      animations.push(el.animate(
        [{ transform: `translate3d(${from}px, 0, 0)` }, { transform: `translate3d(${to}px, 0, 0)` }],
        { duration, easing: SPRING.soft.easing, fill: 'forwards' },
      ));
    }
    const job: Pending = { tab, animations };
    pending.current = job;
    if (!animations.length) {
      finishInFlight();
      return;
    }
    void Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
      .then(() => { if (pending.current === job) finishInFlight(); });
  };

  const settle = (g: Gesture, commitTab: ActiveTab | null) => {
    pending.current?.animations.forEach((animation) => animation.cancel());
    const from = g.pos;
    const to = commitTab ? -g.dir * g.width : 0;
    const moves = [{ el: currentRef.current, from, to }];
    if (peekRef.current && g.target) {
      moves.push({ el: peekRef.current, from: from + g.dir * g.width, to: commitTab ? 0 : g.dir * g.width });
    }
    animate(commitTab, moves);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    gesture.current = null;
    // Finish any transition still running, even when a new gesture cannot start.
    finishInFlight();
    if (disabled || getOpenModalCount() || e.touches.length !== 1 || !trackRef.current) return;
    const origin = e.target as Element;
    // Only controls whose own gesture conflicts with a horizontal swipe are excluded. Plain text
    // fields, blank cards, charts and ordinary buttons all accept a swipe.
    if (origin.closest('[data-no-swipe], textarea, [contenteditable="true"], input[type="range"], [data-peek]')) return;
    const finger = e.touches[0];
    if (finger.clientX < EDGE_PX || finger.clientX > window.innerWidth - EDGE_PX) return;
    gesture.current = {
      id: finger.identifier,
      origin,
      x0: finger.clientX,
      y0: finger.clientY,
      x: finger.clientX,
      lastX: finger.clientX,
      lastT: performance.now(),
      vx: 0,
      width: trackRef.current.clientWidth || window.innerWidth,
      axis: null,
      dir: 1,
      target: null,
      pos: 0,
    };
  };

  const onTouchMove = (e: TouchEvent) => {
    const g = gesture.current;
    const track = trackRef.current;
    if (!g || !track) return;
    const finger = Array.from(e.touches).find((touch) => touch.identifier === g.id);
    if (!finger || e.touches.length !== 1) {
      gesture.current = null;
      if (g.axis === 'x') settle(g, null);
      return;
    }
    const now = performance.now();
    const dx = finger.clientX - g.x0;
    const dy = finger.clientY - g.y0;

    if (g.axis === null) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null; // vertical scrolling
        return;
      }
      if (Math.abs(dx) < FOLLOW_PX || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (scrollerTakesGesture(gesture.current?.origin as Element ?? e.target as Element, track, dx)) {
        gesture.current = null;
        return;
      }
      g.axis = 'x';
      g.dir = dx < 0 ? 1 : -1;
      const index = tabsRef.current.indexOf(logicalTab.current);
      g.target = index >= 0 ? tabsRef.current[index + g.dir] ?? null : null;
      if (g.target) setPeek({ tab: g.target, dir: g.dir });
    }
    if (g.axis !== 'x') return;

    g.vx = (finger.clientX - g.lastX) / Math.max(1, now - g.lastT);
    g.lastX = finger.clientX;
    g.lastT = now;
    g.x = finger.clientX;
    // At the end of the tab list the page resists, like a list at its edge.
    g.pos = g.target ? dx : dx * 0.3;
    if (currentRef.current) currentRef.current.style.transform = `translate3d(${g.pos}px, 0, 0)`;
    if (peekRef.current && g.target) {
      peekRef.current.style.transform = `translate3d(${g.pos + g.dir * g.width}px, 0, 0)`;
    }
  };

  const onTouchEnd = (_e?: TouchEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.axis !== 'x') {
      commitDeferred();
      return;
    }
    const dx = g.x - g.x0;
    if (!g.target) {
      if (dx > 64 && onSwipeBackRef.current && !tabsRef.current.includes(logicalTab.current)) onSwipeBackRef.current();
      settle(g, deferredCommit.current);
      deferredCommit.current = null;
      return;
    }
    const forward = g.dir * dx < 0;
    const fling = Math.abs(g.vx) > FLICK_PX_PER_MS && g.vx * g.dir < 0 && Math.abs(dx) > 10;
    const far = Math.abs(dx) > Math.max(COMMIT_PX, g.width * 0.07);
    settle(g, forward && (far || fling) ? g.target : deferredCommit.current);
    deferredCommit.current = null;
  };

  const onTouchCancel = (_e?: TouchEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (g && g.axis === 'x') settle(g, deferredCommit.current);
    deferredCommit.current = null;
  };

  // A tab tap uses the same short, interruptible slide as a swipe.
  useEffect(() => {
    const el = currentRef.current;
    if (!el || pending.current || prefersReducedMotion() || typeof el.animate !== 'function') return;
    // This effect sees the new prop; the previous value was stored by the render that preceded it.
    const previous = shownTab.current;
    shownTab.current = activeTab;
    if (previous === activeTab) return;
    const direction = tabsRef.current.indexOf(activeTab) >= tabsRef.current.indexOf(previous) ? 1 : -1;
    const animation = el.animate(
      [
        { opacity: 0.45, transform: `translate3d(${direction * 20}px, 0, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: 200, easing: SPRING.soft.easing },
    );
    const job: Pending = { tab: null, animations: [animation] };
    pending.current = job;
    void animation.finished.catch(() => undefined).then(() => { if (pending.current === job) finishInFlight(); });
  }, [activeTab, finishInFlight]);

  // Move/end events are listened for on window: a React commit during the gesture can unmount the
  // original touch target, but the browser keeps sending touch events to that detached element.
  const moveRef = useRef(onTouchMove);
  const endRef = useRef(onTouchEnd);
  const cancelRef = useRef(onTouchCancel);
  moveRef.current = onTouchMove;
  endRef.current = onTouchEnd;
  cancelRef.current = onTouchCancel;
  useEffect(() => {
    const move = (e: TouchEvent) => moveRef.current(e);
    const end = (e: TouchEvent) => endRef.current(e);
    const cancel = (e: TouchEvent) => cancelRef.current(e);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', cancel);
    return () => {
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', cancel);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className="relative overflow-x-clip"
      onTouchStart={onTouchStart}
    >
      <div ref={currentRef}>{renderTab(activeTab)}</div>
      {peek && (
        <div
          data-peek
          ref={peekRef}
          aria-hidden="true"
          inert
          className="absolute inset-x-0 top-0"
          style={{ transform: `translate3d(${peek.dir * 100}vw, 0, 0)` }}
        >
          {renderTab(peek.tab)}
        </div>
      )}
    </div>
  );
}
