import React from 'react';
import { getDefaultAmount } from '../../utils/amountMemory';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { Plus, Trash2, Edit2, ChefHat as ChefHatIcon, ChevronDown } from 'lucide-react';
import { MacroPills } from '../common/MacroPills';
import { LibraryPhoto } from '../journal/PhotoDiary';
import { LibrarySectionHeader } from '../common/LibrarySectionHeader';
import type { LibraryState } from './usePreBuiltMealsState';

export const RecipesSection: React.FC<{ s: LibraryState }> = ({ s }) => {
  const {
    allFoods, t, autoMealSlot, ultraMinimal, savedRecipes, recipeQuery, setRecipeQuery,
    setActiveRecipeToLog, setRecipeLogSlot, setRecipeLogAmount, openRecipes, setOpenRecipes,
    sectionsOpen, toggleSection, setPendingDelete, nameOf, openRecipeModal, openEditRecipeModal,
    visibleRecipes,
  } = s;
  return (
    <>
      <section data-library-section="recipes" className={`bg-[#E2D6FF] border border-[#C9B8F2] rounded-3xl ${ultraMinimal ? 'p-2 sm:p-3 space-y-2' : 'p-4 sm:p-5 space-y-3'}`} data-section-open={sectionsOpen.recipes}>
        <LibrarySectionHeader
          title={t.prebuilt.recipesTitle}
          tone="recipes"
          icon={<ChefHatIcon size={16} />}
          count={savedRecipes.length}
          createLabel={t.prebuilt.createRecipe}
          onCreate={openRecipeModal}
          searchLabel={t.prebuilt.searchRecipes}
          query={recipeQuery}
          setQuery={setRecipeQuery}
          open={sectionsOpen.recipes}
          onToggle={() => toggleSection('recipes')}
        />

        <div className="accordion-grid" data-open={sectionsOpen.recipes} inert={!sectionsOpen.recipes}>
        <div className="accordion-inner">
        {savedRecipes.length === 0 ? (
          ultraMinimal ? <div className="min-h-2" aria-hidden="true" /> :
          <p className="kc-section-empty text-xs font-medium text-[#4D3582] px-1 py-1">
            {t.prebuilt.noRecipes}
          </p>
        ) : visibleRecipes.length === 0 ? (
          ultraMinimal ? <div className="min-h-2" aria-hidden="true" /> :
          <p className="kc-section-empty text-xs font-medium text-[#4D3582] px-1 py-2 text-center">
            {t.prebuilt.noMatches}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {visibleRecipes.map((recipe) => {
              const isOpen = openRecipes.includes(recipe.id);
              return (
                <div key={recipe.id} data-library-card data-library-id={recipe.id} className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl ${ultraMinimal ? 'p-2.5 gap-2' : 'p-3.5 gap-2.5'} flex flex-col`}>
                  {/* Title/actions first; calories and number-only macros share the full-width row below. */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenRecipes((prev) =>
                          prev.includes(recipe.id) ? prev.filter((x) => x !== recipe.id) : [...prev, recipe.id]
                        )
                      }
                      className="min-w-0 flex-1 flex items-start justify-between gap-1.5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm sm:text-base font-extrabold text-[var(--text)]" title={nameOf(recipe)}>
                          {nameOf(recipe)}
                        </span>

                      </span>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 mt-1 text-[var(--muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditRecipeModal(recipe)}
                        title={t.common.edit}
                        aria-label={`${t.common.edit}: ${nameOf(recipe)}`}
                        className="pressable size-8 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: 'recipe', id: recipe.id, name: nameOf(recipe) })}
                        title={t.common.delete}
                        aria-label={`${t.common.delete}: ${nameOf(recipe)}`}
                        className="pressable size-8 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRecipeToLog(recipe);
                          setRecipeLogSlot(autoMealSlot());
                          setRecipeLogAmount(getDefaultAmount(recipe));
                        }}
                        title={t.prebuilt.logRecipe}
                        aria-label={`${t.prebuilt.logRecipe}: ${nameOf(recipe)}`}
                        className={`kc-action-pill pressable ${ultraMinimal ? 'size-8 px-0' : 'h-8 px-3'} bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-xl text-[11px] flex items-center justify-center gap-1`}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span className={ultraMinimal ? 'sr-only' : 'whitespace-nowrap'}>{t.common.log}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-nutrition-row
                    onClick={() => setOpenRecipes((prev) => prev.includes(recipe.id) ? prev.filter((id) => id !== recipe.id) : [...prev, recipe.id])}
                    aria-expanded={isOpen}
                    aria-label={`${nameOf(recipe)}: ${isOpen ? t.common.collapse : t.common.expand}`}
                    className="flex w-full min-w-0 items-center gap-3 text-left"
                  >
                    <span data-calories className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)]">
                      {recipe.calories} {!ultraMinimal && <span className="text-[11px] font-semibold text-[var(--muted)]">kcal/100{recipe.unit}</span>}
                    </span>
                    <MacroPills carbs={recipe.carbs} protein={recipe.protein} fat={recipe.fat} stretch />
                  </button>

                  <div className="accordion-grid" data-open={isOpen} inert={!isOpen}>
                    <div className="accordion-inner">
                      <div className="pt-1 space-y-2.5 border-t border-[var(--border)]">
                        <LibraryPhoto linkedId={recipe.id} title={nameOf(recipe)} />
                        <div className="pt-2"><FoodMacroGrid food={recipe} amount={100} mode={ultraMinimal ? 'minimal' : 'facts'} /></div>

                        {/* Ingredients with their original quantities */}
                        <div>
                          {!ultraMinimal && (
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                              {t.prebuilt.recipeIngredients.replace('{count}', String(recipe.recipeIngredients?.length ?? 0))}
                            </span>
                          )}
                          {recipe.recipeIngredients && recipe.recipeIngredients.length > 0 ? (
                            <div data-library-ingredients className="bg-[var(--surface)] rounded-2xl p-2.5 divide-y divide-[var(--border)]">
                              {recipe.recipeIngredients.map((ing, idx) => {
                                const food = allFoods.find((f) => f.id === ing.foodId);
                                const kcal = food ? Math.round((food.calories * ing.amount) / 100) : null;
                                return (
                                  <div key={idx} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                                    <span className="font-medium truncate text-[var(--text)]">
                                      {food ? nameOf(food) : ing.foodId}
                                    </span>
                                    <span className="flex items-center gap-2 shrink-0 tabular-nums">
                                      {kcal !== null && <span className="text-[var(--muted)]">{kcal}{!ultraMinimal && ' kcal'}</span>}
                                      <span className="font-bold text-[var(--muted)]">
                                        {ing.amount}
                                        {!ultraMinimal && (food?.unit || 'g')}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] font-medium text-[var(--muted)]">
                              {t.prebuilt.recipeNoIngredients}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
        </div>
      </section>
    </>
  );
};
