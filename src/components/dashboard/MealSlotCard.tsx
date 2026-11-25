import React from 'react';
import { useApp } from '../../context/AppContext';
import { MealSlotId, LoggedFoodItem } from '../../types';
import { calculateMacros, calculateTotalCalories } from '../../utils/calculations';
import { formatKcal } from '../../utils/formatters';
import { MacroPills } from '../common/MacroPills';
import { LazyBody } from '../common/LazyBody';
import { MealNutrientTotals } from './MealNutrientTotals';
import { MealSlotBody } from './MealSlotBody';
import { MealNoteAction } from '../journal/MealDiary';
import { MealPhotoAction } from '../journal/PhotoDiary';
import { useMealSlots } from '../../utils/mealSlots';
import { MealSlotIcon } from '../common/mealSlotIcon';
import {
  Plus,
  ChevronDown,
} from 'lucide-react';

interface MealSlotCardProps {
  slotId: MealSlotId;
  dateOverride?: string;
  open: boolean;
  onToggle: () => void;
  compact?: boolean;
  ultraMinimal?: boolean;
}

/**
 * One meal of Today. The header (icon, kcal, macros, +, chevron) is always mounted; the body (every logged item with
 * its macros, planned meals, photos, note) is mounted through `LazyBody` only, so a collapsed meal costs no DOM.
 * Open on arrival (remembered in `kcak_today_meals_open`) the body mounts after the first paint behind a skeleton
 * (`defer`); opened by a tap it mounts at once; once mounted it stays mounted so the closing animation plays.
 * See docs/performance.md > Collapsed means not mounted.
 */
export const MealSlotCard: React.FC<MealSlotCardProps> = ({
  slotId,
  dateOverride,
  open,
  onToggle,
  compact = false,
  ultraMinimal = false,
}) => {
  const {
    currentDayLog,
    allDayLogs,
    selectedDate,
    setSelectedDate,
    setIsAddFoodOpen,
    setTargetMealSlot,
    t,
  } = useApp();

  const { label: slotLabel } = useMealSlots();

  const activeDate = dateOverride || selectedDate;
  const dayLog = dateOverride
    ? allDayLogs[dateOverride] || {
        date: dateOverride,
        meals: {
          breakfast: [],
          mid_morning: [],
          lunch: [],
          midday_snack: [],
          dinner: [],
          extra: [],
        },
        activities: [],
      }
    : currentDayLog;

  const items: LoggedFoodItem[] = dayLog.meals[slotId] || [];
  const slotCalories = calculateTotalCalories(items);
  const slotMacros = calculateMacros(items);

  // Circle rule: the icon circle is transparent (same colour as the card, no border, no shadow),
  // so the macro pills stay the only coloured elements on a meal card. Size and round shape are kept.
  const getSlotDetails = (id: MealSlotId) => {
    switch (id) {
      case 'breakfast':
      case 'mid_morning':
      case 'lunch':
      case 'midday_snack':
      case 'dinner':
      case 'extra':
        return { title: t.mealSlots[id] };
      default:
        // A meal type added with the advanced layout.
        return { title: slotLabel(id) };
    }
  };

  const details = getSlotDetails(slotId);

  const handleOpenAddFood = () => {
    if (dateOverride && dateOverride !== selectedDate) {
      setSelectedDate(dateOverride);
    }
    setTargetMealSlot(slotId);
    setIsAddFoodOpen(true);
  };

  // Only numbers are visible in the macro pills; accessible labels retain the names and units.
  const macroPills = (
    <MacroPills
      carbs={slotMacros.carbsGrams}
      protein={slotMacros.proteinGrams}
      fat={slotMacros.fatGrams}
      stretch
    />
  );

  // Fibre, salt and sugar of the whole meal live in the same area as the macros (right under them, icon + number only),
  // shown only when the meal is open; they are mounted only then (LazyBody).
  const macroArea = (
    <div data-macro-area className="flex min-w-0 flex-1 w-full flex-col">
      {macroPills}
      <div className="accordion-grid" data-open={open} inert={!open} aria-hidden={!open}>
        <div className="accordion-inner">
          <LazyBody open={open}>
            <div className="pt-1.5">
              <MealNutrientTotals fiber={slotMacros.fiberGrams} salt={slotMacros.saltGrams} sugar={slotMacros.sugarGrams} compact={compact} />
            </div>
          </LazyBody>
        </div>
      </div>
    </div>
  );

  // `.kc-meal-kcal` is hidden by a container query when the card is too narrow (src/styles/performance.css); no JS measuring.
  const kcalLabel = (
    <span
      data-calories
      className="inline-flex shrink-0 items-baseline gap-1 tabular-nums whitespace-nowrap kc-meal-kcal"
      aria-label={`${formatKcal(slotCalories)} kcal`}
      title={`${formatKcal(slotCalories)} kcal`}
    >
      <span className={`font-extrabold text-[var(--text)] ${compact ? 'text-[15px] max-[359px]:text-sm' : 'text-sm sm:text-base'}`}>
        {formatKcal(slotCalories)}
      </span>
      {!compact && <span className="text-[11px] font-semibold text-[var(--muted)]">kcal</span>}
    </span>
  );

  const slotBadge = (size: string, iconSize: number) => (
    <div className={`kc-meal-icon ${size} rounded-full flex items-center justify-center shrink-0 bg-transparent text-[var(--text)]`}>
      <MealSlotIcon slot={slotId} size={iconSize} />
    </div>
  );

  const addButton = (size: string, iconSize: number) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleOpenAddFood();
      }}
      className={`pressable ${size} shrink-0 rounded-full bg-transparent hover:opacity-75 text-[var(--text)] flex items-center justify-center`}
      title={t.mealSlots.addItem}
      aria-label={`${t.mealSlots.addItem} — ${details.title}`}
    >
      <Plus size={iconSize} strokeWidth={2.5} />
    </button>
  );

  const toggleHeader = (
    <div
      role="button"
      tabIndex={0}
      aria-label={details.title}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`${compact ? 'px-3 py-3 max-[359px]:px-2.5' : 'px-4 py-3.5'} flex flex-col items-center gap-2.5 cursor-pointer select-none hover:bg-[var(--inset)]/40 transition-colors`}
    >
      {compact ? (
        <>
          {/* Row 1: icon · kcal · add · chevron (meal name hidden in compact) */}
          <div className="relative flex items-center gap-2 max-[359px]:gap-1 w-full">
            {slotBadge('size-8 max-[359px]:size-7', 15)}
            <div className="relative min-w-0 flex-1 self-stretch flex items-center">{kcalLabel}</div>
            {/* Note and photo icons: hidden by a container query (`.kc-meal-extras`, src/styles/performance.css) when the card is too narrow for them. */}
            <div
              data-compact-extras
              className="flex items-center shrink-0 kc-meal-extras"
              onClick={(e) => e.stopPropagation()}
            >
              <MealNoteAction date={activeDate} slot={slotId} />
              <MealPhotoAction date={activeDate} slot={slotId} />
            </div>
            {addButton('size-7 max-[359px]:size-6', 14)}
            <ChevronDown
              size={14}
              className={`${compact ? 'max-[359px]:size-3' : ''} shrink-0 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </div>
          {/* Row 2: numeric macro pills, or the empty-state text */}
          {items.length === 0 ? (
            <div className="w-full min-h-6 flex items-center">
              {!ultraMinimal && <p className="text-xs font-medium text-[var(--muted)]">{t.mealSlots.emptySlot}</p>}
            </div>
          ) : (
            macroArea
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5 w-full">
            {slotBadge('size-9', 16)}
            <h4 className="min-w-0 flex-1 text-sm font-extrabold text-[var(--text)] truncate">{details.title}</h4>
            <MealNoteAction date={activeDate} slot={slotId} />
            <MealPhotoAction date={activeDate} slot={slotId} />
            {addButton('size-8', 16)}
            <ChevronDown
              size={16}
              className={`${compact ? 'max-[359px]:size-3' : ''} shrink-0 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </div>
          <div data-nutrition-row className="relative flex items-center gap-3 w-full min-w-0">
            {kcalLabel}
            {items.length > 0 ? macroArea : (
              <span className="text-xs font-medium text-[var(--muted)]">{t.mealSlots.emptySlot}</span>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div data-meal-slot={slotId} className={`bg-[var(--surface)] border border-[var(--border)] overflow-hidden transition-colors ${compact ? 'rounded-2xl' : 'rounded-3xl'}`}>
      {/* Neutral meal card: energy left, numeric macro pills alongside it (beneath it in Compact). */}
      {toggleHeader}

      {/* Smooth collapsible food items list: the body is not mounted while the meal is closed. */}
      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <LazyBody open={open} defer>
            <MealSlotBody slotId={slotId} date={activeDate} items={items} compact={compact} ultraMinimal={ultraMinimal} />
          </LazyBody>
        </div>
      </div>
    </div>
  );
};
