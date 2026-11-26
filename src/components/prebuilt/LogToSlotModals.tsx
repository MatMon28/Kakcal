import React from 'react';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { setLastAmount } from '../../utils/amountMemory';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { WorkflowFooter } from '../common/WorkflowFooter';
import type { LibraryState } from './usePreBuiltMealsState';

export const LogMealToSlotModal: React.FC<{ s: LibraryState }> = ({ s }) => {
  const {
    t, mealSlots, activeMealToLog, setActiveMealToLog, selectedSlot, setSelectedSlot,
    confirmLogToSlot, foodById, j, startFoodBatch,
  } = s;
  return (
    <>
      {/* ============ Log meal to slot picker ============ */}
      <Modal
        isOpen={activeMealToLog !== null}
        onClose={() => setActiveMealToLog(null)}
        title={t.prebuilt.selectSlotPrompt}
        subtitle={activeMealToLog?.name}
        footer={<WorkflowFooter primary={t.prebuilt.logMeal} onPrimary={confirmLogToSlot} more={j('Add more', 'Aggiungi altro')} onMore={() => {
          if (!activeMealToLog) return;
          startFoodBatch(selectedSlot, activeMealToLog.ingredients.flatMap(({ foodId, amount }) => {
            const food = foodById.get(foodId);
            return food && amount > 0 ? [{ food, amount }] : [];
          }));
          setActiveMealToLog(null);
        }} />}
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
        </div>
      </Modal>
    </>
  );
};

export const LogRecipeToSlotModal: React.FC<{ s: LibraryState }> = ({ s }) => {
  const {
    logFoodItem, selectedDate, t, j, startFoodBatch, mealSlots, activeRecipeToLog, setActiveRecipeToLog,
    recipeLogSlot, setRecipeLogSlot, recipeLogAmount, setRecipeLogAmount, nameOf,
  } = s;
  const valid = Number.isFinite(recipeLogAmount) && recipeLogAmount > 0;
  const log = () => {
    if (!activeRecipeToLog || !valid) return;
    setLastAmount(activeRecipeToLog.id, recipeLogAmount);
    logFoodItem(recipeLogSlot, activeRecipeToLog, recipeLogAmount, selectedDate);
    setActiveRecipeToLog(null);
  };
  return (
    <>
      {/* ============ Log recipe to slot (amount selectable) ============ */}
      <Modal
        isOpen={activeRecipeToLog !== null}
        onClose={() => setActiveRecipeToLog(null)}
        title={t.prebuilt.logRecipe}
        subtitle={activeRecipeToLog ? nameOf(activeRecipeToLog) : undefined}
        footer={<WorkflowFooter primary={t.prebuilt.logRecipe} onPrimary={log} disabled={!valid} more={j('Add more', 'Aggiungi altro')} moreDisabled={!valid} onMore={() => {
          if (!activeRecipeToLog || !valid) return;
          startFoodBatch(recipeLogSlot, [{ food: activeRecipeToLog, amount: recipeLogAmount }]);
          setActiveRecipeToLog(null);
        }} />}
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
              <AmountSelector value={recipeLogAmount} onChange={setRecipeLogAmount} unit={activeRecipeToLog.unit} food={activeRecipeToLog} />
              <FoodMacroGrid food={activeRecipeToLog} amount={recipeLogAmount} />
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
