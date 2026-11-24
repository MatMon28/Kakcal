import React from 'react';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { FoodResultRow } from '../common/FoodResultRow';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { Plus, Trash2, Check, ArrowLeft } from 'lucide-react';
import { MacroPills } from '../common/MacroPills';
import { scrollFadeX, scrollFadeY } from '../../utils/scrollFade';
import type { LibraryState } from './usePreBuiltMealsState';

export const CreateMealModal: React.FC<{ s: LibraryState }> = ({ s }) => {
  const {
    allFoods, t, mealSlots, isCreateOpen, setIsCreateOpen, editingMealId, newMealName,
    setNewMealName, newMealDesc, setNewMealDesc, newMealSlot, setNewMealSlot, newIngredients,
    setNewIngredients, pendingFood, setPendingFood, pendingAmount, setPendingAmount,
    ingredientSearch, setIngredientSearch, nameOf, newMealNutrition, handleSelectFood,
    handleConfirmAndAddAnother, handleSaveMeal, filteredFoodsForSearch, favoriteOneChar,
    pendingKcal, searchInput,
  } = s;
  return (
    <>
      {/* ============ Create / Edit meal modal ============ */}
      <Modal
        dockId="meal"
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setPendingFood(null);
        }}
        title={pendingFood ? nameOf(pendingFood) : editingMealId ? t.prebuilt.edit : t.prebuilt.newModalTitle}
        maxWidth="max-w-xl"
      >
        {pendingFood ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setPendingFood(null)}
              className="pressable inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              <span>{t.common.back}</span>
            </button>

            <div className="kc-modal-banner flex items-center justify-between bg-[#FAE0B4] rounded-2xl px-4 py-3 tabular-nums">
              <span className="text-xs font-bold text-[#7D4E14]">
                {pendingFood.calories} kcal / 100{pendingFood.unit}
              </span>
              <div>
                <span className="text-2xl font-extrabold text-[#2D1E0B]">{pendingKcal}</span>
                <span className="text-xs font-bold text-[#7D4E14] ml-1">kcal</span>
              </div>
            </div>

            <AmountSelector value={pendingAmount} onChange={setPendingAmount} unit={pendingFood.unit} />

            <FoodMacroGrid food={pendingFood} amount={pendingAmount} />

            {/* Adding an ingredient queues it and returns to the picker; saving is a separate step. */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmAndAddAnother}
                disabled={pendingAmount <= 0}
                className="kc-primary-btn pressable w-full py-3 px-4 bg-[#FAE0B4] hover:bg-[#F7D69E] text-[#6E4412] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm disabled:opacity-40"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>{t.prebuilt.addAnotherIngredient}</span>
              </button>
              {newIngredients.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSaveMeal(true)}
                  className="pressable w-full py-3 px-4 bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm tabular-nums"
                >
                  <Check size={17} strokeWidth={2.5} />
                  <span>{t.prebuilt.saveMeal} ({newMealNutrition.totalKcal + pendingKcal} kcal)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <input
              type="text"
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              placeholder={t.prebuilt.mealNamePlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-sm font-bold focus:outline-none focus:border-[var(--muted)]"
            />

            <input
              type="text"
              value={newMealDesc}
              onChange={(e) => setNewMealDesc(e.target.value)}
              placeholder={t.prebuilt.descPlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2 text-[var(--text)] placeholder-[var(--muted)] text-xs font-medium focus:outline-none focus:border-[var(--muted)]"
            />

            <div ref={scrollFadeX} className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {mealSlots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setNewMealSlot(s.id)}
                  data-slot-chip
                  className={`pressable px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                    newMealSlot === s.id
                      ? 'kc-chip-active bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Ingredient search — same behaviour as Add Food (fuzzy, favourites first and starred). Placed ABOVE the ingredients already in the meal. */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--muted)] block">
                {t.prebuilt.pickIngredientPrompt}
              </span>
              {searchInput(ingredientSearch, setIngredientSearch, t.foodModal.searchPlaceholder)}
              {ingredientSearch.trim().length === 1 && (
                favoriteOneChar(ingredientSearch).length > 0 ? (
                  <div ref={scrollFadeY} className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] max-h-52 overflow-y-auto">
                    {favoriteOneChar(ingredientSearch).map((food) => (
                      <FoodResultRow key={food.id} food={food} onClick={() => handleSelectFood(food)} favorite />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-[var(--muted)] px-1">{t.foodModal.minCharsHint}</p>
                )
              )}
              {ingredientSearch.trim().length >= 2 && (
                <div ref={scrollFadeY} className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] max-h-52 overflow-y-auto">
                  {filteredFoodsForSearch.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--muted)]">{t.foodModal.noResults}</div>
                  ) : (
                    filteredFoodsForSearch.map((food) => (
                      <FoodResultRow key={food.id} food={food} onClick={() => handleSelectFood(food)} favorite />
                    ))
                  )}
                </div>
              )}
            </div>


            {newIngredients.length > 0 && (
              <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[var(--text)]">
                    {t.prebuilt.ingredientsCount.replace('{count}', String(newIngredients.length))}
                  </span>
                  <span className="kc-action-pill text-xs font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-[#C9EFD3] text-[#174A2B]">
                    {newMealNutrition.totalKcal} kcal
                  </span>
                </div>
                <div ref={scrollFadeY} className="space-y-1.5 max-h-36 overflow-y-auto">
                  {newIngredients.map((ing, idx) => {
                    const food = allFoods.find((f) => f.id === ing.foodId);
                    const kcal = food ? Math.round((food.calories * ing.amount) / 100) : 0;
                    return (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-[var(--surface)] flex items-center justify-between gap-2 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (food) {
                              setNewIngredients((prev) => prev.filter((_, i) => i !== idx));
                              handleSelectFood(food);
                              setPendingAmount(ing.amount);
                            }
                          }}
                          className="font-bold text-[var(--text)] truncate text-left hover:underline"
                        >
                          {food ? nameOf(food) : ing.foodId} ({ing.amount}
                          {food?.unit || 'g'})
                        </button>
                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          {food && (
                            <MacroPills
                              carbs={food.carbs == null ? null : (food.carbs * ing.amount) / 100}
                              protein={food.protein == null ? null : (food.protein * ing.amount) / 100}
                              fat={food.fat == null ? null : (food.fat * ing.amount) / 100}
                            />
                          )}
                          <span className="font-bold text-[var(--muted)]">{kcal} kcal</span>
                          <button
                            type="button"
                            onClick={() => setNewIngredients((prev) => prev.filter((_, i) => i !== idx))}
                            className="pressable w-6 h-6 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                            aria-label={t.common.delete}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {newIngredients.length > 0 && (
              <button
                type="button"
                onClick={() => handleSaveMeal(false)}
                className="kc-primary-btn pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums"
              >
                <Check size={18} strokeWidth={2.5} />
                <span>
                  {t.prebuilt.saveMeal} ({newMealNutrition.totalKcal} kcal)
                </span>
              </button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
