import { useSettings } from '../context/AppContext';
import type { MealSlotId } from '../types';
import { BUILT_IN_MEAL_SLOTS } from './mealItems';
import { mealItemId, useLayout } from './layoutStore';
import { mealSlotForTime } from './mealByTime';

export interface MealSlotOption {
  id: MealSlotId;
  label: string;
}

/**
 * The meal types the user can choose from (Add food, Custom meals, Foods, barcode lookup, ...), in the order
 * of the Today page: the built-in ones, minus those removed with the advanced layout, plus the meal types
 * the user added. `label(id)` gives the name of any slot, removed or not.
 */
export function useMealSlots(): { options: MealSlotOption[]; label: (id: MealSlotId) => string } {
  const { t } = useSettings();
  const layout = useLayout();
  const custom = new Map(layout.mealTypes.map((m) => [m.id as string, m.name]));
  const label = (id: MealSlotId): string =>
    custom.get(id) ?? (t.mealSlots as Record<string, string>)[id] ?? id;

  const ids: MealSlotId[] = [...BUILT_IN_MEAL_SLOTS, ...layout.mealTypes.map((m) => m.id)];
  let ordered = ids;
  if (layout.enabled) {
    const page = layout.pages.today;
    const rank = (id: MealSlotId) => {
      const at = page.order.indexOf(mealItemId(id));
      return at < 0 ? Number.MAX_SAFE_INTEGER : at;
    };
    // Stable sort: slots the user never moved keep their original relative order.
    ordered = [...ids].sort((a, b) => rank(a) - rank(b));
    ordered = ordered.filter((id) => !page.hidden.includes(mealItemId(id)));
  }
  return { options: ordered.map((id) => ({ id, label: label(id) })), label };
}

/**
 * `() => MealSlotId`: the meal that fits the time of day right now, among the meals the user can
 * choose from. Call it when something opens that does not come from one specific meal card
 * (the Add food button, a widget, the Foods and Custom pages) and pass the result to
 * `setTargetMealSlot`; the user can still pick another meal in the popup. See
 * docs/journal-pages.md (Meal chosen by the time of day).
 */
export function useAutoMealSlot(): () => MealSlotId {
  const { options } = useMealSlots();
  return () => mealSlotForTime(new Date(), options.map((o) => o.id));
}
