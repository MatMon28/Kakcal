import type { FoodItem, PreBuiltMeal } from '../types';
import { fuzzyMatchTokens, fuzzyScoreTokens, tokenize } from './fuzzy';

/**
 * Local (bundled + user) food search with the text work done once.
 *
 * Before this module every keystroke tokenized and normalized the name / brand of every food several times and
 * computed a fuzzy score for every food before throwing most of them away. Now:
 *  1. each food is tokenized once (kept in a WeakMap, so it disappears with the food object),
 *  2. the cheap yes/no match runs first and only the foods that match are scored,
 *  3. the finished, sorted result of a query is cached per food list, so backspacing, retyping or reopening a
 *     dialog with the same text costs nothing.
 *
 * Results are identical to the old `fuzzyScore` / `fuzzyMatch` pipeline: the score is the best score of the German,
 * Italian, English name and the brand (or, with `combined`, the score against all of them as one text), the match
 * rule is "every query word matches some word of any name". Ties keep the order of the food list.
 */

interface Entry {
  /** Tokens of name_de, name_it, name_en and the brand (empty array when absent). */
  names: string[][];
  /** All of them as one list. */
  all: string[];
}

export interface ScoredFood { f: FoodItem; score: number }
export interface ScoredMeal { m: PreBuiltMeal; score: number }

const foodEntries = new WeakMap<FoodItem, Entry>();
const mealEntries = new WeakMap<PreBuiltMeal, string[]>();

function foodEntry(food: FoodItem): Entry {
  let entry = foodEntries.get(food);
  if (!entry) {
    const names = [food.name_de, food.name_it, food.name_en, food.brand || ''].map(tokenize);
    entry = { names, all: names.flat() };
    foodEntries.set(food, entry);
  }
  return entry;
}

function mealTokens(meal: PreBuiltMeal): string[] {
  let tokens = mealEntries.get(meal);
  if (!tokens) {
    tokens = tokenize(meal.name);
    mealEntries.set(meal, tokens);
  }
  return tokens;
}

const CACHE_SIZE = 24;
// One small result cache per list identity (a new list = a new food added or removed = fresh results).
const foodCache = new WeakMap<readonly FoodItem[], Map<string, readonly ScoredFood[]>>();
const mealCache = new WeakMap<readonly PreBuiltMeal[], Map<string, readonly ScoredMeal[]>>();

function remember<T>(cache: Map<string, T>, key: string, value: T): T {
  cache.set(key, value);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  return value;
}

const byScore = (a: { score: number }, b: { score: number }) => a.score - b.score;

export interface FoodSearchOptions {
  /** Score the query against name_de + name_it + name_en + brand as one text (Settings food picker). */
  combined?: boolean;
}

/** Foods that match `query`, best first (stable). The returned array is shared: do not modify it. */
export function searchFoods(foods: readonly FoodItem[], query: string, options: FoodSearchOptions = {}): readonly ScoredFood[] {
  const qs = tokenize(query);
  if (!qs.length) return [];
  const key = `${options.combined ? 'c' : 'm'}|${qs.join(' ')}`;
  let cache = foodCache.get(foods);
  if (!cache) {
    cache = new Map();
    foodCache.set(foods, cache);
  }
  const hit = cache.get(key);
  if (hit) return hit;
  const found: ScoredFood[] = [];
  for (const f of foods) {
    const entry = foodEntry(f);
    if (!fuzzyMatchTokens(qs, entry.all)) continue;
    const score = options.combined
      ? fuzzyScoreTokens(qs, entry.all)
      : Math.min(...entry.names.map((tokens) => fuzzyScoreTokens(qs, tokens)));
    found.push({ f, score });
  }
  return remember(cache, key, found.sort(byScore));
}

/** Saved meals / recipes whose name matches `query`, best first (stable). The returned array is shared. */
export function searchMeals(meals: readonly PreBuiltMeal[], query: string): readonly ScoredMeal[] {
  const qs = tokenize(query);
  if (!qs.length) return [];
  const key = qs.join(' ');
  let cache = mealCache.get(meals);
  if (!cache) {
    cache = new Map();
    mealCache.set(meals, cache);
  }
  const hit = cache.get(key);
  if (hit) return hit;
  const found: ScoredMeal[] = [];
  for (const m of meals) {
    const tokens = mealTokens(m);
    if (fuzzyMatchTokens(qs, tokens)) found.push({ m, score: fuzzyScoreTokens(qs, tokens) });
  }
  return remember(cache, key, found.sort(byScore));
}
