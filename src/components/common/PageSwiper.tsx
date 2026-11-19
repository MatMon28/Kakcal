import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { ActiveTab } from '../../types';
import { prefersReducedMotion } from '../../utils/motion';
import { getOpenModalCount } from './Modal';

interface PageSwiperProps {
  tabs: ActiveTab[];
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  renderTab: (tab: ActiveTab) => ReactNode;
  disabled?: boolean;
  onSwipeBack?: () => void;
}

type Peer = { tab: ActiveTab; side: number; top: number };
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

const translate = (px: number) => `translate3d(${px}px,0,0)`;

export function PageSwiper(props: PageSwiperProps) {
  const { activeTab, renderTab } = props;
  const latest = useRef(props);
  latest.current = props;
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const motion = useRef<Animation | null>(null);
  const frame = useRef(0);
  const previous = useRef(activeTab);
  const swipeDestination = useRef<ActiveTab | null>(null);
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
    if (rail.current) {
      rail.current.style.transform = '';
      rail.current.style.willChange = '';
    }
    document.documentElement.classList.remove('kc-page-moving', 'kc-page-dragging');
  }, []);

  const rest = useCallback(() => {
    cancelMotion();
    setPeer(null);
  }, [cancelMotion]);

  // The base style is already at rest. A finished animation cannot pin the live page offscreen.
  const settle = useCallback((from: number, duration: number) => {
    const el = rail.current;
    if (!el || prefersReducedMotion() || !el.animate || Math.abs(from) < 0.5) return rest();
    el.style.transform = '';
    el.style.willChange = 'transform';
    const animation = el.animate([{ transform: translate(from) }, { transform: 'none' }], {
      duration, easing: 'cubic-bezier(.2,0,0,1)', fill: 'none',
    });
    motion.current = animation;
    animation.onfinish = () => { if (motion.current === animation) rest(); };
  }, [rest]);

  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = activeTab;
    if (old === activeTab) return;
    if (swipeDestination.current === activeTab) {
      swipeDestination.current = null;
      return;
    }
    drag.current = null;
    rest();
    const tabs = latest.current.tabs;
    const side = activeTab === 'database' || (old !== 'database' && tabs.indexOf(activeTab) > tabs.indexOf(old)) ? 1 : -1;
    document.documentElement.style.setProperty('--kc-swipe-dir', String(side));
    document.documentElement.dataset.swipeDir = side > 0 ? 'right' : 'left';
    document.documentElement.classList.add('kc-page-moving');
    settle(side * 16, 115);
  }, [activeTab, rest, settle]);

  useEffect(() => {
    const el = rail.current;
    const viewport = el?.parentElement;
    const surface = viewport?.closest('main');
    if (!el || !viewport || !surface) return;
    let blockDragClick = false;
    const interrupt = () => { if (motion.current) rest(); };
    const cancelDrag = () => {
      const g = drag.current;
      drag.current = null;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      document.documentElement.classList.remove('kc-page-dragging');
      if (g?.locked) settle(g.offset, 125);
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
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
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
        if (!prefersReducedMotion()) flushSync(() => setPeer(tab ? { tab, side, top: g.scrollY } : null));
      }
      const dt = event.timeStamp - g.time;
      if (dt > 0) g.velocity = (event.clientX - g.x) / dt;
      g.x = event.clientX;
      g.time = event.timeStamp;
      const resist = dx - Math.sign(dx) * 8;
      const abs = Math.abs(resist);
      const damped = abs < 85 ? resist * 0.72 : Math.sign(resist) * (85 * 0.72 + (abs - 85) * 0.92);
      g.offset = g.target ? Math.max(-g.width, Math.min(g.width, damped)) : Math.max(-28, Math.min(28, resist * 0.2));
      if (!frame.current && !prefersReducedMotion()) frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (drag.current === g) el.style.transform = translate(g.offset);
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
      const velocity = event.timeStamp - g.time < 90 ? -g.velocity * g.side : 0;
      const minDistance = Math.min(116, Math.max(86, g.width * 0.27));
      const cross = dist > minDistance ||
        (dist > Math.max(44, g.width * 0.12) && (velocity > 0.65 || avgSpeed > 0.65));
      const { activeTab: old, onChange, onSwipeBack } = latest.current;
      if (!g.target && old === 'database' && dx > 86) {
        document.documentElement.style.setProperty('--kc-swipe-dir', '-1');
        document.documentElement.dataset.swipeDir = 'left';
        rest();
        onSwipeBack?.();
        return;
      }
      let from = g.offset;
      if (g.target && cross) {
        // Promote the keyed preview instead of mounting the destination twice. The old panel's
        // offset compensates for the new tab's scroll-to-top in the same layout pass.
        const target = g.target;
        document.documentElement.style.setProperty('--kc-swipe-dir', String(g.side));
        document.documentElement.dataset.swipeDir = g.side > 0 ? 'right' : 'left';
        swipeDestination.current = target;
        from += g.side * g.width;
        flushSync(() => {
          setPeer({ tab: old, side: -g.side, top: -g.scrollY });
          onChange(target);
        });
      }
      settle(from, Math.min(150, 80 + Math.abs(from) * 0.2));
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
    <div className="relative overflow-x-clip" data-page-viewport>
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
