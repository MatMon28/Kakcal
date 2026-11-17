import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PeriodStatus, pillMarkerFor, PillMarker } from '../../utils/period';
import { addDaysToDateString, formatFullDate, getTodayDateString } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

/** Capsule marker (≥14px) used in calendar cells and the legend. */
export const PillCapsule: React.FC<{ kind: PillMarker; size?: number }> = ({ kind, size = 14 }) => {
  const w = size * 1.6;
  const h = size * 0.85;
  const r = h / 2;
  const accent = '#7C5CBF';
  const common = { width: w, height: h, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': true as const };
  if (kind === 'taken') {
    return (
      <svg {...common}>
        <rect x="0.5" y="0.5" width={w - 1} height={h - 1} rx={r} fill={accent} />
        <path
          d={`M${w * 0.3} ${h * 0.52} l${w * 0.12} ${h * 0.22} l${w * 0.26} -${h * 0.42}`}
          stroke="#fff"
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'break') {
    return (
      <svg {...common}>
        <rect x="0.75" y="0.75" width={w - 1.5} height={h - 1.5} rx={r} fill="none" stroke="#9A93AC" strokeWidth={1.3} />
        <line x1={w * 0.3} y1={h * 0.78} x2={w * 0.7} y2={h * 0.22} stroke="#9A93AC" strokeWidth={1.3} strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'due') {
    return (
      <svg {...common} className="animate-pulse">
        <rect x="0.75" y="0.75" width={w - 1.5} height={h - 1.5} rx={r} fill="none" stroke={accent} strokeWidth={1.5} strokeDasharray="2.5 2" />
      </svg>
    );
  }
  if (kind === 'missed') {
    return (
      <svg {...common}>
        <rect x="0.75" y="0.75" width={w - 1.5} height={h - 1.5} rx={r} fill="none" stroke={accent} strokeWidth={1.4} />
      </svg>
    );
  }
  if (kind === 'future') {
    return (
      <svg {...common} opacity={0.35}>
        <rect x="0.75" y="0.75" width={w - 1.5} height={h - 1.5} rx={r} fill="none" stroke="#9A93AC" strokeWidth={1.2} />
      </svg>
    );
  }
  return null;
};

interface Props {
  selected: string;
  onSelect: (date: string) => void;
  status: PeriodStatus;
}

export const PeriodCalendar: React.FC<Props> = ({ selected, onSelect, status }) => {
  const { t, language, periodData } = useApp();
  const todayStr = getTodayDateString();
  const settings = periodData.settings;
  const pillMode = settings.trackPill;

  const [viewYear, setViewYear] = useState(Number(selected.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(Number(selected.slice(5, 7)) - 1);
  const [legendOpen, setLegendOpen] = useState(false);

  const mondayFirst = language === 'it';
  const locale = language === 'it' ? 'it-IT' : 'en-US';

  const weekdayLabels = useMemo(() => {
    // 2024-01-07 is a Sunday
    const base = new Date(2024, 0, 7);
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 3);
    });
    return mondayFirst ? [...labels.slice(1), labels[0]] : labels;
  }, [locale, mondayFirst]);

  const rawFirst = new Date(viewYear, viewMonth, 1).getDay();
  const firstOffset = mondayFirst ? (rawFirst + 6) % 7 : rawFirst;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const cells: (number | null)[] = [
    ...Array.from({ length: firstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const dateFor = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

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

  // predicted period: whole range (start .. start+duration-1), widened by the variability range if any
  const predictedSet = useMemo(() => {
    const s = new Set<string>();
    if (!status.nextPeriod || pillMode) return s;
    const from = status.nextPeriodRange ? status.nextPeriodRange[0] : status.nextPeriod;
    const to = addDaysToDateString(
      status.nextPeriodRange ? status.nextPeriodRange[1] : status.nextPeriod,
      settings.periodDuration - 1
    );
    let d = from;
    let guard = 0;
    while (d <= to && guard < 60) {
      s.add(d);
      d = addDaysToDateString(d, 1);
      guard++;
    }
    return s;
  }, [status.nextPeriod, status.nextPeriodRange, settings.periodDuration, pillMode]);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="w-10 h-10 rounded-full bg-[var(--inset)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-extrabold text-[var(--text)] capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-10 h-10 rounded-full bg-[var(--inset)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-[var(--muted)] py-1 capitalize">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />;
          const ds = dateFor(day);
          const log = periodData.logs[ds];
          const isSel = ds === selected;
          const isToday = ds === todayStr;
          const logged = Boolean(log?.isPeriod);
          const predicted = predictedSet.has(ds) && !logged;
          const isOvul = !pillMode && status.ovulation === ds;
          const pill = pillMarkerFor(settings, periodData.logs, ds, todayStr);

          const aria: string[] = [formatFullDate(ds, language)];
          if (isToday) aria.push(t.period.ariaToday);
          if (logged) aria.push(t.period.ariaPeriod);
          if (predicted) aria.push(t.period.ariaPredicted);
          if (isOvul) aria.push(t.period.ariaOvulation);
          if (pill === 'taken') aria.push(t.period.ariaPillTaken);
          if (pill === 'missed') aria.push(t.period.ariaPillMissed);
          if (pill === 'break') aria.push(t.period.ariaBreak);

          const cellBg = logged
            ? 'bg-[#F4C6D8]'
            : predicted
            ? 'bg-[#FBE4EE] border border-dashed border-[#E79CBB]'
            : 'bg-transparent hover:bg-[var(--inset)]';
          const selRing = isSel ? 'outline outline-2 outline-[var(--text)] outline-offset-[-2px]' : '';

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(ds)}
              aria-label={aria.join(', ')}
              aria-pressed={isSel}
              className={`relative min-h-[44px] min-w-[44px] w-full rounded-2xl flex flex-col items-center justify-start pt-1 pb-1 gap-0.5 transition-colors ${cellBg} ${selRing}`}
            >
              {/* day number: today = filled dark circle; ovulation = green ring */}
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isToday
                    ? 'bg-[var(--text)] text-[var(--surface)]'
                    : isOvul
                    ? 'ring-2 ring-[#1E5E3A] text-[var(--text)]'
                    : logged
                    ? 'text-[#6E2440]'
                    : 'text-[var(--text)]'
                }`}
              >
                {day}
              </span>
              {/* bottom row: pill marker only (never overlaps the number) */}
              <span className="h-[14px] flex items-center justify-center">
                {pill !== 'none' && <PillCapsule kind={pill} size={14} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-[var(--muted)]"
          aria-expanded={legendOpen}
        >
          <span>{t.period.legend}</span>
          <ChevronDown size={14} className={`transition-transform ${legendOpen ? 'rotate-180' : ''}`} />
        </button>
        {legendOpen && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 text-[11px] font-bold text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-[#F4C6D8]" /> {t.period.legendPeriod}
            </span>
            {!pillMode && (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-md bg-[#FBE4EE] border border-dashed border-[#E79CBB]" />{' '}
                {t.period.legendPredicted}
              </span>
            )}
            {!pillMode && (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full ring-2 ring-[#1E5E3A]" /> {t.period.legendOvulation}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[var(--text)]" /> {t.period.legendToday}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md outline outline-2 outline-[var(--text)] outline-offset-[-2px]" />{' '}
              {t.period.legendSelected}
            </span>
            {pillMode && (
              <>
                <span className="flex items-center gap-1.5">
                  <PillCapsule kind="taken" /> {t.period.legendPillTaken}
                </span>
                <span className="flex items-center gap-1.5">
                  <PillCapsule kind="missed" /> {t.period.legendPillMissed}
                </span>
                <span className="flex items-center gap-1.5">
                  <PillCapsule kind="break" /> {t.period.legendPillBreak}
                </span>
                <span className="flex items-center gap-1.5">
                  <PillCapsule kind="due" /> {t.period.legendPillDue}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
