import React from 'react';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { formatKcal } from '../../utils/formatters';
import { UtensilsCrossed, Plus, Trash2, Edit2, ChevronDown } from 'lucide-react';
import { MacroPills } from '../common/MacroPills';
import { LibraryPhoto } from '../journal/PhotoDiary';
import { LibrarySectionHeader } from '../common/LibrarySectionHeader';
import { LazyBody } from '../common/LazyBody';
import type { LibraryState } from './usePreBuiltMealsState';

export const MealsSection: React.FC<{ s: LibraryState }> = ({ s }) => {
  const {
    preBuiltMeals, t, slotLabel, ultraMinimal, mealQuery, setMealQuery, openMeals,
    setOpenMeals, sectionsOpen, toggleSection, setPendingDelete, nameOf, calculateMealNutrition,
    openNewMealModal, openEditMealModal, handleOpenLogModal, visibleMeals, mealNutrition, foodById,
  } = s;
  return (
    <>
      <section data-library-section="meals" className={`bg-[#FAE0B4] border border-[#E8C68E] rounded-3xl ${ultraMinimal ? 'p-2 sm:p-3 space-y-2' : 'p-4 sm:p-5 space-y-3'}`} data-section-open={sectionsOpen.meals}>
        <LibrarySectionHeader
          title={t.prebuilt.title}
          tone="meals"
          icon={<UtensilsCrossed size={16} strokeWidth={2.2} />}
          count={preBuiltMeals.length}
          createLabel={t.prebuilt.createNew}
          onCreate={openNewMealModal}
          searchLabel={t.prebuilt.searchMeals}
          query={mealQuery}
          setQuery={setMealQuery}
          open={sectionsOpen.meals}
          onToggle={() => toggleSection('meals')}
        />

        <div className="accordion-grid" data-open={sectionsOpen.meals} inert={!sectionsOpen.meals}>
        <div className="accordion-inner">
        <LazyBody open={sectionsOpen.meals} defer>
        {preBuiltMeals.length === 0 ? (
          ultraMinimal ? <div className="min-h-2" aria-hidden="true" /> :
          <p className="kc-section-empty text-xs font-medium text-[#7D4E14] px-1 py-1">
            {t.common.emptyMeals}
          </p>
        ) : visibleMeals.length === 0 ? (
          ultraMinimal ? <div className="min-h-2" aria-hidden="true" /> :
          <p className="kc-section-empty text-xs font-medium text-[#7D4E14] px-1 py-2 text-center">
            {t.prebuilt.noMatches}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {visibleMeals.map((meal) => {
              const nut = mealNutrition.get(meal.id) ?? calculateMealNutrition(meal.ingredients);
              const isOpen = openMeals.includes(meal.id);
              return (
                <div
                  key={meal.id}
                  data-library-card
                  data-library-id={meal.id}
                  data-card-open={isOpen}
                  className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl ${ultraMinimal ? 'p-2.5 gap-2' : 'p-3.5 gap-2.5'} flex flex-col`}
                >
                  {/* Title/actions first; calories and number-only macros share the full-width row below. */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMeals((prev) =>
                          prev.includes(meal.id) ? prev.filter((x) => x !== meal.id) : [...prev, meal.id]
                        )
                      }
                      className="min-w-0 flex-1 flex items-start justify-between gap-1.5 text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text)]" title={meal.name}>
                            {meal.name}
                          </h3>
                          {meal.slot && !ultraMinimal && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                              {slotLabel(meal.slot)}
                            </span>
                          )}
                        </div>

                      </div>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 mt-1 text-[var(--muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div data-library-actions className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditMealModal(meal)}
                        title={t.common.edit}
                        aria-label={`${t.common.edit}: ${meal.name}`}
                        className="pressable size-8 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: 'meal', id: meal.id, name: meal.name })}
                        title={t.common.delete}
                        aria-label={`${t.common.delete}: ${meal.name}`}
                        className="pressable size-8 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLogModal(meal)}
                        title={t.prebuilt.logMeal}
                        aria-label={`${t.prebuilt.logMeal}: ${meal.name}`}
                        className={`kc-action-pill pressable ${ultraMinimal ? 'size-8 px-0' : 'h-8 px-3'} bg-[#FAE0B4] hover:bg-[#F7D69E] text-[#7D4E14] font-extrabold rounded-xl text-[11px] flex items-center justify-center gap-1`}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span className={ultraMinimal ? 'sr-only' : 'whitespace-nowrap'}>{t.common.log}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-nutrition-row
                    onClick={() => setOpenMeals((prev) => prev.includes(meal.id) ? prev.filter((id) => id !== meal.id) : [...prev, meal.id])}
                    aria-expanded={isOpen}
                    aria-label={`${meal.name}: ${isOpen ? t.common.collapse : t.common.expand}`}
                    className="flex w-full min-w-0 items-center gap-3 text-left"
                  >
                    <span data-calories className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)]">
                      {formatKcal(nut.totalKcal)} {!ultraMinimal && <span className="text-[11px] font-semibold text-[var(--muted)]">kcal</span>}
                    </span>
                    <MacroPills carbs={nut.carbs} protein={nut.protein} fat={nut.fat} stretch />
                  </button>

                  <div className="accordion-grid" data-open={isOpen} inert={!isOpen}>
                    <div className="accordion-inner">
                      <LazyBody open={isOpen}>
                      <div className="pt-1 space-y-3 border-t border-[var(--border)]">
                        <LibraryPhoto linkedId={meal.id} title={meal.name} slot={meal.slot} />
                        {meal.description && !ultraMinimal && (
                          <p className="text-xs text-[var(--muted)]">{meal.description}</p>
                        )}
                        <div className="pt-2"><FoodMacroGrid food={nut} amount={100} mode={ultraMinimal ? 'minimal' : 'facts'} /></div>

                        <div data-library-ingredients className="bg-[var(--surface)] rounded-2xl p-2.5 divide-y divide-[var(--border)]">
                          {meal.ingredients.map((ing, idx) => {
                            const food = foodById.get(ing.foodId);
                            return (
                              <div
                                key={idx}
                                className="py-1.5 flex items-center justify-between text-xs text-[var(--text)]"
                              >
                                <span className="font-medium truncate pr-2">
                                  {food ? nameOf(food) : ing.foodId}
                                </span>
                                <span className="font-bold tabular-nums text-[var(--muted)] shrink-0">
                                  {ing.amount}
                                  {!ultraMinimal && (food?.unit || 'g')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      </LazyBody>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </LazyBody>
        </div>
        </div>
      </section>
    </>
  );
};
