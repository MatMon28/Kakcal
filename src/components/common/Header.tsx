import React from 'react';
import { useApp } from '../../context/AppContext';
import { User, Settings } from 'lucide-react';
import { Tabs } from './Tabs';
import { Wordmark } from './Brand';
import { prefersReducedMotion } from '../../utils/motion';

const TOP_HIDE_SCROLL_PX = 48;
const TABS_HIDE_DELTA_PX = 56;
const TABS_REVEAL_DELTA_PX = 36;
const TOP_ROW_HEIGHT_PX = 44;
const TABS_ROW_HEIGHT_PX = 52;
/** Smoothing time constant of the pill (ms): it eases toward the scroll-driven target. */
const TABS_SMOOTHING_MS = 80;
/** After scrolling stops, a half-shown pill completes its movement instead of hanging in between. */
const TABS_SETTLE_IDLE_MS = 140;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const Header: React.FC = () => {
  const { t, activeTab, setActiveTab, setIsProfileOpen, setIsSettingsOpen } = useApp();
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const topRowRef = React.useRef<HTMLDivElement>(null);
  const tabsRowRef = React.useRef<HTMLDivElement>(null);
  const scrollStateRef = React.useRef({
    lastY: 0,
    topProgress: 1,
    /** Where the pill is heading (driven by scroll) and where it currently is (eased). */
    tabsTarget: 1,
    tabsShown: 1,
    frame: 0,
    frameTime: 0,
    idle: 0,
  });

  // Only transform and opacity change, so scrolling never causes layout. The blurred background
  // belongs to the app-name row alone: the pill that returns while scrolling floats by itself.
  const applyHeaderProgress = React.useCallback((topProgress: number, tabsProgress: number) => {
    const backdrop = backdropRef.current;
    const topRow = topRowRef.current;
    const tabsRow = tabsRowRef.current;
    if (!backdrop || !topRow || !tabsRow) return;

    const topP = clamp01(topProgress);
    const tabsP = clamp01(tabsProgress);

    backdrop.style.opacity = topP.toFixed(3);

    topRow.style.opacity = topP.toFixed(3);
    topRow.style.transform = `translate3d(0, ${((1 - topP) * -12).toFixed(2)}px, 0)`;
    topRow.style.pointerEvents = topP > 0.45 ? 'auto' : 'none';

    // The pill rises into the space of the vanished name row, then slides/fades with its own progress.
    const rise = (1 - topP) * -TOP_ROW_HEIGHT_PX + (1 - tabsP) * -14;
    const scale = 0.96 + 0.04 * tabsP;
    tabsRow.style.opacity = tabsP.toFixed(3);
    tabsRow.style.transform = `translate3d(0, ${rise.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
    // --kc-float drives the translucent glass look of the pill whenever it floats over the content.
    tabsRow.style.setProperty('--kc-float', (1 - topP).toFixed(3));
    tabsRow.style.pointerEvents = tabsP > 0.4 ? 'auto' : 'none';
  }, []);

  const stopFrame = React.useCallback(() => {
    const state = scrollStateRef.current;
    cancelAnimationFrame(state.frame);
    state.frame = 0;
  }, []);

  // Eases the pill toward its target at display rate (frame-rate independent).
  const stepTabs = React.useCallback(
    (now: number) => {
      const state = scrollStateRef.current;
      const dt = Math.min(64, Math.max(1, now - (state.frameTime || now - 16)));
      state.frameTime = now;
      const diff = state.tabsTarget - state.tabsShown;
      if (Math.abs(diff) < 0.003) {
        state.tabsShown = state.tabsTarget;
        state.frame = 0;
        state.frameTime = 0;
      } else {
        state.tabsShown += diff * (1 - Math.exp(-dt / TABS_SMOOTHING_MS));
        state.frame = requestAnimationFrame(stepTabs);
      }
      applyHeaderProgress(state.topProgress, state.tabsShown);
    },
    [applyHeaderProgress],
  );

  const pushTabs = React.useCallback(() => {
    const state = scrollStateRef.current;
    if (prefersReducedMotion()) {
      stopFrame();
      state.tabsShown = state.tabsTarget;
      applyHeaderProgress(state.topProgress, state.tabsShown);
    } else if (!state.frame) {
      state.frame = requestAnimationFrame(stepTabs);
    }
  }, [applyHeaderProgress, stepTabs, stopFrame]);

  React.useEffect(() => {
    const state = scrollStateRef.current;
    state.lastY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    state.topProgress = clamp01(1 - state.lastY / TOP_HIDE_SCROLL_PX);
    if (state.lastY <= 4) {
      state.tabsTarget = 1;
      state.tabsShown = 1;
      stopFrame();
    }
    applyHeaderProgress(state.topProgress, state.tabsShown);
  }, [activeTab, applyHeaderProgress, stopFrame]);

  React.useEffect(() => {
    const state = scrollStateRef.current;
    state.lastY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    state.topProgress = clamp01(1 - state.lastY / TOP_HIDE_SCROLL_PX);
    state.tabsTarget = state.tabsShown = 1;
    applyHeaderProgress(state.topProgress, state.tabsShown);

    const onScroll = () => {
      if (document.documentElement.classList.contains('kc-sheet-open')) return;
      const y = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      const dy = y - state.lastY;
      state.lastY = y;

      // App name bar at the top disappears as we scroll down from the top of the page.
      state.topProgress = clamp01(1 - y / TOP_HIDE_SCROLL_PX);

      // The pill hides while scrolling down and glides back as soon as the user scrolls up a little.
      if (y <= 4) {
        state.tabsTarget = 1;
      } else if (dy > 0) {
        state.tabsTarget = clamp01(state.tabsTarget - dy / TABS_HIDE_DELTA_PX);
      } else if (dy < 0) {
        state.tabsTarget = clamp01(state.tabsTarget + -dy / TABS_REVEAL_DELTA_PX);
      }
      pushTabs();

      window.clearTimeout(state.idle);
      state.idle = window.setTimeout(() => {
        if (state.tabsTarget > 0 && state.tabsTarget < 1) {
          state.tabsTarget = state.tabsTarget >= 0.35 ? 1 : 0;
          pushTabs();
        }
      }, TABS_SETTLE_IDLE_MS);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(state.idle);
      stopFrame();
    };
  }, [applyHeaderProgress, pushTabs, stopFrame]);

  const handleTitleClick = () => {
    if (activeTab !== 'today') {
      setActiveTab('today');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 h-[calc(max(0.75rem,env(safe-area-inset-top))+6.25rem)] pointer-events-none">
      {/* Background of the app-name row only: it fades with that row and never follows the pill. */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="kc-header-surface absolute inset-0 bg-[var(--bg)]/95 sm:backdrop-blur-md border-b border-[var(--border)]"
      />
      <div className="relative px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1">
        <div className="max-w-4xl mx-auto">
          {/* Profile (left) · app name (top center) · settings (right) */}
          <div
            ref={topRowRef}
            className="pointer-events-auto grid grid-cols-[1fr_auto_1fr] items-center overflow-hidden will-change-[opacity,transform]"
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

          {/* Today / Meals / Period / Statistics pill bar: floats, translucent, no background of its own */}
          <div
            ref={tabsRowRef}
            className="kc-tabs-row pointer-events-auto will-change-[opacity,transform]"
            style={{ height: `${TABS_ROW_HEIGHT_PX}px` }}
          >
            <Tabs />
          </div>
        </div>
      </div>
    </header>
  );
};
