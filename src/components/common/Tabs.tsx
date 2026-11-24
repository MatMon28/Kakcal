import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Flame, UtensilsCrossed, TrendingUp, Droplet, BookOpen, PersonStanding } from 'lucide-react';
import { useShell } from '../../context/AppContext';
import type { ActiveTab } from '../../types';
import { isPeriodShown } from '../../utils/tourPreview';
import { useAdvanced } from '../../utils/advancedStore';
import { getPagePosition, subscribePagePosition } from '../../utils/pagePosition';

export function Tabs() {
  // Navigation + settings only: no journal data, so a logged meal does not re-render the tab bar.
  const { t, activeTab, setActiveTab, settings } = useShell();
  const bodyShown = useAdvanced().body.enabled;
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const layers = useRef<(HTMLSpanElement | null)[]>([]);
  const shown = useRef<number | null>(null);
  const frame = useRef(0);
  const items = [
    { id: 'today', label: t.nav.today, icon: Flame, color: '#F6D0D0' },
    { id: 'prebuilt', label: t.nav.prebuilt, icon: UtensilsCrossed, color: '#FAE0B4' },
    ...(isPeriodShown(settings.hidePeriod) ? [{ id: 'period', label: t.nav.period, icon: Droplet, color: '#F4C6D8' }] : []),
    ...(bodyShown ? [{ id: 'body', label: t.nav.body, icon: PersonStanding, color: '#E2D6FF' }] : []),
    { id: 'history', label: t.nav.history, icon: TrendingUp, color: '#CFE7FE' },
    ...(activeTab === 'database' ? [{ id: 'database', label: t.nav.database, icon: BookOpen, color: '#C9EFD3' }] : []),
  ];
  const latest = useRef({ index: 0, count: 0 });
  latest.current = { index: Math.max(0, items.findIndex((item) => item.id === activeTab)), count: items.length };
  const draw = useCallback((value: number) => {
    const p = Math.max(0, Math.min(latest.current.count - 1, value));
    shown.current = p;
    const lo = Math.floor(p), hi = Math.min(latest.current.count - 1, lo + 1), fraction = p - lo;
    buttons.current.forEach((button, i) => {
      button?.style.setProperty('--tab-weight', String(Math.max(0, 1 - Math.abs(p - i))));
      const layer = layers.current[i];
      if (layer) layer.style.opacity = i === lo ? '1' : i === hi ? String(fraction) : '0';
    });
    const a = buttons.current[lo], b = buttons.current[hi];
    if (!a || !b || !indicator.current) return;
    indicator.current.style.transform = `translate3d(${a.offsetLeft + (b.offsetLeft - a.offsetLeft) * fraction}px,0,0)`;
    indicator.current.style.width = `${a.offsetWidth + (b.offsetWidth - a.offsetWidth) * fraction}px`;
  }, []);
  const glide = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const from = shown.current ?? latest.current.index, to = latest.current.index, start = performance.now();
    const step = (now: number) => {
      const p = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : Math.min(1, (now - start) / 260);
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
  // The label widths only change with the label texts / the Ultra Minimal mode (fonts and resizes are handled by the
  // ResizeObserver below). This used to run after *every* render of Tabs, and `scrollWidth` forces a synchronous layout
  // of the whole document: on a tab change that meant laying out the freshly mounted page inside a layout effect,
  // before the first frame. See docs/performance.md.
  const labelKey = `${settings.ultraMinimal ? 'u' : 'n'}|${items.map((item) => item.label).join('|')}`;
  useLayoutEffect(() => {
    buttons.current.forEach((button) => {
      const label = button?.querySelector('span');
      if (button && label) button.style.setProperty('--tab-label-width', `${label.scrollWidth}px`);
    });
  }, [labelKey]);
  // Follow the active tab. This used to have NO dependency list (ran after every render of Tabs and read offsetLeft /
  // offsetWidth through `draw`, a whole-document forced layout). It only has to run when the target tab or the tab
  // geometry changes; page-position changes during a swipe come from `subscribePagePosition` below.
  useLayoutEffect(() => {
    if (getPagePosition() === null) glide();
    else draw(getPagePosition()!);
  }, [labelKey, activeTab, items.length, settings.ultraMinimal, draw, glide]);
  useEffect(() => {
    const unsubscribe = subscribePagePosition(() => {
      const p = getPagePosition();
      cancelAnimationFrame(frame.current);
      if (p === null) glide(); else draw(p);
    });
    const refresh = () => {
      buttons.current.forEach((button) => {
        const label = button?.querySelector('span');
        if (button && label) button.style.setProperty('--tab-label-width', `${label.scrollWidth}px`);
      });
      draw(shown.current ?? latest.current.index);
    };
    const observer = new ResizeObserver(refresh);
    if (nav.current) observer.observe(nav.current);
    void document.fonts.ready.then(refresh);
    return () => { unsubscribe(); observer.disconnect(); cancelAnimationFrame(frame.current); };
  }, [draw, glide]);
  return (
    <div className="flex items-center justify-center py-1.5">
      <nav ref={nav} className="kc-nav-pill kc-following-pill" aria-label="Primary">
        <span ref={indicator} className="kc-following-indicator" aria-hidden="true">
          {items.map((item, i) => <span key={item.id} ref={(node) => { layers.current[i] = node; }} style={{ background: item.color }} />)}
        </span>
        {items.map(({ id, label, icon: Icon }, i) => (
          <button key={id} ref={(node) => { buttons.current[i] = node; }} type="button"
            className={`kc-following-tab pressable ${settings.ultraMinimal ? 'is-ultra' : ''}`}
            aria-label={label} title={label} aria-current={activeTab === id ? 'page' : undefined}
            onClick={() => activeTab === id ? window.scrollTo({ top: 0, behavior: 'smooth' }) : setActiveTab(id as ActiveTab)}>
            <Icon size={16} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
