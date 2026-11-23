import type { ReactNode } from 'react';
import { useApp } from '../../context/AppContext';
import type { LoggedFoodItem, MealSlotId } from '../../types';
import { calculateMacros, calculateTotalCalories } from '../../utils/calculations';
import { formatKcal } from '../../utils/formatters';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { MacroPills } from '../common/MacroPills';
import { MealSlotIcon } from '../common/mealSlotIcon';
import { MealNutrientTotals } from '../dashboard/MealNutrientTotals';

/**
 * Read-only version of the meal field a user sees in Today when a meal is expanded: the colourless slot icon and meal
 * name, the calories with the carbs / protein / fat pills (and fibre / salt / sugar under them), then one row per food
 * with its own macros. Used by the Meal diary (a logged meal) and the Meal planner (a planned meal), so the three
 * places look the same. Anything passed as `children` (notes, actions) is drawn under the foods inside the same card.
 */
export function MealSummaryCard({
  slot,
  title,
  subtitle,
  items,
  trailing,
  emptyText,
  children,
}: {
  slot: MealSlotId;
  title: string;
  /** Small line under the title, usually the date. */
  subtitle?: string;
  items: LoggedFoodItem[];
  /** Right-hand header content (the favourite star in the diary). */
  trailing?: ReactNode;
  /** Shown instead of the foods when the meal has none (a note-only meal). */
  emptyText?: string;
  children?: ReactNode;
}) {
  const { settings } = useApp();
  const ultraMinimal = Boolean(settings.ultraMinimal);
  const kcal = calculateTotalCalories(items);
  const macros = calculateMacros(items);

  return (
    <div
      data-meal-summary={slot}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden text-[var(--text)]"
    >
      <div className="px-4 py-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 w-full">
          <div className="kc-meal-icon size-9 rounded-full flex items-center justify-center shrink-0 bg-transparent text-[var(--text)]">
            <MealSlotIcon slot={slot} size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-extrabold truncate">{title}</h4>
            {subtitle && !ultraMinimal && (
              <p className="text-[11px] font-medium text-[var(--muted)] truncate">{subtitle}</p>
            )}
          </div>
          {trailing}
        </div>
        {items.length > 0 && (
          <div className="relative flex items-center gap-3 w-full min-w-0">
            <span
              data-calories
              className="inline-flex shrink-0 items-baseline gap-1 tabular-nums whitespace-nowrap"
              aria-label={`${formatKcal(kcal)} kcal`}
            >
              <span className="font-extrabold text-sm sm:text-base">{formatKcal(kcal)}</span>
              {!ultraMinimal && <span className="text-[11px] font-semibold text-[var(--muted)]">kcal</span>}
            </span>
            <div data-macro-area className="flex min-w-0 flex-1 w-full flex-col gap-1.5">
              <MacroPills carbs={macros.carbsGrams} protein={macros.proteinGrams} fat={macros.fatGrams} stretch />
              <MealNutrientTotals fiber={macros.fiberGrams} salt={macros.saltGrams} sugar={macros.sugarGrams} />
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-1.5 border-t border-[var(--border)] divide-y divide-[var(--border)]">
        {items.length === 0 && emptyText && !ultraMinimal && (
          <p className="py-3 text-xs font-medium text-[var(--muted)]">{emptyText}</p>
        )}
        {items.map((item, index) => {
          const itemKcal = Math.round((item.calories * item.amount) / 100);
          return (
            <div key={item.id || `${item.foodId}-${index}`} className="py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-bold truncate block">{item.name}</span>
                  <span className="text-[11px] font-medium tabular-nums text-[var(--muted)]">
                    {item.amount}
                    {!ultraMinimal && item.unit}
                  </span>
                </div>
                <span
                  className="text-xs sm:text-sm font-extrabold tabular-nums shrink-0"
                  aria-label={`${itemKcal} kcal`}
                  title={`${itemKcal} kcal`}
                >
                  {itemKcal}
                  {!ultraMinimal && ' kcal'}
                </span>
              </div>
              <div data-item-nutrition>
                <FoodMacroGrid food={item} amount={item.amount} dense mode={ultraMinimal ? 'minimal' : 'portion'} />
              </div>
            </div>
          );
        })}
        {children}
      </div>
    </div>
  );
}
