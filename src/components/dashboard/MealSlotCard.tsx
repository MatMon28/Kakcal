import React, { useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MealSlotId, LoggedFoodItem } from '../../types';
import { calculateMacros, calculateTotalCalories } from '../../utils/calculations';
import { formatKcal } from '../../utils/formatters';
import { setLastAmount } from '../../utils/amountMemory';
import { AmountSelector } from '../common/AmountSelector';
import { MacroPills } from '../common/MacroPills';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { MealNutrientTotals } from './MealNutrientTotals';
import { PlannedMeals } from '../journal/MealPlanner';
import { InlineMealNote, MealNoteAction } from '../journal/MealDiary';
import { MealPhotoAction, MealPhotos } from '../journal/PhotoDiary';
import { useMealSlots } from '../../utils/mealSlots';
import { MealSlotIcon } from '../common/mealSlotIcon';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
} from 'lucide-react';

/** Room (px) the three macro pills need next to the calories in the Normal layout: 3 pills of ~34 px, 2 gaps of 6 px, 12 px gap. */
const PILLS_RESERVE = 3 * 34 + 2 * 6 + 12;

/**
 * True while `target` (the calories) does not fit in `room` plus the space that has to stay free (`reserve`). Used to make
 * the calorie text disappear when a meal field is resized so narrow that it would be cut off or squeeze the macro pills.
 * The target is hidden with `invisible absolute`, not removed, so it can still be measured and comes back when there is room.
 */
function useCramped(room: React.RefObject<HTMLElement | null>, target: React.RefObject<HTMLElement | null>, reserve: number, watch: unknown) {
  const [cramped, setCramped] = useState(false);
  useLayoutEffect(() => {
    const roomEl = room.current;
    const targetEl = target.current;
    if (!roomEl || !targetEl) return undefined;
    const check = () => setCramped(roomEl.clientWidth < targetEl.offsetWidth + reserve);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(roomEl);
    observer.observe(targetEl);
    return () => observer.disconnect();
  }, [room, target, reserve, watch]);
  return cramped;
}

/**
 * True when the note / photo icons (`extras`) fit in the one-line header of a compact meal next to the other controls.
 * Everything is measured from the DOM (the extras are always rendered, only hidden with `invisible absolute`), so the
 * answer does not depend on whether they are currently shown and cannot flip back and forth. Without any icon enabled
 * (no `extras` width) the answer is simply true.
 */
function useExtrasFit(
  row: React.RefObject<HTMLElement | null>,
  kcalRoom: React.RefObject<HTMLElement | null>,
  kcal: React.RefObject<HTMLElement | null>,
  extras: React.RefObject<HTMLElement | null>,
  watch: unknown,
) {
  const [fits, setFits] = useState(false);
  useLayoutEffect(() => {
    const rowEl = row.current;
    const roomEl = kcalRoom.current;
    const kcalEl = kcal.current;
    const extrasEl = extras.current;
    if (!rowEl || !roomEl || !kcalEl || !extrasEl) return undefined;
    const check = () => {
      const extrasWidth = extrasEl.getBoundingClientRect().width;
      if (extrasWidth === 0) {
        setFits(true);
        return;
      }
      const gap = parseFloat(getComputedStyle(rowEl).columnGap) || 0;
      const others = Array.from(rowEl.children).filter((child) => child !== roomEl && child !== extrasEl);
      const fixed = others.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0);
      // others + calories + extras, with a gap between every pair of items.
      const needed = fixed + kcalEl.getBoundingClientRect().width + extrasWidth + gap * (others.length + 1);
      setFits(rowEl.clientWidth >= needed);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(rowEl);
    observer.observe(extrasEl);
    return () => observer.disconnect();
  }, [row, kcalRoom, kcal, extras, watch]);
  return fits;
}

interface MealSlotCardProps {
  slotId: MealSlotId;
  dateOverride?: string;
  open: boolean;
  onToggle: () => void;
  compact?: boolean;
  ultraMinimal?: boolean;
}

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
    removeLoggedFoodItem,
    updateLoggedFoodItemAmount,
    setIsAddFoodOpen,
    setTargetMealSlot,
    t,
  } = useApp();

  const { label: slotLabel } = useMealSlots();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);

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

  // The calories disappear when the card is too narrow for them (a meal field resized in the advanced layout).
  const kcalRoom = useRef<HTMLDivElement>(null);
  const kcalRef = useRef<HTMLSpanElement>(null);
  const compactRow = useRef<HTMLDivElement>(null);
  const extrasRef = useRef<HTMLDivElement>(null);
  const extrasFit = useExtrasFit(compactRow, kcalRoom, kcalRef, extrasRef, `${compact}:${formatKcal(slotCalories)}`);
  const kcalCramped = useCramped(kcalRoom, kcalRef, compact ? 0 : PILLS_RESERVE, `${compact}:${formatKcal(slotCalories)}:${items.length}`);

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

  const startEdit = (item: LoggedFoodItem) => {
    setEditingItemId(item.id);
    setEditAmount(item.amount);
  };

  const saveEdit = (item: LoggedFoodItem) => {
    const finalVal = editAmount > 0 ? editAmount : 0;
    if (finalVal === 0) {
      removeLoggedFoodItem(slotId, item.id, activeDate);
    } else {
      setLastAmount(item.foodId, finalVal);
      updateLoggedFoodItemAmount(slotId, item.id, finalVal, activeDate);
    }
    setEditingItemId(null);
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

  // Fibre, salt and sugar of the whole meal live in the same area as the macros (right under them, icon + number only), shown only when the meal is open.
  const macroArea = (
    <div data-macro-area className="flex min-w-0 flex-1 w-full flex-col">
      {macroPills}
      {/* Fibre, salt and sugar only show while the meal is open; the row grows / shrinks with the same accordion. */}
      <div className="accordion-grid" data-open={open} inert={!open} aria-hidden={!open}>
        <div className="accordion-inner">
          <div className="pt-1.5">
            <MealNutrientTotals fiber={slotMacros.fiberGrams} salt={slotMacros.saltGrams} sugar={slotMacros.sugarGrams} compact={compact} />
          </div>
        </div>
      </div>
    </div>
  );

  const kcalLabel = (
    <span
      ref={kcalRef}
      data-calories
      data-cramped={kcalCramped ? '' : undefined}
      className={`inline-flex shrink-0 items-baseline gap-1 tabular-nums whitespace-nowrap ${kcalCramped ? 'invisible absolute left-0 top-0 pointer-events-none' : ''}`}
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
          <div ref={compactRow} className="relative flex items-center gap-2 max-[359px]:gap-1 w-full">
            {slotBadge('size-8 max-[359px]:size-7', 15)}
            <div ref={kcalRoom} className="relative min-w-0 flex-1 self-stretch flex items-center">{kcalLabel}</div>
            {/* Note and photo icons: next to + when they fit in the bar, otherwise only once the meal is expanded.
                Always rendered (so they can be measured) and hidden with `invisible absolute` while they are not shown. */}
            <div
              ref={extrasRef}
              data-compact-extras
              data-shown={extrasFit || open ? '' : undefined}
              className={`flex items-center shrink-0 ${extrasFit || open ? '' : 'invisible absolute right-0 top-0 pointer-events-none'}`}
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
          <div ref={kcalRoom} data-nutrition-row className="relative flex items-center gap-3 w-full min-w-0">
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

      {/* Smooth collapsible food items list */}
      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className={`${compact ? 'px-2.5' : 'px-4'} py-1.5 border-t border-[var(--border)] divide-y divide-[var(--border)]`}>
            <PlannedMeals date={activeDate} slot={slotId} />
            <MealPhotos date={activeDate} slot={slotId} />
            <InlineMealNote date={activeDate} slot={slotId} />
            {items.length === 0 && ultraMinimal ? (
              <div className="min-h-7" aria-hidden="true" />
            ) : items.length === 0 ? (
              <p className="py-3 text-xs font-medium text-[var(--muted)]">{t.mealSlots.emptySlot}</p>
            ) : (
              <>
              {items.map((item) => {
                const isEditing = editingItemId === item.id;
                const displayAmt = isEditing ? editAmount : item.amount;
                const itemKcal = Math.round((item.calories * displayAmt) / 100);

                return (
                  <div
                    key={item.id}
                    className="py-2.5 space-y-2"
                    onKeyDown={(e) => {
                      if (!isEditing) return;
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setEditingItemId(null);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => (isEditing ? saveEdit(item) : startEdit(item))}
                        className="min-w-0 flex-1 text-left group"
                      >
                        <span className="text-xs sm:text-sm font-bold text-[var(--text)] group-hover:opacity-80 truncate block">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-medium tabular-nums text-[var(--muted)]">
                          {displayAmt}
                          {!ultraMinimal && item.unit}
                        </span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)] mr-1" aria-label={`${itemKcal} kcal`} title={`${itemKcal} kcal`}>
                          {itemKcal}{!compact && !ultraMinimal && ' kcal'}
                        </span>
                        <button
                          type="button"
                          onClick={() => (isEditing ? saveEdit(item) : startEdit(item))}
                          className={`pressable w-8 h-8 rounded-full flex items-center justify-center ${
                            isEditing
                              ? 'bg-[#C9EFD3] text-[#1A5632]'
                              : 'text-[var(--muted)] hover:bg-[var(--inset)] hover:text-[var(--text)]'
                          }`}
                          title={isEditing ? t.common.save : t.common.edit}
                          aria-label={isEditing ? t.common.save : t.common.edit}
                        >
                          {isEditing ? <Check size={15} strokeWidth={2.5} /> : <Edit2 size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) setEditingItemId(null);
                            removeLoggedFoodItem(slotId, item.id, activeDate);
                          }}
                          className="pressable w-8 h-8 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                          title={t.common.delete}
                          aria-label={t.common.delete}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Every logged item shows its own carbs, protein, fat, fibre, salt (and sugar) for the portion eaten. */}
                    <div data-item-nutrition>
                      <FoodMacroGrid food={item} amount={displayAmt} dense mode={ultraMinimal ? 'minimal' : 'portion'} />
                    </div>

                    {isEditing && (
                      <div className="bg-[var(--inset)] rounded-2xl p-2.5 space-y-2">
                        <AmountSelector
                          value={editAmount}
                          onChange={setEditAmount}
                          unit={item.unit}
                          compact
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="pressable px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[11px] font-bold text-[var(--muted)]"
                          >
                            {t.common.cancel}
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(item)}
                            className="pressable px-3.5 py-1.5 rounded-xl bg-[#C9EFD3] text-[#174A2B] text-[11px] font-extrabold inline-flex items-center gap-1"
                          >
                            <Check size={13} strokeWidth={2.5} />
                            {t.common.save}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
