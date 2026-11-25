import { useState } from 'react';
import { AmountSelector } from '../common/AmountSelector';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { IngredientPicker } from '../common/IngredientPicker';
import { IngredientRow } from '../common/IngredientRow';
import { MacroPills } from '../common/MacroPills';
import { Modal } from '../common/Modal';
import { useRemovalScope } from '../common/UndoRemovalNotice';
import { WorkflowFooter } from '../common/WorkflowFooter';
import { scrollFadeX } from '../../utils/scrollFade';
import { removeWithUndo } from '../../utils/undoRemoval';
import type { LibraryState } from './usePreBuiltMealsState';

/**
 * The saved-meal builder. It is laid out like the recipe builder (`RecipeBuilderModal.tsx`): the name, one card per
 * ingredient (`IngredientRow`: quantity, kcal, macros, pencil for the quantity, bin), the same quantity screen after a
 * food is chosen, the same footer (Add ingredient / Save on the list, Add more / Add on the quantity) and the same
 * nutrition recap. Only the meal type and the description are specific to meals.
 */
export function CreateMealModal({ s }: { s: LibraryState }) {
  const { foodById, settings, t, j, mealSlots, isCreateOpen, setIsCreateOpen, editingMealId, newMealName, setNewMealName,
    newMealDesc, setNewMealDesc, newMealSlot, setNewMealSlot, newIngredients, setNewIngredients,
    pendingFood, setPendingFood, pendingAmount, setPendingAmount, pendingIngredient, setPendingIngredient,
    nameOf, newMealNutrition, handleSelectFood, handleConfirmAndAddAnother, handleSaveMeal } = s;
  const [picking, setPicking] = useState(false);
  // A new number per opening, so "Add more" starts a fresh search while Back from the quantity keeps the current one.
  const [pickerSession, setPickerSession] = useState(0);
  const undoScope = useRemovalScope();
  const valid = Number.isFinite(pendingAmount) && pendingAmount > 0;
  const editing = Boolean(pendingIngredient);
  const openPicker = () => { setPickerSession((session) => session + 1); setPicking(true); };
  const discardPending = () => { setPendingFood(null); setPendingIngredient(null); };
  /** Keeps the quantity on screen in the meal, then returns to the list or opens the picker again. */
  const commit = (another = false) => {
    if (!pendingFood || !valid) return;
    handleConfirmAndAddAnother();
    if (another) openPicker();
    else setPicking(false);
  };
  // Back from the quantity returns to the search it came from (the picker stays mounted), or to the list for the pencil.
  const back = pendingFood ? discardPending : picking ? () => setPicking(false) : undefined;
  const input = 'mt-1 w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-[var(--text)] text-sm font-bold';

  return (
    <Modal dockId="meal" isOpen={isCreateOpen} onClose={back ?? (() => setIsCreateOpen(false))} onBack={back} maxWidth="max-w-xl"
      bodyKey={picking ? 'picker' : pendingFood ? 'amount' : 'meal'}
      title={pendingFood ? nameOf(pendingFood) : picking ? j('Choose an ingredient', 'Scegli un ingrediente') : editingMealId ? t.prebuilt.edit : t.prebuilt.newModalTitle}
      subtitle={pendingFood ? j('Choose the quantity', 'Scegli la quantità') : undefined}
      footer={pendingFood ? <WorkflowFooter
        more={editing ? undefined : j('Add more', 'Aggiungi altro')} onMore={editing ? undefined : () => commit(true)} moreDisabled={!valid}
        primary={editing ? j('Save amount', 'Salva quantità') : j('Add to meal', 'Aggiungi al pasto')} onPrimary={() => commit()} disabled={!valid}
      /> : !picking && <WorkflowFooter
        more={t.prebuilt.addIngredient} onMore={openPicker} primary={t.prebuilt.saveMeal}
        onPrimary={() => handleSaveMeal()} disabled={newIngredients.length === 0}
      />}
    >
      {picking || pendingFood ? (
        <>
          {picking && <div hidden={Boolean(pendingFood)}>
            <IngredientPicker key={pickerSession} onPick={handleSelectFood} slot={newMealSlot} />
          </div>}
          {pendingFood && <div className="space-y-3.5" data-ingredient-amount-step={editing ? 'edit' : 'add'}>
            <AmountSelector value={pendingAmount} onChange={setPendingAmount} unit={pendingFood.unit} />
            <FoodMacroGrid food={pendingFood} amount={pendingAmount} />
          </div>}
        </>
      ) : (
        <div className="space-y-3.5">
          <label className="block text-xs font-bold text-[var(--muted)]">{j('Meal name', 'Nome del pasto')}
            <input value={newMealName} onChange={(e) => setNewMealName(e.target.value)} placeholder={t.prebuilt.mealNamePlaceholder} className={input} />
          </label>
          <div ref={scrollFadeX} className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {mealSlots.map(({ id, label }) => <button key={id} type="button" aria-pressed={newMealSlot === id} onClick={() => setNewMealSlot(id)} data-slot-chip
              className={`pressable px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${newMealSlot === id
                ? 'kc-chip-active bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]' : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'}`}>{label}</button>)}
          </div>
          <label className="block text-xs font-bold text-[var(--muted)]">{j('Description (optional)', 'Descrizione (facoltativa)')}
            <input value={newMealDesc} onChange={(e) => setNewMealDesc(e.target.value)} placeholder={t.prebuilt.descPlaceholder} className={input} />
          </label>
          <div className="space-y-2.5" data-ingredient-review>
            {newIngredients.length === 0 && <p className="text-sm text-[var(--muted)]">{j('Add ingredients first. You choose the quantity of each food as you add it.', 'Aggiungi prima gli ingredienti. Scegli la quantità di ogni alimento mentre lo aggiungi.')}</p>}
            {newIngredients.map((ingredient, index) => {
              const food = foodById.get(ingredient.foodId);
              const name = food ? nameOf(food) : ingredient.foodId;
              return <article key={index} data-review-line className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-3">
                <IngredientRow food={food} name={name} amount={ingredient.amount}
                  onEdit={food ? () => handleSelectFood(food, ingredient.amount, ingredient) : undefined}
                  editLabel={j(`Change amount for ${name}`, `Modifica quantità per ${name}`)}
                  onDelete={() => removeWithUndo(newIngredients, index, setNewIngredients, undoScope)} deleteLabel={`${t.common.delete}: ${name}`} />
              </article>;
            })}
          </div>
          {newIngredients.length > 0 && <div data-meal-recap className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-3">
            <p className="flex items-center justify-between gap-2 text-xs font-extrabold">
              <span>{j('Meal recap', 'Riepilogo pasto')}</span>
              <span className="text-[var(--muted)]">{t.prebuilt.ingredientsCount.replace('{count}', String(newIngredients.length))}</span>
            </p>
            <div data-nutrition-row className="flex min-w-0 items-center gap-2">
              <strong data-calories className="shrink-0 text-xs tabular-nums">{newMealNutrition.totalKcal} kcal</strong>
              <MacroPills carbs={newMealNutrition.carbs} protein={newMealNutrition.protein} fat={newMealNutrition.fat} stretch />
            </div>
            <div className={`grid ${settings.trackSugar ? 'grid-cols-3' : 'grid-cols-2'} gap-1 text-center text-[10px] font-bold tabular-nums`}>
              <span data-nutrient="fiber" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.fiber} {newMealNutrition.fiber}g</span>
              <span data-nutrient="salt" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.salt} {newMealNutrition.salt}g</span>
              {settings.trackSugar && <span data-nutrient="sugar" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.sugar} {newMealNutrition.sugar}g</span>}
            </div>
          </div>}
        </div>
      )}
    </Modal>
  );
}
