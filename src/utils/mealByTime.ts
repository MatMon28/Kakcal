import type { BuiltInMealSlotId, MealSlotId } from '../types';
import { BUILT_IN_MEAL_SLOTS } from './mealItems';

/**
 * Which built-in meal fits the time of day (pure, no React, easy to test).
 *
 * Windows are in minutes after midnight, local time, and cover the whole day:
 *
 * | From  | Until | Meal           |
 * | ----- | ----- | -------------- |
 * | 05:00 | 09:59 | breakfast      |
 * | 10:00 | 11:29 | mid_morning    |
 * | 11:30 | 14:59 | lunch          |
 * | 15:00 | 17:59 | midday_snack   |
 * | 18:00 | 22:29 | dinner         |
 * | 22:30 | 04:59 | extra          |
 *
 * `extra` is the free-form slot, so it is also what a late-night or very early log lands in.
 */
export const MEAL_TIME_WINDOWS: ReadonlyArray<{ from: number; slot: BuiltInMealSlotId }> = [
  { from: 5 * 60, slot: 'breakfast' },
  { from: 10 * 60, slot: 'mid_morning' },
  { from: 11 * 60 + 30, slot: 'lunch' },
  { from: 15 * 60, slot: 'midday_snack' },
  { from: 18 * 60, slot: 'dinner' },
  { from: 22 * 60 + 30, slot: 'extra' },
];

/** The built-in meal for a moment, ignoring which meals the user has hidden. */
export function idealMealSlot(now: Date = new Date()): BuiltInMealSlotId {
  const minutes = now.getHours() * 60 + now.getMinutes();
  let slot: BuiltInMealSlotId = 'extra'; // before 05:00: still the previous night
  for (const window of MEAL_TIME_WINDOWS) {
    if (minutes >= window.from) slot = window.slot;
  }
  return slot;
}

/**
 * The meal to preselect right now, among the meals the user can choose from (`available`: some
 * built-in meals may be removed with the advanced layout). When the ideal meal is not available,
 * the closest built-in meal in Today order is used; with no built-in meal left, the first one
 * available.
 */
export function mealSlotForTime(now: Date, available: readonly MealSlotId[]): MealSlotId {
  const ideal = idealMealSlot(now);
  if (available.length === 0 || available.includes(ideal)) return ideal;
  const at = BUILT_IN_MEAL_SLOTS.indexOf(ideal);
  const choices = BUILT_IN_MEAL_SLOTS
    .filter((slot) => available.includes(slot))
    .sort((a, b) => Math.abs(BUILT_IN_MEAL_SLOTS.indexOf(a) - at) - Math.abs(BUILT_IN_MEAL_SLOTS.indexOf(b) - at));
  return choices[0] ?? available[0];
}
