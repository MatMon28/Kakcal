import { Activity, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { ActiveTab } from '../../types';
import { prefersReducedMotion } from '../../utils/motion';
import { canAnimatePages, playPageChange, setPageTransitioning } from '../../utils/pageTransition';
import { afterPaint } from '../../utils/idle';
import { getOpenModalCount } from './Modal';
import { setPagePosition } from '../../utils/pagePosition';
import { preloadTabScreen } from '../../utils/lazyScreens';

interface PageSwiperProps {
  tabs: ActiveTab[];
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  renderTab: (tab: ActiveTab) => ReactNode;
  disabled?: boolean;
  onSwipeBack?: () => void;
}

// `placeholder`: the swipe neighbour has only been announced (an empty panel); the real page is mounted later.
type Peer = { tab: ActiveTab; side: number; top: number; placeholder?: boolean };
// The page a tap / Back change is leaving: kept mounted (inert, in place) while it fades out.
type Leaving = { tab: ActiveTab; top: number };
type Drag = {
  id: number; origin: Element; startX: number; startY: number; startTime: number; scrollY: number;
  width: number; locked: boolean; side: number; target?: ActiveTab; offset: number; placeholder: boolean;
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
 * Swipe tuning. Deliberately sensitive: the page starts following the finger after 6 px, follows it
 * almost 1:1, and a short drag (about 14 % of the width, 44-72 px) or a light flick changes the page.
 */
const LOCK_DISTANCE = 6; // px of horizontal travel before the drag is taken over
const LOCK_RATIO = 1.1; // horizontal must beat vertical by this factor
const FOLLOW = 0.88; // initial finger-to-page ratio (1 = no resistance)
const COMMIT_MIN = 44;
const COMMIT_MAX = 72;
const COMMIT_RATIO = 0.14;
const FLICK_SPEED = 0.22; // px/ms
const FLICK_MIN = 24;
const BACK_DISTANCE = 56; // swipe right out of the food catalogue
// The neighbour is an empty panel until the drag has covered this share of the commit distance; only then is the real
// page (the costly part) mounted. Mounting it at the 6 px lock stalled the page under the finger.
const PREVIEW_AT = 0.6;
const commitDistance = (width: number) => Math.min(COMMIT_MAX, Math.max(COMMIT_MIN, width * COMMIT_RATIO));

const translate = (px: number) => `translate3d(${px}px,0,0)`;

export function PageSwiper(props: PageSwiperProps) {
  const { activeTab, renderTab } = props;
  const latest = useRef(props);
  latest.current = props;
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const motion = useRef<Animation | null>(null);
  const leavingMotion = useRef<Animation | null>(null);
  const frame = useRef(0);
  const previous = useRef(activeTab);
  const swipeDestination = useRef<ActiveTab | null>(null);
  const scrollAtChange = useRef(0);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [shownTab, setShownTab] = useState(activeTab);
  const [todayVisited, setTodayVisited] = useState(activeTab === 'today');

  // Tap / Back change: keep the page we are leaving mounted so it can fade out instead of being cut away. This is
  // decided while rendering, so the old page is never unmounted and re-mounted (its state and DOM survive). A swipe
  // already hands the old page over as `peer`, and reduced motion keeps the instant change.
  if (shownTab !== activeTab) {
    const handedOver = swipeDestination.current === activeTab || peer?.tab === shownTab;
    setShownTab(activeTab);
    // The scroll the window had before this change (read now, while layout is still clean). The reset to the top is
    // done in the layout effect below, or - for a tap - after the first frame (no forced layout in the commit); until
    // then the old page simply stays where it was (`top: 0`) and is shifted up by that scroll when the reset happens.
    scrollAtChange.current = window.scrollY;
    setLeaving(handedOver || !canAnimatePages() ? null : { tab: shownTab, top: 0 });
  }

  const cancelMotion = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const animation = motion.current;
    motion.current = null;
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
    }
    const outgoingAnimation = leavingMotion.current;
    leavingMotion.current = null;
    if (outgoingAnimation) {
      outgoingAnimation.onfinish = null;
      outgoingAnimation.cancel();
    }
    if (rail.current) {
      rail.current.style.transform = '';
      rail.current.style.willChange = '';
    }
    document.documentElement.classList.remove('kc-page-moving', 'kc-page-dragging');
    setPagePosition(null);
    setPageTransitioning(false);
  }, []);

  const rest = useCallback(() => {
    cancelMotion();
    setPeer(null);
    setLeaving(null);
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
    const index = latest.current.tabs.indexOf(latest.current.activeTab);
    const width = el.parentElement?.clientWidth || 1;
    const followPill = () => {
      if (motion.current !== animation) return;
      const progress = Number(animation.effect?.getComputedTiming().progress ?? 0);
      if (index >= 0) setPagePosition(index - (from / width) * (1 - progress));
      frame.current = requestAnimationFrame(followPill);
    };
    followPill();
    animation.onfinish = () => { if (motion.current === animation) rest(); };
  }, [rest]);

  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = activeTab;
    if (old === activeTab) return;
    const scrolled = scrollAtChange.current;
    scrollAtChange.current = 0;
    const toTop = () => window.scrollTo({ top: 0, behavior: 'instant' });
    if (swipeDestination.current === activeTab) {
      swipeDestination.current = null;
      // A swipe shows both pages under the finger: the offsets must be right in this very frame.
      if (scrolled > 0) toTop();
      return;
    }
    drag.current = null;
    cancelMotion();
    setPeer(null);
    const tabs = latest.current.tabs;
    const side = activeTab === 'database' || (old !== 'database' && tabs.indexOf(activeTab) > tabs.indexOf(old)) ? 1 : -1;
    document.documentElement.style.setProperty('--kc-swipe-dir', String(side));
    document.documentElement.dataset.swipeDir = side > 0 ? 'right' : 'left';
    const pages = Array.from(rail.current?.children ?? []).filter((el): el is HTMLElement => el instanceof HTMLElement);
    const incoming = pages.find((el) => el.dataset.journalPage === activeTab);
    const outgoing = pages.find((el) => el.dataset.journalPage === old) ?? null;
    if (!incoming || !canAnimatePages()) { if (scrolled > 0) toTop(); rest(); return; }
    // Writing the scroll position forces a layout of the freshly mounted page, so a tap does it after the first frame.
    // The incoming page is still invisible then (opacity 0 during its delay) and the old page is moved up by the scroll
    // it had, which looks exactly like the old synchronous reset. Nothing to do when the page was not scrolled.
    if (scrolled > 0) {
      afterPaint(() => {
        toTop();
        if (outgoing?.isConnected) outgoing.style.top = `${-scrolled}px`;
      });
    }
    // Fade through: the old page fades out, the new one fades in while sliding 12 px (src/utils/pageTransition.ts).
    document.documentElement.classList.add('kc-page-moving');
    setPageTransitioning(true);
    const { incoming: animation, outgoing: leavingAnimation } = playPageChange(incoming, outgoing, side);
    motion.current = animation;
    leavingMotion.current = leavingAnimation;
    // Keep the leaving page hidden via `fill: 'forwards'` until `incoming` lands so unmounting never causes a
    // mid-transition frame drop. Removing it while `kc-page-moving` is still on cannot stretch the document.
    animation.onfinish = () => {
      if (motion.current !== animation) return;
      flushSync(() => { setPeer(null); setLeaving(null); });
      cancelMotion();
    };
  }, [activeTab, cancelMotion, rest]);

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
        scrollY: window.scrollY, width: viewport.clientWidth, locked: false, side: 0, offset: 0, placeholder: false,
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
        g.placeholder = Boolean(tab);
        if (tab) preloadTabScreen(tab);
        if (!prefersReducedMotion()) flushSync(() => setPeer(tab ? { tab, side, top: g.scrollY, placeholder: true } : null));
      }
      // Far enough that the neighbour is about to be needed: mount the real page now, once.
      if (g.placeholder && g.target && Math.abs(dx) > commitDistance(g.width) * PREVIEW_AT) {
        g.placeholder = false;
        const { target: tab, side } = g;
        if (!prefersReducedMotion()) flushSync(() => setPeer({ tab, side, top: g.scrollY }));
      }
      const dt = event.timeStamp - g.time;
      if (dt > 0) g.velocity = (event.clientX - g.x) / dt;
      g.x = event.clientX;
      g.time = event.timeStamp;
      const resist = dx - Math.sign(dx) * 8;
      const abs = Math.abs(resist);
      const damped = abs < 85 ? resist * FOLLOW : Math.sign(resist) * (85 * FOLLOW + (abs - 85) * 0.96);
      g.offset = g.target ? Math.max(-g.width, Math.min(g.width, damped)) : Math.max(-28, Math.min(28, resist * 0.2));
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
      const minDistance = commitDistance(g.width);
      const cross = dist > minDistance ||
        (dist > Math.max(FLICK_MIN, g.width * 0.06) && (velocity > FLICK_SPEED || avgSpeed > FLICK_SPEED));
      const { activeTab: old, onChange, onSwipeBack } = latest.current;
      if (!g.target && old === 'database' && dx > BACK_DISTANCE) {
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

  // The page that is not the active one: the swipe neighbour (beside the rail) or the page a tap just left (in place).
  // `today` is kept mounted inside React 19 `<Activity>` once visited so return navigation is instant without holding
  // heavier pages (like Custom photos) in memory.
  const other = peer && peer.tab !== activeTab
    ? { tab: peer.tab, placeholder: Boolean(peer.placeholder), style: { left: `${peer.side * 100}%`, top: peer.top } }
    : leaving && leaving.tab !== activeTab ? { tab: leaving.tab, placeholder: false, style: { left: 0, top: leaving.top } } : null;
  const pages = other ? [activeTab, other.tab] : [activeTab];
  const todayGhost = other && other.tab === 'today' ? other : null;
  const todayShown = activeTab === 'today' || Boolean(todayGhost);
  const todayActivityVisible = activeTab === 'today' || Boolean(todayGhost && !todayGhost.placeholder);
  if (todayActivityVisible && !todayVisited) setTodayVisited(true);
  const nonTodayPages = pages.filter((tab) => tab !== 'today');
  return (
    <div className="relative -mx-2 px-2 overflow-x-clip min-h-[55dvh]" data-page-viewport>
      <div ref={rail} className="relative" data-page-rail>
        {todayVisited && (
          <div
            key="today"
            data-journal-page={todayShown ? 'today' : undefined}
            hidden={!todayShown}
            inert={Boolean(todayGhost) || !todayShown}
            aria-hidden={todayGhost || !todayShown ? true : undefined}
            className={todayGhost ? 'pointer-events-none absolute w-full [contain:layout_paint] will-change-[opacity]' : undefined}
            style={todayGhost?.style}
          >
            {todayGhost?.placeholder && <div className="min-h-[55dvh]" />}
            <Activity mode={todayActivityVisible ? 'visible' : 'hidden'}>
              {renderTab('today')}
            </Activity>
          </div>
        )}
        {nonTodayPages.map((tab) => {
          const ghost = other && tab !== activeTab ? other : null;
          return (
            <div key={tab} data-journal-page={tab} inert={Boolean(ghost)} aria-hidden={ghost ? true : undefined}
              className={ghost ? 'pointer-events-none absolute w-full [contain:layout_paint] will-change-[opacity]' : undefined}
              style={ghost?.style}>
              {ghost?.placeholder ? <div className="min-h-[55dvh]" /> : renderTab(tab)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
