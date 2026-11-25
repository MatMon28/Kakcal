import { describe, expect, it, vi } from 'vitest';
import type { FoodItem } from '../src/types';
import { parseIngredientLine } from '../src/utils/ingredientParse';
import { matchIngredient, matchIngredients, needsReview, scoreFood } from '../src/utils/ingredientMatch';
import { tokenize } from '../src/utils/fuzzy';

/** A small stand-in for the bundled catalogue, with the noise a real one has. */
const food = (id: string, name: string, extra: Partial<FoodItem> = {}): FoodItem => ({
  id,
  name_en: name,
  name_it: name,
  name_de: name,
  store: 'Open Food Facts',
  category: 'prepared',
  unit: 'g',
  calories: 100,
  carbs: 10,
  protein: 5,
  fat: 3,
  fiber: 1,
  salt: 0.1,
  sugar: 2,
  ...extra,
});

const CATALOGUE: FoodItem[] = [
  food('oil', 'Olive oil, extra virgin'),
  food('oilflavour', 'Potato chips with olive oil flavour', { category: 'snacks_sweets' }),
  food('milk', 'Whole milk', { unit: 'ml', calories: 64 }),
  food('milkpowder', 'Milk powder'),
  food('spaghetti', 'Spaghetti'),
  food('spaghetti-brand', 'Barilla Spaghetti n.5'),
  food('spaghetti-sauce', 'Spaghetti with tomato sauce', { category: 'prepared' }),
  food('onion', 'Onions, raw'),
  food('garlic', 'Garlic, raw'),
  food('egg', 'Egg, whole, raw'),
  food('chicken', 'Chicken breast, raw'),
  food('flour', 'Flour, wheat, white'),
  food('salt', 'Table salt'),
  food('yogurt', 'Yogurt, plain'),
  food('greek-yogurt', 'Greek yogurt'),
  food('chickpeas', 'Chickpeas, canned, drained'),
  food('protein', 'Protein powder', { portion: 30 }),
  food('basil-fresh', 'Basil, fresh'),
  food('basil-pesto', 'Basil pesto'),
  food('tomato-plain', 'Tomatoes'),
  food('tomato-dried', 'Dried tomatoes'),
];

const deps = { localFoods: CATALOGUE };
const score = (query: string, id: string) => {
  const product = CATALOGUE.find((entry) => entry.id === id);
  if (!product) throw new Error(`no such food: ${id}`);
  return scoreFood(tokenize(query), product);
};

describe('scoreFood', () => {
  it('scores the exact product highest', () => {
    expect(score('olive oil', 'oil')).toBeGreaterThan(score('olive oil', 'oilflavour'));
    expect(score('spaghetti', 'spaghetti')).toBeGreaterThan(score('spaghetti', 'spaghetti-brand'));
    expect(score('greek yogurt', 'greek-yogurt')).toBeGreaterThan(score('greek yogurt', 'yogurt'));
    expect(score('chicken breast', 'chicken')).toBeGreaterThan(0.8);
  });

  it('prefers the plain product over one with an ingredient the recipe did not ask for', () => {
    expect(score('basil', 'basil-fresh')).toBeGreaterThan(score('basil', 'basil-pesto'));
    expect(score('tomatoes', 'tomato-plain')).toBeGreaterThan(score('tomatoes', 'tomato-dried'));
    // …but when the recipe asks for it, the processed product wins.
    expect(score('dried tomatoes', 'tomato-dried')).toBeGreaterThan(score('dried tomatoes', 'tomato-plain'));
  });

  it('prefers the plain product over the prepared dish', () => {
    expect(score('spaghetti', 'spaghetti')).toBeGreaterThan(score('spaghetti', 'spaghetti-sauce'));
  });

  it('accepts a typo', () => {
    expect(score('chiken breast', 'chicken')).toBeGreaterThan(0.7);
  });

  it('scores unrelated products low', () => {
    expect(score('olive oil', 'salt')).toBeLessThan(0.45);
    expect(score('garlic', 'spaghetti-sauce')).toBeLessThan(0.45);
  });
});

describe('matchIngredient', () => {
  it('finds the product and keeps the parsed weight', async () => {
    const match = await matchIngredient(parseIngredientLine('2 tbsp olive oil'), deps);
    expect(match.food?.id).toBe('oil');
    expect(match.amount).toBeCloseTo(27.6, 1);
    expect(match.amountSource).toBe('parsed');
    expect(match.confidence).toBe('high');
  });

  it('uses millilitres for a liquid sold in ml', async () => {
    const match = await matchIngredient(parseIngredientLine('2 cups whole milk'), deps);
    expect(match.food?.id).toBe('milk');
    expect(match.amount).toBe(480);
  });

  it('keeps grams for solid foods even when the recipe used a volume', async () => {
    const match = await matchIngredient(parseIngredientLine('1 cup flour'), deps);
    expect(match.food?.id).toBe('flour');
    expect(match.amount).toBeCloseTo(127.2, 0);
  });

  it('offers alternatives, best first', async () => {
    const match = await matchIngredient(parseIngredientLine('500 g spaghetti'), deps);
    expect(match.food?.id).toBe('spaghetti');
    expect(match.alternatives.map((entry) => entry.id)).toContain('spaghetti-brand');
  });

  it('leaves an unknown ingredient unmatched instead of guessing', async () => {
    const match = await matchIngredient(parseIngredientLine('2 tbsp pandan extract'), deps);
    expect(match.food).toBeNull();
    expect(match.confidence).toBeNull();
  });

  it('still returns the parsed weight when nothing matched', async () => {
    const match = await matchIngredient(parseIngredientLine('100 g pandan paste'), deps);
    expect(match.food).toBeNull();
    expect(match.amount).toBe(100);
  });

  it('never invents a portion for a line that has no amount', async () => {
    // "1 scoop protein powder" (an unknown unit): the product is found, the amount is not guessed.
    const match = await matchIngredient(parseIngredientLine('1 scoop protein powder'), deps);
    expect(match.food?.id).toBe('protein');
    expect(match.amount).toBeNull();
    expect(match.amountSource).toBeNull();
    expect(needsReview(match)).toBe(true);
  });

  it('keeps a pinch of salt a pinch, not a 100 g portion', async () => {
    const match = await matchIngredient(parseIngredientLine('a pinch of salt'), deps);
    expect(match.food?.id).toBe('salt');
    expect(match.amount).toBe(0.5);
    expect(match.parsed.amountKind).toBe('vague');
  });

  it('matches a seasoning even when the page gave no amount at all', async () => {
    const match = await matchIngredient(parseIngredientLine('salt to taste'), deps);
    expect(match.food?.id).toBe('salt');
    expect(match.amount).toBeNull();
  });

  it('leaves a vague optional line unmatched', async () => {
    const match = await matchIngredient(parseIngredientLine('salt and pepper to taste'), deps);
    expect(match.food).toBeNull();
    expect(match.parsed.optional).toBe(true);
  });

  it('retries with the head noun when the whole phrase finds nothing', async () => {
    const search = vi.fn(async (query: string) => (query.includes('oil') ? [CATALOGUE[0]] : []));
    const match = await matchIngredient(parseIngredientLine('1 tbsp cold pressed sicilian olive oil'), {
      localFoods: [],
      search,
    });
    expect(match.food?.id).toBe('oil');
    expect(search).toHaveBeenCalled();
  });

  it('retries without the processing words when the phrase finds nothing', async () => {
    // The catalogue only knows "Chickpeas, canned, drained": "canned chickpeas" finds nothing there.
    const chickpeas = CATALOGUE.find((entry) => entry.id === 'chickpeas') as FoodItem;
    const search = vi.fn(async (query: string) => (query === 'chickpeas' ? [chickpeas] : []));
    const match = await matchIngredient(parseIngredientLine('400 g canned chickpeas'), { localFoods: [], search });
    expect(match.food?.id).toBe('chickpeas');
    expect(match.amount).toBe(400);
    expect(search.mock.calls.map(([query]) => query)).toContain('chickpeas');
  });

  it('uses the catalogue search for products that are not loaded locally', async () => {
    const remote = food('farro', 'Farro, cooked');
    const search = vi.fn(async () => [remote]);
    const match = await matchIngredient(parseIngredientLine('150 g farro'), { localFoods: [], search });
    expect(search).toHaveBeenCalledWith('farro', 8);
    expect(match.food?.id).toBe('farro');
    expect(match.amount).toBe(150);
  });

  it('survives an unavailable catalogue', async () => {
    const search = vi.fn(async () => {
      throw new Error('offline');
    });
    const match = await matchIngredient(parseIngredientLine('200 g flour'), { localFoods: CATALOGUE, search });
    expect(match.food?.id).toBe('flour');
  });
});

describe('matchIngredients', () => {
  it('matches every line and keeps the recipe order', async () => {
    const parsed = [
      '200 g spaghetti',
      '2 tbsp olive oil',
      '2 eggs',
      '3 cloves garlic',
      'unobtainium powder',
    ].map(parseIngredientLine);
    const matches = await matchIngredients(parsed, deps);
    expect(matches.map((match) => match.food?.id ?? null)).toEqual(['spaghetti', 'oil', 'egg', 'garlic', null]);
    expect(matches.map((match) => match.parsed.raw)).toEqual(parsed.map((entry) => entry.raw));
  });

  it('runs a bounded number of searches at once', async () => {
    let running = 0;
    let peak = 0;
    const search = vi.fn(async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return CATALOGUE;
    });
    const parsed = Array.from({ length: 8 }, () => parseIngredientLine('100 g flour'));
    await matchIngredients(parsed, { localFoods: [], search, concurrency: 3 });
    expect(peak).toBeLessThanOrEqual(3);
    expect(search).toHaveBeenCalledTimes(8);
  });
});
