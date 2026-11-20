import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Flame, Scale, Utensils, X } from 'lucide-react';
import { SecondaryNutrientCard, SecondaryNutrientRow } from '../common/FoodMacroGrid';
import { useApp } from '../../context/AppContext';
import { PeriodDayInfoModal } from '../period/PeriodDayInfoModal';
import { EditableGrid, type LayoutItem } from '../layout/EditableGrid';
import { LayoutToolbar } from '../layout/LayoutToolbar';
import { useLayoutText } from '../../i18n/layout';
import { useLayout } from '../../utils/layoutStore';
import { PoopIcon } from '../common/PoopIcon';
import { TrackerIcon } from '../common/TrackerIcon';
import { usePersistentState } from '../../utils/usePersistentState';
import {
  calculateBMR,
  calculateMacros,
  calculateTEF,
  calculateTotalActivityCalories,
  calculateTotalCalories,
} from '../../utils/calculations';
import {
  addDaysToDateString,
  formatDateDisplay,
  formatKcal,
  getTodayDateString,
} from '../../utils/formatters';
import { allMealItems } from '../../utils/mealItems';
import { getTrackerValue } from '../../utils/customTrackers';
import { getPeriodStatus, phaseOfDate } from '../../utils/period';
import type { ActivityLog, DayLog, PoopEntry, WaterEntry } from '../../types';

type RangeKey = '7' | '30' | 'custom';

type DaySummary = {
  date: string;
  intake: number;
  bmr: number;
  actExp: number;
  tef: number;
  expenditure: number;
  net: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  salt: number;
  sugar: number;
  activities: ActivityLog[];
  weightKg?: number;
  waterEntries: WaterEntry[];
  poops: PoopEntry[];
  hasLog: boolean;
};

function summarizeDay(date: string, log: DayLog | undefined, bmr: number): DaySummary {
  if (!log) {
    return {
      date, intake: 0, bmr, actExp: 0, tef: 0, expenditure: bmr, net: -bmr,
      carbs: 0, protein: 0, fat: 0, fiber: 0, salt: 0, sugar: 0, activities: [],
      waterEntries: [], poops: [], hasLog: false,
    };
  }
  const items = allMealItems(log.meals);
  const macros = calculateMacros(items);
  const intake = calculateTotalCalories(items);
  const actExp = calculateTotalActivityCalories(log.activities);
  const tef = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams).totalTEF;
  const expenditure = bmr + actExp + tef;
  return {
    date,
    intake,
    bmr,
    actExp,
    tef,
    expenditure,
    net: intake - expenditure,
    carbs: macros.carbsGrams,
    protein: macros.proteinGrams,
    fat: macros.fatGrams,
    fiber: macros.fiberGrams,
    salt: macros.saltGrams,
    sugar: macros.sugarGrams,
    activities: log.activities,
    weightKg: log.weightKg,
    waterEntries: log.waterEntries ?? [],
    poops: log.poops ?? [],
    hasLog:
      items.length > 0 ||
      log.activities.length > 0 ||
      typeof log.weightKg === 'number' ||
      (log.waterEntries ?? []).length > 0 ||
      (log.poops ?? []).length > 0,
  };
}

export const HistoryView: React.FC = () => {
  const { allDayLogs, userProfile, settings, periodData, language, t } = useApp();
  const layoutText = useLayoutText();
  const layoutEnabled = useLayout().enabled;
  const ultraMinimal = settings.ultraMinimal;
  const todayStr = getTodayDateString();
  const bmr = calculateBMR(userProfile);
  const [range, setRange] = useState<RangeKey>('7');
  const [customFrom, setCustomFrom] = useState(addDaysToDateString(todayStr, -6));
  const [customTo, setCustomTo] = useState(todayStr);
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);
  const [selectedWeightIdx, setSelectedWeightIdx] = useState<number | null>(null);
  const [dailyOpen, setDailyOpen] = usePersistentState('kcalsync_stats_daily_open', false);
  const [weightOpen, setWeightOpen] = usePersistentState('kcalsync_stats_weight_open', true);

  const rangeDates = useMemo(() => {
    const dates: string[] = [];
    if (range === 'custom') {
      const from = customFrom <= customTo ? customFrom : customTo;
      const to = customFrom <= customTo ? customTo : customFrom;
      let date = to;
      let guard = 0;
      while (date >= from && guard < 366) {
        dates.push(date);
        date = addDaysToDateString(date, -1);
        guard += 1;
      }
    } else {
      const count = range === '30' ? 30 : 7;
      for (let i = 0; i < count; i += 1) dates.push(addDaysToDateString(todayStr, -i));
    }
    return dates;
  }, [range, customFrom, customTo, todayStr]);

  const period = useMemo(() => {
    const days = rangeDates.map((date) => summarizeDay(date, allDayLogs[date], bmr));
    const loggedDays = days.filter((day) => day.hasLog);
    const count = Math.max(1, loggedDays.length);
    const avg = (fn: (day: DaySummary) => number) =>
      Math.round((loggedDays.reduce((sum, day) => sum + fn(day), 0) / count) * 10) / 10;
    return {
      days,
      total: days.length,
      loggedCount: days.filter((day) =>
        day.hasLog || settings.customButtons.some((tracker) =>
          getTrackerValue(allDayLogs[day.date], tracker) !== undefined
        )
      ).length,
      avgIntake: loggedDays.length ? Math.round(loggedDays.reduce((sum, day) => sum + day.intake, 0) / count) : 0,
      avgExpenditure: loggedDays.length ? Math.round(loggedDays.reduce((sum, day) => sum + day.expenditure, 0) / count) : bmr,
      avgNet: loggedDays.length ? Math.round(loggedDays.reduce((sum, day) => sum + day.net, 0) / count) : -bmr,
      avgCarbs: loggedDays.length ? avg((day) => day.carbs) : 0,
      avgProtein: loggedDays.length ? avg((day) => day.protein) : 0,
      avgFat: loggedDays.length ? avg((day) => day.fat) : 0,
      avgFiber: loggedDays.length ? avg((day) => day.fiber) : 0,
      avgSalt: loggedDays.length ? avg((day) => day.salt) : 0,
      avgSugar: loggedDays.length ? avg((day) => day.sugar) : 0,
      daysWithPoop: days.filter((day) => day.poops.length > 0),
      weightPoints: [...days]
        .reverse()
        .filter((day) => typeof day.weightKg === 'number')
        .map((day) => ({ date: day.date, kg: day.weightKg as number })),
    };
  }, [rangeDates, allDayLogs, bmr, settings.customButtons]);

  const avgScale = Math.max(period.avgIntake, period.avgExpenditure, 1);
  const avgIntakePct = Math.round((period.avgIntake / avgScale) * 100);
  const avgExpPct = Math.round((period.avgExpenditure / avgScale) * 100);
  const avgNetPos = period.avgNet > 0;

  const wp: { date: string | null; kg: number }[] = period.weightPoints.length
    ? period.weightPoints
    : [{ date: null, kg: userProfile.weightKg }];
  const wMin = Math.min(...wp.map((point) => point.kg));
  const wMax = Math.max(...wp.map((point) => point.kg));
  const wDelta = wp.length >= 2 ? Math.round((wp[wp.length - 1].kg - wp[0].kg) * 10) / 10 : 0;
  const wRange = Math.max(0.6, wMax - wMin);
  const wMiddle = (wMin + wMax) / 2;
  const W_SVG = 340;
  const H_SVG = 116;
  const wX = (index: number) => wp.length === 1 ? W_SVG / 2 : 18 + (index / (wp.length - 1)) * (W_SVG - 36);
  const wY = (kg: number) => 60 - ((kg - wMiddle) / wRange) * 76;
  const activeWeightIndex = selectedWeightIdx !== null && wp[selectedWeightIdx] ? selectedWeightIdx : wp.length - 1;
  const activeWeightPt = wp[activeWeightIndex];

  // ---- Advanced layout: every block of the page as a field of the editable grid ----
  const rangeNode = (
    <div className={ultraMinimal ? 'space-y-3' : 'space-y-4'}>
        <div className="flex justify-center">
          <div
            role="group"
            aria-label={t.stats.dateRange}
            className="inline-flex w-fit max-w-full items-center justify-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full"
          >
              {([
              ['7', t.stats.last7],
              ['30', t.stats.last30],
              ['custom', t.stats.customRange],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={range === key}
                  aria-label={label}
                  title={label}
                onClick={() => {
                  setRange(key);
                  setSelectedWeightIdx(null);
                }}
                className={`pressable px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap ${
                  range === key ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {ultraMinimal ? key === 'custom' ? <CalendarDays size={14} /> : key : label}
              </button>
            ))}
          </div>
        </div>

        {range === 'custom' && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 px-1">
            {([
              [t.stats.from, customFrom, setCustomFrom],
              [t.stats.to, customTo, setCustomTo],
            ] as const).map(([label, value, setter]) => (
              <label key={label} className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
                <span className={ultraMinimal ? 'sr-only' : ''}>{label}</span>
                <input
                  type="date"
                  aria-label={label}
                  value={value}
                  onChange={(event) => event.target.value && setter(event.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
                />
              </label>
            ))}
          </div>
        )}

        <div
          className="px-1 text-center text-xs font-bold tabular-nums text-[var(--muted)]"
          aria-label={t.history.daysLogged.replace('{count}', String(period.loggedCount)).replace('{total}', String(period.total))}
        >
          {ultraMinimal ? `${period.loggedCount}/${period.total}` : t.history.daysLogged
            .replace('{count}', String(period.loggedCount))
            .replace('{total}', String(period.total))}
        </div>
    </div>
  );
  const intakeNode = (
          <div role="group" aria-label={t.history.avgIntake} className={`kc-hero-intake bg-intake rounded-3xl ${ultraMinimal ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'}`}>
            <div className="flex items-center justify-between gap-1 min-h-[22px]">
              <span className={`${ultraMinimal ? 'inline-flex items-center gap-1 text-intake-accent' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider text-intake-accent'}`} title={t.history.avgIntake}>
                {ultraMinimal && (
                  <>
                    <Utensils size={14} aria-hidden="true" />
                    <span className="text-[10px] font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded bg-intake-accent/15 text-intake-accent">avg</span>
                  </>
                )}
                <span className={ultraMinimal ? 'sr-only' : ''}>{t.history.avgIntake}</span>
              </span>
              {avgNetPos && (
                <span className="kc-balance-badge px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-intake-accent text-intake-soft">
                  +{formatKcal(period.avgNet)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 my-1 tabular-nums">
              <span className="text-2xl sm:text-3xl font-extrabold text-intake-ink">{formatKcal(period.avgIntake)}</span>
              {!ultraMinimal && <span className="text-xs font-semibold text-intake-accent">kcal</span>}
            </div>
            <div className="kc-hero-track w-full bg-intake-soft h-2.5 rounded-full overflow-hidden mt-3">
              <div className="kc-hero-fill h-full rounded-full bg-intake-accent transition-[width] duration-500" style={{ width: `${period.avgIntake > 0 ? Math.max(5, avgIntakePct) : 0}%` }} />
            </div>
          </div>
  );
  const burnedNode = (
          <div role="group" aria-label={t.history.avgExpenditure} className={`kc-hero-burned bg-activity rounded-3xl ${ultraMinimal ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'}`}>
            <div className="flex items-center justify-between gap-1 min-h-[22px]">
              <span className={`${ultraMinimal ? 'inline-flex items-center gap-1 text-activity-accent' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider text-activity-accent'}`} title={t.history.avgExpenditure}>
                {ultraMinimal && (
                  <>
                    <Flame size={14} aria-hidden="true" />
                    <span className="text-[10px] font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded bg-activity-accent/15 text-activity-accent">avg</span>
                  </>
                )}
                <span className={ultraMinimal ? 'sr-only' : ''}>{t.history.avgExpenditure}</span>
              </span>
              {!avgNetPos && (
                <span className="kc-balance-badge px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-activity-accent text-activity-soft">
                  {period.avgNet === 0 ? '0' : `-${formatKcal(Math.abs(period.avgNet))}`}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 my-1 tabular-nums">
              <span className="text-2xl sm:text-3xl font-extrabold text-activity-ink">{formatKcal(period.avgExpenditure)}</span>
              {!ultraMinimal && <span className="text-xs font-semibold text-activity-accent">kcal</span>}
            </div>
            <div className="kc-hero-track w-full bg-activity-soft h-2.5 rounded-full overflow-hidden mt-3">
              <div className="kc-hero-fill h-full rounded-full bg-activity-accent transition-[width] duration-500" style={{ width: `${Math.max(5, avgExpPct)}%` }} />
            </div>
          </div>
  );
          const macroNodes = ([
            [t.history.avgCarbs, period.avgCarbs, 'kc-macro-carbs bg-[#CFE7FE] text-[#1A4670]', 'text-[#0F3355]'],
            [t.history.avgProtein, period.avgProtein, 'kc-macro-protein bg-[#FAE0B4] text-[#7D4E14]', 'text-[#2D1E0B]'],
            [t.history.avgFat, period.avgFat, 'kc-macro-fat bg-[#E2D6FF] text-[#523A8C]', 'text-[#1F1636]'],
          ] as const).map(([label, value, card, number]) => (
            <div key={label} role="group" aria-label={`${label}: ${value} g`} className={`${card} rounded-3xl ${ultraMinimal ? 'p-2.5' : 'p-3.5'} text-center`}>
              <span className={`${ultraMinimal ? 'sr-only' : 'text-[10px] font-bold uppercase block truncate'}`}>{label}</span>
              <div className={`flex items-baseline justify-center gap-1 ${ultraMinimal ? '' : 'mt-0.5'}`}>
                <span className={`text-lg sm:text-xl font-extrabold ${number}`}>{value}</span>
                <span className={`text-[10px] sm:text-[11px] font-bold ${ultraMinimal ? 'opacity-75' : ''}`}>
                  {ultraMinimal ? '/day' : 'g'}
                </span>
              </div>
            </div>
          ));
  const poopNode = (
          <div className={`kc-themed-card bg-[#FAE0B4] rounded-3xl ${ultraMinimal ? 'p-3' : 'p-4 sm:p-5'}`}>
            <div className="kc-custom-stat-header flex items-center justify-between text-[#7D4E14]">
              {ultraMinimal ? <span className="inline-flex items-center" title={t.poop.poopsInPeriod}><PoopIcon size={15} /><span className="sr-only">{t.poop.poopsInPeriod}</span></span> : <span className="text-sm font-extrabold">{t.poop.poopsInPeriod}</span>}
              <span className="text-sm font-extrabold tabular-nums">
                {t.poop.countOf
                  .replace('{a}', String(period.daysWithPoop.length))
                  .replace('{b}', String(period.total))}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {[...period.days].reverse().map((day) => {
                const pooped = day.poops.length > 0;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setInspectedDate(day.date)}
                    title={formatDateDisplay(day.date, language)}
                    aria-label={formatDateDisplay(day.date, language)}
                    className={`pressable w-9 h-9 rounded-full flex items-center justify-center hover:scale-105 ${
                      pooped ? 'kc-custom-stat-dot-active bg-[#FDF3E0] text-[#8A5A2B]' : 'kc-custom-stat-dot-empty bg-[#FDF3E0]/50 text-[#B89862]'
                    }`}
                  >
                    {pooped ? (
                      <span className="relative flex items-center">
                        <PoopIcon size={16} />
                        {day.poops.length > 1 && <span className="text-[9px] font-extrabold ml-0.5">×{day.poops.length}</span>}
                      </span>
                    ) : <X size={14} />}
                  </button>
                );
              })}
            </div>
          </div>
  );
            const trackerButtons = settings.customButtons.filter((button) => button.showStats !== false);
  const trackerNodes = settings.customButtons.filter((button) => button.showStats !== false).map((button) => {
              const values = period.days.map((day) => ({
                date: day.date,
                value: getTrackerValue(allDayLogs[day.date], button),
              }));
              if (button.type === 'toggle') {
                const doneDays = values.filter((entry) => entry.value === true).length;
                return (
                  <div key={button.id} className={`kc-themed-card bg-[#F7E9AA] rounded-3xl ${ultraMinimal ? 'p-3' : 'p-4 sm:p-5'}`}>
                    <div className="kc-custom-stat-header flex items-center justify-between text-[#6E5B14]">
                      <span className="flex items-center gap-2 text-sm font-extrabold" aria-label={button.name} title={button.name}>
                        <TrackerIcon icon={button.icon} size={15} /> <span className={ultraMinimal ? 'sr-only' : ''}>{button.name}</span>
                      </span>
                      <span className="text-sm font-extrabold tabular-nums">{doneDays}/{period.total}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {[...values].reverse().map((entry) => (
                        <button
                          key={entry.date}
                          type="button"
                          onClick={() => setInspectedDate(entry.date)}
                          title={`${formatDateDisplay(entry.date, language)} — ${entry.value === true ? t.settings.done : t.settings.notDone}`}
                          aria-label={`${formatDateDisplay(entry.date, language)} — ${entry.value === true ? t.settings.done : t.settings.notDone}`}
                          className={`pressable w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold hover:scale-105 ${
                            entry.value === true ? 'kc-custom-stat-dot-active bg-[#C9EFD3] text-[#174A2B]' : 'kc-custom-stat-dot-empty bg-[#FCF4D6]/70 text-[#8A7224]/60'
                          }`}
                        >
                          {entry.value === true ? '✓' : <X size={13} />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              const numbers = values.map((entry) => entry.value).filter((value): value is number => typeof value === 'number' && value > 0);
              const average = numbers.length ? Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 10) / 10 : 0;
              const total = Math.round(numbers.reduce((sum, value) => sum + value, 0) * 10) / 10;
              const max = Math.max(1, ...numbers);
              return (
                <div key={button.id} className={`kc-themed-card bg-[#F7E9AA] rounded-3xl ${ultraMinimal ? 'relative p-3 pb-8' : 'p-4 sm:p-5'}`}>
                  <div className="kc-custom-stat-header flex items-center justify-between gap-2 text-[#6E5B14]">
                    <span className="flex items-center gap-2 text-sm font-extrabold" aria-label={button.name} title={button.name}>
                      <TrackerIcon icon={button.icon} size={15} /> <span className={ultraMinimal ? 'sr-only' : ''}>{button.name}</span>
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block text-sm font-extrabold" aria-label={`${button.name}: ${average}${button.unit ? ` ${button.unit}` : ''} ${t.stats.perDay}`}>
                        {average}{!ultraMinimal && button.unit ? ` ${button.unit}` : ''} {!ultraMinimal && t.stats.perDay}
                      </span>
                      {!ultraMinimal && <span className="kc-custom-stat-sub block text-[11px] font-bold text-[#8A7224]">
                        {total}{button.unit ? ` ${button.unit}` : ''} · {numbers.length}/{period.total}
                      </span>}
                    </span>
                  </div>
                  <div className={`flex items-end gap-1 h-12 ${ultraMinimal ? 'mt-2 mb-1' : 'mt-3'}`}>
                    {[...values].reverse().map((entry) => {
                      const value = typeof entry.value === 'number' ? entry.value : 0;
                      const height = value > 0 ? Math.max(14, Math.round((value / max) * 100)) : 10;
                      return (
                        <button
                          key={entry.date}
                          type="button"
                          onClick={() => setInspectedDate(entry.date)}
                          title={`${formatDateDisplay(entry.date, language)} — ${value > 0 ? `${value}${button.unit ? ` ${button.unit}` : ''}` : '—'}`}
                          aria-label={`${formatDateDisplay(entry.date, language)} — ${value > 0 ? `${value}${button.unit ? ` ${button.unit}` : ''}` : '—'}`}
                          className={`flex-1 rounded-md transition-opacity hover:opacity-80 ${value > 0 ? 'kc-custom-stat-bar-active bg-[#6E5B14]' : 'kc-custom-stat-bar-empty bg-[#FCF4D6]/70'}`}
                          style={{ height: `${height}%` }}
                        />
                      );
                    })}
                  </div>
                  {ultraMinimal && <span className="kc-custom-stat-sub absolute bottom-2 right-3 text-[10px] font-bold text-[#8A7224]">{t.stats.perDay}</span>}
                </div>
              );
            });
  const weightNode = (
<div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setWeightOpen(!weightOpen)}
            aria-expanded={weightOpen}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
              <span className="w-7 h-7 rounded-full bg-transparent text-[var(--weight-on-surface)] flex items-center justify-center shrink-0">
                <Scale size={14} />
              </span>
              <span className={ultraMinimal ? 'sr-only' : ''}>{t.stats.weightTrend}</span>
            </span>
            <span className="flex items-center gap-2 tabular-nums">
              <span className="text-xs font-bold text-[var(--muted)]">
                {wMin === wMax ? wMax.toFixed(1) : `${wMin.toFixed(1)} – ${wMax.toFixed(1)}`} kg
              </span>
              {wp.length >= 2 && wDelta !== 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-weight text-weight-ink">
                  {wDelta > 0 ? `+${wDelta.toFixed(1)}` : wDelta.toFixed(1)}
                </span>
              )}
              <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${weightOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>

          <div className="accordion-grid" data-open={weightOpen} inert={!weightOpen}>
            <div className="accordion-inner">
              <div className="pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs font-bold tabular-nums px-1" aria-live="polite">
                  <span className={`text-[var(--muted)] ${ultraMinimal ? 'sr-only' : ''}`}>
                    {activeWeightPt.date ? formatDateDisplay(activeWeightPt.date, language) : t.stats.profileWeight}
                  </span>
                  <span className="text-[var(--weight-on-surface)] font-extrabold">{activeWeightPt.kg.toFixed(1)} kg</span>
                </div>
                <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} className="w-full h-32 overflow-visible">
                  {periodData.settings.showPhaseBandsInStats && !periodData.settings.trackPill && (() => {
                    const status = getPeriodStatus(periodData);
                    const colors: Record<string, string> = {
                      menstrual: '#F4C6D8', follicular: '#CFE7FE', ovulation: '#C9EFD3', luteal: '#E2D6FF',
                    };
                    return wp.map((point, index) => {
                      if (!point.date) return null;
                      const phase = phaseOfDate(periodData, point.date, status);
                      if (!phase) return null;
                      const x0 = index === 0 ? 4 : (wX(index - 1) + wX(index)) / 2;
                      const x1 = index === wp.length - 1 ? W_SVG - 4 : (wX(index) + wX(index + 1)) / 2;
                      return <rect key={`band-${point.date}`} x={x0} y={4} rx={4} width={Math.max(0, x1 - x0)} height={H_SVG - 8} fill={colors[phase]} opacity={0.35} />;
                    });
                  })()}
                  {[22, 98].map((y) => (
                    <line key={y} x1={8} x2={W_SVG - 8} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  {wp.length > 1 && (
                    <>
                      <polyline points={wp.map((point, index) => `${wX(index)},${wY(point.kg)}`).join(' ')} fill="none" stroke="var(--color-weight)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
                      <polyline points={wp.map((point, index) => `${wX(index)},${wY(point.kg)}`).join(' ')} fill="none" stroke="var(--weight-on-surface)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  )}
                  {wp.map((point, index) => {
                    const selected = activeWeightIndex === index;
                    const label = `${point.date ? formatDateDisplay(point.date, language) : t.stats.profileWeight} · ${point.kg.toFixed(1)} kg`;
                    return (
                      <g
                        key={point.date ?? 'profile'}
                        role="button"
                        aria-label={label}
                        aria-pressed={selected}
                        tabIndex={weightOpen ? 0 : -1}
                        onClick={() => setSelectedWeightIdx(index)}
                        onMouseEnter={() => setSelectedWeightIdx(index)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedWeightIdx(index);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <circle cx={wX(index)} cy={wY(point.kg)} r="12" fill="transparent" />
                        <circle cx={wX(index)} cy={wY(point.kg)} r={selected ? '5.5' : '4'} fill="var(--color-weight)" stroke="var(--color-weight-ink)" strokeWidth={selected ? '2.2' : '1.6'} />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>
  );
  const dailyNode = (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setDailyOpen(!dailyOpen)}
              aria-expanded={dailyOpen}
              aria-label={t.history.last7DaysChart}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              {ultraMinimal ? <CalendarDays size={16} aria-hidden="true" className="text-[var(--muted)]" /> : <h3 className="text-sm font-extrabold text-[var(--text)]">{t.history.last7DaysChart}</h3>}
              <span className="flex items-center gap-2">
                {!ultraMinimal && <span className="hidden sm:inline text-[11px] font-medium text-[var(--muted)]">{t.history.selectDayHint}</span>}
                <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${dailyOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
            <div className="accordion-grid" data-open={dailyOpen} inert={!dailyOpen}>
              <div className="accordion-inner">
                <div className="pt-3 space-y-2.5">
                  {period.days.map((day) => {
                    const maxDayVal = Math.max(day.intake, day.expenditure, 2400);
                    const inWidth = Math.round((day.intake / maxDayVal) * 100);
                    const outWidth = Math.round((day.expenditure / maxDayVal) * 100);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setInspectedDate(day.date)}
                        className="pressable w-full text-left p-3.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-[var(--text)]">
                              {formatDateDisplay(day.date, language)}
                            </span>
                            {!settings.hidePoop && day.poops.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14]" title={t.quickAdd.poop}>
                                <PoopIcon size={12} />
                                {day.poops.length > 1 && <span className="text-[10px] font-extrabold">×{day.poops.length}</span>}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${day.net > 0 ? 'bg-intake text-intake-ink' : 'bg-activity text-activity-ink'}`}>
                              {day.net > 0 ? `+${day.net}` : day.net}{!ultraMinimal && ' kcal'}
                            </span>
                            <ChevronRight size={16} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-0.5 tabular-nums">
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className={`font-bold text-[var(--intake-on-surface)] ${ultraMinimal ? 'inline-flex items-center' : ''}`} title={t.energy.intake}>
                                {ultraMinimal && <Utensils size={12} aria-hidden="true" />}
                                <span className={ultraMinimal ? 'sr-only' : ''}>{t.energy.intake}</span>
                              </span>
                              <span className="font-extrabold text-[var(--text)]">{formatKcal(day.intake)}{!ultraMinimal && ' kcal'}</span>
                            </div>
                            <div className="w-full bg-intake h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-intake-accent rounded-full" style={{ width: `${day.intake > 0 ? Math.max(4, inWidth) : 0}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className={`font-bold text-[var(--activity-on-surface)] ${ultraMinimal ? 'inline-flex items-center' : ''}`} title={t.energy.expenditure}>
                                {ultraMinimal && <Flame size={12} aria-hidden="true" />}
                                <span className={ultraMinimal ? 'sr-only' : ''}>{t.energy.expenditure}</span>
                              </span>
                              <span className="font-extrabold text-[var(--text)]">{formatKcal(day.expenditure)}{!ultraMinimal && ' kcal'}</span>
                            </div>
                            <div className="w-full bg-activity h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-activity-accent rounded-full" style={{ width: `${Math.max(4, outWidth)}%` }} />
                            </div>
                          </div>
                        </div>
                        {settings.trackSugar && (
                          <div data-nutrient="sugar" className="flex items-center justify-between gap-2 rounded-xl bg-nutrient text-nutrient-ink px-2.5 py-1.5 text-[11px] tabular-nums">
                            <span className="font-bold">{t.macros.sugar}</span>
                            <span className="font-extrabold">{day.sugar} g</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
  );

  const names = layoutText.names;
  const items: LayoutItem[] = [
    { id: 'range', label: names.range, node: rangeNode, span: 'col-span-6' },
    { id: 'intake', label: names.avgIntake, node: intakeNode, span: 'col-span-3' },
    { id: 'burned', label: names.avgBurned, node: burnedNode, span: 'col-span-3' },
    ...(['carbs', 'protein', 'fat'] as const).map((id, index): LayoutItem => ({
      id,
      label: t.macros[id],
      node: macroNodes[index],
      span: 'col-span-2',
    })),
    ...(['fiber', 'salt', 'sugar'] as const).map((id): LayoutItem => ({
      id,
      label: t.macros[id],
      node: <SecondaryNutrientCard nutrient={id} value={{ fiber: period.avgFiber, salt: period.avgSalt, sugar: period.avgSugar }[id]} average />,
      span: settings.trackSugar ? 'col-span-2' : 'col-span-3',
      show: id !== 'sugar' || settings.trackSugar,
    })),
    { id: 'poop', label: names.poopStats, node: poopNode, span: 'col-span-6', show: !settings.hidePoop },
    ...trackerButtons.map((button, index): LayoutItem => ({
      id: `tracker:${button.id}`,
      label: button.name,
      node: trackerNodes[index],
      span: 'col-span-6',
    })),
    { id: 'weight', label: names.weight, node: weightNode, span: 'col-span-6' },
    { id: 'daily', label: names.daily, node: dailyNode, span: 'col-span-6', show: range === '7' },
  ];

  return (
    <>
      <div className={ultraMinimal ? 'space-y-3' : 'space-y-4'}>
        {/* Settings > Advanced > Advanced layout: the pencil icon (and, while editing, the toolbar). */}
        <LayoutToolbar page="stats" items={items} />
        {layoutEnabled ? (
          <EditableGrid page="stats" items={items} className={ultraMinimal ? 'gap-y-3 gap-x-2.5' : 'gap-y-4 gap-x-3 sm:gap-x-4'} />
        ) : (
          <>
            {/* Original layout (advanced layout off) */}
            {rangeNode}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">{intakeNode}{burnedNode}</div>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 tabular-nums">{macroNodes}</div>
            <SecondaryNutrientRow fiber={period.avgFiber} salt={period.avgSalt} sugar={period.avgSugar} average />
            {!settings.hidePoop && poopNode}
            {trackerNodes.length > 0 && <div className="space-y-2.5">{trackerNodes}</div>}
            {weightNode}
            {range === '7' && dailyNode}
          </>
        )}
      </div>


      <PeriodDayInfoModal date={inspectedDate} onClose={() => setInspectedDate(null)} />
    </>
  );
};
