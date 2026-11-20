import type { BuiltInMealSlotId, DayLog, LoggedFoodItem } from '../types';

/** The six built-in meal slots in their original order. */
export const BUILT_IN_MEAL_SLOTS: BuiltInMealSlotId[] = [
  'breakfast',
  'mid_morning',
  'lunch',
  'midday_snack',
  'dinner',
  'extra',
];

/** Every food item logged in a day, whatever the meal type (built-in or added by the user). */
export function allMealItems(meals: DayLog['meals'] | undefined): LoggedFoodItem[] {
  return meals ? (Object.values(meals).flat().filter(Boolean) as LoggedFoodItem[]) : [];
}
