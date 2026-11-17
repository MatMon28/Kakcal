import type { FoodItem } from '../types';
import { USDA_FOOD_ROWS } from './usdaFoodRows';

export const REFERENCE_FOODS: FoodItem[] = USDA_FOOD_ROWS.map(
  ([fdcId, category, name_en, name_it, name_de, calories, carbs, protein, fat, fiber, salt]) => ({
    id: `usda-sr-${fdcId}`, store: 'Generic', unit: 'g', category, name_en, name_it, name_de,
    calories, carbs, protein, fat, fiber, salt,
    source: { label: 'USDA FoodData Central', url: `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients` },
  }),
);

// The bakery's label applies to this rice pie, not to every rice pie recipe.
REFERENCE_FOODS.push({
  id: 'van-hecke-rijsttaart-92214',
  name_en: 'Rice pie (Rijsttaart)',
  name_it: 'Torta di riso (Rijsttaart)',
  name_de: 'Reiskuchen (Rijsttaart)',
  brand: 'Bakkerij Van Hecke',
  store: 'Generic',
  category: 'desserts',
  unit: 'g',
  calories: 216,
  carbs: 25,
  protein: 3.3,
  fat: 12,
  fiber: 0.57,
  salt: 0.32,
  source: { label: 'Bakkerij Van Hecke', url: 'https://bakkersonline.be/be-nl/vanhecke-ferrerlaan/product/92214/rijsttaart' },
});