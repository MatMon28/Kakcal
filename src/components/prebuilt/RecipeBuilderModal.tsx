import React from 'react';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { FoodResultRow } from '../common/FoodResultRow';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { Plus, Trash2, Check, ArrowLeft, Link2, X, Search, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { MacroPills } from '../common/MacroPills';
import { NumericInput } from '../common/NumericInput';
import { scrollFadeY } from '../../utils/scrollFade';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { isSamePortion, portionFractions } from '../../utils/portionFractions';
import type { LibraryState } from './usePreBuiltMealsState';

export const RecipeBuilderModal: React.FC<{ s: LibraryState }> = ({ s }) => {
  const {
    allFoods, rememberFood, settings, t, j, isRecipeOpen, editingRecipeId, recipeName,
    setRecipeName, recipeIngs, setRecipeIngs, recipePendingFood, setRecipePendingFood,
    recipePendingAmt, setRecipePendingAmt, recipeSearch, setRecipeSearch, recipePortion,
    setRecipePortion, nameOf, recipeResults, favoriteOneChar, recipeTotals,
    saveRecipe, searchInput, importSummary, clearImportSummary, searchUnmatched, addSeasoning,
    requestCloseRecipeModal, confirmCloseRecipe, confirmDiscardRecipe, cancelDiscardRecipe,
  } = s;

  // Quick portions are fractions of the WHOLE recipe (see utils/portionFractions.ts), so a recipe
  // that arrived with its portion already computed still offers 1/2 of the full weight.
  const fractions = portionFractions(recipeTotals.grams);
  return (
    <>
      {/* ============ Create / Edit recipe modal ============ */}
      <Modal
        dockId="recipe"
        isOpen={isRecipeOpen}
        onClose={requestCloseRecipeModal}
        title={
          recipePendingFood
            ? nameOf(recipePendingFood)
            : editingRecipeId
            ? t.prebuilt.edit
            : t.prebuilt.recipeTitle
        }
        maxWidth="max-w-xl"
      >
        {recipePendingFood ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setRecipePendingFood(null)}
              className="pressable inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              <span>{t.common.back}</span>
            </button>

            <div className="kc-modal-banner flex items-center justify-between bg-[#E2D6FF] rounded-2xl px-4 py-3 tabular-nums">
              <span className="text-xs font-bold text-[#4D3582]">
                {recipePendingFood.calories} kcal / 100{recipePendingFood.unit}
              </span>
              <span className="text-xl font-extrabold text-[#1F1636]">
                {Math.round((recipePendingFood.calories * recipePendingAmt) / 100)} kcal
              </span>
            </div>

            <AmountSelector value={recipePendingAmt} onChange={setRecipePendingAmt} unit={recipePendingFood.unit} />

            <FoodMacroGrid food={recipePendingFood} amount={recipePendingAmt} />

            <button
              type="button"
              disabled={recipePendingAmt <= 0}
              onClick={() => {
                if (recipePendingAmt > 0) {
                  setLastAmount(recipePendingFood.id, recipePendingAmt);
                  setRecipeIngs((prev) => [...prev, { foodId: recipePendingFood.id, amount: recipePendingAmt }]);
                }
                setRecipePendingFood(null);
                setRecipeSearch('');
              }}
              className="kc-primary-btn pressable w-full py-3 bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>{t.prebuilt.addIngredient}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <input
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder={t.prebuilt.recipeNamePlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)]"
            />


            {/* Imported from a link: what was read, what was matched, and the lines still to fix. */}
            {importSummary && (
              <div data-recipe-import className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex items-center gap-1.5">
                    <Link2 size={13} className="shrink-0 text-[var(--muted)]" />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-extrabold text-[var(--text)] truncate">
                        {j('Imported recipe', 'Ricetta importata')}{importSummary.source ? ` · ${importSummary.source}` : ''}
                      </span>
                      <span className="block text-[10px] font-medium text-[var(--muted)] tabular-nums">
                        {importSummary.total > 0
                          ? j(
                              `${importSummary.matched} of ${importSummary.total} ingredients matched · ${Math.round(importSummary.coverage * 100)}% of the weight`,
                              `${importSummary.matched} di ${importSummary.total} ingredienti abbinati · ${Math.round(importSummary.coverage * 100)}% del peso`,
                            )
                          : j('No ingredients matched yet', 'Nessun ingrediente abbinato')}
                      </span>
                      <span className="block text-[10px] font-medium text-[var(--muted)] tabular-nums">
                        {importSummary.portionSource === 'servings'
                          ? j(
                              `Portion ${importSummary.portion} g computed from ${importSummary.servings} servings`,
                              `Porzione ${importSummary.portion} g calcolata da ${importSummary.servings} porzioni`,
                            )
                          : j('No servings on the page: portion set to 100 g', 'Nessuna porzione nella pagina: porzione a 100 g')}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={clearImportSummary}
                    className="pressable shrink-0 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center"
                    aria-label={j('Hide import notes', 'Nascondi le note di importazione')}
                  >
                    <X size={13} />
                  </button>
                </div>

                {importSummary.warnings.filter((w) => w === 'no-matches' || w === 'few-matches').map((warning) => (
                  <p key={warning} className="flex items-start gap-1.5 text-[10px] font-bold leading-relaxed text-[#8C5A16]">
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    <span>
                      {warning === 'no-matches'
                        ? j(
                            'None of the ingredients was found, so this recipe has no nutrition yet. Search for them below.',
                            'Nessun ingrediente è stato trovato: la ricetta non ha ancora valori nutrizionali. Cercali qui sotto.',
                          )
                        : j(
                            'Only part of the recipe was matched — check the amounts and the products below.',
                            'Solo una parte della ricetta è stata abbinata — controlla gli importi e i prodotti qui sotto.',
                          )}
                    </span>
                  </p>
                ))}

                {importSummary.warnings.includes('multiple-recipes') && (
                  <p className="flex items-start gap-1.5 text-[10px] font-medium leading-relaxed text-[var(--muted)]">
                    <Info size={11} className="shrink-0 mt-0.5" />
                    <span>
                      {j(
                        'The page lists more than one recipe: the first one was imported.',
                        'La pagina contiene più di una ricetta: è stata importata la prima.',
                      )}
                    </span>
                  </p>
                )}

                {importSummary.warnings.includes('duplicates') && (
                  <p className="flex items-start gap-1.5 text-[10px] font-medium leading-relaxed text-[var(--muted)]">
                    <Info size={11} className="shrink-0 mt-0.5" />
                    <span>
                      {j('Ingredient lines listed twice were removed.', 'Le righe di ingredienti ripetute due volte sono state rimosse.')}
                    </span>
                  </p>
                )}

                {/* "Sale q.b.", "a pinch of pepper": real lines, no real amount. Kept out of the
                    totals so they cannot distort them, and one tap away when the user wants them. */}
                {importSummary.seasonings.length > 0 && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[10px] font-extrabold text-[var(--muted)]">
                      <Sparkles size={11} className="shrink-0" />
                      {j('To taste — not counted. Tap to add:', 'Quanto basta — non conteggiati. Tocca per aggiungere:')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {importSummary.seasonings.map((line, idx) => (
                        <button
                          key={`${line.query}-${idx}`}
                          type="button"
                          onClick={() => addSeasoning(idx)}
                          className="pressable inline-flex items-center gap-1 max-w-full rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] px-2 py-1 text-[10px] font-bold text-[var(--text)]"
                          title={line.raw}
                        >
                          <Plus size={10} className="shrink-0" />
                          <span className="truncate">{line.query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {importSummary.unmatched.length > 0 && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[10px] font-extrabold text-[#8C5A16]">
                      <AlertTriangle size={11} className="shrink-0" />
                      {j('Not found in your foods — tap to search and add:', 'Non trovati nei tuoi alimenti — tocca per cercare e aggiungere:')}
                    </p>
                    <div className="space-y-1">
                      {importSummary.unmatched.map((line, idx) => (
                        <button
                          key={`${line.query}-${idx}`}
                          type="button"
                          onClick={() => searchUnmatched(line.query, idx)}
                          className="pressable w-full text-left px-2 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--hover)] flex items-center justify-between gap-2"
                        >
                          <span className="min-w-0 text-[10px] font-bold text-[var(--text)] truncate">{line.raw}</span>
                          <span className="shrink-0 flex items-center gap-1 text-[10px] font-extrabold text-[var(--muted)]">
                            <Search size={11} />
                            {j('Search', 'Cerca')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ingredient search — same behaviour as Add Food (favourites first and starred). Placed ABOVE the ingredients already in the recipe. */}
            <div className="space-y-2">
              {searchInput(recipeSearch, setRecipeSearch, t.foodModal.searchPlaceholder)}
              {recipeSearch.trim().length === 1 && (
                favoriteOneChar(recipeSearch).length > 0 ? (
                  <div ref={scrollFadeY} className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] max-h-52 overflow-y-auto">
                    {favoriteOneChar(recipeSearch).map((food) => (
                      <FoodResultRow
                        key={food.id}
                        food={food}
                        favorite
                        onClick={() => {
                          rememberFood(food);
                          setRecipePendingFood(food);
                          setRecipePendingAmt(getDefaultAmount(food));
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-[var(--muted)] px-1">{t.foodModal.minCharsHint}</p>
                )
              )}
              {recipeSearch.trim().length >= 2 && (
                <div ref={scrollFadeY} className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] max-h-52 overflow-y-auto">
                  {recipeResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--muted)]">{t.foodModal.noResults}</div>
                  ) : (
                    recipeResults.map((food) => (
                      <FoodResultRow
                        key={food.id}
                        food={food}
                        favorite
                        onClick={() => {
                          rememberFood(food);
                          setRecipePendingFood(food);
                          setRecipePendingAmt(getDefaultAmount(food));
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>


            {recipeIngs.length > 0 && (
              <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold tabular-nums text-[var(--text)]">
                    {t.prebuilt.ingredientsCount.replace('{count}', String(recipeIngs.length))} · {recipeTotals.grams}g
                  </span>
                </div>
                <div data-nutrition-row className="flex min-w-0 items-center gap-3">
                  <span data-calories className="shrink-0 whitespace-nowrap text-xs font-extrabold tabular-nums text-[var(--text)]">
                    {recipeTotals.kcal100} <span className="text-[11px] font-semibold text-[var(--muted)]">kcal/100g</span>
                  </span>
                  <MacroPills carbs={recipeTotals.c100} protein={recipeTotals.p100} fat={recipeTotals.f100} stretch />
                </div>
                <div className={`grid ${settings.trackSugar ? 'grid-cols-3' : 'grid-cols-2'} gap-1 text-center text-[10px] font-bold tabular-nums`}>
                  <span data-nutrient="fiber" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.fiber} {recipeTotals.fib100}g</span>
                  <span data-nutrient="salt" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.salt} {recipeTotals.salt100}g</span>
                  {settings.trackSugar && <span data-nutrient="sugar" className="bg-nutrient text-nutrient-ink rounded-lg py-1">{t.macros.sugar} {recipeTotals.sugar100}g</span>}
                </div>
                {/* Standard portion: e.g. a 1000 g recipe with a 250 g portion is logged as 250 g by default. */}
                <div data-recipe-portion className="rounded-xl bg-[var(--surface)] px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold text-[var(--text)]">{j('Standard portion', 'Porzione standard')}</span>
                      <span className="block text-[10px] font-medium text-[var(--muted)]">
                        {j(`Logged by default instead of 100 g (recipe: ${recipeTotals.grams} g).`, `Registrata di default al posto di 100 g (ricetta: ${recipeTotals.grams} g).`)}
                      </span>
                    </span>
                    <div className="w-28 shrink-0">
                      <NumericInput
                        ariaLabel={j('Standard portion in grams', 'Porzione standard in grammi')}
                        value={recipePortion}
                        onChange={setRecipePortion}
                        unit="g"
                        min={0}
                        max={Math.max(recipeTotals.grams, 1) * 2}
                        placeholder="100"
                        className="!py-2 !text-sm"
                      />
                    </div>
                  </div>
                  {fractions.length > 0 && (
                    <div className="space-y-1">
                      <span className="block text-[9px] font-bold text-[var(--muted)]">
                        {j(
                          `Fractions of the whole recipe (${recipeTotals.grams} g), not of the portion:`,
                          `Frazioni della ricetta intera (${recipeTotals.grams} g), non della porzione:`,
                        )}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {fractions.map(({ parts, grams }) => {
                          const active = isSamePortion(recipePortion, grams);
                          return (
                            <button
                              key={parts}
                              type="button"
                              aria-pressed={active}
                              title={j(`${parts === 2 ? 'Half' : `A ${parts}th of`} the whole recipe (${recipeTotals.grams} g)`, `${parts}ª parte della ricetta intera (${recipeTotals.grams} g)`)}
                              onClick={() => setRecipePortion(active ? 0 : grams)}
                              className={`pressable px-2.5 py-1 rounded-full text-[11px] font-bold border tabular-nums ${active ? 'bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F5]' : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--hover)]'}`}
                            >
                              1/{parts} · {grams} g
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div ref={scrollFadeY} className="space-y-1.5 max-h-32 overflow-y-auto">
                  {recipeIngs.map((ing, idx) => {
                    const food = allFoods.find((f) => f.id === ing.foodId);
                    return (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-[var(--surface)] flex items-center justify-between gap-2 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (food) {
                              setRecipeIngs((prev) => prev.filter((_, i) => i !== idx));
                              setRecipePendingFood(food);
                              setRecipePendingAmt(ing.amount);
                            }
                          }}
                          className="font-bold text-[var(--text)] truncate text-left hover:underline"
                        >
                          {food ? nameOf(food) : ing.foodId} ({ing.amount}
                          {food?.unit || 'g'})
                          {importSummary?.lowConfidence.some((w) => w.foodId === ing.foodId) && (
                            <span
                              className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-[#FAE0B4] px-1.5 py-0.5 text-[9px] font-extrabold text-[#7D4E14] align-middle"
                              title={j('Check this match', 'Controlla questo abbinamento')}
                            >
                              <AlertTriangle size={9} />
                              {j('check', 'controlla')}
                            </span>
                          )}
                        </button>
                        {food && (
                          <span className="ml-auto flex items-center gap-1.5 shrink-0 tabular-nums">
                            <MacroPills
                              carbs={food.carbs == null ? null : (food.carbs * ing.amount) / 100}
                              protein={food.protein == null ? null : (food.protein * ing.amount) / 100}
                              fat={food.fat == null ? null : (food.fat * ing.amount) / 100}
                            />
                            <span className="font-bold text-[var(--muted)]">{Math.round((food.calories * ing.amount) / 100)} kcal</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setRecipeIngs((prev) => prev.filter((_, i) => i !== idx))}
                          className="pressable w-6 h-6 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center shrink-0"
                          aria-label={t.common.delete}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {recipeIngs.length > 0 && (
              <button
                type="button"
                onClick={saveRecipe}
                disabled={!recipeName.trim() || recipeIngs.every((i) => i.amount <= 0)}
                className="kc-primary-btn pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40"
              >
                <Check size={18} strokeWidth={2.5} />
                <span>
                  {t.common.save} · {t.prebuilt.recipeNote}: {recipeTotals.kcal100} kcal
                </span>
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Closing with ingredients already added throws work away: ask first. */}
      <ConfirmDialog
        open={confirmCloseRecipe}
        title={j('Discard this recipe?', 'Scartare la ricetta?')}
        message={j(
          `The ${recipeIngs.length} ingredient${recipeIngs.length === 1 ? '' : 's'} you added will be lost.`,
          `I ${recipeIngs.length} ingredienti aggiunti andranno persi.`,
        )}
        confirmLabel={j('Discard', 'Scarta')}
        onConfirm={confirmDiscardRecipe}
        onCancel={cancelDiscardRecipe}
      />
    </>
  );
};
