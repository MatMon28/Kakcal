import React, { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ActiveTab } from '../../types';
import { SPRING } from '../../utils/spring';
import { prefersReducedMotion } from '../../utils/motion';
import { getOpenModalCount } from './Modal';

interface PageSwiperProps {
  /** Main tabs in swipe order. */
  tabs: ActiveTab[];
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  renderTab: (tab: ActiveTab) => React.ReactNode;
  /** Swipes are ignored while a dialog is open. */
  disabled?: boolean;
  /** Swipe right on a page that is not in the tab order (the food catalogue) to go back. */
  onSwipeBack?: () => void;
}

/** Horizontal distance before the page starts following the finger. */
const FOLLOW_PX = 6;
/** Release distance that changes page (about a tenth of the screen, at least 36 px). */
const COMMIT_PX = 36;
/** Flick speed in px per ms that changes page even when the drag is short. */
const FLICK_PX_PER_MS = 0.35;

interface Gesture {
  id: number;
  origin: Element;
  x0: number;
  y0: number;
  /** Latest finger position and the speed measured between the last two moves. */
  x: number;
  lastX: number;
  lastT: number;
  vx: number;
  width: number;
  axis: 'x' | 'y' | null;
  dir: 1 | -1;
  target: ActiveTab | null;
  /** Offset currently applied to the page. */
  pos: number;
}

/** True when a horizontal scroller under the finger can still move in the drag direction. */
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
 * The main pages. A horizontal swipe moves the page with the finger and brings the neighbouring
 * page in from the side; releasing completes or cancels the change with a spring. Tapping a tab
 * slides the new page in with the same spring.
 */
export function PageSwiper({ tabs, activeTab, onChange, renderTab, disabled = false, onSwipeBack }: PageSwiperProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const running = useRef<Animation[]>([]);
  const busy = useRef(false);
  const shownTab = useRef(activeTab);
  const [peek, setPeek] = useState<{ tab: ActiveTab; x: number } | null>(null);

  const stop = () => {
    running.current.forEach((animation) => animation.cancel());
    running.current = [];
  };

  const clearStyles = () => {
    if (currentRef.current) currentRef.current.style.transform = '';
    if (peekRef.current) peekRef.current.style.transform = '';
  };

  const glide = (el: HTMLElement | null, from: number, to: number): Promise<void> => {
    if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return Promise.resolve();
    const animation = el.animate(
      [{ transform: `translate3d(${from}px, 0, 0)` }, { transform: `translate3d(${to}px, 0, 0)` }],
      { duration: SPRING.soft.duration, easing: SPRING.soft.easing, fill: 'forwards' },
    );
    running.current.push(animation);
    return animation.finished.then(() => undefined, () => undefined);
  };

  // Commits the new tab and resets the pages in one synchronous step, so nothing flickers.
  const finish = (tab: ActiveTab | null) => {
    flushSync(() => {
      setPeek(null);
      if (tab) onChange(tab);
    });
    stop();
    clearStyles();
    busy.current = false;
  };

  // Completes (commitTab set) or cancels the change from the current offset.
  const settle = (g: Gesture, from: number, commitTab: ActiveTab | null) => {
    stop();
    busy.current = true;
    const jobs = [glide(currentRef.current, from, commitTab ? -g.dir * g.width : 0)];
    if (g.target) jobs.push(glide(peekRef.current, from + g.dir * g.width, commitTab ? 0 : g.dir * g.width));
    void Promise.all(jobs).then(() => finish(commitTab));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    gesture.current = null;
    if (disabled || busy.current || getOpenModalCount() || e.touches.length !== 1 || !trackRef.current) return;
    const origin = e.target as Element;
    if (origin.closest('[data-no-swipe], textarea, [contenteditable="true"], input[type="range"]')) return;
    const finger = e.touches[0];
    // The outer 24 px belong to the system's edge gestures.
    if (finger.clientX < 24 || finger.clientX > window.innerWidth - 24) return;
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

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    const track = trackRef.current;
    if (!g || !track) return;
    const finger = Array.from(e.touches).find((touch) => touch.identifier === g.id);
    if (!finger || e.touches.length !== 1) {
      gesture.current = null;
      if (g.axis === 'x') settle(g, g.pos, null);
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
      if (scrollerTakesGesture(g.origin, track, dx)) {
        gesture.current = null; // a horizontal list or chart is scrolling instead
        return;
      }
      g.axis = 'x';
      g.dir = dx < 0 ? 1 : -1;
      const index = tabs.indexOf(activeTab);
      g.target = index >= 0 ? tabs[index + g.dir] ?? null : null;
      if (g.target) setPeek({ tab: g.target, x: dx + g.dir * g.width });
    }
    if (g.axis !== 'x') return;

    const dt = Math.max(1, now - g.lastT);
    g.vx = (finger.clientX - g.lastX) / dt;
    g.lastX = finger.clientX;
    g.lastT = now;
    g.x = finger.clientX;
    // Without a neighbouring page the content resists, like the end of a list.
    const pos = g.target ? dx : dx * 0.3;
    g.pos = pos;
    if (currentRef.current) currentRef.current.style.transform = `translate3d(${pos}px, 0, 0)`;
    if (peekRef.current && g.target) peekRef.current.style.transform = `translate3d(${pos + g.dir * g.width}px, 0, 0)`;
  };

  const onTouchEnd = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.axis !== 'x') return;
    const dx = g.x - g.x0;
    if (!g.target) {
      if (dx > 72 && onSwipeBack && !tabs.includes(activeTab)) onSwipeBack();
      settle(g, g.pos, null);
      return;
    }
    const forward = g.dir * dx < 0;
    const fling = Math.abs(g.vx) > FLICK_PX_PER_MS && g.vx * g.dir < 0 && Math.abs(dx) > 12;
    const far = Math.abs(dx) > Math.max(COMMIT_PX, g.width * 0.1);
    settle(g, g.pos, forward && (far || fling) ? g.target : null);
  };

  const onTouchCancel = () => {
    const g = gesture.current;
    gesture.current = null;
    if (g && g.axis === 'x') settle(g, g.pos, null);
  };

  // Tapping a tab (not a swipe) slides the new page in from the side it belongs to.
  useLayoutEffect(() => {
    const previous = shownTab.current;
    if (previous === activeTab) return;
    shownTab.current = activeTab;
    const el = currentRef.current;
    if (busy.current || !el || prefersReducedMotion() || typeof el.animate !== 'function') return;
    const direction = tabs.indexOf(activeTab) >= tabs.indexOf(previous) ? 1 : -1;
    running.current.push(el.animate(
      [
        { opacity: 0.35, transform: `translate3d(${direction * 24}px, 0, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: SPRING.soft.duration, easing: SPRING.soft.easing },
    ));
  }, [activeTab]);

  return (
    <div
      ref={trackRef}
      className="relative overflow-x-clip"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <div ref={currentRef}>{renderTab(activeTab)}</div>
      {peek && (
        <div
          ref={peekRef}
          aria-hidden="true"
          inert
          className="absolute inset-x-0 top-0"
          style={{ transform: `translate3d(${peek.x}px, 0, 0)` }}
        >
          {renderTab(peek.tab)}
        </div>
      )}
    </div>
  );
}
