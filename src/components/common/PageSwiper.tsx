import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { ActiveTab } from '../../types';
import { prefersReducedMotion } from '../../utils/motion';
import { getOpenModalCount } from './Modal';
import { getPagePosition, setPagePosition } from '../../utils/pagePosition';

interface PageSwiperProps {
  tabs: ActiveTab[];
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  renderTab: (tab: ActiveTab) => ReactNode;
  disabled?: boolean;
  onSwipeBack?: () => void;
}

type Peer = {
  tab: ActiveTab;
  side: number;
  top: number;
  role: 'drag' | 'exit';
};

type PendingTap = {
  side: number;
  oldTab: ActiveTab;
  newTab: ActiveTab;
  fromIndex: number | null;
  toIndex: number | null;
  initialOffset: number;
};

type SettleOptions = {
  fromIndex: number | null;
  toIndex: number | null;
  fade?: { incoming: ActiveTab; outgoing: ActiveTab } | null;
};

type Drag = {
  id: number; origin: Element; startX: number; startY: number; startTime: number; scrollY: number;
  width: number; locked: boolean; side: number; target?: ActiveTab; offset: number;
  x: number; time: number; velocity: number;
};

function listCanScroll(origin: Element, surface: HTMLElement, dx: number) {
  for (let el: Element | null = origin; el && el !== surface; el = el.parentElement) {
    if (!(el instanceof HTMLElement) || el.scrollWidth <= el.clientWidth + 1) continue;
    if (!/auto|scroll/.test(getComputedStyle(el).overflowX)) continue;
    if (dx < 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 1) return true;
  }
  return false;
}

/**
 * Swipe & transition tuning. Sensitive horizontal lock (6 px) with zero dead-zone jump;
 * smooth critically-damped deceleration (no overshoot so adjacent panels never peek).
 */
const LOCK_DISTANCE = 6; // px of horizontal travel before the drag is taken over
const LOCK_RATIO = 1.1; // horizontal must beat vertical by this factor
const FOLLOW = 0.94; // initial finger-to-page ratio (1 = no resistance)
const COMMIT_MIN = 44;
const COMMIT_MAX = 72;
const COMMIT_RATIO = 0.14;
const FLICK_SPEED = 0.22; // px/ms
const FLICK_MIN = 24;
const BACK_DISTANCE = 56; // swipe right out of the food catalogue
const SETTLE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const translate = (px: number) => `translate3d(${px}px,0,0)`;

function settleDuration(distance: number, width: number, velocity = 0): number {
  const ratio = Math.min(1, Math.abs(distance) / Math.max(240, width));
  const base = 195 + ratio * 105; // 195..300 ms
  const boost = Math.min(50, Math.max(0, velocity) * 38);
  return Math.round(Math.max(175, Math.min(300, base - boost)));
}

export function PageSwiper(props: PageSwiperProps) {
  const { activeTab, renderTab } = props;
  const latest = useRef(props);
  latest.current = props;
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const motion = useRef<Animation | null>(null);
  const panelMotions = useRef<Animation[]>([]);
  const frame = useRef(0);
  const previous = useRef(activeTab);
  const swipeDestination = useRef<ActiveTab | null>(null);
  const pendingBackOffset = useRef<number | null>(null);
  const pendingTap = useRef<PendingTap | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);

  const cancelMotion = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const animation = motion.current;
    motion.current = null;
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
    }
    for (const anim of panelMotions.current) {
      anim.onfinish = null;
      anim.cancel();
    }
    panelMotions.current = [];
    if (rail.current) {
      rail.current.style.transform = '';
      rail.current.style.willChange = '';
      const viewport = rail.current.parentElement;
      if (viewport) viewport.style.minHeight = '';
    }
    document.documentElement.classList.remove('kc-page-moving', 'kc-page-dragging');
    setPagePosition(null);
  }, []);

  const rest = useCallback(() => {
    pendingTap.current = null;
    cancelMotion();
    setPeer(null);
  }, [cancelMotion]);

  // The base style is already at rest. A finished animation cannot pin the live page offscreen.
  const settle = useCallback((from: number, duration: number, opts?: SettleOptions) => {
    const el = rail.current;
    if (!el || prefersReducedMotion() || !el.animate || Math.abs(from) < 0.5) return rest();
    const viewport = el.parentElement;
    if (viewport && window.scrollY <= 1) {
      const rectTop = Math.max(0, viewport.getBoundingClientRect().top);
      const minVisible = Math.max(0, window.innerHeight - rectTop);
      if (minVisible > 0) viewport.style.minHeight = `${minVisible}px`;
    }
    el.style.transform = '';
    el.style.willChange = 'transform';
    const animation = el.animate([{ transform: translate(from) }, { transform: 'none' }], {
      duration, easing: SETTLE_EASING, fill: 'none',
    });
    motion.current = animation;

    if (opts?.fade) {
      const { incoming, outgoing } = opts.fade;
      const inEl = Array.from(el.children).find(
        (c): c is HTMLElement => c instanceof HTMLElement && c.dataset.journalPage === incoming,
      );
      const outEl = Array.from(el.children).find(
        (c): c is HTMLElement => c instanceof HTMLElement && c.dataset.journalPage === outgoing,
      );
      if (inEl?.animate) {
        panelMotions.current.push(
          inEl.animate([{ opacity: 0.72 }, { opacity: 1 }], { duration, easing: SETTLE_EASING, fill: 'none' }),
        );
      }
      if (outEl?.animate) {
        panelMotions.current.push(
          outEl.animate([{ opacity: 1 }, { opacity: 0.25 }], { duration, easing: SETTLE_EASING, fill: 'none' }),
        );
      }
    }

    const fromIndex = opts?.fromIndex ?? null;
    const toIndex = opts?.toIndex ?? null;
    const followPill = () => {
      if (motion.current !== animation) return;
      const raw = animation.effect?.getComputedTiming().progress;
      const progress = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
      if (fromIndex !== null && toIndex !== null) {
        setPagePosition(fromIndex + (toIndex - fromIndex) * progress);
      }
      frame.current = requestAnimationFrame(followPill);
    };
    followPill();
    animation.onfinish = () => {
      if (motion.current === animation) {
        if (toIndex !== null) setPagePosition(toIndex);
        rest();
      }
    };
  }, [rest]);

  // Phase 1 of tap / Back page change: capture old scroll & pill position and mount outgoing peer.
  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = activeTab;
    if (old === activeTab) return;
    if (swipeDestination.current === activeTab) {
      swipeDestination.current = null;
      pendingBackOffset.current = null;
      return;
    }
    drag.current = null;
    const backOffset = pendingBackOffset.current ?? 0;
    pendingBackOffset.current = null;

    const tabs = latest.current.tabs;
    const oldIndex = tabs.indexOf(old);
    const newIndex = tabs.indexOf(activeTab);
    const currentPill = getPagePosition();
    const side = activeTab === 'database' || (old !== 'database' && newIndex > oldIndex) ? 1 : -1;
    const oldScrollY = window.scrollY;

    cancelMotion();
    document.documentElement.style.setProperty('--kc-swipe-dir', String(side));
    document.documentElement.dataset.swipeDir = side > 0 ? 'right' : 'left';

    if (prefersReducedMotion()) {
      pendingTap.current = null;
      setPeer(null);
      return;
    }

    document.documentElement.classList.add('kc-page-moving');
    const canSyncPill = oldIndex >= 0 && newIndex >= 0;
    const fromIndex = canSyncPill ? (currentPill ?? oldIndex) : null;
    const toIndex = canSyncPill ? newIndex : null;
    if (fromIndex !== null) setPagePosition(fromIndex);

    pendingTap.current = {
      side,
      oldTab: old,
      newTab: activeTab,
      fromIndex,
      toIndex,
      initialOffset: backOffset,
    };
    setPeer({ tab: old, side: -side, top: -oldScrollY, role: 'exit' });
  }, [activeTab, cancelMotion]);

  // Phase 2 of tap / Back page change: once outgoing peer is in the DOM, animate both panels on the compositor.
  useLayoutEffect(() => {
    const tap = pendingTap.current;
    if (!tap || !peer || peer.tab !== tap.oldTab || peer.role !== 'exit') return;
    pendingTap.current = null;
    const el = rail.current;
    const width = el?.parentElement?.clientWidth || window.innerWidth || 1;
    const from = tap.side * width + tap.initialOffset;
    const duration = width > 640 ? 290 : 270;
    settle(from, duration, {
      fromIndex: tap.fromIndex,
      toIndex: tap.toIndex,
      fade: { incoming: tap.newTab, outgoing: tap.oldTab },
    });
  }, [peer, settle]);

  useEffect(() => {
    const el = rail.current;
    const viewport = el?.parentElement;
    const surface = viewport?.closest('main');
    if (!el || !viewport || !surface) return;
    let blockDragClick = false;
    const interrupt = (event: PointerEvent) => {
      if (!motion.current) return;
      const target = event.target;
      // Tapping a nav/sidebar tab button redirects via activeTab change instead of snapping mid-flight.
      if (target instanceof Element && target.closest('nav[aria-label="Primary"], .journal-sidebar')) return;
      rest();
    };
    const cancelDrag = () => {
      const g = drag.current;
      drag.current = null;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      document.documentElement.classList.remove('kc-page-dragging');
      if (g?.locked) {
        const idx = latest.current.tabs.indexOf(latest.current.activeTab);
        const canSync = idx >= 0 && Boolean(g.target);
        settle(g.offset, settleDuration(g.offset, g.width), {
          fromIndex: canSync ? idx - g.offset / g.width : null,
          toIndex: canSync ? idx : null,
        });
      }
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) { cancelDrag(); return; }
      blockDragClick = false;
      if (event.button !== 0 || latest.current.disabled || getOpenModalCount()) return;
      if (event.clientX < 8 || event.clientX > window.innerWidth - 8) return;
      const origin = event.target;
      if (!(origin instanceof Element) || origin.closest('[data-no-swipe], [role="dialog"], textarea, [contenteditable="true"], input[type="range"]')) return;
      drag.current = { id: event.pointerId, origin, startX: event.clientX, startY: event.clientY, startTime: event.timeStamp,
        scrollY: window.scrollY, width: viewport.clientWidth, locked: false, side: 0, offset: 0,
        x: event.clientX, time: event.timeStamp, velocity: 0 };
    };
    const move = (event: PointerEvent) => {
      const g = drag.current;
      if (!g || g.id !== event.pointerId) return;
      const dx = event.clientX - g.startX;
      const dy = event.clientY - g.startY;
      if (!g.locked) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { cancelDrag(); return; }
        if (Math.abs(dx) < LOCK_DISTANCE || Math.abs(dx) < Math.abs(dy) * LOCK_RATIO) return;
        if (listCanScroll(g.origin, surface, dx) || getOpenModalCount()) { cancelDrag(); return; }
        // Leave taps with the original button; capture only a horizontal drag.
        try { surface.setPointerCapture(event.pointerId); } catch { /* pointer already released */ }
        g.locked = true;
        blockDragClick = true;
        document.documentElement.classList.add('kc-page-moving', 'kc-page-dragging');
        el.style.willChange = 'transform';
      }
      if (event.cancelable) event.preventDefault();
      const side = dx < 0 ? 1 : -1;
      if (side !== g.side) {
        g.side = side;
        const index = latest.current.tabs.indexOf(latest.current.activeTab);
        g.target = index < 0 ? undefined : latest.current.tabs[index + side];
        const tab = g.target;
        if (!prefersReducedMotion()) flushSync(() => setPeer(tab ? { tab, side, top: g.scrollY, role: 'drag' } : null));
      }
      const dt = event.timeStamp - g.time;
      if (dt > 0) g.velocity = (event.clientX - g.x) / dt;
      g.x = event.clientX;
      g.time = event.timeStamp;
      const travel = Math.abs(dx) <= LOCK_DISTANCE ? 0 : dx - Math.sign(dx) * LOCK_DISTANCE;
      const abs = Math.abs(travel);
      if (g.target) {
        const damped = abs < 72 ? travel * FOLLOW : Math.sign(travel) * (72 * FOLLOW + (abs - 72));
        g.offset = Math.max(-g.width, Math.min(g.width, damped));
      } else if (latest.current.activeTab === 'database' && dx > 0) {
        g.offset = Math.min(96, travel * 0.48);
      } else {
        g.offset = Math.sign(travel) * 28 * (1 - Math.exp(-abs / 85));
      }
      if (!frame.current && !prefersReducedMotion()) frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (drag.current === g) {
          el.style.transform = translate(g.offset);
          const index = latest.current.tabs.indexOf(latest.current.activeTab);
          if (index >= 0) setPagePosition(index - g.offset / g.width);
        }
      });
    };
    const up = (event: PointerEvent) => {
      const g = drag.current;
      if (!g || g.id !== event.pointerId) return;
      drag.current = null;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      document.documentElement.classList.remove('kc-page-dragging');
      if (!g.locked) return;
      const dx = event.clientX - g.startX;
      const dist = -dx * g.side;
      const totalDt = Math.max(1, event.timeStamp - g.startTime);
      const avgSpeed = dist / totalDt;
      const velocity = event.timeStamp - g.time < 120 ? -g.velocity * g.side : 0;
      const minDistance = Math.min(COMMIT_MAX, Math.max(COMMIT_MIN, g.width * COMMIT_RATIO));
      const cross = dist > minDistance ||
        (dist > Math.max(FLICK_MIN, g.width * 0.06) && (velocity > FLICK_SPEED || avgSpeed > FLICK_SPEED));
      const { activeTab: old, tabs, onChange, onSwipeBack } = latest.current;
      if (!g.target && old === 'database' && dx > BACK_DISTANCE && onSwipeBack) {
        document.documentElement.style.setProperty('--kc-swipe-dir', '-1');
        document.documentElement.dataset.swipeDir = 'left';
        pendingBackOffset.current = g.offset;
        onSwipeBack();
        return;
      }
      const oldIndex = tabs.indexOf(old);
      let from = g.offset;
      let fromIndex = oldIndex >= 0 ? oldIndex - g.offset / g.width : null;
      let toIndex = oldIndex >= 0 ? oldIndex : null;
      if (g.target && cross) {
        // Promote the keyed preview instead of mounting the destination twice. The old panel's
        // offset compensates for the new tab's scroll-to-top in the same layout pass.
        const target = g.target;
        const targetIndex = tabs.indexOf(target);
        document.documentElement.style.setProperty('--kc-swipe-dir', String(g.side));
        document.documentElement.dataset.swipeDir = g.side > 0 ? 'right' : 'left';
        swipeDestination.current = target;
        from += g.side * g.width;
        if (targetIndex >= 0) toIndex = targetIndex;
        flushSync(() => {
          setPeer({ tab: old, side: -g.side, top: -g.scrollY, role: 'drag' });
          onChange(target);
        });
      } else {
        fromIndex = oldIndex >= 0 ? oldIndex - from / g.width : null;
      }
      settle(from, settleDuration(from, g.width, velocity), { fromIndex, toIndex });
    };
    const lost = (event: PointerEvent) => {
      // A child's implicit capture is released when main takes over. That is not cancellation.
      if (event.type === 'lostpointercapture' && event.target !== surface) return;
      if (drag.current?.id === event.pointerId) cancelDrag();
    };
    const click = (event: MouseEvent) => {
      if (blockDragClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
      blockDragClick = false;
    };
    // In Chromium a native fling can swallow the next tap even after pointer capture.
    // Consume the touch pan only after horizontal lock; vertical scrolls remain native.
    const consumePagePan = (event: TouchEvent) => {
      if (drag.current?.locked && event.touches.length === 1 && event.cancelable) event.preventDefault();
    };
    const stopNavigation = () => {
      if (drag.current || motion.current) { drag.current = null; rest(); }
    };
    document.addEventListener('pointerdown', interrupt, true);
    document.addEventListener('kc:overlay-open', stopNavigation);
    surface.addEventListener('pointerdown', down);
    surface.addEventListener('touchmove', consumePagePan, { passive: false });
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', lost);
    surface.addEventListener('lostpointercapture', lost);
    window.addEventListener('resize', cancelDrag);
    window.addEventListener('blur', cancelDrag);
    surface.addEventListener('click', click, true);
    return () => {
      document.removeEventListener('pointerdown', interrupt, true);
      document.removeEventListener('kc:overlay-open', stopNavigation);
      surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('touchmove', consumePagePan);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', lost);
      surface.removeEventListener('lostpointercapture', lost);
      window.removeEventListener('resize', cancelDrag);
      window.removeEventListener('blur', cancelDrag);
      surface.removeEventListener('click', click, true);
      drag.current = null;
      cancelMotion();
    };
  }, [cancelMotion, rest, settle]);

  const pages = peer && peer.tab !== activeTab ? [activeTab, peer.tab] : [activeTab];
  return (
    <div className="relative overflow-x-clip min-h-[55dvh]" data-page-viewport>
      <div ref={rail} className="relative" data-page-rail>
        {pages.map((tab) => {
          const other = tab !== activeTab && peer;
          return (
            <div key={tab} data-journal-page={tab} inert={Boolean(other)} aria-hidden={other ? true : undefined}
              className={other ? 'pointer-events-none absolute w-full' : undefined}
              style={other ? { left: `${other.side * 100}%`, top: other.top } : undefined}>
              {renderTab(tab)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
