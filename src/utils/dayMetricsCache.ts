import type { DayLog, MacroSummary } from '../types';
import { calculateMacros, calculateTEF, calculateTotalActivityCalories, calculateTotalCalories } from './calculations';
import { allMealItems } from './mealItems';

export interface DayBaseMetrics {
  intake: number;
  macros: MacroSummary;
  actExp: number;
  tef: number;
  hasFood: boolean;
  hasLog: boolean;
}

const metricsCache = new WeakMap<DayLog, DayBaseMetrics>();

/**
 * Memoised per immutable `DayLog` reference so Statistics and CycleNutrition never recompute
 * meal/macro/TEF totals for unchanged days on mount or range changes.
 */
export function getDayBaseMetrics(log: DayLog): DayBaseMetrics {
  const cached = metricsCache.get(log);
  if (cached) return cached;
  const items = allMealItems(log.meals);
  const macros = calculateMacros(items);
  const intake = calculateTotalCalories(items);
  const actExp = calculateTotalActivityCalories(log.activities);
  const tef = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams).totalTEF;
  const hasFood = items.length > 0;
  const hasLog =
    hasFood ||
    log.activities.length > 0 ||
    typeof log.weightKg === 'number' ||
    (log.waterEntries ?? []).length > 0 ||
    (log.poops ?? []).length > 0;
  const result: DayBaseMetrics = { intake, macros, actExp, tef, hasFood, hasLog };
  metricsCache.set(log, result);
  return result;
}
