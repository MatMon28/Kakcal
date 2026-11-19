import React from 'react';
import { useApp } from '../../context/AppContext';
import { User, Settings } from 'lucide-react';
import { Tabs } from './Tabs';
import { Wordmark } from './Brand';

const TOP_HIDE_SCROLL_PX = 48;
const TABS_HIDE_DELTA_PX = 56;
const TABS_REVEAL_DELTA_PX = 44;
const TOP_ROW_HEIGHT_PX = 44;
const TABS_ROW_HEIGHT_PX = 52;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const Header: React.FC = () => {
  const { t, activeTab, setActiveTab, setIsProfileOpen, setIsSettingsOpen } = useApp();
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const topRowRef = React.useRef<HTMLDivElement>(null);
  const tabsRowRef = React.useRef<HTMLDivElement>(null);
  const scrollStateRef = React.useRef({
    lastY: 0,
    topProgress: 1,
    tabsProgress: 1,
  });

  const applyHeaderProgress = React.useCallback((topProgress: number, tabsProgress: number) => {
    const surface = surfaceRef.current;
    const topRow = topRowRef.current;
    const tabsRow = tabsRowRef.current;
    if (!surface || !topRow || !tabsRow) return;

    const topP = clamp01(topProgress);
    const tabsP = clamp01(tabsProgress);
    const barVisibility = Math.max(topP, tabsP);

    topRow.style.height = `${(topP * TOP_ROW_HEIGHT_PX).toFixed(2)}px`;
    topRow.style.opacity = topP.toFixed(3);
    topRow.style.transform = `translate3d(0, ${((1 - topP) * -12).toFixed(2)}px, 0)`;
    topRow.style.pointerEvents = topP > 0.45 ? 'auto' : 'none';

    tabsRow.style.height = `${(tabsP * TABS_ROW_HEIGHT_PX).toFixed(2)}px`;
    tabsRow.style.opacity = tabsP.toFixed(3);
    tabsRow.style.transform = `translate3d(0, ${((1 - tabsP) * -10).toFixed(2)}px, 0)`;
    tabsRow.style.pointerEvents = tabsP > 0.15 ? 'auto' : 'none';

    const topPadRem = 0.25 + 0.5 * topP;
    surface.style.paddingTop =
      barVisibility > 0.02
        ? `calc(max(${topPadRem.toFixed(3)}rem, env(safe-area-inset-top)) * ${barVisibility.toFixed(3)})`
        : '0px';
    surface.style.paddingBottom = `${(0.25 * barVisibility).toFixed(3)}rem`;
    surface.style.opacity = clamp01(barVisibility * 1.15).toFixed(3);
    surface.style.borderBottomColor = barVisibility > 0.06 ? 'var(--border)' : 'transparent';
    surface.style.pointerEvents = barVisibility > 0.1 ? 'auto' : 'none';
  }, []);

  React.useEffect(() => {
    const state = scrollStateRef.current;
    state.lastY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    state.topProgress = clamp01(1 - state.lastY / TOP_HIDE_SCROLL_PX);
    state.tabsProgress = state.lastY <= 4 ? 1 : state.tabsProgress;
    applyHeaderProgress(state.topProgress, state.tabsProgress);
  }, [activeTab, applyHeaderProgress]);

  React.useEffect(() => {
    const state = scrollStateRef.current;
    state.lastY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    state.topProgress = clamp01(1 - state.lastY / TOP_HIDE_SCROLL_PX);
    state.tabsProgress = 1;
    applyHeaderProgress(state.topProgress, state.tabsProgress);

    const onScroll = () => {
      if (document.documentElement.classList.contains('kc-sheet-open')) return;
      const y = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      const dy = y - state.lastY;
      state.lastY = y;

      // App name bar at the top disappears as we scroll down from the top of the page.
      state.topProgress = clamp01(1 - y / TOP_HIDE_SCROLL_PX);

      // Pages indicator below it disappears when scrolling down,
      // and gradually reappears as soon as the user scrolls back up a little.
      if (y <= 4) {
        state.tabsProgress = 1;
      } else if (dy > 0) {
        state.tabsProgress = clamp01(state.tabsProgress - dy / TABS_HIDE_DELTA_PX);
      } else if (dy < 0) {
        state.tabsProgress = clamp01(state.tabsProgress + (-dy) / TABS_REVEAL_DELTA_PX);
      }

      applyHeaderProgress(state.topProgress, state.tabsProgress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [applyHeaderProgress]);

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
        className="kc-header-surface pointer-events-auto bg-[var(--bg)]/95 sm:backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1 transition-[border-color] duration-150"
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
            className="overflow-hidden will-change-[height,opacity,transform]"
            style={{ height: `${TABS_ROW_HEIGHT_PX}px` }}
          >
            <Tabs />
          </div>
        </div>
      </div>
    </header>
  );
};
