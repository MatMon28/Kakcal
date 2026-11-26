import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { Flame, UtensilsCrossed, TrendingUp, Droplet, BookOpen, PersonStanding, Timer } from 'lucide-react';
import { useNav, useNavActions, useShell } from '../../context/AppContext';
import type { ActiveTab, MainTabId } from '../../types';
import { isPeriodShown } from '../../utils/tourPreview';
import { normalizePageOrder } from '../../utils/pageVisibility';
import { useAdvanced } from '../../utils/advancedStore';
import { useFasting } from '../../utils/fastingStore';
import { getPagePosition, subscribePagePosition } from '../../utils/pagePosition';
import { preloadTabScreen } from '../../utils/lazyScreens';

export function Tabs() {
  // Navigation + settings only: no journal data, so a logged meal does not re-render the tab bar.
  const { t, settings } = useShell();
  const { activeTab } = useNav();
  const { setActiveTab } = useNavActions();
  const [isPending, startTabTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<ActiveTab | null>(null);
  const displayTab = isPending && pendingTab ? pendingTab : activeTab;
  const bodyShown = useAdvanced().body.enabled;
  const fastingShown = useFasting().config.enabled;
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const layers = useRef<(HTMLSpanElement | null)[]>([]);
  const shown = useRef<number | null>(null);
  const frame = useRef(0);
  const metrics = useRef({ padLeft: 4, gap: 4, labelWidths: [] as number[] });
  const mainItems: Record<MainTabId, { id: MainTabId; label: string; icon: typeof Flame; color: string; shown: boolean }> = {
    today: { id: 'today', label: t.nav.today, icon: Flame, color: '#F6D0D0', shown: true },
    fasting: { id: 'fasting', label: t.nav.fasting, icon: Timer, color: '#F7E9AA', shown: fastingShown },
    prebuilt: { id: 'prebuilt', label: t.nav.prebuilt, icon: UtensilsCrossed, color: '#FAE0B4', shown: !settings.hideCustomPage },
    period: { id: 'period', label: t.nav.period, icon: Droplet, color: '#F4C6D8', shown: isPeriodShown(settings.hidePeriod) },
    body: { id: 'body', label: t.nav.body, icon: PersonStanding, color: '#E2D6FF', shown: bodyShown },
    history: { id: 'history', label: t.nav.history, icon: TrendingUp, color: '#CFE7FE', shown: !settings.hideStatisticsPage },
  };
  const items = [
    ...normalizePageOrder(settings.pageOrder).flatMap((id) => (mainItems[id].shown ? [mainItems[id]] : [])),
    ...(activeTab === 'database' ? [{ id: 'database', label: t.nav.database, icon: BookOpen, color: '#C9EFD3' }] : []),
  ];
  const latest = useRef({ index: 0, count: 0, ultraMinimal: false });
  latest.current = {
    index: Math.max(0, items.findIndex((item) => item.id === displayTab)),
    count: items.length,
    ultraMinimal: settings.ultraMinimal,
  };
  // Compute indicator geometry from cached label widths and CSS pill metrics (zero DOM layout reads per frame).
  const draw = useCallback((value: number) => {
    const { count, ultraMinimal } = latest.current;
    if (!count) return;
    const p = Math.max(0, Math.min(count - 1, value));
    shown.current = p;
    const lo = Math.floor(p), hi = Math.min(count - 1, lo + 1), fraction = p - lo;
    const { padLeft, gap, labelWidths } = metrics.current;
    let cursor = padLeft;
    let loLeft = padLeft, loW = 32, hiLeft = padLeft, hiW = 32;
    for (let i = 0; i < count; i += 1) {
      const weight = Math.max(0, 1 - Math.abs(p - i));
      buttons.current[i]?.style.setProperty('--tab-weight', String(weight));
      const layer = layers.current[i];
      if (layer) layer.style.opacity = i === lo ? '1' : i === hi ? String(fraction) : '0';
      const tabW = ultraMinimal ? 32 : 32 + ((labelWidths[i] ?? 50) + 12) * weight;
      if (i === lo) { loLeft = cursor; loW = tabW; }
      if (i === hi) { hiLeft = cursor; hiW = tabW; }
      cursor += tabW + gap;
    }
    if (!indicator.current) return;
    indicator.current.style.transform = `translate3d(${loLeft + (hiLeft - loLeft) * fraction}px,0,0)`;
    indicator.current.style.width = `${loW + (hiW - loW) * fraction}px`;
  }, []);
  const glide = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const from = shown.current ?? latest.current.index, to = latest.current.index, start = performance.now();
    const step = (now: number) => {
      const p = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : Math.min(1, (now - start) / 200);
      draw(from + (to - from) * (1 - (1 - p) ** 3));
      if (p < 1) frame.current = requestAnimationFrame(step);
      else {
        const strip = nav.current, active = buttons.current[to];
        if (strip && active && strip.clientWidth && strip.scrollWidth > strip.clientWidth) {
          strip.scrollTo({ left: Math.max(0, active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2), behavior: 'instant' });
        }
      }
    };
    frame.current = requestAnimationFrame(step);
  }, [draw]);
  // Batch all layout reads (container padding/gap and label scrollWidths) before writing CSS vars.
  const measureLabels = useCallback(() => {
    const strip = nav.current;
    const cs = strip ? getComputedStyle(strip) : null;
    const rawPad = cs ? parseFloat(cs.paddingLeft) : NaN;
    const rawGap = cs ? parseFloat(cs.columnGap) : NaN;
    const padLeft = Number.isFinite(rawPad) ? rawPad : 4;
    const gap = Number.isFinite(rawGap) ? rawGap : 4;
    const count = latest.current.count;
    const labelWidths: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const label = buttons.current[i]?.querySelector('span');
      labelWidths.push(label ? label.scrollWidth : 50);
    }
    metrics.current = { padLeft, gap, labelWidths };
    for (let i = 0; i < count; i += 1) {
      buttons.current[i]?.style.setProperty('--tab-label-width', `${labelWidths[i]}px`);
    }
  }, []);
  // The label widths only change with the label texts / the Ultra Minimal mode (fonts and resizes are handled by the
  // ResizeObserver below). This used to run after *every* render of Tabs, and `scrollWidth` forces a synchronous layout
  // of the whole document: on a tab change that meant laying out the freshly mounted page inside a layout effect,
  // before the first frame. See docs/performance.md.
  const labelKey = `${settings.ultraMinimal ? 'u' : 'n'}|${items.map((item) => `${item.id}:${item.label}`).join('|')}`;
  useLayoutEffect(() => {
    measureLabels();
  }, [labelKey, measureLabels]);
  // Follow the active tab. This used to have NO dependency list (ran after every render of Tabs and read offsetLeft /
  // offsetWidth through `draw`, a whole-document forced layout). It only has to run when the target tab or the tab
  // geometry changes; page-position changes during a swipe come from `subscribePagePosition` below.
  useLayoutEffect(() => {
    if (getPagePosition() === null) glide();
    else draw(getPagePosition()!);
  }, [labelKey, displayTab, items.length, settings.ultraMinimal, draw, glide]);
  useEffect(() => {
    const unsubscribe = subscribePagePosition(() => {
      const p = getPagePosition();
      cancelAnimationFrame(frame.current);
      if (p === null) glide(); else draw(p);
    });
    const refresh = () => {
      measureLabels();
      draw(shown.current ?? latest.current.index);
    };
    const observer = new ResizeObserver(refresh);
    if (nav.current) observer.observe(nav.current);
    void document.fonts.ready.then(refresh);
    return () => { unsubscribe(); observer.disconnect(); cancelAnimationFrame(frame.current); };
  }, [draw, glide, measureLabels]);
  return (
    <div className="flex items-center justify-center py-1.5">
      <nav ref={nav} className="kc-nav-pill kc-following-pill" aria-label="Primary">
        <span ref={indicator} className="kc-following-indicator" aria-hidden="true">
          {items.map((item, i) => <span key={item.id} ref={(node) => { layers.current[i] = node; }} style={{ background: item.color }} />)}
        </span>
        {items.map(({ id, label, icon: Icon }, i) => (
          <button key={id} ref={(node) => { buttons.current[i] = node; }} type="button"
            className={`kc-following-tab pressable ${settings.ultraMinimal ? 'is-ultra' : ''}`}
            aria-label={label} title={label} aria-current={displayTab === id ? 'page' : undefined}
            onPointerDown={() => preloadTabScreen(id as ActiveTab)}
            onFocus={() => preloadTabScreen(id as ActiveTab)}
            onClick={() => {
              if (activeTab === id) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setPendingTab(id as ActiveTab);
                startTabTransition(() => setActiveTab(id as ActiveTab));
              }
            }}>
            <Icon size={16} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
