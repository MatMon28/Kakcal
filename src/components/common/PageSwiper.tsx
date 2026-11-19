import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ActiveTab } from '../../types';
import { prefersReducedMotion } from '../../utils/motion';
import { getOpenModalCount } from './Modal';

interface PageSwiperProps {
  tabs: ActiveTab[];
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  renderTab: (tab: ActiveTab) => React.ReactNode;
  disabled?: boolean;
  onSwipeBack?: () => void;
}

const DRAG_THRESHOLD = 6;
const EDGE_RESERVE = 8;
const SETTLE_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const MOVING_CLASS = 'kc-page-moving';

interface Gesture {
  id: number;
  origin: Element;
  x0: number;
  y0: number;
  x: number;
  width: number;
  axis: 'x' | 'y' | null;
  dir: 1 | -1;
  target: ActiveTab | null;
  offset: number;
  samples: { x: number; t: number }[];
}

interface Pending {
  tab: ActiveTab | null;
  animations: Animation[];
}

/** Horizontal lists keep their own gesture while they can still scroll in that direction. */
function scrollerTakesGesture(origin: Element, surface: Element, dx: number): boolean {
  for (let el: Element | null = origin; el && el !== surface; el = el.parentElement) {
    if (!(el instanceof HTMLElement) || el.scrollWidth <= el.clientWidth + 1) continue;
    const overflow = getComputedStyle(el).overflowX;
    if (overflow !== 'auto' && overflow !== 'scroll') continue;
    if (dx < 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
    if (dx > 0 && el.scrollLeft > 1) return true;
  }
  return false;
}

/**
 * Main-page navigation driven by Pointer Events. Pointer capture is taken on <main>, not on the
 * touched card, so gestures continue even when React replaces a page. Only transforms are animated;
 * there are no React state updates per frame and no layout properties in the animation.
 */
export function PageSwiper({ tabs, activeTab, onChange, renderTab, disabled = false, onSwipeBack }: PageSwiperProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pending = useRef<Pending | null>(null);
  const frame = useRef(0);
  const suppressClickUntil = useRef(0);
  const skipTabAnimation = useRef(false);
  const previousTab = useRef(activeTab);
  const activeRef = useRef(activeTab);
  const tabsRef = useRef(tabs);
  const onChangeRef = useRef(onChange);
  const onSwipeBackRef = useRef(onSwipeBack);
  const disabledRef = useRef(disabled);
  activeRef.current = activeTab;
  tabsRef.current = tabs;
  onChangeRef.current = onChange;
  onSwipeBackRef.current = onSwipeBack;
  disabledRef.current = disabled;
  const [peek, setPeek] = useState<{ tab: ActiveTab; dir: 1 | -1 } | null>(null);

  const setMoving = useCallback((moving: boolean) => {
    document.documentElement.classList.toggle(MOVING_CLASS, moving);
  }, []);

  const clearStyles = useCallback(() => {
    for (const el of [currentRef.current, peekRef.current]) {
      if (!el) continue;
      el.style.transform = '';
      el.style.willChange = '';
      el.style.opacity = '';
    }
  }, []);

  /** Finish a transition atomically. The incoming dock becomes visible only after this point. */
  const commit = useCallback((tab: ActiveTab | null) => {
    pending.current = null;
    if (tab && tab !== activeRef.current) skipTabAnimation.current = true;
    flushSync(() => {
      setPeek(null);
      if (tab && tab !== activeRef.current) onChangeRef.current(tab);
    });
    clearStyles();
    setMoving(false);
  }, [clearStyles, setMoving]);

  const finishPending = useCallback(() => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    job.animations.forEach((animation) => animation.cancel());
    commit(job.tab);
  }, [commit]);

  const startSettle = useCallback((g: Gesture, destination: ActiveTab | null) => {
    const current = currentRef.current;
    const incoming = peekRef.current;
    if (!current) {
      commit(destination);
      return;
    }
    pending.current?.animations.forEach((animation) => animation.cancel());
    const reduced = prefersReducedMotion() || typeof current.animate !== 'function';
    const toCurrent = destination ? -g.dir * g.width : 0;
    const remaining = Math.abs(toCurrent - g.offset);
    const duration = reduced ? 0 : Math.max(140, Math.min(240, 120 + remaining * 0.25));
    const animations: Animation[] = [];
    const moves: { el: HTMLElement | null; from: number; to: number }[] = [
      { el: current, from: g.offset, to: toCurrent },
    ];
    if (incoming && g.target) {
      moves.push({ el: incoming, from: g.offset + g.dir * g.width, to: destination ? 0 : g.dir * g.width });
    }
    if (duration > 0) {
      for (const move of moves) {
        if (!move.el) continue;
        move.el.style.willChange = 'transform';
        animations.push(move.el.animate(
          [
            { transform: `translate3d(${move.from}px, 0, 0)` },
            { transform: `translate3d(${move.to}px, 0, 0)` },
          ],
          { duration, easing: SETTLE_EASING, fill: 'forwards' },
        ));
      }
    }
    const job: Pending = { tab: destination, animations };
    pending.current = job;
    suppressClickUntil.current = performance.now() + duration + 80;
    if (!animations.length) {
      commit(destination);
      return;
    }
    void Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
      .then(() => { if (pending.current === job) commit(destination); });
  }, [commit]);

  const endGesture = useCallback((cancelled = false) => {
    const g = gesture.current;
    gesture.current = null;
    window.cancelAnimationFrame(frame.current);
    if (!g) return;
    if (g.axis !== 'x') {
      setMoving(false);
      return;
    }
    if (cancelled) {
      startSettle(g, null);
      return;
    }
    const dx = g.x - g.x0;
    const samples = g.samples;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const velocity = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const forward = g.dir * dx < 0;
    const flick = forward && velocity * g.dir < -0.45 && Math.abs(dx) > 12;
    const distance = forward && Math.abs(dx) > Math.max(48, g.width * 0.18);
    const projected = forward && g.dir * (dx + velocity * 160) < -Math.max(40, g.width * 0.12);
    const destination = g.target && (distance || flick || projected) ? g.target : null;
    if (!g.target && dx > 64 && onSwipeBackRef.current && !tabsRef.current.includes(activeRef.current)) {
      onSwipeBackRef.current();
    }
    startSettle(g, destination);
  }, [setMoving, startSettle]);

  useEffect(() => {
    const track = trackRef.current;
    const surface = track?.parentElement;
    if (!track || !surface) return;
    const previousTouchAction = surface.style.touchAction;
    surface.style.touchAction = 'pan-y';

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const origin = event.target as Element;
      if (origin.closest('[role="dialog"], [data-no-swipe], textarea, [contenteditable="true"], input[type="range"]')) return;
      if (event.clientX < EDGE_RESERVE || event.clientX > window.innerWidth - EDGE_RESERVE) return;
      // Capture on the stable <main> before finishing an older transition. Its commit may replace
      // the touched card, but every following pointer event still arrives here.
      try { surface.setPointerCapture(event.pointerId); } catch { /* capture is optional on old WebViews */ }
      finishPending();
      // A new tap after an interrupted animation is a real tap, not the swipe’s synthetic click.
      suppressClickUntil.current = 0;
      gesture.current = null;
      if (disabledRef.current || getOpenModalCount()) return;
      gesture.current = {
        id: event.pointerId,
        origin,
        x0: event.clientX,
        y0: event.clientY,
        x: event.clientX,
        width: track.clientWidth || window.innerWidth,
        axis: null,
        dir: 1,
        target: null,
        offset: 0,
        samples: [{ x: event.clientX, t: event.timeStamp }],
      };
    };

    const applyDrag = () => {
      frame.current = 0;
      const g = gesture.current;
      if (!g || g.axis !== 'x') return;
      if (currentRef.current) currentRef.current.style.transform = `translate3d(${g.offset}px, 0, 0)`;
      if (peekRef.current && g.target) {
        peekRef.current.style.transform = `translate3d(${g.offset + g.dir * g.width}px, 0, 0)`;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const g = gesture.current;
      if (!g || event.pointerId !== g.id) return;
      const dx = event.clientX - g.x0;
      const dy = event.clientY - g.y0;
      if (g.axis === null) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1) {
          g.axis = 'y';
          gesture.current = null;
          try { surface.releasePointerCapture(event.pointerId); } catch { /* already released */ }
          return;
        }
        if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.1) return;
        if (scrollerTakesGesture(g.origin, surface, dx)) {
          gesture.current = null;
          try { surface.releasePointerCapture(event.pointerId); } catch { /* already released */ }
          return;
        }
        g.axis = 'x';
        g.dir = dx < 0 ? 1 : -1;
        const index = tabsRef.current.indexOf(activeRef.current);
        g.target = index >= 0 ? tabsRef.current[index + g.dir] ?? null : null;
        setMoving(true);
        if (g.target) flushSync(() => setPeek({ tab: g.target!, dir: g.dir }));
        if (currentRef.current) currentRef.current.style.willChange = 'transform';
        if (peekRef.current) peekRef.current.style.willChange = 'transform';
      }
      if (g.axis !== 'x') return;
      if (event.cancelable) event.preventDefault();
      g.x = event.clientX;
      const now = event.timeStamp;
      g.samples.push({ x: event.clientX, t: now });
      while (g.samples.length > 2 && now - g.samples[0].t > 100) g.samples.shift();
      g.offset = g.target ? dx : dx * 0.25;
      if (!frame.current) frame.current = window.requestAnimationFrame(applyDrag);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (gesture.current?.id !== event.pointerId) return;
      try { surface.releasePointerCapture(event.pointerId); } catch { /* already released */ }
      endGesture(false);
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (gesture.current?.id !== event.pointerId) return;
      endGesture(true);
    };
    const onClick = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressClickUntil.current = 0;
      }
    };

    surface.addEventListener('pointerdown', onPointerDown);
    surface.addEventListener('pointermove', onPointerMove, { passive: false });
    surface.addEventListener('pointerup', onPointerUp);
    surface.addEventListener('pointercancel', onPointerCancel);
    surface.addEventListener('click', onClick, true);
    return () => {
      surface.style.touchAction = previousTouchAction;
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerup', onPointerUp);
      surface.removeEventListener('pointercancel', onPointerCancel);
      surface.removeEventListener('click', onClick, true);
      window.cancelAnimationFrame(frame.current);
      gesture.current = null;
      pending.current?.animations.forEach((animation) => animation.cancel());
      pending.current = null;
      setMoving(false);
    };
  }, [endGesture, finishPending, setMoving]);

  // Tapping a tab is a separate, subtle entrance. A swipe commit opts out via skipTabAnimation.
  useEffect(() => {
    const previous = previousTab.current;
    previousTab.current = activeTab;
    if (skipTabAnimation.current) {
      skipTabAnimation.current = false;
      return;
    }
    const el = currentRef.current;
    if (!el || pending.current || prefersReducedMotion() || typeof el.animate !== 'function') return;
    const direction = tabsRef.current.indexOf(activeTab) >= tabsRef.current.indexOf(previous) ? 1 : -1;
    setMoving(true);
    const animation = el.animate(
      [
        { opacity: 0.55, transform: `translate3d(${direction * 18}px, 0, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: 180, easing: SETTLE_EASING },
    );
    const job: Pending = { tab: null, animations: [animation] };
    pending.current = job;
    void animation.finished.catch(() => undefined).then(() => {
      if (pending.current === job) commit(null);
    });
  }, [activeTab, commit, setMoving]);

  return (
    <div ref={trackRef} className="relative overflow-x-clip">
      <div ref={currentRef}>{renderTab(activeTab)}</div>
      {peek && (
        <div
          data-peek
          ref={peekRef}
          aria-hidden="true"
          inert
          className="absolute inset-x-0 top-0"
          style={{ transform: `translate3d(${peek.dir * 100}%, 0, 0)` }}
        >
          {renderTab(peek.tab)}
        </div>
      )}
    </div>
  );
}
