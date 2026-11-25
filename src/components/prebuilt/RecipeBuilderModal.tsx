import { useId, useState } from 'react';
import { CircleAlert, Link2, Pencil, Search, Trash2 } from 'lucide-react';
import type { FoodItem } from '../../types';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { isSamePortion, portionFractions } from '../../utils/portionFractions';
import type { RecipeReviewLine } from '../../utils/recipeImport';
import { removeWithUndo } from '../../utils/undoRemoval';
import { AmountSelector } from '../common/AmountSelector';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { IngredientPicker } from '../common/IngredientPicker';
import { CollapseArrow, CollapseBody } from '../common/InlineCollapse';
import { MacroPills } from '../common/MacroPills';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { useRemovalScope } from '../common/UndoRemovalNotice';
import { WorkflowFooter } from '../common/WorkflowFooter';
import type { LibraryState } from './usePreBuiltMealsState';

const smallButton = 'pressable inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] text-xs font-bold text-[var(--text)]';

export function RecipeBuilderModal({ s }: { s: LibraryState }) {
  const {
    foodById, rememberFood, settings, t, j, isRecipeOpen, editingRecipeId, recipeName, setRecipeName,
    recipeRows, setRecipeRows, recipeIngs, recipePortion, setRecipePortion, nameOf, recipeTotals,
    saveRecipe, importSummary, requestCloseRecipeModal, confirmCloseRecipe, confirmDiscardRecipe, cancelDiscardRecipe,
  } = s;
  const [step, setStep] = useState<'review' | 'recap'>('review');
  const [picker, setPicker] = useState<{ row?: RecipeReviewLine; query?: string } | null>(null);
  const [editingAmount, setEditingAmount] = useState<RecipeReviewLine | null>(null);
  const [amount, setAmount] = useState(0);
  const [portionOpen, setPortionOpen] = useState(false);
  const [customPortion, setCustomPortion] = useState(false);
  const portionId = useId();
  const undoScope = useRemovalScope();
  const missing = recipeRows.filter((row) => !row.optional && (!row.foodId || !foodById.has(row.foodId)));
  const canRecap = recipeIngs.length > 0 && missing.length === 0;
  const editedFood = editingAmount?.foodId ? foodById.get(editingAmount.foodId) : undefined;
  const safeAmount = Number.isFinite(amount) && amount > 0;

  const chooseFood = (food: FoodItem, pickedAmount?: number, row = picker?.row) => {
    if (food.id === editingRecipeId) return;
    rememberFood(food);
    const previousUnit = (row?.foodId ? foodById.get(row.foodId)?.unit : undefined) ?? row?.automatic?.unit ?? 'g';
    const nextAmount = pickedAmount ?? (row && row.amount > 0 && previousUnit === food.unit ? row.amount : getDefaultAmount(food));
    if (row) setRecipeRows((current) => current.map((item) => item.id === row.id ? { ...item, foodId: food.id, amount: nextAmount } : item));
    else setRecipeRows((current) => [...current, { id: `added-${Date.now()}-${Math.random().toString(36).slice(2)}`, foodId: food.id, amount: nextAmount }]);
    setPicker(null);
  };
  const effectivePortion = importSummary && !customPortion
    ? (importSummary.servings ? Math.max(1, Math.round(recipeTotals.grams / importSummary.servings)) : 100)
    : recipePortion;
  const enterRecap = () => { if (canRecap) setStep('recap'); };
  const setPortion = (value: number) => { setCustomPortion(true); setRecipePortion(value); };
  const add = () => { setStep('review'); setPicker({}); };
  const back = picker ? () => setPicker(null) : editingAmount ? () => setEditingAmount(null) : step === 'recap' ? () => setStep('review') : undefined;
  const remove = (index: number) => removeWithUndo(recipeRows, index, setRecipeRows, undoScope, (a, b) => a.id === b.id);
  const suggestions = picker?.row ? [picker.row.automatic, ...(picker.row.alternatives ?? [])]
    .filter((food): food is FoodItem => Boolean(food)).filter((food, i, list) => list.findIndex((entry) => entry.id === food.id) === i) : [];

  return (
    <>
      <Modal
        dockId="recipe" isOpen={isRecipeOpen} onClose={back ?? requestCloseRecipeModal} onBack={back} maxWidth="max-w-xl"
        bodyKey={picker ? 'picker' : editingAmount ? 'amount' : step}
        title={picker ? j('Choose an ingredient', 'Scegli un ingrediente') : editedFood ? nameOf(editedFood) : step === 'review'
          ? j('Review ingredients', 'Controlla gli ingredienti') : j('Recipe recap', 'Riepilogo ricetta')}
        subtitle={picker?.row?.raw ?? (!picker && !editingAmount ? (step === 'review' ? j('Step 1 of 2', 'Passaggio 1 di 2') : j('Step 2 of 2', 'Passaggio 2 di 2')) : undefined)}
        footer={editingAmount ? <WorkflowFooter
          primary={j('Save amount', 'Salva quantità')} disabled={!safeAmount} onPrimary={() => {
            if (!editedFood || !safeAmount) return;
            setLastAmount(editedFood.id, amount);
            setRecipeRows((rows) => rows.map((row) => row.id === editingAmount.id ? { ...row, amount } : row));
            setEditingAmount(null);
          }}
        /> : !picker && (step === 'review' ? <WorkflowFooter
          more={t.prebuilt.addIngredient} onMore={add} primary={j('Continue to portions', 'Continua alle porzioni')}
          onPrimary={enterRecap} disabled={!canRecap}
        /> : <WorkflowFooter
          more={j('Add more', 'Aggiungi altro')} onMore={add} primary={j('Save recipe', 'Salva ricetta')}
          onPrimary={() => saveRecipe(effectivePortion)} disabled={!recipeName.trim() || !canRecap}
        />)}
      >
        {picker ? (
          <IngredientPicker onPick={chooseFood} initialQuery={picker.query} suggestions={suggestions} excludeId={editingRecipeId} />
        ) : editedFood && editingAmount ? (
          <div className="space-y-3.5">
            <AmountSelector value={amount} onChange={setAmount} unit={editedFood.unit} />
            <FoodMacroGrid food={editedFood} amount={amount} />
          </div>
        ) : (
          <div className="space-y-3.5">
            <label className="block text-xs font-bold text-[var(--muted)]">
              {j('Recipe name', 'Nome della ricetta')}
              <input value={recipeName} onChange={(event) => setRecipeName(event.target.value)} placeholder={t.prebuilt.recipeNamePlaceholder}
                className="mt-1 w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[var(--text)]" />
            </label>
            {step === 'review' ? (
              <div className="space-y-2.5" data-ingredient-review>
                {importSummary && <div data-recipe-import className="flex items-start gap-2 rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5 text-xs text-[var(--muted)]">
                  <Link2 size={16} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="font-extrabold text-[var(--text)]">{j('Imported recipe', 'Ricetta importata')}{importSummary.source ? ` · ${importSummary.source}` : ''}</p>
                    <p>{j('Compare the original ingredient with the matched food. Replace or remove any line before continuing.', 'Confronta l’ingrediente originale con l’alimento abbinato. Sostituisci o rimuovi le righe prima di continuare.')}</p>
                    {importSummary.warnings.includes('multiple-recipes') && <p>{j('This page listed several recipes; the first was used.', 'La pagina elencava più ricette; è stata usata la prima.')}</p>}
                    {importSummary.warnings.includes('duplicates') && <p>{j('Duplicate source lines were omitted.', 'Le righe duplicate sono state omesse.')}</p>}
                  </div>
                </div>}
                {missing.length > 0 && <p className="flex gap-1.5 text-xs font-bold text-[var(--text)]"><CircleAlert size={15} className="shrink-0" />
                  {j(`Choose a food for each unmatched ingredient or remove it (${missing.length} left).`, `Scegli un alimento per ogni ingrediente senza abbinamento o rimuovilo (${missing.length} rimasti).`)}</p>}
                {recipeRows.length === 0 && <p className="text-sm text-[var(--muted)]">{j('Add ingredients first. You can set their amounts and the recipe portion on the next screen.', 'Aggiungi prima gli ingredienti. Puoi impostare le quantità e la porzione nel passaggio successivo.')}</p>}
                {recipeRows.map((row, index) => {
                  const selected = row.foodId ? foodById.get(row.foodId) : undefined;
                  const rowName = row.raw ?? (selected ? nameOf(selected) : row.foodId ?? '');
                  return (
                    <article key={row.id} data-review-line className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-3 space-y-2.5">
                      {row.raw && <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{j('Original ingredient', 'Ingrediente originale')}</p>
                          <p className="text-xs font-extrabold break-words">{row.raw}</p></div>
                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{j('Automatic match', 'Abbinamento automatico')}</p>
                          <p className="text-xs font-extrabold break-words">{row.automatic ? nameOf(row.automatic) : j('No match', 'Nessun abbinamento')}</p>
                          {row.automatic && row.confidence && row.confidence !== 'high' && <span className="text-[10px] font-bold text-[var(--muted)]">{j('Check match', 'Verifica abbinamento')}</span>}
                        </div>
                      </div>}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs min-w-0 break-words font-bold">
                          {row.raw && <span className="text-[var(--muted)] mr-1">{j('Selected:', 'Selezionato:')}</span>}
                          {selected ? nameOf(selected) : row.optional ? j('Optional · not counted', 'Facoltativo · non conteggiato') : j('Needs a food', 'Scegli un alimento')}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!selected && row.automatic && <button type="button" className={smallButton} onClick={() => chooseFood(row.automatic!, undefined, row)}>{j('Use match', 'Usa abbinamento')}</button>}
                          <button type="button" className={smallButton} aria-label={selected ? j(`Change ${rowName}`, `Sostituisci ${rowName}`) : j(`Search for ${rowName}`, `Cerca ${rowName}`)}
                            onClick={() => setPicker({ row, query: row.query })}>
                            {selected ? <Pencil size={13} /> : <Search size={13} />}{selected ? j('Change', 'Sostituisci') : j('Search', 'Cerca')}
                          </button>
                          <button type="button" className={`${smallButton} px-2.5`} onClick={() => remove(index)} aria-label={`${t.common.delete}: ${rowName}`}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div data-recipe-recap className="space-y-3">
                {missing.length > 0 && <p role="status" className="rounded-xl border border-[var(--border)] bg-[var(--inset)] p-2.5 text-xs font-bold">
                  {j('An ingredient still needs a food. Go back to review it before saving.', 'Un ingrediente non ha ancora un alimento. Torna al controllo prima di salvare.')}
                </p>}
                <div data-recipe-portion className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] px-3 py-2.5">
                  <button type="button" onClick={() => setPortionOpen((value) => !value)} aria-expanded={portionOpen} aria-controls={portionId}
                    className="pressable w-full flex items-center gap-3 min-h-8 text-left font-extrabold text-sm">
                    <span className="flex-1">{j('Standard portion', 'Porzione standard')}</span>
                    <span className="text-xs tabular-nums">{effectivePortion || 100} g</span><CollapseArrow open={portionOpen} />
                  </button>
                  <CollapseBody open={portionOpen} id={portionId}>
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-[var(--muted)] flex-1 min-w-36">{j(`Default amount when logging. Whole recipe: ${recipeTotals.grams} g.`, `Quantità predefinita per la registrazione. Ricetta intera: ${recipeTotals.grams} g.`)}</p>
                      <div className="w-28"><NumericInput ariaLabel={j('Standard portion in grams', 'Porzione standard in grammi')}
                        value={effectivePortion} onChange={setPortion} unit="g" min={0} max={Math.max(recipeTotals.grams, 100) * 2} placeholder="100" /></div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {portionFractions(recipeTotals.grams).map(({ parts, grams }) => <button key={parts} type="button" aria-pressed={isSamePortion(effectivePortion, grams)}
                        className={`${smallButton} aria-pressed:bg-[#E2D6FF] aria-pressed:text-[#4D3582]`} onClick={() => setPortion(isSamePortion(effectivePortion, grams) ? 0 : grams)}>1/{parts} · {grams} g</button>)}
                    </div>
                  </CollapseBody>
                </div>
                <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-3">
                  <div data-nutrition-row className="flex min-w-0 items-center gap-2">
                    <strong data-calories className="shrink-0 text-xs tabular-nums">{recipeTotals.kcal100} kcal/100 g</strong>
                    <MacroPills carbs={recipeTotals.c100} protein={recipeTotals.p100} fat={recipeTotals.f100} stretch />
                  </div>
                  <div className={`grid ${settings.trackSugar ? 'grid-cols-3' : 'grid-cols-2'} gap-1 text-center text-[10px] font-bold tabular-nums`}>
                    <span data-nutrient="fiber" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.fiber} {recipeTotals.fib100}g</span>
                    <span data-nutrient="salt" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.salt} {recipeTotals.salt100}g</span>
                    {settings.trackSugar && <span data-nutrient="sugar" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.sugar} {recipeTotals.sugar100}g</span>}
                  </div>
                  {recipeRows.map((row, index) => {
                    const food = row.foodId ? foodById.get(row.foodId) : undefined;
                    if (!food) return null;
                    return <div key={row.id} className="rounded-xl bg-[var(--surface)] px-3 py-1.5 flex items-center gap-2 text-xs">
                      <span className="flex-1 min-w-0 font-bold break-words">{nameOf(food)}</span>
                      <button type="button" className={smallButton} onClick={() => { setEditingAmount(row); setAmount(row.amount); }}
                        aria-label={j(`Change amount for ${nameOf(food)}`, `Modifica quantità per ${nameOf(food)}`)}><Pencil size={12} />{row.amount} {food.unit}</button>
                      <button type="button" className={smallButton} onClick={() => remove(index)} aria-label={`${t.common.delete}: ${nameOf(food)}`}><Trash2 size={14} /></button>
                    </div>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      {confirmCloseRecipe && <ConfirmDialog open title={j('Discard this recipe?', 'Scartare la ricetta?')}
        message={j('Your unsaved recipe changes will be lost.', 'Le modifiche non salvate alla ricetta andranno perse.')}
        confirmLabel={j('Discard', 'Scarta')} onConfirm={confirmDiscardRecipe} onCancel={cancelDiscardRecipe} />}
    </>
  );
}
