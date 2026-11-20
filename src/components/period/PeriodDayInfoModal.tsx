import React from 'react';
import { Footprints, Scale, Droplets, ArrowUpRight, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { PoopIcon } from '../common/PoopIcon';
import { BristolIcon } from '../common/BristolIcon';
import { TrackerIcon } from '../common/TrackerIcon';
import {
  calculateBMR,
  calculateMacros,
  calculateTEF,
  calculateTotalActivityCalories,
  calculateTotalCalories,
} from '../../utils/calculations';
import { formatFullDate, formatKcal } from '../../utils/formatters';
import { formatTrackerAmount, getCustomEntries, getTrackerValue } from '../../utils/customTrackers';
import type { PoopSize } from '../../types';
import { allMealItems } from '../../utils/mealItems';
import { activityLogLabel } from '../../utils/activityLabel';

interface PeriodDayInfoModalProps {
  date: string | null;
  onClose: () => void;
}

export const PeriodDayInfoModal: React.FC<PeriodDayInfoModalProps> = ({ date, onClose }) => {
  const {
    allDayLogs,
    userProfile,
    settings,
    language,
    setSelectedDate,
    setActiveTab,
    t,
  } = useApp();

  if (!date) return null;

  const log = allDayLogs[date];
  const allItems = log
    ? allMealItems(log.meals)
    : [];

  const intake = calculateTotalCalories(allItems);
  const macros = calculateMacros(allItems);
  const bmr = calculateBMR(userProfile);
  const activities = log?.activities ?? [];
  const actExp = calculateTotalActivityCalories(activities);
  const tef = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams).totalTEF;
  const burned = bmr + actExp + tef;
  const net = intake - burned;
  const netPos = net > 0;

  const waterEntries = log?.waterEntries ?? [];
  const waterMl = waterEntries.reduce((sum, entry) => sum + entry.ml, 0);
  const showWater = settings.quickAdd.water || waterMl > 0;
  const weightKg = log?.weightKg;
  const poops = log?.poops ?? [];

  // Include every tracker that has a value on this day, including an explicit
  // "not done" state. Quantity trackers aggregate all entries for the day.
  const loggedTrackers = settings.customButtons
    .map((tracker) => ({
      tracker,
      value: getTrackerValue(log, tracker),
      present:
        tracker.type === 'toggle'
          ? typeof log?.custom?.[tracker.id] === 'boolean'
          : getCustomEntries(log, tracker.id).length > 0,
    }))
    .filter(({ present }) => present);

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

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t.period.daySummaryTitle}
      subtitle={formatFullDate(date, language)}
      maxWidth="max-w-md"
      footer={
        <button
          type="button"
          onClick={() => {
            setSelectedDate(date);
            onClose();
            setActiveTab('today');
          }}
          className="pressable w-full py-3 px-4 rounded-2xl bg-[var(--text)] text-[var(--on-text)] text-sm font-extrabold flex items-center justify-center gap-1.5"
        >
          <span>{t.period.openInToday}</span>
          <ArrowUpRight size={15} />
        </button>
      }
    >
      <div className="space-y-3">
        {/* Intake & Burned */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="kc-hero-intake bg-intake rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-1 min-h-[20px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-intake-accent">
                {t.energy.intake}
              </span>
              {netPos && (
                <span className="kc-balance-badge px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-intake-accent text-intake-soft">
                  +{formatKcal(net)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-1 tabular-nums">
              <span className="text-xl font-extrabold text-intake-ink">{formatKcal(intake)}</span>
              <span className="text-[11px] font-semibold text-intake-accent">kcal</span>
            </div>
          </div>

          <div className="kc-hero-burned bg-activity rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-1 min-h-[20px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-activity-accent">
                {t.energy.expenditure}
              </span>
              {!netPos && (
                <span className="kc-balance-badge px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-activity-accent text-activity-soft">
                  {net === 0 ? '0' : `-${formatKcal(Math.abs(net))}`}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-1 tabular-nums">
              <span className="text-xl font-extrabold text-activity-ink">{formatKcal(burned)}</span>
              <span className="text-[11px] font-semibold text-activity-accent">kcal</span>
            </div>
          </div>
        </div>

        {/* Macros summary when food was logged */}
        {allItems.length > 0 && (
          <FoodMacroGrid mode="facts" amount={100} food={{ carbs: macros.carbsGrams, protein: macros.proteinGrams,
            fat: macros.fatGrams, fiber: macros.fiberGrams, salt: macros.saltGrams, sugar: macros.sugarGrams }} />
        )}

        {/* Poop */}
        {!settings.hidePoop && (
          <div data-day-overview-card className="bg-[#FAE0B4] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span data-period-value className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#7D4E14]">
                <span className="kc-period-header-icon size-7 rounded-full bg-transparent text-[#8A5A2B] flex items-center justify-center shrink-0">
                  <PoopIcon size={15} />
                </span>
                {t.quickAdd.poop}
              </span>
              <span data-period-value className="text-xs font-extrabold tabular-nums text-[#7D4E14]">
                {poops.length}
              </span>
            </div>
            {poops.length === 0 ? (
              <p data-period-label className="text-xs font-medium text-[#9B6E32] pl-0.5">{t.period.noPoopEntries}</p>
            ) : (
              <div className="space-y-1.5">
                {poops.map((p) => (
                  <div
                    key={p.id}
                    data-day-overview-row
                    className="px-3 py-2 rounded-xl bg-[#FDF3E0] flex items-center gap-2 text-xs"
                  >
                    <PoopIcon size={13} className="kc-period-header-icon text-[#8A5A2B] shrink-0" />
                    <span data-period-value className="font-bold text-[#7D4E14] shrink-0">{sizeLabel(p.size)}</span>
                    {p.bristol && (
                      <span className="kc-custom-pill inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14] text-[10px] font-extrabold shrink-0">
                        <BristolIcon type={p.bristol} size={12} className="text-current" />
                        B{p.bristol}
                      </span>
                    )}
                    {p.description && (
                      <span data-period-label className="text-[#9B6E32] font-medium truncate">{p.description}</span>
                    )}
                    <span data-period-label className="text-[#9B6E32] font-medium tabular-nums shrink-0 ml-auto">
                      {new Date(p.timestamp).toLocaleTimeString(language === 'it' ? 'it-IT' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity */}
        <div data-day-overview-card className="bg-activity rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span data-period-value className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-activity-ink">
              <span className="kc-period-header-icon size-7 rounded-full bg-transparent flex items-center justify-center shrink-0">
                <Footprints size={14} />
              </span>
              {t.activities.title}
            </span>
            <span data-period-label className="text-[11px] font-bold tabular-nums text-activity-accent">
              {t.energy.bmrShort} {bmr} · {t.energy.activitiesShort} {actExp} · {t.energy.tefShort} {tef}
            </span>
          </div>
          {activities.length === 0 ? (
            <p data-period-label className="text-xs font-medium text-activity-accent pl-0.5">{t.activities.noActivities}</p>
          ) : (
            <div className="space-y-1.5">
              {activities.map((act) => {
                const label = activityLogLabel(act, language, t.activities);
                const detail =
                  act.method === 'distance' && act.distanceKm !== undefined
                    ? `${act.distanceKm} ${t.activities.km}`
                    : act.durationMin !== undefined
                    ? `${act.durationMin} ${t.activities.min}`
                    : '';
                return (
                  <div
                    key={act.id}
                    data-day-overview-row
                    className="px-3 py-2 rounded-xl bg-activity-soft flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="min-w-0 truncate">
                      <span data-period-value className="font-bold text-activity-ink">{label}</span>
                      {(detail || act.notes) && (
                        <span data-period-label className="text-activity-accent font-medium ml-1.5 tabular-nums">
                          {detail}
                          {detail && act.notes ? ' · ' : ''}
                          {act.notes || ''}
                        </span>
                      )}
                    </span>
                    <span data-period-value className="font-extrabold tabular-nums text-activity-ink shrink-0">
                      {act.caloriesBurned} kcal
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weight (& Water if active/logged) */}
        <div className={`grid gap-2.5 ${showWater ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div data-day-overview-card className="bg-weight rounded-2xl p-3.5 flex items-center gap-2.5">
            <span className="kc-period-header-icon size-8 rounded-full bg-transparent text-weight-ink flex items-center justify-center shrink-0">
              <Scale size={15} />
            </span>
            <div className="min-w-0">
              <span data-period-label className="block text-[11px] font-bold text-weight-accent">{t.quickAdd.weight}</span>
              <span data-period-value className="block text-sm font-extrabold tabular-nums text-weight-ink truncate">
                {typeof weightKg === 'number' ? `${weightKg.toFixed(1)} kg` : t.period.notRecorded}
              </span>
            </div>
          </div>

          {showWater && (
            <div data-day-overview-card className="bg-[#CFE7FE] rounded-2xl p-3.5 flex items-center gap-2.5">
              <span className="kc-period-header-icon size-8 rounded-full bg-transparent text-[#183B5E] flex items-center justify-center shrink-0">
                <Droplets size={15} />
              </span>
              <div className="min-w-0">
                <span data-period-label className="block text-[11px] font-bold text-[#436B94]">{t.quickAdd.water}</span>
                <span data-period-value className="block text-sm font-extrabold tabular-nums text-[#183B5E] truncate">
                  {waterMl} ml
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Custom trackers logged that day */}
        {loggedTrackers.length > 0 && (
          <div data-day-overview-card className="bg-[#F7E9AA] rounded-2xl p-3.5 space-y-1.5">
            <span data-period-value className="flex items-center gap-1.5 text-xs font-extrabold text-[#6E5B14]">
              <Sparkles size={13} />
              {t.quickAdd.custom}
            </span>
            {loggedTrackers.map(({ tracker, value }) => (
              <div
                key={tracker.id}
                data-day-overview-row
                className="px-3 py-1.5 rounded-xl bg-[#FCF4D6] flex items-center justify-between gap-2 text-xs text-[#6E5B14]"
              >
                <span className="flex items-center gap-2 font-bold truncate">
                  <TrackerIcon icon={tracker.icon} size={13} className="shrink-0" />
                  <span className="truncate">{tracker.name}</span>
                </span>
                <span className="font-extrabold tabular-nums shrink-0">
                  {typeof value === 'number'
                    ? `${formatTrackerAmount(value, language)}${tracker.unit ? ` ${tracker.unit}` : ''}`
                    : value
                    ? `✓ ${t.settings.done}`
                    : t.settings.notDone}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
