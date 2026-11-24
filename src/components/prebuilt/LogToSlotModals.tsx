import React from 'react';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { setLastAmount } from '../../utils/amountMemory';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { Check } from 'lucide-react';
import type { LibraryState } from './usePreBuiltMealsState';

export const LogMealToSlotModal: React.FC<{ s: LibraryState }> = ({ s }) => {
  const {
    t, mealSlots, slotLabel, activeMealToLog, setActiveMealToLog, selectedSlot, setSelectedSlot,
    confirmLogToSlot,
  } = s;
  return (
    <>
      {/* ============ Log meal to slot picker ============ */}
      <Modal
        isOpen={activeMealToLog !== null}
        onClose={() => setActiveMealToLog(null)}
        title={t.prebuilt.selectSlotPrompt}
        subtitle={activeMealToLog?.name}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {mealSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot.id)}
                className={`pressable p-3 rounded-2xl border text-xs font-bold text-center ${
                  selectedSlot === slot.id
                    ? 'kc-chip-active bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={confirmLogToSlot}
            className="kc-primary-btn pressable w-full py-3 bg-[#FAE0B4] hover:bg-[#F7D69E] text-[#7D4E14] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>
              {t.prebuilt.logMeal} → {slotLabel(selectedSlot)}
            </span>
          </button>
        </div>
      </Modal>
    </>
  );
};

export const LogRecipeToSlotModal: React.FC<{ s: LibraryState }> = ({ s }) => {
  const {
    logFoodItem, selectedDate, t, mealSlots, slotLabel, activeRecipeToLog, setActiveRecipeToLog,
    recipeLogSlot, setRecipeLogSlot, recipeLogAmount, setRecipeLogAmount, nameOf,
  } = s;
  return (
    <>
      {/* ============ Log recipe to slot (amount selectable) ============ */}
      <Modal
        isOpen={activeRecipeToLog !== null}
        onClose={() => setActiveRecipeToLog(null)}
        title={t.prebuilt.logRecipe}
        subtitle={activeRecipeToLog ? nameOf(activeRecipeToLog) : undefined}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {mealSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setRecipeLogSlot(slot.id)}
                className={`pressable p-3 rounded-2xl border text-xs font-bold text-center ${
                  recipeLogSlot === slot.id
                    ? 'kc-chip-active bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F2]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
          {activeRecipeToLog && (
            <>
              <AmountSelector value={recipeLogAmount} onChange={setRecipeLogAmount} unit={activeRecipeToLog.unit} />
              <FoodMacroGrid food={activeRecipeToLog} amount={recipeLogAmount} />
            </>
          )}
          <button
            type="button"
            onClick={() => {
              if (activeRecipeToLog && recipeLogAmount > 0) {
                setLastAmount(activeRecipeToLog.id, recipeLogAmount);
                logFoodItem(recipeLogSlot, activeRecipeToLog, recipeLogAmount, selectedDate);
                setActiveRecipeToLog(null);
              }
            }}
            disabled={recipeLogAmount <= 0}
            className="kc-primary-btn pressable w-full py-3 bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>
              {t.prebuilt.logRecipe} → {slotLabel(recipeLogSlot)} ·{' '}
              {activeRecipeToLog ? Math.round((activeRecipeToLog.calories * recipeLogAmount) / 100) : 0} kcal
            </span>
          </button>
        </div>
      </Modal>
    </>
  );
};
