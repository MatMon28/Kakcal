import React, { useRef, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
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
  formatFullDate,
  formatKcal,
  getTodayDateString,
} from '../../utils/formatters';
import { MealSlotCard } from '../dashboard/MealSlotCard';
import { CustomButtonsCard } from '../dashboard/CustomButtonsCard';
import { getTrackerValue } from '../../utils/customTrackers';
import { PoopIcon } from '../common/PoopIcon';
import { usePersistentState } from '../../utils/usePersistentState';
import { BristolIcon } from '../common/BristolIcon';
import { getPeriodStatus, phaseOfDate } from '../../utils/period';
import { TrackerIcon } from '../common/TrackerIcon';
import type { ActivityLog as ActivityLogType, MealSlotId, PoopEntry, PoopSize, WaterEntry } from '../../types';
import {
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  Droplets,
  Scale,
  ChevronsDownUp,
  ChevronsUpDown,
  ChevronDown,
  X,
} from 'lucide-react';

type RangeKey = '7' | '30' | 'custom';

const MEAL_SLOTS: MealSlotId[] = [
  'breakfast',
  'mid_morning',
  'lunch',
  'midday_snack',
  'dinner',
  'extra',
];

export const HistoryView: React.FC = () => {
  const {
    allDayLogs,
    setSelectedDate,
    userProfile,
    exportDataJson,
    importDataJson,
    removeActivity,
    removeWaterEntry,
    removePoop,
    setIsAddFoodOpen,
    setIsLogActivityOpen,
    setIsWaterOpen,
    setIsPoopOpen,
    setIsWeightOpen,
    settings,
    periodData,
    language,
    t,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);
  const [selectedWeightIdx, setSelectedWeightIdx] = useState<number | null>(null);

  const todayStr = getTodayDateString();
  const bmr = calculateBMR(userProfile);

  const [range, setRange] = useState<RangeKey>('7');
  const [customFrom, setCustomFrom] = useState(addDaysToDateString(todayStr, -6));
  const [customTo, setCustomTo] = useState(todayStr);

  // Persisted collapse states
  const [openSlots, setOpenSlots] = usePersistentState<MealSlotId[]>('kcak_day_meals_open', []);
  const [dailyOpen, setDailyOpen] = usePersistentState('kcalsync_stats_daily_open', false);
  const [weightOpen, setWeightOpen] = usePersistentState('kcalsync_stats_weight_open', true);

  const allOpen = openSlots.length === MEAL_SLOTS.length;
  const toggleSlot = (slot: MealSlotId) =>
    setOpenSlots((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  const getDaySummary = (date: string) => {
    const log = allDayLogs[date];
    if (!log) {
      return {
        date,
        intake: 0,
        bmr,
        actExp: 0,
        tef: 0,
        expenditure: bmr,
        net: -bmr,
        carbs: 0,
        protein: 0,
        fat: 0,
        fiber: 0,
        salt: 0,
        carbsPct: 0,
        proteinPct: 0,
        fatPct: 0,
        activities: [] as ActivityLogType[],
        weightKg: undefined as number | undefined,
        waterEntries: [] as WaterEntry[],
        waterMl: 0,
        poops: [] as PoopEntry[],
        hasLog: false,
      };
    }

    const allItems = [
      ...log.meals.breakfast,
      ...log.meals.mid_morning,
      ...log.meals.lunch,
      ...log.meals.midday_snack,
      ...log.meals.dinner,
      ...log.meals.extra,
    ];
    const intake = calculateTotalCalories(allItems);
    const macros = calculateMacros(allItems);
    const actExp = calculateTotalActivityCalories(log.activities);
    const tef = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams).totalTEF;
    const totalExp = bmr + actExp + tef;

    return {
      date,
      intake,
      bmr,
      actExp,
      tef,
      expenditure: totalExp,
      net: intake - totalExp,
      carbs: macros.carbsGrams,
      protein: macros.proteinGrams,
      fat: macros.fatGrams,
      fiber: macros.fiberGrams,
      salt: macros.saltGrams,
      carbsPct: macros.carbsPercent,
      proteinPct: macros.proteinPercent,
      fatPct: macros.fatPercent,
      activities: log.activities,
      weightKg: log.weightKg,
      waterMl: (log.waterEntries || []).reduce((a, w) => a + w.ml, 0),
      waterEntries: log.waterEntries || [],
      poops: log.poops || [],
      hasLog:
        allItems.length > 0 ||
        log.activities.length > 0 ||
        typeof log.weightKg === 'number' ||
        (log.waterEntries || []).length > 0 ||
        (log.poops || []).length > 0,
    };
  };

  const rangeDates = useMemo(() => {
    const dates: string[] = [];
    if (range === 'custom') {
      const from = customFrom <= customTo ? customFrom : customTo;
      const to = customFrom <= customTo ? customTo : customFrom;
      let d = to;
      let guard = 0;
      while (d >= from && guard < 366) {
        dates.push(d);
        d = addDaysToDateString(d, -1);
        guard++;
      }
    } else {
      const n = range === '30' ? 30 : 7;
      for (let i = 0; i < n; i++) dates.push(addDaysToDateString(todayStr, -i));
    }
    return dates;
  }, [range, customFrom, customTo, todayStr]);

  const period = useMemo(() => {
    const days = rangeDates.map(getDaySummary);
    const loggedDays = days.filter((d) => d.hasLog);
    const count = Math.max(1, loggedDays.length);

    const avg = (fn: (d: (typeof days)[number]) => number) =>
      Math.round((loggedDays.reduce((a, d) => a + fn(d), 0) / count) * 10) / 10;

    const weightPoints = [...days]
      .reverse()
      .filter((d) => typeof d.weightKg === 'number')
      .map((d) => ({ date: d.date, kg: d.weightKg as number }));

    const daysWithPoop = days.filter((d) => d.poops.length > 0);

    return {
      days,
      loggedCount: days.filter((day) => day.hasLog || settings.customButtons.some((tracker) =>
        getTrackerValue(allDayLogs[day.date], tracker) !== undefined
      )).length,
      total: days.length,
      avgIntake: loggedDays.length ? Math.round(loggedDays.reduce((a, d) => a + d.intake, 0) / count) : 0,
      avgExpenditure: loggedDays.length ? Math.round(loggedDays.reduce((a, d) => a + d.expenditure, 0) / count) : bmr,
      avgNet: loggedDays.length ? Math.round(loggedDays.reduce((a, d) => a + d.net, 0) / count) : -bmr,
      avgCarbs: loggedDays.length ? avg((d) => d.carbs) : 0,
      avgProtein: loggedDays.length ? avg((d) => d.protein) : 0,
      avgFat: loggedDays.length ? avg((d) => d.fat) : 0,
      avgFiber: loggedDays.length ? avg((d) => d.fiber) : 0,
      avgSalt: loggedDays.length ? avg((d) => d.salt) : 0,
      weightPoints,
      daysWithPoop,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDates, allDayLogs, userProfile, settings.customButtons]);

  const handleExport = () => {
    const json = exportDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kakcalculator_backup_${todayStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importDataJson(content);
        setImportMessage(
          ok ? { text: t.history.importSuccess, isError: false } : { text: t.history.importError, isError: true }
        );
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openDayInspector = (date: string) => {
    setSelectedDate(date);
    setInspectedDate(date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stepInspectedDay = (delta: number) => {
    if (!inspectedDate) return;
    const next = addDaysToDateString(inspectedDate, delta);
    setSelectedDate(next);
    setInspectedDate(next);
  };

  const sizeLabel = (size: PoopSize) => {
    switch (size) {
      case 'very_little':
        return t.poop.veryLittle;
      case 'little':
        return t.poop.little;
      case 'normal':
        return t.poop.normal;
      case 'a_lot':
        return t.poop.aLot;
      case 'huge':
        return t.poop.huge;
    }
  };

  // ==================== DAY INSPECTOR ====================
  if (inspectedDate) {
    const dayStats = getDaySummary(inspectedDate);
    const scale = Math.max(dayStats.intake, dayStats.expenditure, 1);
    const intakePct = Math.round((dayStats.intake / scale) * 100);
    const expPct = Math.round((dayStats.expenditure / scale) * 100);
    const netPos = dayStats.net > 0;

    return (
      <div className="space-y-3.5 anim-page">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setInspectedDate(null)}
              className="pressable inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              <span>{t.history.backToStats}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepInspectedDay(-1)}
                className="pressable w-8 h-8 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center shrink-0"
                aria-label="Previous day"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm sm:text-lg font-extrabold text-[var(--text)] capitalize px-1">
                {formatFullDate(inspectedDate, language)}
              </h2>
              <button
                type="button"
                onClick={() => stepInspectedDay(1)}
                className="pressable w-8 h-8 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center shrink-0"
                aria-label="Next day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(inspectedDate);
                setIsAddFoodOpen(true);
              }}
              className="pressable px-3.5 py-2 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>{t.quickAdd.food}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(inspectedDate);
                setIsLogActivityOpen(true);
              }}
              className="pressable px-3.5 py-2 rounded-full bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold text-xs flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>{t.quickAdd.movement}</span>
            </button>
          </div>
        </div>

        {/* Intake & Burned (consistent net pill placement) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-[#F6D0D0] rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-1 min-h-[22px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C3A3A]">
                {t.energy.intake}
              </span>
              {netPos && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-[#8A2D2D] text-[#FFE9E9]">
                  +{formatKcal(dayStats.net)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 my-1 tabular-nums">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2B1818]">
                {formatKcal(dayStats.intake)}
              </span>
              <span className="text-xs font-semibold text-[#8C3A3A]">kcal</span>
            </div>
            <div className="w-full bg-[#FAEBEB] h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-[#8A2D2D] transition-[width] duration-300"
                style={{ width: `${dayStats.intake > 0 ? Math.max(5, intakePct) : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-[#C9EFD3] rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-1 min-h-[22px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#25633E]">
                {t.energy.expenditure}
              </span>
              {!netPos && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-[#1E5E3A] text-[#EDFFF2]">
                  {dayStats.net === 0 ? '0' : `-${formatKcal(Math.abs(dayStats.net))}`}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 my-1 tabular-nums">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#142E1F]">
                {formatKcal(dayStats.expenditure)}
              </span>
              <span className="text-xs font-semibold text-[#25633E]">kcal</span>
            </div>
            <div className="w-full bg-[#E6F8EB] h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-[#1E5E3A] transition-[width] duration-300"
                style={{ width: `${Math.max(5, expPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Macros + Fiber/Salt */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 tabular-nums">
          <div className="bg-[#FAE0B4] rounded-3xl p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-[#8A5617] block">{t.macros.carbs}</span>
            <span className="text-lg font-extrabold text-[#2D1E0B] block">{dayStats.carbs}g</span>
            <span className="text-[11px] font-bold text-[#8A5617]">{dayStats.carbsPct}%</span>
          </div>
          <div className="bg-[#F6D0D0] rounded-3xl p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-[#8C3A3A] block">{t.macros.protein}</span>
            <span className="text-lg font-extrabold text-[#2B1818] block">{dayStats.protein}g</span>
            <span className="text-[11px] font-bold text-[#8C3A3A]">{dayStats.proteinPct}%</span>
          </div>
          <div className="bg-[#E2D6FF] rounded-3xl p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-[#523A8C] block">{t.macros.fat}</span>
            <span className="text-lg font-extrabold text-[#1F1636] block">{dayStats.fat}g</span>
            <span className="text-[11px] font-bold text-[#523A8C]">{dayStats.fatPct}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 tabular-nums">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-[var(--muted)]">{t.macros.fiber}</span>
            <span className="text-base font-extrabold text-[var(--text)]">
              {dayStats.fiber}
              <span className="text-xs font-semibold text-[var(--muted)] ml-0.5">g</span>
            </span>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-[var(--muted)]">{t.macros.salt}</span>
            <span className="text-base font-extrabold text-[var(--text)]">
              {dayStats.salt}
              <span className="text-xs font-semibold text-[var(--muted)] ml-0.5">g</span>
            </span>
          </div>
        </div>

        {/* Collapsible meal slots */}
        <div className="flex items-center justify-end px-1">
          <button
            type="button"
            onClick={() => setOpenSlots(allOpen ? [] : [...MEAL_SLOTS])}
            className="pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
          >
            {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
            <span>{allOpen ? t.mealSlots.collapseAll : t.mealSlots.expandAll}</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
          {MEAL_SLOTS.map((slotId) => (
            <MealSlotCard
              key={slotId}
              slotId={slotId}
              dateOverride={inspectedDate}
              open={openSlots.includes(slotId)}
              onToggle={() => toggleSlot(slotId)}
            />
          ))}
        </div>

        {/* Movement */}
        <div className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-[#4D3582]">{t.activities.title}</h4>
              <p className="text-xs font-medium tabular-nums text-[#6E5BA8] mt-0.5">
                {t.energy.bmrShort} {dayStats.bmr} · {t.energy.activitiesShort} {dayStats.actExp} · {t.energy.tefShort} {dayStats.tef}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(inspectedDate);
                setIsLogActivityOpen(true);
              }}
              className="pressable w-9 h-9 rounded-full bg-[#FBF8F2] hover:bg-white text-[#4D3582] flex items-center justify-center shrink-0"
              aria-label={t.activities.logActivity}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
          {dayStats.activities.length > 0 && (
            <div className="space-y-2">
              {dayStats.activities.map((act) => {
                const detail =
                  act.method === 'distance' && act.distanceKm !== undefined
                    ? `${act.distanceKm} ${t.activities.km}`
                    : act.durationMin !== undefined
                    ? `${act.durationMin} ${t.activities.min}`
                    : '';
                return (
                  <div
                    key={act.id}
                    className="px-3.5 py-2.5 rounded-2xl bg-[#F0E9FF] flex items-center justify-between gap-3"
                  >
                    <div className="text-xs sm:text-sm min-w-0">
                      <span className="font-bold text-[#4D3582]">
                        {act.type === 'custom'
                          ? act.customName || t.activities.custom
                          : act.type === 'walking'
                          ? t.activities.walking
                          : t.activities.running}
                      </span>
                      {(detail || act.notes) && (
                        <span className="text-[#6E5BA8] ml-2 font-medium tabular-nums">
                          {detail}
                          {detail && act.notes ? ' · ' : ''}
                          {act.notes || ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs sm:text-sm font-extrabold tabular-nums text-[#4D3582]">
                        -{act.caloriesBurned} kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => removeActivity(act.id, inspectedDate)}
                        className="pressable w-8 h-8 rounded-full text-[#6E5BA8] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                        aria-label={t.common.delete}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weight */}
        <div className="bg-[#F6D0D0] rounded-3xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FBE9E9] text-[#7A2727] flex items-center justify-center">
              <Scale size={18} />
            </div>
            <div>
              <span className="text-sm font-extrabold text-[#7A2727] block">{t.quickAdd.weight}</span>
              <span className="text-xs font-medium tabular-nums text-[#9D5353]">
                {typeof dayStats.weightKg === 'number' ? `${dayStats.weightKg} kg` : '—'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(inspectedDate);
              setIsWeightOpen(true);
            }}
            className="pressable w-9 h-9 rounded-full bg-[#FBF8F2] hover:bg-white text-[#7A2727] flex items-center justify-center"
            aria-label={t.weight.title}
          >
            <Plus size={17} strokeWidth={2.5} />
          </button>
        </div>

        {/* Water */}
        <div className="bg-[#CFE7FE] rounded-3xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E8F3FF] text-[#183B5E] flex items-center justify-center">
                <Droplets size={18} />
              </div>
              <div>
                <span className="text-sm font-extrabold text-[#183B5E] block">{t.quickAdd.water}</span>
                <span className="text-xs font-medium tabular-nums text-[#436B94]">{dayStats.waterMl} ml</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(inspectedDate);
                setIsWaterOpen(true);
              }}
              className="pressable w-9 h-9 rounded-full bg-[#FBF8F2] hover:bg-white text-[#183B5E] flex items-center justify-center"
              aria-label={t.water.add}
            >
              <Plus size={17} strokeWidth={2.5} />
            </button>
          </div>
          {dayStats.waterEntries.length > 0 && (
            <div className="space-y-1.5">
              {dayStats.waterEntries.map((w) => (
                <div
                  key={w.id}
                  className="px-3.5 py-2 rounded-2xl bg-[#E8F3FF] flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2 text-xs sm:text-sm tabular-nums">
                    <Droplets size={13} className="text-[#2E7CC4]" />
                    <span className="font-bold text-[#183B5E]">{w.ml} ml</span>
                    <span className="text-[#436B94] font-medium">
                      {new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeWaterEntry(w.id, inspectedDate)}
                    className="pressable w-8 h-8 rounded-full text-[#436B94] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Poop */}
        {!settings.hidePoop && (
          <div className="bg-[#FAE0B4] rounded-3xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FDF3E0] text-[#8A5A2B] flex items-center justify-center">
                  <PoopIcon size={19} />
                </div>
                <span className="text-sm font-extrabold tabular-nums text-[#7D4E14]">
                  {t.quickAdd.poop} · {dayStats.poops.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(inspectedDate);
                  setIsPoopOpen(true);
                }}
                className="pressable w-9 h-9 rounded-full bg-[#FBF8F2] hover:bg-white text-[#7D4E14] flex items-center justify-center"
                aria-label={t.poop.addPoop}
              >
                <Plus size={17} strokeWidth={2.5} />
              </button>
            </div>
            {dayStats.poops.length > 0 && (
              <div className="space-y-1.5">
                {dayStats.poops.map((p) => (
                  <div
                    key={p.id}
                    className="px-3.5 py-2 rounded-2xl bg-[#FDF3E0] flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 text-xs sm:text-sm min-w-0 flex-1">
                      <PoopIcon size={15} className="text-[#8A5A2B] shrink-0" />
                      <span className="font-bold text-[#7D4E14] shrink-0">{sizeLabel(p.size)}</span>
                      {p.bristol && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14] text-[10px] font-extrabold shrink-0">
                          <BristolIcon type={p.bristol} size={13} className="text-[#7D4E14]" />
                          B{p.bristol}
                        </span>
                      )}
                      {p.description && (
                        <span className="text-[#9B6E32] font-medium truncate">{p.description}</span>
                      )}
                      <span className="text-[#9B6E32] font-medium tabular-nums shrink-0 ml-auto">
                        {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removePoop(p.id, inspectedDate)}
                      className="pressable w-8 h-8 shrink-0 rounded-full text-[#9B6E32] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                      aria-label={t.common.delete}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <CustomButtonsCard />
      </div>
    );
  }

  // ==================== STATISTICS OVERVIEW ====================
  const avgScale = Math.max(period.avgIntake, period.avgExpenditure, 1);
  const avgIntakePct = Math.round((period.avgIntake / avgScale) * 100);
  const avgExpPct = Math.round((period.avgExpenditure / avgScale) * 100);
  const avgNetPos = period.avgNet > 0;

  // The profile point is a visual fallback, not a synthetic weigh-in stored in the journal.
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
  const wX = (i: number) => wp.length === 1 ? W_SVG / 2 : 18 + (i / (wp.length - 1)) * (W_SVG - 36);
  const wY = (kg: number) => 60 - ((kg - wMiddle) / wRange) * 76;
  const activeWeightIndex = selectedWeightIdx !== null && wp[selectedWeightIdx] ? selectedWeightIdx : wp.length - 1;
  const activeWeightPt = wp[activeWeightIndex];

  return (
    <div className="space-y-4">
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
              onClick={() => {
                setRange(key);
                setSelectedWeightIdx(null);
              }}
              className={`pressable px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap ${
                range === key ? 'bg-[var(--text)] text-[var(--surface)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {range === 'custom' && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 px-1">
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            {t.stats.from}
            <input
              type="date"
              value={customFrom}
              onChange={(e) => e.target.value && setCustomFrom(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            {t.stats.to}
            <input
              type="date"
              value={customTo}
              onChange={(e) => e.target.value && setCustomTo(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
            />
          </label>
        </div>
      )}

      <div className="px-1 text-center text-xs font-bold tabular-nums text-[var(--muted)]">
        {t.history.daysLogged
          .replace('{count}', String(period.loggedCount))
          .replace('{total}', String(period.total))}
      </div>

      {/* Avg Intake & Burned (consistent surplus/deficit pill) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[#F6D0D0] rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-1 min-h-[22px]">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8C3A3A]">
              {t.history.avgIntake}
            </span>
            {avgNetPos && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-[#8A2D2D] text-[#FFE9E9]">
                +{formatKcal(period.avgNet)}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 my-1 tabular-nums">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#2B1818]">
              {formatKcal(period.avgIntake)}
            </span>
            <span className="text-xs font-semibold text-[#8C3A3A]">kcal</span>
          </div>
          <div className="w-full bg-[#FAEBEB] h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-[#8A2D2D] transition-[width] duration-500"
              style={{ width: `${period.avgIntake > 0 ? Math.max(5, avgIntakePct) : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-[#C9EFD3] rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-1 min-h-[22px]">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#25633E]">
              {t.history.avgExpenditure}
            </span>
            {!avgNetPos && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-[#1E5E3A] text-[#EDFFF2]">
                {period.avgNet === 0 ? '0' : `-${formatKcal(Math.abs(period.avgNet))}`}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 my-1 tabular-nums">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#142E1F]">
              {formatKcal(period.avgExpenditure)}
            </span>
            <span className="text-xs font-semibold text-[#25633E]">kcal</span>
          </div>
          <div className="w-full bg-[#E6F8EB] h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-[#1E5E3A] transition-[width] duration-500"
              style={{ width: `${Math.max(5, avgExpPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Macro averages (Carbs / Protein / Fat) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 tabular-nums">
        <div className="bg-[#FAE0B4] rounded-3xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase text-[#8A5617] block truncate">{t.history.avgCarbs}</span>
          <span className="text-lg sm:text-xl font-extrabold text-[#2D1E0B] mt-0.5 block">{period.avgCarbs}g</span>
        </div>
        <div className="bg-[#F6D0D0] rounded-3xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase text-[#8C3A3A] block truncate">{t.history.avgProtein}</span>
          <span className="text-lg sm:text-xl font-extrabold text-[#2B1818] mt-0.5 block">{period.avgProtein}g</span>
        </div>
        <div className="bg-[#E2D6FF] rounded-3xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase text-[#523A8C] block truncate">{t.history.avgFat}</span>
          <span className="text-lg sm:text-xl font-extrabold text-[#1F1636] mt-0.5 block">{period.avgFat}g</span>
        </div>
      </div>

      {/* Fiber & Salt — same position/layout as the daily overview */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 tabular-nums">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-[var(--muted)]">
            {t.stats.avgFiber}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base sm:text-lg font-extrabold text-[var(--text)]">
              {period.avgFiber}
            </span>
            <span className="text-xs font-semibold text-[var(--muted)]">g</span>
          </div>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-[var(--muted)]">
            {t.stats.avgSalt}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base sm:text-lg font-extrabold text-[var(--text)]">
              {period.avgSalt}
            </span>
            <span className="text-xs font-semibold text-[var(--muted)]">g</span>
          </div>
        </div>
      </div>

      {/* Poop count (above weight graph) — "3/7" style, no icon next to label */}
      {!settings.hidePoop && (
        <div className="bg-[#FAE0B4] rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-[#7D4E14]">
              {t.poop.poopsInPeriod}
            </span>
            <span className="text-sm font-extrabold tabular-nums text-[#7D4E14]">
              {t.poop.countOf
                .replace('{a}', String(period.daysWithPoop.length))
                .replace('{b}', String(period.total))}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[...period.days].reverse().map((d) => {
              const pooped = d.poops.length > 0;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => openDayInspector(d.date)}
                  title={formatDateDisplay(d.date, language)}
                  aria-label={formatDateDisplay(d.date, language)}
                  className={`pressable w-9 h-9 rounded-full flex items-center justify-center hover:scale-105 ${
                    pooped
                      ? 'bg-[#FDF3E0] text-[#8A5A2B]'
                      : 'bg-[#FDF3E0]/50 text-[#B89862]'
                  }`}
                >
                  {pooped ? (
                    <span className="relative flex items-center">
                      <PoopIcon size={16} />
                      {d.poops.length > 1 && (
                        <span className="text-[9px] font-extrabold ml-0.5">×{d.poops.length}</span>
                      )}
                    </span>
                  ) : (
                    <X size={14} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Weight progression — collapsible (persisted), crisp proportions & interactive points */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setWeightOpen(!weightOpen)}
          aria-expanded={weightOpen}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
            <span className="w-7 h-7 rounded-full bg-[#F6D0D0] text-[#7A2727] flex items-center justify-center shrink-0">
              <Scale size={14} />
            </span>
            {t.stats.weightTrend}
          </span>
          <span className="flex items-center gap-2 tabular-nums">
            {wp.length > 0 && (
              <span className="text-xs font-bold text-[var(--muted)]">
                {wMin === wMax ? wMax.toFixed(1) : `${wMin.toFixed(1)} – ${wMax.toFixed(1)}`} kg
              </span>
            )}
            {wp.length >= 2 && wDelta !== 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  wDelta < 0 ? 'bg-[#C9EFD3] text-[#174A2B]' : 'bg-[#FAE0B4] text-[#7D4E14]'
                }`}
              >
                {wDelta > 0 ? `+${wDelta.toFixed(1)}` : wDelta.toFixed(1)}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`text-[var(--muted)] transition-transform duration-200 ${weightOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        <div className="accordion-grid" data-open={weightOpen} inert={!weightOpen}>
          <div className="accordion-inner">
            <div className="pt-3" data-no-swipe>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs font-bold tabular-nums px-1" aria-live="polite">
                  <span className="text-[var(--muted)]">
                    {activeWeightPt.date ? formatDateDisplay(activeWeightPt.date, language) : t.stats.profileWeight}
                  </span>
                  <span className="text-[var(--text)] font-extrabold">{activeWeightPt.kg.toFixed(1)} kg</span>
                </div>
                  <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} className="w-full h-32 overflow-visible">
                    {periodData.settings.showPhaseBandsInStats && !periodData.settings.trackPill && (() => {
                      const st = getPeriodStatus(periodData);
                      const colors: Record<string, string> = {
                        menstrual: '#F4C6D8',
                        follicular: '#CFE7FE',
                        ovulation: '#C9EFD3',
                        luteal: '#E2D6FF',
                      };
                      return wp.map((p, i) => {
                        if (!p.date) return null;
                        const ph = phaseOfDate(periodData, p.date, st);
                        if (!ph) return null;
                        const x0 = i === 0 ? 4 : (wX(i - 1) + wX(i)) / 2;
                        const x1 = i === wp.length - 1 ? W_SVG - 4 : (wX(i) + wX(i + 1)) / 2;
                        return (
                          <rect
                            key={`band-${p.date}`}
                            x={x0}
                            y={4}
                            rx={4}
                            width={Math.max(0, x1 - x0)}
                            height={H_SVG - 8}
                            fill={colors[ph]}
                            opacity={0.35}
                          />
                        );
                      });
                    })()}

                    <line
                      x1={8}
                      x2={W_SVG - 8}
                      y1={22}
                      y2={22}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={8}
                      x2={W_SVG - 8}
                      y1={98}
                      y2={98}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />

                    {wp.length > 1 && (
                      <polyline
                        points={wp.map((p, i) => `${wX(i)},${wY(p.kg)}`).join(' ')}
                        fill="none"
                        stroke="#C9EFD3"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.65"
                      />
                    )}
                    {wp.length > 1 && (
                      <polyline
                        points={wp.map((p, i) => `${wX(i)},${wY(p.kg)}`).join(' ')}
                        fill="none"
                        stroke="#2E8B57"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {wp.map((p, i) => {
                      const isSel = activeWeightIndex === i;
                      const label = `${p.date ? formatDateDisplay(p.date, language) : t.stats.profileWeight} · ${p.kg.toFixed(1)} kg`;
                      return (
                        <g
                          key={p.date ?? 'profile'}
                          role="button"
                          aria-label={label}
                          aria-pressed={isSel}
                          tabIndex={weightOpen ? 0 : -1}
                          onClick={() => setSelectedWeightIdx(i)}
                          onMouseEnter={() => setSelectedWeightIdx(i)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedWeightIdx(i);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <circle cx={wX(i)} cy={wY(p.kg)} r="12" fill="transparent" />
                          <circle
                            cx={wX(i)}
                            cy={wY(p.kg)}
                            r={isSel ? '5.5' : '4'}
                            fill="#F6D0D0"
                            stroke="#7A2727"
                            strokeWidth={isSel ? '2.2' : '1.6'}
                          />
                        </g>
                      );
                    })}
                  </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom button trackers, below the weight trend — clickable to inspect day */}
      {settings.customButtons.some((b) => b.showStats !== false) && (
        <div className="space-y-2.5">
          {settings.customButtons
            .filter((b) => b.showStats !== false)
            .map((b) => {
              const vals = period.days.map((d) => ({ date: d.date, value: getTrackerValue(allDayLogs[d.date], b) }));
              if (b.type === 'toggle') {
                const doneDays = vals.filter((v) => v.value === true).length;
                return (
                  <div key={b.id} className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-extrabold text-[#4D3582]">
                        <TrackerIcon icon={b.icon} size={15} />
                        {b.name}
                      </span>
                      <span className="text-sm font-extrabold tabular-nums text-[#4D3582]">
                        {doneDays}/{period.total}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {[...vals].reverse().map((v) => (
                        <button
                          key={v.date}
                          type="button"
                          onClick={() => openDayInspector(v.date)}
                          title={`${formatDateDisplay(v.date, language)} — ${
                            v.value === true ? t.settings.done : t.settings.notDone
                          }`}
                          className={`pressable w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold hover:scale-105 ${
                            v.value === true
                              ? 'bg-[#C9EFD3] text-[#174A2B]'
                              : 'bg-[#F0E9FF]/60 text-[#6E5BA8]/60'
                          }`}
                        >
                          {v.value === true ? '✓' : <X size={13} />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              const nums = vals
                .map((v) => v.value)
                .filter((v): v is number => typeof v === 'number' && v > 0);
              const avg =
                nums.length > 0
                  ? Math.round((nums.reduce((a, v) => a + v, 0) / nums.length) * 10) / 10
                  : 0;
              const total = Math.round(nums.reduce((a, v) => a + v, 0) * 10) / 10;
              const max = Math.max(1, ...nums);
              return (
                <div key={b.id} className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-extrabold text-[#4D3582]">
                      <TrackerIcon icon={b.icon} size={15} />
                      {b.name}
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block text-sm font-extrabold text-[#4D3582]">
                        {avg}
                        {b.unit ? ` ${b.unit}` : ''} {t.stats.perDay}
                      </span>
                      <span className="block text-[11px] font-bold text-[#6E5BA8]">
                        {total}
                        {b.unit ? ` ${b.unit}` : ''} · {nums.length}/{period.total}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-end gap-1 h-12 mt-3">
                    {[...vals].reverse().map((v) => {
                      const n = typeof v.value === 'number' ? v.value : 0;
                      const h = n > 0 ? Math.max(14, Math.round((n / max) * 100)) : 10;
                      return (
                        <button
                          key={v.date}
                          type="button"
                          onClick={() => openDayInspector(v.date)}
                          title={`${formatDateDisplay(v.date, language)} — ${
                            n > 0 ? `${n}${b.unit ? ' ' + b.unit : ''}` : '—'
                          }`}
                          aria-label={formatDateDisplay(v.date, language)}
                          className={`flex-1 rounded-md transition-opacity hover:opacity-80 ${
                            n > 0 ? 'bg-[#4D3582]' : 'bg-[#F0E9FF]/60'
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Daily breakdown — only for the 7-day filter; collapsed by default (persisted) */}
      {range === '7' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setDailyOpen(!dailyOpen)}
            aria-expanded={dailyOpen}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <h3 className="text-sm font-extrabold text-[var(--text)]">{t.history.last7DaysChart}</h3>
            <span className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] font-medium text-[var(--muted)]">
                {t.history.selectDayHint}
              </span>
              <ChevronDown
                size={16}
                className={`text-[var(--muted)] transition-transform duration-200 ${dailyOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          <div className="accordion-grid" data-open={dailyOpen} inert={!dailyOpen}>
            <div className="accordion-inner">
              <div className="pt-3 space-y-2.5">
                {period.days.map((d) => {
                  const maxDayVal = Math.max(d.intake, d.expenditure, 2400);
                  const inWidth = Math.round((d.intake / maxDayVal) * 100);
                  const outWidth = Math.round((d.expenditure / maxDayVal) * 100);

                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => openDayInspector(d.date)}
                      className="pressable w-full text-left p-3.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] space-y-2 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-[var(--text)]">
                            {formatDateDisplay(d.date, language)}
                          </span>
                          {!settings.hidePoop && d.poops.length > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14]"
                              title={t.quickAdd.poop}
                            >
                              <PoopIcon size={12} />
                              {d.poops.length > 1 && (
                                <span className="text-[10px] font-extrabold">×{d.poops.length}</span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                              d.net > 0
                                ? 'bg-[#F6D0D0] text-[#7A2727]'
                                : 'bg-[#C9EFD3] text-[#1D5C38]'
                            }`}
                          >
                            {d.net > 0 ? `+${d.net}` : d.net} kcal
                          </span>
                          <ChevronRight
                            size={16}
                            className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-0.5 tabular-nums">
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-[var(--text-warn)]">{t.energy.intake}</span>
                            <span className="font-extrabold text-[var(--text)]">
                              {formatKcal(d.intake)} kcal
                            </span>
                          </div>
                          <div className="w-full bg-[#F6D0D0] h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#8A2D2D] rounded-full"
                              style={{ width: `${d.intake > 0 ? Math.max(4, inWidth) : 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-[var(--text-neg)]">{t.energy.expenditure}</span>
                            <span className="font-extrabold text-[var(--text)]">
                              {formatKcal(d.expenditure)} kcal
                            </span>
                          </div>
                          <div className="w-full bg-[#C9EFD3] h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1E5E3A] rounded-full"
                              style={{ width: `${Math.max(4, outWidth)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-[var(--text)]">{t.history.backupTitle}</h3>
        {importMessage && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              importMessage.isError ? 'bg-[#F6D0D0] text-[#7A2727]' : 'bg-[#C9EFD3] text-[#174A2B]'
            }`}
          >
            {importMessage.isError ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
            <span>{importMessage.text}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="pressable flex-1 py-2.5 px-4 rounded-2xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center justify-center gap-2"
          >
            <Download size={15} />
            <span>{t.history.exportBtn}</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="pressable flex-1 py-2.5 px-4 rounded-2xl bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183F66] font-extrabold text-xs flex items-center justify-center gap-2"
          >
            <Upload size={15} />
            <span>{t.history.importBtn}</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
      </div>
    </div>
  );
};
