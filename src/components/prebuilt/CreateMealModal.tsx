import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { AmountSelector } from '../common/AmountSelector';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { IngredientPicker } from '../common/IngredientPicker';
import { MacroPills } from '../common/MacroPills';
import { Modal } from '../common/Modal';
import { useRemovalScope } from '../common/UndoRemovalNotice';
import { WorkflowFooter } from '../common/WorkflowFooter';
import { scrollFadeX } from '../../utils/scrollFade';
import { removeWithUndo } from '../../utils/undoRemoval';
import type { LibraryState } from './usePreBuiltMealsState';

export function CreateMealModal({ s }: { s: LibraryState }) {
  const { foodById, t, j, mealSlots, isCreateOpen, setIsCreateOpen, editingMealId, newMealName, setNewMealName,
    newMealDesc, setNewMealDesc, newMealSlot, setNewMealSlot, newIngredients, setNewIngredients,
    pendingFood, setPendingFood, pendingAmount, setPendingAmount, pendingIngredient, setPendingIngredient,
    nameOf, newMealNutrition, handleSelectFood, handleConfirmAndAddAnother, handleSaveMeal } = s;
  const [picking, setPicking] = useState(false);
  const undoScope = useRemovalScope();
  const valid = Number.isFinite(pendingAmount) && pendingAmount > 0;
  const back = pendingFood ? () => { setPendingFood(null); setPendingIngredient(null); setPicking(!pendingIngredient); } : picking ? () => setPicking(false) : undefined;
  const input = 'mt-1 w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-[var(--text)] text-sm font-bold';

  return (
    <Modal dockId="meal" isOpen={isCreateOpen} onClose={back ?? (() => setIsCreateOpen(false))} onBack={back} maxWidth="max-w-xl"
      bodyKey={pendingFood ? 'amount' : picking ? 'picker' : 'meal'}
      title={pendingFood ? nameOf(pendingFood) : picking ? j('Choose an ingredient', 'Scegli un ingrediente') : editingMealId ? t.prebuilt.edit : t.prebuilt.newModalTitle}
      footer={<WorkflowFooter
        more={pendingFood ? j('Add more', 'Aggiungi altro') : t.prebuilt.addIngredient}
        onMore={pendingFood ? () => { handleConfirmAndAddAnother(); setPicking(true); } : !picking ? () => setPicking(true) : undefined}
        moreDisabled={Boolean(pendingFood && !valid)} primary={t.prebuilt.saveMeal}
        onPrimary={() => handleSaveMeal(Boolean(pendingFood))} disabled={pendingFood ? !valid : newIngredients.length === 0}
      />}
    >
      {pendingFood ? (
        <div className="space-y-3.5">
          <AmountSelector value={pendingAmount} onChange={setPendingAmount} unit={pendingFood.unit} />
          <FoodMacroGrid food={pendingFood} amount={pendingAmount} />
        </div>
      ) : picking ? (
        <IngredientPicker onPick={handleSelectFood} slot={newMealSlot} />
      ) : (
        <div className="space-y-3.5">
          <label className="block text-xs font-bold text-[var(--muted)]">{j('Meal name', 'Nome del pasto')}
            <input value={newMealName} onChange={(e) => setNewMealName(e.target.value)} placeholder={t.prebuilt.mealNamePlaceholder} className={input} />
          </label>
          <label className="block text-xs font-bold text-[var(--muted)]">{j('Description (optional)', 'Descrizione (facoltativa)')}
            <input value={newMealDesc} onChange={(e) => setNewMealDesc(e.target.value)} placeholder={t.prebuilt.descPlaceholder} className={input} />
          </label>
          <div ref={scrollFadeX} className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {mealSlots.map(({ id, label }) => <button key={id} type="button" aria-pressed={newMealSlot === id} onClick={() => setNewMealSlot(id)} data-slot-chip
              className={`pressable px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${newMealSlot === id
                ? 'kc-chip-active bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]' : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'}`}>{label}</button>)}
          </div>
          {newIngredients.length > 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-3 space-y-2">
              <div className="flex justify-between items-center gap-2 text-xs font-extrabold">
                <span>{t.prebuilt.ingredientsCount.replace('{count}', String(newIngredients.length))}</span><span>{newMealNutrition.totalKcal} kcal</span>
              </div>
              {newIngredients.map((ingredient, index) => {
                const food = foodById.get(ingredient.foodId);
                const name = food ? nameOf(food) : ingredient.foodId;
                return <div key={index} className="rounded-xl bg-[var(--surface)] px-2.5 py-1.5 text-xs flex flex-wrap items-center gap-1.5">
                  <button type="button" disabled={!food} onClick={() => food && handleSelectFood(food, ingredient.amount, ingredient)}
                    className="pressable flex items-center gap-1.5 min-h-8 font-bold text-left flex-1 min-w-32"><Pencil size={13} className="shrink-0" /> {name} · {ingredient.amount} {food?.unit ?? 'g'}</button>
                  {food && <MacroPills carbs={food.carbs == null ? null : food.carbs * ingredient.amount / 100}
                    protein={food.protein == null ? null : food.protein * ingredient.amount / 100} fat={food.fat == null ? null : food.fat * ingredient.amount / 100} />}
                  <button type="button" aria-label={`${t.common.delete}: ${name}`} className="pressable w-8 h-8 grid place-items-center rounded-full hover:bg-[#F6D0D0] hover:text-[#8C2D32]"
                    onClick={() => removeWithUndo(newIngredients, index, setNewIngredients, undoScope)}><Trash2 size={14} /></button>
                </div>;
              })}
            </div>
          ) : <p className="text-sm text-[var(--muted)]">{j('Add an ingredient to start building your meal.', 'Aggiungi un ingrediente per iniziare a creare il pasto.')}</p>}
        </div>
      )}
    </Modal>
  );
}
