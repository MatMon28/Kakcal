import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { isPeriodShown } from '../../utils/tourPreview';
import { Flame, UtensilsCrossed, TrendingUp, Droplet, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

export const Tabs: React.FC = () => {
  const { t, activeTab, setActiveTab, settings } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
  };

  useEffect(() => {
    checkScroll();
    // Only pan the tab strip. scrollIntoView can also move the journal underneath a sheet.
    const nav = scrollRef.current;
    const active = activeBtnRef.current;
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      const bounds = nav.getBoundingClientRect(), button = active.getBoundingClientRect();
      const dx = Math.min(0, button.left - bounds.left) + Math.max(0, button.right - bounds.right);
      if (dx) nav.scrollBy({ left: dx, behavior: 'instant' });
    }
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [settings.hidePeriod, activeTab]);

  const navItems = [
    {
      id: 'today' as ActiveTab,
      label: t.nav.today,
      icon: Flame,
      activeClass: 'bg-[#F6D0D0] text-[#6E2326]',
    },
    {
      id: 'prebuilt' as ActiveTab,
      label: t.nav.prebuilt,
      icon: UtensilsCrossed,
      activeClass: 'bg-[#FAE0B4] text-[#6E4412]',
    },
    ...(isPeriodShown(settings.hidePeriod)
      ? [
          {
            id: 'period' as ActiveTab,
            label: t.nav.period,
            icon: Droplet,
            activeClass: 'bg-[#F4C6D8] text-[#6E2440]',
          },
        ]
      : []),
    {
      id: 'history' as ActiveTab,
      label: t.nav.history,
      icon: TrendingUp,
      activeClass: 'bg-[#CFE7FE] text-[#1A4670]',
    },
    ...(activeTab === 'database'
      ? [
          {
            id: 'database' as ActiveTab,
            label: t.nav.database,
            icon: BookOpen,
            activeClass: 'bg-[#C9EFD3] text-[#174A2B]',
          },
        ]
      : []),
  ];

  const handleSelect = (id: ActiveTab) => {
    if (activeTab === id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="flex items-center justify-center pt-1.5 pb-1.5">
      <div className="relative max-w-full">
        <nav
          ref={scrollRef}
          onScroll={checkScroll}
          aria-label="Primary"
          className="kc-nav-pill inline-flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full max-w-full overflow-x-auto no-scrollbar"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                ref={isActive ? activeBtnRef : null}
                type="button"
                onClick={() => handleSelect(item.id)}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`kc-nav-tab pressable flex items-center justify-center rounded-full text-xs sm:text-sm font-bold whitespace-nowrap ${
                  isActive
                    ? settings.ultraMinimal
                      ? `kc-nav-tab-active w-8 h-8 shrink-0 ${item.activeClass}`
                      : `kc-nav-tab-active h-8 gap-1.5 ${item.activeClass} px-3.5 sm:px-4`
                    : 'w-8 h-8 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
                }`}
              >
                <Icon size={16} />
                {isActive && !settings.ultraMinimal && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
        {canScrollLeft && (
          <button
            type="button"
            aria-label={t.period.scrollHint}
            onClick={() => scrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
            className="pressable absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] flex items-center justify-center shadow-sm"
          >
            <ChevronLeft size={14} />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            aria-label={t.period.scrollHint}
            onClick={() => scrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
            className="pressable absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] flex items-center justify-center shadow-sm"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
