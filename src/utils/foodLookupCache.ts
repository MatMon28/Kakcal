import type { FoodItem, PreBuiltMeal, PreBuiltMealIngredient } from '../types';

export interface MealNutritionSummary {
  totalKcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  salt: number;
  sugar: number;
}

const foodByIdCache = new WeakMap<FoodItem[], Map<string, FoodItem>>();
const savedRecipesCache = new WeakMap<FoodItem[], FoodItem[]>();
const mealNutritionCache = new WeakMap<PreBuiltMeal[], WeakMap<Map<string, FoodItem>, Map<string, MealNutritionSummary>>>();

/** Returns a cached `id -> FoodItem` lookup map keyed by the `allFoods` array identity. */
export function getFoodByIdMap(allFoods: FoodItem[]): Map<string, FoodItem> {
  let cached = foodByIdCache.get(allFoods);
  if (!cached) {
    cached = new Map(allFoods.map((f) => [f.id, f]));
    foodByIdCache.set(allFoods, cached);
  }
  return cached;
}

/** Returns the cached `isRecipe` subset keyed by the `allFoods` array identity. */
export function getSavedRecipes(allFoods: FoodItem[]): FoodItem[] {
  let cached = savedRecipesCache.get(allFoods);
  if (!cached) {
    cached = allFoods.filter((f) => f.isRecipe);
    savedRecipesCache.set(allFoods, cached);
  }
  return cached;
}

export function computeMealNutrition(ingredients: PreBuiltMealIngredient[], foodById: Map<string, FoodItem>): MealNutritionSummary {
  let totalKcal = 0, carbs = 0, protein = 0, fat = 0, fiber = 0, salt = 0, sugar = 0;
  for (const ing of ingredients) {
    const food = foodById.get(ing.foodId);
    if (!food) continue;
    const factor = ing.amount / 100;
    totalKcal += food.calories * factor;
    if (food.carbs !== null) carbs += food.carbs * factor;
    if (food.protein !== null) protein += food.protein * factor;
    if (food.fat !== null) fat += food.fat * factor;
    if (food.fiber !== null) fiber += food.fiber * factor;
    if (food.salt !== null) salt += food.salt * factor;
    if (food.sugar != null) sugar += food.sugar * factor;
  }
  return {
    totalKcal: Math.round(totalKcal),
    carbs: Math.round(carbs * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
    salt: Math.round(salt * 100) / 100,
    sugar: Math.round(sugar * 10) / 10,
  };
}

/** Returns a cached `mealId -> MealNutritionSummary` map keyed by `(preBuiltMeals, foodById)`. */
export function getMealNutritionMap(
  preBuiltMeals: PreBuiltMeal[],
  foodById: Map<string, FoodItem>,
): Map<string, MealNutritionSummary> {
  let byFoodMap = mealNutritionCache.get(preBuiltMeals);
  if (!byFoodMap) {
    byFoodMap = new WeakMap();
    mealNutritionCache.set(preBuiltMeals, byFoodMap);
  }
  let cached = byFoodMap.get(foodById);
  if (!cached) {
    cached = new Map(preBuiltMeals.map((m) => [m.id, computeMealNutrition(m.ingredients, foodById)]));
    byFoodMap.set(foodById, cached);
  }
  return cached;
}
