import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MealSlotId, LoggedFoodItem } from '../../types';
import { calculateMacros, calculateTotalCalories } from '../../utils/calculations';
import { formatKcal } from '../../utils/formatters';
import { setLastAmount } from '../../utils/amountMemory';
import { AmountSelector } from '../common/AmountSelector';
import {
  Coffee,
  Apple,
  Utensils,
  SunMedium,
  Moon,
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
} from 'lucide-react';

interface MealSlotCardProps {
  slotId: MealSlotId;
  dateOverride?: string;
  open: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export const MealSlotCard: React.FC<MealSlotCardProps> = ({
  slotId,
  dateOverride,
  open,
  onToggle,
  compact = false,
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

  const getSlotDetails = (id: MealSlotId) => {
    switch (id) {
      case 'breakfast':
        return { title: t.mealSlots.breakfast, icon: Coffee, badge: 'bg-[#FAE0B4] text-[#7D4E14]' };
      case 'mid_morning':
        return { title: t.mealSlots.mid_morning, icon: Apple, badge: 'bg-[#C9EFD3] text-[#1D5C38]' };
      case 'lunch':
        return { title: t.mealSlots.lunch, icon: Utensils, badge: 'bg-[#F6D0D0] text-[#7A2727]' };
      case 'midday_snack':
        return { title: t.mealSlots.midday_snack, icon: SunMedium, badge: 'bg-[#F7E9AA] text-[#6E5B14]' };
      case 'dinner':
        return { title: t.mealSlots.dinner, icon: Utensils, badge: 'bg-[#CFE7FE] text-[#1A4670]' };
      case 'extra':
        return { title: t.mealSlots.extra, icon: Moon, badge: 'bg-[#E2D6FF] text-[#4D3582]' };
    }
  };

  const details = getSlotDetails(slotId);
  const Icon = details.icon;

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

  // Compact cards drop the meal name and show rounded C/P/F in a bar that wraps
  // onto a second line (and therefore grows taller) when the card is too narrow.
  const compactMacroBar = (
    <div className="w-full mt-1.5 rounded-xl bg-[var(--inset)] px-2 py-1.5 min-h-[32px] flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10.5px] font-bold tabular-nums leading-tight">
      {items.length === 0 ? (
        <span className="text-[var(--muted)] opacity-80">{t.mealSlots.emptySlot}</span>
      ) : (
        <>
          <span>
            <span className="text-[#8A5617]">C</span>{' '}
            <span className="text-[var(--text)]">{Math.round(slotMacros.carbsGrams)}g</span>
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span>
            <span className="text-[#8C3A3A]">P</span>{' '}
            <span className="text-[var(--text)]">{Math.round(slotMacros.proteinGrams)}g</span>
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span>
            <span className="text-[#523A8C]">F</span>{' '}
            <span className="text-[var(--text)]">{Math.round(slotMacros.fatGrams)}g</span>
          </span>
          <span className="text-[var(--muted)] font-medium">· {items.length}</span>
        </>
      )}
    </div>
  );

  const toggleHeader = (
    <div
      role="button"
      tabIndex={0}
      aria-label={details.title}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`${compact ? 'px-2.5 pt-2.5 pb-2.5 flex-col gap-1' : 'px-4 py-3.5 gap-3'} flex items-center justify-between cursor-pointer select-none hover:bg-[var(--inset)]/40 transition-colors`}
    >
      {compact ? (
        <>
          <div className="flex items-center justify-between gap-1.5 w-full">
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${details.badge}`}>
              <Icon size={14} />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {slotCalories > 0 && (
                <span className="text-xs font-extrabold tabular-nums text-[var(--text)]">
                  {formatKcal(slotCalories)}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddFood();
                }}
                className="pressable size-7 rounded-full bg-[var(--surface)] hover:bg-[#C9EFD3] text-[var(--text)] hover:text-[#1A5632] flex items-center justify-center border border-[var(--border)]"
                title={t.mealSlots.addItem}
                aria-label={`${t.mealSlots.addItem} — ${details.title}`}
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
              <ChevronDown
                size={13}
                className={`text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </div>
          </div>
          {compactMacroBar}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${details.badge}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-[var(--text)] truncate">{details.title}</h4>
              {items.length > 0 && (
                <span className="text-[11px] font-medium tabular-nums text-[var(--muted)] block truncate">
                  {items.length} · C {slotMacros.carbsGrams}g · P {slotMacros.proteinGrams}g · F {slotMacros.fatGrams}g
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {slotCalories > 0 && (
              <div className="text-right tabular-nums">
                <span className="text-sm sm:text-base font-extrabold text-[var(--text)]">{formatKcal(slotCalories)}</span>
                <span className="text-[11px] font-semibold text-[var(--muted)] ml-0.5">kcal</span>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddFood();
              }}
              className="pressable size-8 rounded-full bg-[var(--inset)] hover:bg-[#C9EFD3] text-[var(--text)] hover:text-[#1A5632] flex items-center justify-center"
              title={t.mealSlots.addItem}
              aria-label={`${t.mealSlots.addItem} — ${details.title}`}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>

            <ChevronDown
              size={16}
              className={`text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] overflow-hidden transition-colors ${compact ? 'rounded-2xl' : 'rounded-3xl'}`}>
      {/* Slot header: meal name in normal mode, rounded macro bar in compact mode */}
      {toggleHeader}

      {/* Smooth collapsible food items list */}
      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className={`${compact ? 'px-2.5' : 'px-4'} py-1.5 border-t border-[var(--border)] divide-y divide-[var(--border)]`}>
            {items.length === 0 ? (
              <button
                type="button"
                onClick={handleOpenAddFood}
                className="w-full py-3 flex items-center justify-between text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors text-left"
              >
                <span>{t.mealSlots.emptySlot}</span>
                <span className="font-bold inline-flex items-center gap-1">
                  <Plus size={13} />
                  {t.mealSlots.addItem}
                </span>
              </button>
            ) : (
              items.map((item) => {
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
                          {item.unit}
                        </span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)] mr-1">
                          {itemKcal} kcal
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
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
