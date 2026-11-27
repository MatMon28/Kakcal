import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { LoggedFoodItem, MealSlotId } from '../../types';
import { setLastAmount } from '../../utils/amountMemory';
import { AmountSelector } from '../common/AmountSelector';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { PlannedMeals } from '../journal/MealPlanner';
import { SaveAsMeal } from '../journal/SaveAsMeal';
import { InlineMealNote } from '../journal/MealDiary';
import { MealPhotos } from '../journal/PhotoDiary';
import { Check, Edit2, Trash2 } from 'lucide-react';

interface MealSlotBodyProps {
  slotId: MealSlotId;
  /** The day shown by the card (the selected day, or the day of a photo / note jump). */
  date: string;
  items: LoggedFoodItem[];
  compact: boolean;
  ultraMinimal: boolean;
}

/**
 * The expandable part of a Today meal card: planned meals, photos, the note, and every logged item with its own
 * macros, editor and delete button. It is mounted ONLY through `LazyBody` in `MealSlotCard` (docs/performance.md >
 * "Collapsed means not mounted"): a closed meal has no item rows, no food grids and no photo / note components at all.
 */
export const MealSlotBody: React.FC<MealSlotBodyProps> = ({ slotId, date, items, compact, ultraMinimal }) => {
  const { allFoods, removeLoggedFoodItem, updateLoggedFoodItemAmount, t } = useApp();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);

  const startEdit = (item: LoggedFoodItem) => {
    setEditingItemId(item.id);
    setEditAmount(item.amount);
  };

  const saveEdit = (item: LoggedFoodItem) => {
    const finalVal = editAmount > 0 ? editAmount : 0;
    if (finalVal === 0) {
      removeLoggedFoodItem(slotId, item.id, date);
    } else {
      setLastAmount(item.foodId, finalVal);
      updateLoggedFoodItemAmount(slotId, item.id, finalVal, date);
    }
    setEditingItemId(null);
  };

  return (
    <div className={`${compact ? 'px-2.5' : 'px-4'} py-1.5 border-t border-[var(--border)] divide-y divide-[var(--border)]`}>
      <PlannedMeals date={date} slot={slotId} />
      <MealPhotos date={date} slot={slotId} />
      <InlineMealNote date={date} slot={slotId} />
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
                          ? 'kc-action-pill bg-[#C9EFD3] text-[#1A5632]'
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
                        removeLoggedFoodItem(slotId, item.id, date);
                      }}
                      className="kc-danger-icon-hover pressable w-8 h-8 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
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
                      food={(allFoods ?? []).find((f) => f.id === item.foodId) ?? { id: item.foodId, unit: item.unit }}
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
                        className="kc-primary-btn pressable px-3.5 py-1.5 rounded-xl bg-[#C9EFD3] text-[#174A2B] text-[11px] font-extrabold inline-flex items-center gap-1"
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
          <div className="py-2.5 flex justify-end">
            <SaveAsMeal slot={slotId} date={date} items={items} variant="row" />
          </div>
        </>
      )}
    </div>
  );
};
