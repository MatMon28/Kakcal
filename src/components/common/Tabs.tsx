import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { Flame, UtensilsCrossed, TrendingUp, Droplet, ChevronRight } from 'lucide-react';

export const Tabs: React.FC = () => {
  const { t, activeTab, setActiveTab, settings } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return setCanScroll(false);
    setCanScroll(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
  };
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    checkScroll();
    return () => window.removeEventListener('resize', checkScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    ...(!settings.hidePeriod
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
  ];

  return (
    <div className="flex items-center justify-center pt-2.5 pb-2">
      <div className="relative max-w-full">
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="inline-flex items-center gap-1 p-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-full max-w-full overflow-x-auto no-scrollbar"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              aria-label={item.label}
              className={`flex items-center justify-center rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? `gap-1.5 ${item.activeClass} px-4 sm:px-5 py-2`
                  : 'w-9 h-9 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]/60'
              }`}
            >
              <Icon size={16} />
              {isActive && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>
      {canScroll && (
        <button
          type="button"
          aria-label={t.period.scrollHint}
          onClick={() => scrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] flex items-center justify-center shadow-sm"
        >
          <ChevronRight size={14} />
        </button>
      )}
      </div>
    </div>
  );
};
