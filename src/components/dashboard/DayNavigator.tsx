import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { allMealItems } from '../../utils/mealItems';
import { formatDateDisplay, addDaysToDateString, getTodayDateString, dateFormatter } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, CornerUpLeft } from 'lucide-react';

interface DayNavigatorProps {
  onInspectDay?: (date: string) => void;
}

// Day changer for the Today view: prev/next arrows + date pill with calendar popover + back-to-today
export const DayNavigator: React.FC<DayNavigatorProps> = ({ onInspectDay }) => {
  const { language, t, settings, selectedDate, setSelectedDate, allDayLogs } = useApp();

  const todayStr = getTodayDateString();
  const isToday = selectedDate === todayStr;
  const mondayFirst = language === 'it';
  const locale = language === 'it' ? 'it-IT' : 'en-US';
  const dateLabel = formatDateDisplay(selectedDate, language);

  const [calOpen, setCalOpen] = useState(false);

  // Swiping the calendar row does exactly what the arrows beside it do: swipe left = next day,
  // swipe right = previous day (like turning a page). One day per swipe, sensitive on purpose.
  const swipe = useRef<{ id: number; x: number; y: number; time: number; done: boolean } | null>(null);
  const swallowClick = useRef(false);
  const shiftDay = (step: number) => setSelectedDate(addDaysToDateString(selectedDate, step));
  const swipeHandlers = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      swallowClick.current = false;
      if (!event.isPrimary || event.button !== 0 || calOpen) { swipe.current = null; return; }
      swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, done: false };
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const s = swipe.current;
      if (!s || s.done || s.id !== event.pointerId) return;
      const dx = event.clientX - s.x;
      const dy = event.clientY - s.y;
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { swipe.current = null; return; }
      if (Math.abs(dx) < 20 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      s.done = true;
      swallowClick.current = true; // the drag must not also tap the calendar button
      shiftDay(dx < 0 ? 1 : -1);
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      const s = swipe.current;
      swipe.current = null;
      if (!s || s.done || s.id !== event.pointerId) return;
      // A quick, short flick counts too.
      const dx = event.clientX - s.x;
      const dy = event.clientY - s.y;
      const speed = Math.abs(dx) / Math.max(1, event.timeStamp - s.time);
      if (Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy) * 1.5 && speed > 0.3) {
        swallowClick.current = true;
        shiftDay(dx < 0 ? 1 : -1);
      }
    },
    onPointerCancel: () => { swipe.current = null; },
    onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  useEffect(() => {
    if (!calOpen) return;
    document.dispatchEvent(new Event('kc:overlay-open'));
    const dismiss = (event: Event) => { event.preventDefault(); setCalOpen(false); };
    document.addEventListener('kc:back-popover', dismiss);
    document.addEventListener('kc:dismiss-popover', dismiss);
    return () => {
      document.removeEventListener('kc:back-popover', dismiss);
      document.removeEventListener('kc:dismiss-popover', dismiss);
    };
  }, [calOpen]);
  const [viewYear, setViewYear] = useState(() => Number(selectedDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(selectedDate.slice(5, 7)) - 1);

  useEffect(() => {
    if (!calOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [calOpen]);

  // Only needed by the calendar popover: skip the Intl work on the Today page's first paint.
  const weekdayLabels = useMemo(() => {
    if (!calOpen) return [];
    const narrow = dateFormatter(locale, { weekday: 'narrow' });
    const base = new Date(2024, 0, 7); // Sunday
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return narrow.format(d).toUpperCase();
    });
    return mondayFirst ? [...labels.slice(1), labels[0]] : labels;
  }, [locale, mondayFirst, calOpen]);

  const dayHasData = (ds: string) => {
    const log = allDayLogs[ds];
    if (!log) return false;
    return (
      allMealItems(log.meals).length > 0 ||
      log.activities.length > 0 ||
      typeof log.weightKg === 'number' ||
      (log.waterEntries || []).length > 0 ||
      (log.poops || []).length > 0 ||
      Object.keys(log.custom ?? {}).length > 0 ||
      Object.values(log.customEntries ?? {}).some((entries) => entries.length > 0)
    );
  };

  const openCalendar = () => {
    setViewYear(Number(selectedDate.slice(0, 4)));
    setViewMonth(Number(selectedDate.slice(5, 7)) - 1);
    setCalOpen((v) => !v);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const pickDay = (day: number) => {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(ds);
    setCalOpen(false);
    onInspectDay?.(ds);
  };

  const rawFirst = new Date(viewYear, viewMonth, 1).getDay();
  const firstDay = mondayFirst ? (rawFirst + 6) % 7 : rawFirst;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = calOpen
    ? dateFormatter(locale, { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1))
    : '';

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap touch-pan-y select-none" data-no-swipe data-day-swipe {...swipeHandlers}>
      <button
        type="button"
        onClick={() => setSelectedDate(addDaysToDateString(selectedDate, -1))}
        className="pressable w-9 h-9 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
        aria-label="Previous day"
      >
        <ChevronLeft size={17} />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={openCalendar}
          aria-expanded={calOpen}
          title={dateLabel}
          aria-label={`${t.stats.dateRange}: ${dateLabel}`}
          className={`pressable flex items-center gap-1.5 bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] rounded-full font-bold text-[var(--text)] ${
            settings.ultraMinimal
              ? isToday
                ? 'w-9 h-9 p-0 justify-center text-sm'
                : 'px-2.5 h-9 justify-center text-xs tabular-nums'
              : 'px-4 py-2 text-sm'
          }`}
        >
          <Calendar size={15} className="text-[var(--muted)] shrink-0" />
          {settings.ultraMinimal ? (
            !isToday ? (
              <span>{`${selectedDate.slice(8, 10)}/${selectedDate.slice(5, 7)}`}</span>
            ) : (
              <span className="sr-only">{dateLabel}</span>
            )
          ) : (
            <span>{dateLabel}</span>
          )}
          {!settings.ultraMinimal && (
            <ChevronDown
              size={14}
              className={`text-[var(--muted)] transition-transform duration-200 ${calOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {calOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCalOpen(false)} />
            <div className="anim-pop absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 shadow-xl shadow-black/15">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="pressable w-8 h-8 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-extrabold text-[var(--text)] capitalize">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="pressable w-8 h-8 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayLabels.map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-[var(--muted)] py-1">
                    {d}
                  </span>
                ))}
                {cells.map((day, i) => {
                  if (day === null) return <span key={i} />;
                  const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSel = ds === selectedDate;
                  const isTodayCell = ds === todayStr;
                  const logged = dayHasData(ds);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickDay(day)}
                      className={`pressable relative w-9 h-9 rounded-full text-xs font-bold tabular-nums flex items-center justify-center ${
                        isSel
                          ? 'bg-[var(--text)] text-[var(--on-text)]'
                          : isTodayCell
                          ? 'bg-[#C9EFD3] text-[#1D5C38]'
                          : 'text-[var(--text)] hover:bg-[var(--inset)]'
                      }`}
                    >
                      {day}
                      {logged && (
                        <span
                          className={`absolute bottom-1 w-1 h-1 rounded-full ${
                            isSel
                              ? 'bg-[var(--surface)]'
                              : isTodayCell
                              ? 'bg-[#1D5C38]'
                              : 'bg-[var(--muted)]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {!isToday && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(todayStr);
                    setCalOpen(false);
                  }}
                  className={`pressable rounded-full bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183B5E] border border-[#A9CFF5] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 ${settings.ultraMinimal ? 'mt-3 size-9 p-0' : 'mt-3 w-full py-2'}`}
                  title={t.header.todayReturn}
                  aria-label={t.header.todayReturn}
                >
                  <CornerUpLeft size={13} strokeWidth={2.6} />
                  <span className={settings.ultraMinimal ? 'sr-only' : ''}>{t.header.today}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setSelectedDate(addDaysToDateString(selectedDate, 1))}
        className="pressable w-9 h-9 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
        aria-label="Next day"
      >
        <ChevronRight size={17} />
      </button>

      {!isToday && (
        <button
          type="button"
          onClick={() => setSelectedDate(todayStr)}
          title={t.header.todayReturn}
          aria-label={t.header.todayReturn}
          className={`pressable rounded-full bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183B5E] border border-[#A9CFF5] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 h-9 ${settings.ultraMinimal ? 'w-9 px-0' : 'px-3.5'}`}
        >
          <CornerUpLeft size={14} strokeWidth={2.6} />
          <span className={settings.ultraMinimal ? 'sr-only' : ''}>{t.header.today}</span>
        </button>
      )}
    </div>
  );
};
