import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MealSlotId, LoggedFoodItem } from '../../types';
import { calculateMacros, calculateTotalCalories } from '../../utils/calculations';
import { formatKcal } from '../../utils/formatters';
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
}

export const MealSlotCard: React.FC<MealSlotCardProps> = ({
  slotId,
  dateOverride,
  open,
  onToggle,
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
      updateLoggedFoodItemAmount(slotId, item.id, finalVal, activeDate);
    }
    setEditingItemId(null);
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden">
      {/* Slot Header — clicking toggles collapse */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        className="px-4 py-3.5 flex items-center justify-between gap-3 border-b border-[var(--border)] cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${details.badge}`}>
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-[var(--text)] truncate">
              {details.title}
            </h4>
            {!open && items.length > 0 && (
              <span className="text-[11px] font-medium text-[var(--muted)]">
                {items.length} · C {slotMacros.carbsGrams}g P {slotMacros.proteinGrams}g F {slotMacros.fatGrams}g
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {slotCalories > 0 && (
            <div className="text-right">
              <span className="text-sm sm:text-base font-extrabold text-[var(--text)]">
                {formatKcal(slotCalories)}
              </span>
              <span className="text-[11px] font-semibold text-[var(--muted)] ml-0.5">kcal</span>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAddFood();
            }}
            className="w-8 h-8 rounded-full bg-[var(--inset)] hover:bg-[#C9EFD3] text-[var(--text)] hover:text-[#1A5632] flex items-center justify-center transition-colors"
            title={t.mealSlots.addItem}
            aria-label={t.mealSlots.addItem}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>

          <ChevronDown
            size={16}
            className={`text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Collapsible food items list */}
      {open && (
        <div className="px-4 py-2 divide-y divide-[var(--border)]">
          {items.length === 0 ? (
            <div className="py-3 text-xs text-[var(--muted)]">{t.mealSlots.emptySlot}</div>
          ) : (
            items.map((item) => {
              const isEditing = editingItemId === item.id;
              const itemKcal = Math.round((item.calories * item.amount) / 100);

              return (
                <div key={item.id} className="py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate block">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-medium text-[var(--muted)]">
                        {item.amount}
                        {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs sm:text-sm font-extrabold text-[var(--text)] mr-1">
                        {itemKcal} kcal
                      </span>
                      <button
                        onClick={() => (isEditing ? saveEdit(item) : startEdit(item))}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                          isEditing
                            ? 'bg-[#C9EFD3] text-[#1A5632]'
                            : 'text-[var(--muted)] hover:bg-[var(--inset)] hover:text-[var(--text)]'
                        }`}
                        title={isEditing ? t.common.save : t.common.edit}
                      >
                        {isEditing ? <Check size={14} strokeWidth={2.5} /> : <Edit2 size={13} />}
                      </button>
                      <button
                        onClick={() => removeLoggedFoodItem(slotId, item.id, activeDate)}
                        className="w-7 h-7 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0]/60 flex items-center justify-center transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="pt-1 pb-1 bg-[var(--inset)] rounded-2xl p-2.5">
                      <AmountSelector
                        value={editAmount}
                        onChange={setEditAmount}
                        unit={item.unit}
                        compact
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
