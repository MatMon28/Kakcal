import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateDisplay, addDaysToDateString, getTodayDateString } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';

// Day changer for the Today view: prev/next arrows + date pill with calendar popover + back-to-today
export const DayNavigator: React.FC = () => {
  const { language, t, selectedDate, setSelectedDate } = useApp();

  const todayStr = getTodayDateString();
  const isToday = selectedDate === todayStr;

  const [calOpen, setCalOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number(selectedDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(selectedDate.slice(5, 7)) - 1);

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
    setSelectedDate(
      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    );
    setCalOpen(false);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    language === 'it' ? 'it-IT' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => setSelectedDate(addDaysToDateString(selectedDate, -1))}
        className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
        aria-label="Previous day"
      >
        <ChevronLeft size={17} />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={openCalendar}
          className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full px-4 py-2 text-sm font-bold text-[var(--text)] hover:bg-[var(--inset)] transition-colors"
        >
          <Calendar size={15} className="text-[var(--muted)]" />
          <span>{formatDateDisplay(selectedDate, language)}</span>
          <ChevronDown
            size={14}
            className={`text-[var(--muted)] transition-transform ${calOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {calOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCalOpen(false)} />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-8 h-8 rounded-full bg-[var(--inset)] text-[var(--muted)] flex items-center justify-center"
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
                  className="w-8 h-8 rounded-full bg-[var(--inset)] text-[var(--muted)] flex items-center justify-center"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-[var(--muted)] py-1">
                    {d}
                  </span>
                ))}
                {cells.map((day, i) => {
                  if (day === null) return <span key={i} />;
                  const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSel = ds === selectedDate;
                  const isTodayCell = ds === todayStr;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickDay(day)}
                      className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                        isSel
                          ? 'bg-[var(--text)] text-[var(--surface)]'
                          : isTodayCell
                          ? 'bg-[#C9EFD3] text-[#1D5C38]'
                          : 'text-[var(--text)] hover:bg-[var(--inset)]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setSelectedDate(addDaysToDateString(selectedDate, 1))}
        className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
        aria-label="Next day"
      >
        <ChevronRight size={17} />
      </button>

      {!isToday && (
        <button
          type="button"
          onClick={() => setSelectedDate(todayStr)}
          className="px-3.5 py-2 text-xs font-extrabold rounded-full bg-[#C9EFD3] text-[#1D5C38] hover:bg-[#B8E6C4] transition-colors"
        >
          {t.header.today}
        </button>
      )}
    </div>
  );
};
