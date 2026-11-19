import React from 'react';
import { useApp } from '../../context/AppContext';
import { User, Settings } from 'lucide-react';
import { Tabs } from './Tabs';
import { Wordmark } from './Brand';

const TOP_HIDE_SCROLL_PX = 48;
const TABS_HIDE_DELTA_PX = 68;
const TABS_REVEAL_DELTA_PX = 68;
const TOP_ROW_HEIGHT_PX = 44;
const TABS_ROW_HEIGHT_PX = 52;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

export const Header: React.FC = () => {
  const { t, activeTab, setActiveTab, setIsProfileOpen, setIsSettingsOpen } = useApp();
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const topRowRef = React.useRef<HTMLDivElement>(null);
  const tabsRowRef = React.useRef<HTMLDivElement>(null);
  const scrollStateRef = React.useRef({
    lastY: 0,
    topProgress: 1,
    tabsProgress: 1,
    renderedTop: 1,
    renderedTabs: 1,
    rafId: 0 as number,
    lastFrameTime: 0,
  });

  const applyHeaderProgress = React.useCallback((topProgress: number, tabsProgress: number) => {
    const surface = surfaceRef.current;
    const topRow = topRowRef.current;
    const tabsRow = tabsRowRef.current;
    if (!surface || !topRow || !tabsRow) return;

    const topP = clamp01(topProgress);
    const tabsP = clamp01(tabsProgress);
    const easedTabsP = smoothstep(tabsP);
    const barVisibility = Math.max(topP, easedTabsP);

    topRow.style.height = `${(topP * TOP_ROW_HEIGHT_PX).toFixed(2)}px`;
    topRow.style.opacity = topP.toFixed(3);
    topRow.style.transform = `translate3d(0, ${((1 - topP) * -12).toFixed(2)}px, 0)`;
    topRow.style.pointerEvents = topP > 0.45 ? 'auto' : 'none';

    // Keep full pill height so borders/shadows are never clipped; animate smoothly via opacity & transform.
    tabsRow.style.height = `${TABS_ROW_HEIGHT_PX}px`;
    tabsRow.style.opacity = easedTabsP.toFixed(3);
    tabsRow.style.transform = `translate3d(0, ${((1 - easedTabsP) * -8).toFixed(2)}px, 0) scale(${(0.97 + 0.03 * easedTabsP).toFixed(3)})`;
    tabsRow.style.pointerEvents = tabsP > 0.15 ? 'auto' : 'none';

    // Header background and bottom border follow ONLY topP so that when scrolling back up
    // down the page, only the page pill reappears (with transparency), never the header background.
    surface.style.setProperty('--header-bg-progress', topP.toFixed(3));
    surface.dataset.pillFloating = topP < 0.85 ? 'true' : 'false';

    const topPadRem = 0.25 + 0.5 * topP;
    surface.style.paddingTop =
      barVisibility > 0.02
        ? `calc(max(${topPadRem.toFixed(3)}rem, env(safe-area-inset-top)) * ${barVisibility.toFixed(3)})`
        : '0px';
    surface.style.paddingBottom = `${(0.25 * topP).toFixed(3)}rem`;
    surface.style.pointerEvents = topP > 0.2 ? 'auto' : 'none';
  }, []);

  const scheduleSmoothUpdate = React.useCallback(
    (immediate = false) => {
      const state = scrollStateRef.current;
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      if (immediate || reduced) {
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = 0;
        }
        state.renderedTop = state.topProgress;
        state.renderedTabs = state.tabsProgress;
        applyHeaderProgress(state.renderedTop, state.renderedTabs);
        return;
      }

      if (state.rafId) return;

      const step = (now: number) => {
        const dt = state.lastFrameTime ? Math.min(48, Math.max(8, now - state.lastFrameTime)) : 16;
        state.lastFrameTime = now;
        const alpha = 1 - Math.pow(1 - 0.24, dt / 16);

        state.renderedTop += (state.topProgress - state.renderedTop) * alpha;
        state.renderedTabs += (state.tabsProgress - state.renderedTabs) * alpha;

        const doneTop = Math.abs(state.topProgress - state.renderedTop) < 0.002;
        const doneTabs = Math.abs(state.tabsProgress - state.renderedTabs) < 0.002;

        if (doneTop) state.renderedTop = state.topProgress;
        if (doneTabs) state.renderedTabs = state.tabsProgress;

        applyHeaderProgress(state.renderedTop, state.renderedTabs);

        if (!doneTop || !doneTabs) {
          state.rafId = requestAnimationFrame(step);
        } else {
          state.rafId = 0;
          state.lastFrameTime = 0;
        }
      };

      state.rafId = requestAnimationFrame(step);
    },
    [applyHeaderProgress]
  );

  React.useEffect(() => {
    const state = scrollStateRef.current;
    state.lastY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    state.topProgress = clamp01(1 - state.lastY / TOP_HIDE_SCROLL_PX);
    state.tabsProgress = state.lastY <= 4 ? 1 : state.tabsProgress;
    scheduleSmoothUpdate(true);
  }, [activeTab, scheduleSmoothUpdate]);

  React.useEffect(() => {
    const state = scrollStateRef.current;
    state.lastY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    state.topProgress = clamp01(1 - state.lastY / TOP_HIDE_SCROLL_PX);
    state.tabsProgress = 1;
    scheduleSmoothUpdate(true);

    const onScroll = () => {
      if (document.documentElement.classList.contains('kc-sheet-open')) return;
      const y = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      const dy = y - state.lastY;
      state.lastY = y;

      // App name bar at the top disappears as we scroll down from the top of the page.
      state.topProgress = clamp01(1 - y / TOP_HIDE_SCROLL_PX);

      // Pages indicator below it disappears when scrolling down,
      // and smoothly reappears as soon as the user scrolls back up.
      if (y <= 4) {
        state.tabsProgress = 1;
      } else if (dy > 0) {
        state.tabsProgress = clamp01(state.tabsProgress - dy / TABS_HIDE_DELTA_PX);
      } else if (dy < 0) {
        state.tabsProgress = clamp01(state.tabsProgress + (-dy) / TABS_REVEAL_DELTA_PX);
      }

      scheduleSmoothUpdate(false);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      }
    };
  }, [scheduleSmoothUpdate]);

  const handleTitleClick = () => {
    if (activeTab !== 'today') {
      setActiveTab('today');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 h-[calc(max(0.75rem,env(safe-area-inset-top))+6.25rem)] pointer-events-none">
      <div
        ref={surfaceRef}
        className="kc-header-surface pointer-events-auto border-b border-transparent px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1"
      >
        <div className="max-w-4xl mx-auto">
          {/* Profile (left) · app name (top center) · settings (right) */}
          <div
            ref={topRowRef}
            className="grid grid-cols-[1fr_auto_1fr] items-center overflow-hidden will-change-[height,opacity,transform]"
            style={{ height: `${TOP_ROW_HEIGHT_PX}px` }}
          >
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="kc-icon-btn pressable w-11 h-11 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                title={t.profile.title}
                aria-label={t.profile.title}
              >
                <User size={21} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleTitleClick}
              aria-label={t.appName}
              title={t.appName}
              className="flex justify-self-center rounded-xl transition-opacity hover:opacity-80"
            >
              <Wordmark className="h-10 sm:h-11" />
            </button>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="kc-icon-btn pressable w-11 h-11 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                title={t.settings.title}
                aria-label={t.settings.title}
              >
                <Settings size={22} />
              </button>
            </div>
          </div>

          {/* Today / Meals / Period / Statistics pill bar */}
          <div
            ref={tabsRowRef}
            className="will-change-[opacity,transform]"
            style={{ height: `${TABS_ROW_HEIGHT_PX}px` }}
          >
            <Tabs />
          </div>
        </div>
      </div>
    </header>
  );
};
