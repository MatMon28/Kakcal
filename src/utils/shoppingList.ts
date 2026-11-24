import type { FoodItem, Language } from '../types';
import type { MealPlan, ShoppingItem, ShoppingList } from '../types/journal';

const MAX_DEPTH = 5;

const foodName = (food: FoodItem, language: Language) => (language === 'it' ? food.name_it : food.name_en) || food.name_de || food.name_en;
/** Stable key of a computed line: the same food in the same unit is one line. */
export const shoppingKey = (foodId: string, unit: string) => `${foodId}|${unit}`;

/**
 * Everything the meals of a plan need, with the total quantity of each food. Recipes are broken down into their
 * ingredients (scaled to the planned amount; nested recipes too) when those foods still exist, otherwise the recipe
 * itself is listed. Meals that are only a note have no foods and add nothing. Lines are sorted by name.
 */
export function buildShoppingItems(
  plans: MealPlan[],
  foodById: (id: string) => FoodItem | undefined,
  language: Language,
): ShoppingItem[] {
  const totals = new Map<string, { food: FoodItem; amount: number }>();
  const add = (food: FoodItem, amount: number) => {
    if (!(amount > 0) || !Number.isFinite(amount)) return;
    const key = shoppingKey(food.id, food.unit);
    const found = totals.get(key);
    if (found) found.amount += amount;
    else totals.set(key, { food, amount });
  };
  const expand = (food: FoodItem, amount: number, depth: number, trail: string[]) => {
    const parts = food.recipeIngredients;
    const weight = parts?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    if (parts && parts.length > 0 && weight > 0 && depth < MAX_DEPTH && !trail.includes(food.id)) {
      const resolved = parts.flatMap((p) => {
        const ingredient = foodById(p.foodId);
        return ingredient ? [{ ingredient, amount: (p.amount * amount) / weight }] : [];
      });
      if (resolved.length > 0) {
        for (const r of resolved) expand(r.ingredient, r.amount, depth + 1, [...trail, food.id]);
        return;
      }
    }
    add(food, amount);
  };
  for (const plan of plans) {
    if (plan.kind !== 'food') continue;
    for (const item of plan.items) expand(foodById(item.food.id) ?? item.food, item.amount, 0, []);
  }
  return [...totals.entries()]
    .map(([key, { food, amount }]) => ({
      id: key,
      name: foodName(food, language),
      amount: Math.round(amount),
      unit: food.unit,
      foodId: food.id,
      checked: false,
    }))
    .filter((i) => i.amount > 0)
    .sort((a, b) => a.name.localeCompare(b.name, language));
}

/** A new shopping list for a plan. */
export function createShoppingList(plans: MealPlan[], planId: string, foodById: (id: string) => FoodItem | undefined, language: Language): ShoppingList {
  return { planId, items: buildShoppingItems(plans, foodById, language), dismissed: [], updatedAt: new Date().toISOString() };
}

/**
 * Brings a list up to date with its plan: quantities are recalculated, foods that are no longer planned disappear,
 * new foods are added, lines the user removed stay removed and ticked boxes stay ticked. Lines added by hand are kept.
 */
export function syncShoppingList(list: ShoppingList, fresh: ShoppingItem[]): ShoppingList {
  const dismissed = new Set(list.dismissed);
  const ticked = new Set(list.items.filter((i) => i.checked && !i.custom).map((i) => i.id));
  const computed = fresh.filter((i) => !dismissed.has(i.id)).map((i) => ({ ...i, checked: ticked.has(i.id) }));
  const custom = list.items.filter((i) => i.custom);
  return { ...list, items: [...computed, ...custom], updatedAt: new Date().toISOString() };
}

/** Removes one line; a computed line is remembered so that it is not added again by an update. */
export function removeShoppingItem(list: ShoppingList, itemId: string): ShoppingList {
  const item = list.items.find((i) => i.id === itemId);
  if (!item) return list;
  return {
    ...list,
    items: list.items.filter((i) => i.id !== itemId),
    dismissed: item.custom || list.dismissed.includes(itemId) ? list.dismissed : [...list.dismissed, itemId],
    updatedAt: new Date().toISOString(),
  };
}

/** Adds a line typed in by hand. An empty name is ignored; a missing or invalid quantity is stored as "no quantity". */
export function addCustomShoppingItem(list: ShoppingList, id: string, name: string, amount: number | null, unit: string): ShoppingList {
  const clean = name.trim();
  if (!clean) return list;
  const item: ShoppingItem = {
    id,
    name: clean.slice(0, 120),
    amount: amount !== null && Number.isFinite(amount) && amount > 0 ? amount : null,
    unit: amount !== null && amount > 0 ? (unit === 'ml' ? 'ml' : unit === 'g' ? 'g' : '') : '',
    checked: false,
    custom: true,
  };
  return { ...list, items: [...list.items, item], updatedAt: new Date().toISOString() };
}

export function toggleShoppingItem(list: ShoppingList, itemId: string): ShoppingList {
  return { ...list, items: list.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)), updatedAt: new Date().toISOString() };
}

/** "350 g", "1.2 kg", "1.5 l", or "" when there is no quantity. */
export function formatQuantity(amount: number | null, unit: string): string {
  if (amount === null) return '';
  if (unit === 'g' && amount >= 1000) return `${Math.round(amount / 10) / 100} kg`;
  if (unit === 'ml' && amount >= 1000) return `${Math.round(amount / 10) / 100} l`;
  return `${Math.round(amount)}${unit ? ` ${unit}` : ''}`;
}

/** How many lines are ticked, for the "3 / 12 bought" counter. */
export const boughtCount = (list: ShoppingList) => list.items.filter((i) => i.checked).length;

/** `true` when the plan's foods or quantities no longer match the computed lines of the list (removed lines do not count). */
export function isShoppingListOutdated(list: ShoppingList, fresh: ShoppingItem[]): boolean {
  const dismissed = new Set(list.dismissed);
  const wanted = new Map(fresh.filter((i) => !dismissed.has(i.id)).map((i) => [i.id, i.amount]));
  const have = list.items.filter((i) => !i.custom);
  return wanted.size !== have.length || have.some((i) => wanted.get(i.id) !== i.amount);
}
