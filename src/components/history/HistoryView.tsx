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
import { PoopIcon } from '../common/PoopIcon';
import { usePersistentState } from '../../utils/usePersistentState';
import { BristolIcon } from '../common/BristolIcon';
import { getPeriodStatus, phaseOfDate } from '../../utils/period';
import { TrackerIcon } from '../common/TrackerIcon';
import { MealSlotId, PoopEntry, PoopSize, WaterEntry } from '../../types';
import {
  TrendingUp,
  Download,
  Upload,
  ChevronRight,
  CheckCircle,
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

export const HistoryView: React.FC = () => {
  const {
    allDayLogs,
    setSelectedDate,
    userProfile,
    exportDataJson,
    importDataJson,
    removeActivity,
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

  const todayStr = getTodayDateString();
  const bmr = calculateBMR(userProfile);

  const [range, setRange] = useState<RangeKey>('7');
  const [customFrom, setCustomFrom] = useState(addDaysToDateString(todayStr, -6));
  const [customTo, setCustomTo] = useState(todayStr);

  const [openSlots, setOpenSlots] = useState<Set<MealSlotId>>(new Set());
  // Collapse preferences persist across page changes
  const [dailyOpen, setDailyOpen] = usePersistentState('kcalsync_stats_daily_open', false);
  const [weightOpen, setWeightOpen] = usePersistentState('kcalsync_stats_weight_open', true);
  const mealSlots: MealSlotId[] = [
    'breakfast',
    'mid_morning',
    'lunch',
    'midday_snack',
    'dinner',
    'extra',
  ];
  const allOpen = openSlots.size === mealSlots.length;
  const toggleSlot = (slot: MealSlotId) =>
    setOpenSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });

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
        custom: {} as Record<string, number | boolean>,
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
      custom: log.custom || {},
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
      loggedCount: loggedDays.length,
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
  }, [rangeDates, allDayLogs, userProfile]);

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
    setOpenSlots(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    return (
      <div className="space-y-3.5 pb-24">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => setInspectedDate(null)}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] mb-1"
            >
              <ArrowLeft size={14} />
              <span>{t.history.backToStats}</span>
            </button>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text)] capitalize">
              {formatFullDate(inspectedDate, language)}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(inspectedDate);
                setIsAddFoodOpen(true);
              }}
              className="px-3.5 py-2 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center gap-1.5"
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
              className="px-3.5 py-2 rounded-full bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold text-xs flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>{t.quickAdd.movement}</span>
            </button>
          </div>
        </div>

        {/* Intake & Burned */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-[#F6D0D0] rounded-3xl p-4 sm:p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C3A3A] block">
              {t.energy.intake}
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2B1818]">
                {formatKcal(dayStats.intake)}
              </span>
              <span className="text-xs font-semibold text-[#8C3A3A]">kcal</span>
            </div>
            <div className="w-full bg-[#FAEBEB] h-2.5 rounded-full overflow-hidden mt-2">
              <div className="h-full rounded-full bg-[#8A2D2D]" style={{ width: `${Math.max(4, intakePct)}%` }} />
            </div>
          </div>

          <div className="bg-[#C9EFD3] rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#25633E]">
                {t.energy.expenditure}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF9EE] text-[#194D2E]">
                {dayStats.net > 0 ? `+${dayStats.net}` : dayStats.net}
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#142E1F]">
                {formatKcal(dayStats.expenditure)}
              </span>
              <span className="text-xs font-semibold text-[#25633E]">kcal</span>
            </div>
            <div className="w-full bg-[#E6F8EB] h-2.5 rounded-full overflow-hidden mt-2">
              <div className="h-full rounded-full bg-[#1E5E3A]" style={{ width: `${Math.max(4, expPct)}%` }} />
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
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

        {/* Collapsible meal slots */}
        <div className="flex items-center justify-end px-1">
          <button
            type="button"
            onClick={() => setOpenSlots(allOpen ? new Set() : new Set(mealSlots))}
            className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
          >
            {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
            <span>{allOpen ? t.mealSlots.collapseAll : t.mealSlots.expandAll}</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {mealSlots.map((slotId) => (
            <MealSlotCard
              key={slotId}
              slotId={slotId}
              dateOverride={inspectedDate}
              open={openSlots.has(slotId)}
              onToggle={() => toggleSlot(slotId)}
            />
          ))}
        </div>

        {/* Movement */}
        <div className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-[#4D3582]">{t.activities.title}</h4>
              <p className="text-xs font-medium text-[#6E5BA8] mt-0.5">
                {t.energy.bmrShort} {dayStats.bmr} · {t.energy.activitiesShort} {dayStats.actExp} · {t.energy.tefShort} {dayStats.tef}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(inspectedDate);
                setIsLogActivityOpen(true);
              }}
              className="w-8 h-8 rounded-full bg-[var(--surface)] hover:opacity-80 text-[#4D3582] flex items-center justify-center"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
          {dayStats.activities.length > 0 && (
            <div className="space-y-2">
              {dayStats.activities.map((act) => (
                <div key={act.id} className="px-3.5 py-2.5 rounded-2xl bg-[#F0E9FF] flex items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm">
                    <span className="font-bold text-[#4D3582]">
                      {act.type === 'custom'
                        ? act.customName || t.activities.custom
                        : act.type === 'walking'
                        ? t.activities.walking
                        : t.activities.running}
                    </span>
                    <span className="text-[#6E5BA8] ml-2 font-medium">
                      {act.method === 'distance' && act.distanceKm !== undefined
                        ? `${act.distanceKm} km`
                        : act.durationMin !== undefined ? ` min` : ""}
                      {act.notes ? ` · ${act.notes}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs sm:text-sm font-extrabold text-[#4D3582]">-{act.caloriesBurned}</span>
                    <button
                      onClick={() => removeActivity(act.id, inspectedDate)}
                      className="w-6 h-6 rounded-full text-[#6E5BA8] hover:text-[#8C2D32] flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
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
              <span className="text-xs font-medium text-[#A05A5A]">
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
            className="w-9 h-9 rounded-full bg-[var(--surface)] hover:opacity-80 text-[#7A2727] flex items-center justify-center"
          >
            <Plus size={17} strokeWidth={2.5} />
          </button>
        </div>

        {/* Water */}
        <div className="bg-[#CFE7FE] rounded-3xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8F3FF] text-[#183B5E] flex items-center justify-center">
              <Droplets size={18} />
            </div>
            <div>
              <span className="text-sm font-extrabold text-[#183B5E] block">{t.quickAdd.water}</span>
              <span className="text-xs font-medium text-[#436B94]">{dayStats.waterMl} ml</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(inspectedDate);
              setIsWaterOpen(true);
            }}
            className="w-9 h-9 rounded-full bg-[var(--surface)] hover:opacity-80 text-[#183B5E] flex items-center justify-center"
          >
            <Plus size={17} strokeWidth={2.5} />
          </button>
        </div>

        {/* Poop */}
        {!settings.hidePoop && (
          <div className="bg-[#FAE0B4] rounded-3xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FDF3E0] text-[#8A5A2B] flex items-center justify-center">
                  <PoopIcon size={19} />
                </div>
                <span className="text-sm font-extrabold text-[#7D4E14]">
                  {t.quickAdd.poop} · {dayStats.poops.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(inspectedDate);
                  setIsPoopOpen(true);
                }}
                className="w-9 h-9 rounded-full bg-[var(--surface)] hover:opacity-80 text-[#7D4E14] flex items-center justify-center"
              >
                <Plus size={17} strokeWidth={2.5} />
              </button>
            </div>
            {dayStats.poops.length > 0 && (
              <div className="space-y-1.5">
                {dayStats.poops.map((p) => (
                  <div key={p.id} className="px-3.5 py-2 rounded-2xl bg-[#FDF3E0] flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                      <PoopIcon size={15} className="text-[#8A5A2B]" />
                      <span className="font-bold text-[#7D4E14]">{sizeLabel(p.size)}</span>
                      {p.bristol && <BristolIcon type={p.bristol} size={14} className="text-[#8A5A2B]" />}
                      {p.description && (
                        <span className="text-[#A87C3F] font-medium truncate max-w-[110px]">{p.description}</span>
                      )}
                      <span className="text-[#A87C3F] font-medium">
                        {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                    <button
                      onClick={() => removePoop(p.id, inspectedDate)}
                      className="w-6 h-6 rounded-full text-[#A87C3F] hover:text-[#8C2D32] flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==================== STATISTICS OVERVIEW ====================
  const avgScale = Math.max(period.avgIntake, period.avgExpenditure, 1);
  const avgIntakePct = Math.round((period.avgIntake / avgScale) * 100);
  const avgExpPct = Math.round((period.avgExpenditure / avgScale) * 100);

  const wp = period.weightPoints;
  const wMin = wp.length ? Math.min(...wp.map((p) => p.kg)) : 0;
  const wMax = wp.length ? Math.max(...wp.map((p) => p.kg)) : 0;
  const wRange = Math.max(0.5, wMax - wMin);
  const wX = (i: number) => (wp.length <= 1 ? 160 : 14 + (i / (wp.length - 1)) * 292);
  const wY = (kg: number) => 96 - ((kg - wMin) / wRange) * 76;

  return (
    <div className="space-y-4 pb-24">
      {/* Header + range filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#CFE7FE] text-[#1A4670] flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[var(--text)]">{t.history.title}</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full">
            {(
              [
                ['7', t.stats.last7],
                ['30', t.stats.last30],
                ['custom', t.stats.customRange],
              ] as [RangeKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors ${
                  range === key
                    ? 'bg-[var(--text)] text-[var(--surface)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {range === 'custom' && (
        <div className="flex items-center gap-2 px-1">
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            {t.stats.from}
            <input
              type="date"
              value={customFrom}
              onChange={(e) => e.target.value && setCustomFrom(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            {t.stats.to}
            <input
              type="date"
              value={customTo}
              onChange={(e) => e.target.value && setCustomTo(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none"
            />
          </label>
        </div>
      )}

      <div className="px-1 text-xs font-bold text-[var(--muted)]">
        {t.history.daysLogged
          .replace('{count}', String(period.loggedCount))
          .replace('{total}', String(period.total))}
      </div>

      {/* Avg Intake & Burned */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[#F6D0D0] rounded-3xl p-4 sm:p-5">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8C3A3A] block">
            {t.history.avgIntake}
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#2B1818]">
              {formatKcal(period.avgIntake)}
            </span>
            <span className="text-xs font-semibold text-[#8C3A3A]">kcal</span>
          </div>
          <div className="w-full bg-[#FAEBEB] h-2.5 rounded-full overflow-hidden mt-3">
            <div className="h-full rounded-full bg-[#8A2D2D]" style={{ width: `${Math.max(4, avgIntakePct)}%` }} />
          </div>
        </div>

        <div className="bg-[#C9EFD3] rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#25633E]">
              {t.history.avgExpenditure}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF9EE] text-[#194D2E]">
              {period.avgNet > 0 ? `+${period.avgNet}` : period.avgNet}
            </span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#142E1F]">
              {formatKcal(period.avgExpenditure)}
            </span>
            <span className="text-xs font-semibold text-[#25633E]">kcal</span>
          </div>
          <div className="w-full bg-[#E6F8EB] h-2.5 rounded-full overflow-hidden mt-3">
            <div className="h-full rounded-full bg-[#1E5E3A]" style={{ width: `${Math.max(4, avgExpPct)}%` }} />
          </div>
        </div>
      </div>

      {/* Macro averages (Carbs / Protein / Fat) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="bg-[#FAE0B4] rounded-3xl p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-[#8A5617] block">{t.history.avgCarbs}</span>
          <span className="text-lg font-extrabold text-[#2D1E0B] mt-0.5 block">{period.avgCarbs}g</span>
        </div>
        <div className="bg-[#F6D0D0] rounded-3xl p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-[#8C3A3A] block">{t.history.avgProtein}</span>
          <span className="text-lg font-extrabold text-[#2B1818] mt-0.5 block">{period.avgProtein}g</span>
        </div>
        <div className="bg-[#E2D6FF] rounded-3xl p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-[#523A8C] block">{t.history.avgFat}</span>
          <span className="text-lg font-extrabold text-[#1F1636] mt-0.5 block">{period.avgFat}g</span>
        </div>
      </div>

      {/* Fiber & Salt — same position/layout as the daily overview */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
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

      {/* Poop count (above weight graph) — "3/7" style */}
      {!settings.hidePoop && (
        <div className="bg-[#FAE0B4] rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-[#7D4E14]">
              {t.poop.poopsInPeriod}
            </span>
            <span className="text-sm font-extrabold text-[#7D4E14]">
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
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 ${
                    pooped
                      ? 'bg-[#FDF3E0] text-[#8A5A2B]'
                      : 'bg-[#FDF3E0]/40 text-[#C9AE7E]'
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
                    <X size={15} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Weight progression — collapsible (state persisted) */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setWeightOpen(!weightOpen)}
          className="w-full flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
            <Scale size={15} className="text-[#7A2727]" />
            {t.stats.weightTrend}
          </span>
          <span className="flex items-center gap-2">
            {wp.length > 0 && (
              <span className="text-xs font-bold text-[var(--muted)]">
                {wMin.toFixed(1)} – {wMax.toFixed(1)} kg
              </span>
            )}
            <ChevronDown
              size={16}
              className={`text-[var(--muted)] transition-transform ${weightOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {weightOpen && (
          <div className="pt-2">
            {wp.length === 0 ? (
              <p className="text-xs font-medium text-[var(--muted)] py-4 text-center">
                {t.stats.noWeightData}
              </p>
            ) : (
              <svg viewBox="0 0 320 112" className="w-full h-28" preserveAspectRatio="none">
                {periodData.settings.showPhaseBandsInStats && !periodData.settings.trackPill && (() => {
                  const st = getPeriodStatus(periodData);
                  const colors: Record<string, string> = { menstrual: '#F4C6D8', follicular: '#CFE7FE', ovulation: '#C9EFD3', luteal: '#E2D6FF' };
                  return wp.map((p, i) => {
                    const ph = phaseOfDate(periodData, p.date, st);
                    if (!ph) return null;
                    const x0 = i === 0 ? 0 : (wX(i - 1) + wX(i)) / 2;
                    const x1 = i === wp.length - 1 ? 320 : (wX(i) + wX(i + 1)) / 2;
                    return <rect key={`band-${p.date}`} x={x0} y={0} width={Math.max(0, x1 - x0)} height={112} fill={colors[ph]} opacity={0.35} />;
                  });
                })()}
                {wp.length > 1 && (
                  <polyline
                    points={wp.map((p, i) => `${wX(i)},${wY(p.kg)}`).join(' ')}
                    fill="none"
                    stroke="#C9EFD3"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.55"
                  />
                )}
                {wp.length > 1 && (
                  <polyline
                    points={wp.map((p, i) => `${wX(i)},${wY(p.kg)}`).join(' ')}
                    fill="none"
                    stroke="#1E5E3A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {wp.map((p, i) => (
                  <circle key={p.date} cx={wX(i)} cy={wY(p.kg)} r="3.5" fill="#F6D0D0" stroke="#7A2727" strokeWidth="1.5" />
                ))}
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Custom button trackers, below the weight trend — styled like the poop card */}
      {settings.customButtons.some((b) => b.showStats !== false) && (
        <div className="space-y-2.5">
          {settings.customButtons.filter((b) => b.showStats !== false).map((b) => {
            const vals = period.days.map((d) => ({ date: d.date, value: d.custom?.[b.id] }));
            if (b.type === 'toggle') {
              const doneDays = vals.filter((v) => v.value === true).length;
              return (
                <div key={b.id} className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-extrabold text-[#4D3582]">
                      <TrackerIcon icon={b.icon} size={15} />
                      {b.name}
                    </span>
                    <span className="text-sm font-extrabold text-[#4D3582]">
                      {doneDays}/{period.total}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {[...vals].reverse().map((v) => (
                      <span
                        key={v.date}
                        title={`${formatDateDisplay(v.date, language)} — ${
                          v.value === true ? t.settings.done : t.settings.notDone
                        }`}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          v.value === true
                            ? 'bg-[#C9EFD3] text-[#174A2B]'
                            : 'bg-[#F0E9FF]/50 text-[#6E5BA8]/50'
                        }`}
                      >
                        {v.value === true ? '✓' : <X size={13} />}
                      </span>
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
                  <span className="text-right">
                    <span className="block text-sm font-extrabold text-[#4D3582]">
                      {avg}
                      {b.unit ? ` ${b.unit}` : ''} / day
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
                    const h = n > 0 ? Math.max(12, Math.round((n / max) * 100)) : 8;
                    return (
                      <div
                        key={v.date}
                        title={`${formatDateDisplay(v.date, language)} — ${
                          n > 0 ? `${n}${b.unit ? ' ' + b.unit : ''}` : '—'
                        }`}
                        className={`flex-1 rounded-md ${
                          n > 0 ? 'bg-[#4D3582]' : 'bg-[#F0E9FF]/50'
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

      {/* Daily breakdown — only for the 7-day filter; no macros, poop icon per day */}
      {range === '7' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-3">
          <button
            type="button"
            onClick={() => setDailyOpen(!dailyOpen)}
            className="w-full flex items-center justify-between gap-2"
          >
            <h3 className="text-sm font-extrabold text-[var(--text)]">{t.history.last7DaysChart}</h3>
            <span className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] font-medium text-[var(--muted)]">
                {t.history.selectDayHint}
              </span>
              <ChevronDown
                size={16}
                className={`text-[var(--muted)] transition-transform ${dailyOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          {dailyOpen && <div className="space-y-2.5">
            {period.days.map((d) => {
              const maxDayVal = Math.max(d.intake, d.expenditure, 2400);
              const inWidth = Math.round((d.intake / maxDayVal) * 100);
              const outWidth = Math.round((d.expenditure / maxDayVal) * 100);

              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => openDayInspector(d.date)}
                  className="w-full text-left p-3.5 rounded-2xl bg-[var(--inset)] hover:opacity-80 transition-opacity space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-[var(--text)]">
                        {formatDateDisplay(d.date, language)}
                      </span>
                      {d.poops.length > 0 && (
                        <span className="flex items-center gap-1 text-[#8A5A2B]" title={t.quickAdd.poop}>
                          <PoopIcon size={14} />
                          {d.poops.length > 1 && (
                            <span className="text-[10px] font-extrabold">×{d.poops.length}</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          d.net > 0 ? 'bg-[#FAE0B4] text-[#7D4E14]' : 'bg-[#C9EFD3] text-[#1D5C38]'
                        }`}
                      >
                        {d.net > 0 ? `+${d.net}` : d.net} kcal
                      </span>
                      <ChevronRight size={16} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[#8C3A3A]">{t.energy.intake}</span>
                        <span className="font-extrabold text-[#2B1818]">{formatKcal(d.intake)} kcal</span>
                      </div>
                      <div className="w-full bg-[#F6D0D0] h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-[#8A2D2D] rounded-full" style={{ width: `${Math.max(3, inWidth)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[#25633E]">{t.energy.expenditure}</span>
                        <span className="font-extrabold text-[#142E1F]">{formatKcal(d.expenditure)} kcal</span>
                      </div>
                      <div className="w-full bg-[#C9EFD3] h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1E5E3A] rounded-full" style={{ width: `${Math.max(3, outWidth)}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>}
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
            <CheckCircle size={15} />
            <span>{importMessage.text}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={15} />
            <span>{t.history.exportBtn}</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183F66] font-extrabold text-xs flex items-center justify-center gap-2 transition-colors"
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

// local alias to avoid importing the type twice in the summary factory above
import type { ActivityLog as ActivityLogType } from '../../types';
