/**
 * Ingredient → food matching: "2 tbsp extra virgin olive oil" → the FoodItem in Kakcal's database
 * that best represents olive oil, plus the amount in grams.
 *
 * Everything here is local and free: the user's own foods and the bundled recipes are searched
 * first, then the 130,000-product offline catalogue through `searchCatalogue`
 * (utils/catalogueSearch.ts). No server, no API key.
 *
 * Scoring has two halves, because a search box and a recipe need different things:
 *  - how much of the *recipe's* words the product name covers ("olive oil" must be in there),
 *  - how much of the *product's* name the recipe explains (so "Potato chips with olive oil
 *    flavour" does not win over "Olive oil, extra virgin").
 * Typos and plurals are tolerated with a length-aware similarity, the same spirit as utils/fuzzy.ts.
 */

import type { FoodItem } from '../types';
import { tokenize } from './fuzzy';
import { volumeMillilitres, type ParsedIngredient } from './ingredientParse';

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface IngredientMatch {
  parsed: ParsedIngredient;
  /** The best product found, or null when nothing plausible was in the database. */
  food: FoodItem | null;
  /** Amount to put in the recipe, in the food's unit. Falls back to the product's portion / 100 g. */
  amount: number | null;
  /** Where `amount` came from, so the review screen can explain itself. */
  amountSource: 'parsed' | 'portion' | 'default' | null;
  confidence: MatchConfidence | null;
  /** 0…1; the review screen shows the weakest ones first. */
  score: number;
  /** Runner-ups, offered in the review screen when the best one is wrong. */
  alternatives: FoodItem[];
}

export interface MatchDeps {
  /** The foods already in the app (bundled + the user's own). Searched before the catalogue. */
  localFoods?: readonly FoodItem[];
  /** Async catalogue search, typically `searchCatalogue`. Omit to match against localFoods only. */
  search?: (query: string, limit: number) => Promise<FoodItem[]>;
  /** Candidate products fetched per ingredient. Default 8. */
  limit?: number;
  /** Simultaneous catalogue searches. Default 4. */
  concurrency?: number;
}

const DEFAULT_LIMIT = 8;
const DEFAULT_CONCURRENCY = 4;
/** Below this a candidate is not even offered as an alternative. */
const MIN_SCORE = 0.55;
const HIGH_CONFIDENCE = 0.78;
const MEDIUM_CONFIDENCE = 0.62;

/** Words that never identify a product (they are on thousands of labels, or are units). */
const IGNORED_TOKENS = new Set([
  'g', 'gr', 'kg', 'ml', 'cl', 'dl', 'l', 'oz', 'lb', 'x', 'percent', 'of', 'the', 'and', 'or',
  'with', 'in', 'a', 'an', 'bio', 'organic', 'natural', 'classic', 'classico', 'original',
]);

/**
 * Words that describe how a food was processed, not what it is: they are dropped for a *second*
 * search ("canned tomatoes" → "tomatoes") when the full phrase finds nothing in the catalogue.
 * They are never dropped from the first search, because they do change the product.
 */
const MODIFIER_WORDS = new Set([
  // Only processing words: size/quality words ("whole", "light", "plain") are already dropped
  // from the query, so penalising a product for having them would be unfair.
  'canned', 'tinned', 'dried', 'frozen', 'cooked', 'boiled', 'roasted', 'smoked', 'salted',
  'unsalted', 'sweetened', 'unsweetened', 'skimmed', 'sliced', 'shelled', 'pitted', 'peeled',
  'boneless', 'skinless', 'conserva', 'surgelato', 'surgelati', 'essiccato', 'secco', 'cotto',
  'gefroren', 'getrocknet', 'gekocht', 'geröstet',
]);

/** Products whose name promises a prepared dish, not the raw ingredient of a recipe. */
const PREPARED_HINTS = /\b(sauce|sugo|salsa|soup|zuppa|ready|meal|piatto|snack|biscuit|biscotti|cake|torta|drink|bevanda|candy|caramelle|cereal bar|flavour|flavor|aroma|pesto|ragu|ragù|ketchup|mayonnaise|maionese|dressing|hummus|spread|burger|nuggets|fries|patatine)\b/i;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

const tokensOf = (food: FoodItem): string[][] =>
  [food.name_en, food.name_it, food.name_de, food.brand]
    .filter((name): name is string => Boolean(name && name.trim()))
    .map((name) => tokenize(name).filter((token) => !IGNORED_TOKENS.has(token)))
    .filter((tokens) => tokens.length > 0);

const queryTokensOf = (query: string): string[] =>
  tokenize(query).filter((token) => !IGNORED_TOKENS.has(token));

/** Plain Levenshtein distance; tokens are short, so two rows are enough. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let previous = new Array<number>(n + 1);
  let current = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) previous[j] = j;
  for (let i = 1; i <= m; i++) {
    current[0] = i;
    const code = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const substitution = previous[j - 1] + (code === b.charCodeAt(j - 1) ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  return previous[n];
}

/** Crude English/Italian plural stem: "tomatoes" → "tomato", "berries" → "berry". */
const stem = (word: string) => word.replace(/ies$/, 'y').replace(/es$/, '').replace(/s$/, '');

/** How much two words are the same word: 1 = identical, 0 = unrelated. */
function wordQuality(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;
  const longer = a.length >= b.length ? a : b;

  // Plurals and inflections: "egg"/"eggs", "tomato"/"tomatoes", "berry"/"berries".
  // (A plain prefix test is not enough: "extra" is a prefix of "extract".)
  if (stem(a) === stem(b)) return 0.9;

  const similarity = 1 - editDistance(a, b) / longer.length;
  if (similarity >= 0.995) return 1;
  // One typo in a long word ("chiken"/"chicken") stays a candidate; the user confirms it.
  if (similarity >= 0.8) return 0.7 + (0.3 * (similarity - 0.8)) / 0.2;
  return 0;
}

/** How well one word of the recipe matches the words of a product name. */
function tokenQuality(word: string, against: readonly string[]): number {
  let best = 0;
  for (const candidate of against) {
    const quality = wordQuality(word, candidate);
    if (quality > best) best = quality;
    if (best === 1) return 1;
  }
  return best;
}

/**
 * How well a product matches the recipe's words, 0…1. Above 0.78 the match is accepted without
 * asking, 0.55…0.78 is offered as a guess the user confirms, below 0.55 it is left unmatched.
 */
export function scoreFood(queryTokens: readonly string[], food: FoodItem): number {
  if (queryTokens.length === 0) return 0;
  let best = 0;
  for (const target of tokensOf(food)) {
    const queryCoverage = mean(queryTokens.map((token) => tokenQuality(token, target)));
    if (queryCoverage === 0) continue;
    const nameCoverage = mean(target.map((token) => tokenQuality(token, queryTokens)));
    let score = queryCoverage * (0.85 + 0.15 * nameCoverage);

    if (food.isRecipe) score -= 0.25;
    if (PREPARED_HINTS.test(`${food.name_en} ${food.name_it} ${food.name_de}`)) score -= 0.12;
    // "400 g canned tomatoes" should not land on "Dried tomatoes": a processing word the recipe
    // did not ask for makes the product a slightly worse answer than the plain one.
    const extraModifiers = target.filter(
      (word) => MODIFIER_WORDS.has(word) && !queryTokens.some((token) => wordQuality(token, word) >= 0.9),
    ).length;
    if (extraModifiers > 0) score -= Math.min(0.1, extraModifiers * 0.05);
    if (food.brand && !queryTokens.some((token) => tokenize(food.brand ?? '').includes(token))) score -= 0.03;
    if (score > best) best = score;
  }
  return clamp01(best);
}

/** Products worth scoring for this ingredient: the app's own foods first, then the catalogue. */
async function gatherCandidates(deps: MatchDeps, limit: number, query: string): Promise<FoodItem[]> {
  const seen = new Map<string, FoodItem>();
  const tokens = queryTokensOf(query);
  if (tokens.length > 0) {
    // Cheap pre-filter so scoring does not run over the whole database for every ingredient:
    // a product is scored when at least one word of the ingredient names it.
    for (const food of deps.localFoods ?? []) {
      if (seen.size >= 40) break;
      if (food.isRecipe) continue;
      const names = tokensOf(food);
      if (names.some((name) => tokens.some((token) => tokenQuality(token, name) >= 0.7))) seen.set(food.id, food);
    }
  }
  if (deps.search && query.trim().length >= 2) {
    try {
      for (const food of await deps.search(query, limit)) {
        if (!seen.has(food.id) && !food.isRecipe) seen.set(food.id, food);
      }
    } catch {
      /* catalogue unavailable: the local foods are enough, as in the rest of the app */
    }
  }
  return Array.from(seen.values());
}

/**
 * Simpler queries to try when the whole phrase finds nothing:
 *  - without the processing words ("canned tomatoes" → "tomatoes"),
 *  - the head noun alone ("cold pressed sicilian olive oil" → "oil"), but only for longer phrases,
 *    otherwise "unobtainium powder" would be matched to any product called "… powder".
 */
function fallbackQueries(query: string): string[] {
  const tokens = queryTokensOf(query);
  const out: string[] = [];
  const withoutModifiers = tokens.filter((token) => !MODIFIER_WORDS.has(token));
  if (withoutModifiers.length > 0 && withoutModifiers.length < tokens.length) out.push(withoutModifiers.join(' '));
  const last = tokens[tokens.length - 1];
  if (tokens.length >= 3 && last.length >= 3 && withoutModifiers.length > 1 && !out.includes(last)) out.push(last);
  // The catalogue search is word-prefix based: "tomatoes" does not find "Tomato pulp".
  const singular = last.replace(/ies$/, 'y').replace(/es$/, '').replace(/s$/, '');
  if (singular.length >= 3 && singular !== last) out.push(singular);
  return out;
}

function confidenceOf(score: number): MatchConfidence | null {
  if (score >= HIGH_CONFIDENCE) return 'high';
  if (score >= MEDIUM_CONFIDENCE) return 'medium';
  if (score >= MIN_SCORE) return 'low';
  return null;
}

function amountFor(
  parsed: ParsedIngredient,
  food: FoodItem,
): { amount: number | null; amountSource: IngredientMatch['amountSource'] } {
  // "A pinch of salt" / "parsley for garnish": never invent a portion for a line that has no
  // amount. The product is still matched, so the review screen can offer to add it in one tap.
  if (parsed.amountKind === 'vague' || parsed.amountKind === 'none') {
    return { amount: parsed.grams, amountSource: parsed.grams === null ? null : 'parsed' };
  }
  if (parsed.grams !== null && parsed.grams > 0) {
    // A drink sold in ml: "2 cups of milk" is logged as 480 ml, not as its 494 g equivalent.
    const millilitres = volumeMillilitres(parsed);
    if (food.unit === 'ml' && millilitres !== null) return { amount: millilitres, amountSource: 'parsed' };
    return { amount: parsed.grams, amountSource: 'parsed' };
  }
  if (food.portion && food.portion > 0) return { amount: food.portion, amountSource: 'portion' };
  return { amount: 100, amountSource: 'default' };
}

/** Match one parsed ingredient. */
export async function matchIngredient(parsed: ParsedIngredient, deps: MatchDeps = {}): Promise<IngredientMatch> {
  const limit = deps.limit ?? DEFAULT_LIMIT;
  const tokens = queryTokensOf(parsed.query);

  // A recipe measured in cups/spoons of a liquid is better served by a product sold in ml.
  const liquid = volumeMillilitres(parsed) !== null;
  const scoreOf = (food: FoodItem, scoringTokens: readonly string[]) =>
    clamp01(scoreFood(scoringTokens, food) + (liquid && food.unit === 'ml' ? 0.03 : 0));

  const rank = (candidates: FoodItem[], scoringTokens: readonly string[] = tokens) =>
    candidates
      .map((food) => ({ food, score: scoreOf(food, scoringTokens) }))
      .sort((a, b) => b.score - a.score || a.food.name_en.length - b.food.name_en.length);

  let ranked = rank(await gatherCandidates(deps, limit, parsed.query));

  // A phrase the catalogue does not know ("canned tomatoes", "cold pressed sicilian olive oil")
  // gets a second search with the simpler query, scored on that query.
  if (!ranked.length || ranked[0].score < MEDIUM_CONFIDENCE) {
    for (const fallback of fallbackQueries(parsed.query)) {
      const found = rank(await gatherCandidates(deps, limit, fallback), queryTokensOf(fallback));
      const merged = new Map<string, { food: FoodItem; score: number }>();
      for (const entry of [...ranked, ...found]) {
        const current = merged.get(entry.food.id);
        if (!current || entry.score > current.score) merged.set(entry.food.id, entry);
      }
      ranked = Array.from(merged.values()).sort((a, b) => b.score - a.score);
      if (ranked[0] && ranked[0].score >= MEDIUM_CONFIDENCE) break;
    }
  }

  const best = ranked[0];
  const confidence = best ? confidenceOf(best.score) : null;
  if (!best || confidence === null) {
    return {
      parsed,
      food: null,
      amount: parsed.grams,
      amountSource: parsed.grams === null ? null : 'parsed',
      confidence: null,
      score: best?.score ?? 0,
      alternatives: ranked.filter((entry) => entry.score >= MIN_SCORE).slice(0, 4).map((entry) => entry.food),
    };
  }

  const { amount, amountSource } = amountFor(parsed, best.food);
  return {
    parsed,
    food: best.food,
    amount,
    amountSource,
    confidence,
    score: Math.round(best.score * 100) / 100,
    alternatives: ranked.slice(1, 5).map((entry) => entry.food),
  };
}

/** Run `task` over `items` with at most `limit` promises in flight, preserving order. */
async function mapLimit<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length || 1) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Match every ingredient of a recipe, keeping the recipe's order. */
export function matchIngredients(parsed: readonly ParsedIngredient[], deps: MatchDeps = {}): Promise<IngredientMatch[]> {
  return mapLimit(parsed, deps.concurrency ?? DEFAULT_CONCURRENCY, (ingredient) => matchIngredient(ingredient, deps));
}

/** True for the matches the review screen should point at: none found, unsure, or an invented amount. */
export const needsReview = (match: IngredientMatch): boolean =>
  match.food === null || match.confidence !== 'high' || match.amount === null || match.amountSource !== 'parsed';
