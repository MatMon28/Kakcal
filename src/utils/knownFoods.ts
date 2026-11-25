import type { FoodItem } from '../types';

const knownIdsByList = new WeakMap<readonly FoodItem[], ReadonlySet<string>>();

/**
 * The ids of every food the app knows (C5). Built once per `allFoods` array - that array changes only when a food is
 * added or removed - and shared by every meal card, instead of each card rebuilding the set on every render.
 */
export function knownFoodIds(allFoods: readonly FoodItem[]): ReadonlySet<string> {
  let ids = knownIdsByList.get(allFoods);
  if (!ids) {
    ids = new Set(allFoods.map((food) => food.id));
    knownIdsByList.set(allFoods, ids);
  }
  return ids;
}
