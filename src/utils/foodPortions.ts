import { getStandardPortions } from '../data/standardPortions';
import type { FoodPortion, Language } from '../types';

export interface PortionFoodRef {
  id: string;
  unit: 'g' | 'ml';
  portion?: number;
  portions?: FoodPortion[];
  isRecipe?: boolean;
}

const isNonBasePortion = (grams: number) =>
  Number.isFinite(grams) && grams > 0 && Math.abs(grams - 100) > 0.01;

/**
 * Resolves all available non-100g/ml portions for a food item in display order:
 * 1. Product / recipe explicit `portion` (e.g. Open Food Facts `serving_quantity` or recipe standard portion)
 * 2. Explicit `food.portions`
 * 3. Standard USDA/EU portions for the bundled database
 * 4. User-saved custom portions
 */
export function getFoodPortions(
  food: PortionFoodRef,
  customPortions: FoodPortion[] = [],
  standardLabel = 'Standard',
): FoodPortion[] {
  const out: FoodPortion[] = [];
  const seenIds = new Set<string>();

  const push = (p: FoodPortion) => {
    if (!isNonBasePortion(p.grams) || seenIds.has(p.id)) return;
    seenIds.add(p.id);
    out.push(p);
  };

  if (typeof food.portion === 'number' && isNonBasePortion(food.portion)) {
    const std = getStandardPortions(food.id);
    const alreadyCovered =
      (food.portions ?? []).some((p) => Math.abs(p.grams - food.portion!) <= 0.05) ||
      std.some((p) => Math.abs(p.grams - food.portion!) <= 0.05);
    if (!alreadyCovered) {
      push({ id: `prop-${food.id}`, grams: Math.round(food.portion * 10) / 10, label: standardLabel });
    }
  }

  for (const p of food.portions ?? []) push(p);
  for (const p of getStandardPortions(food.id)) push(p);
  for (const p of customPortions) push(p);

  return out;
}

export function getPortionLabel(p: FoodPortion, lang: Language): string {
  return lang === 'it' && p.label_it ? p.label_it : p.label;
}

/** Parses decimal input with either '.' or ','. Returns null when incomplete/invalid. */
export function parseDecimalInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!cleaned || cleaned === '.' || cleaned === '-') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export function portionStepUp(v: number): number {
  const clean = Math.round(Math.max(0, v) * 100) / 100;
  if (clean < 1) return Math.min(1, Math.round((Math.floor(clean / 0.25 + 1e-9) * 0.25 + 0.25) * 100) / 100);
  if (clean < 3) return Math.min(3, Math.round((Math.floor(clean / 0.5 + 1e-9) * 0.5 + 0.5) * 100) / 100);
  return Math.floor(clean + 1e-9) + 1;
}

export function portionStepDown(v: number): number {
  const clean = Math.round(Math.max(0, v) * 100) / 100;
  if (clean <= 0) return 0;
  if (clean <= 1) return Math.max(0, Math.round((Math.ceil(clean / 0.25 - 1e-9) * 0.25 - 0.25) * 100) / 100);
  if (clean <= 3) return Math.max(1, Math.round((Math.ceil(clean / 0.5 - 1e-9) * 0.5 - 0.5) * 100) / 100);
  return Math.max(3, Math.ceil(clean - 1e-9) - 1);
}

export function portionsToAmount(count: number, portionGrams: number): number {
  if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(portionGrams) || portionGrams <= 0) return 0;
  return Math.round(count * portionGrams * 10) / 10;
}

export function amountToPortions(amount: number, portionGrams: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(portionGrams) || portionGrams <= 0) return 0;
  return Math.round((amount / portionGrams) * 100) / 100;
}

export function formatPortionCount(n: number, lang: Language): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  const rounded = Math.round(n * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return lang === 'it' ? text.replace('.', ',') : text;
}

export function formatWeightAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
