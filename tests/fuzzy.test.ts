import { describe, expect, it } from 'vitest';
import { fuzzyMatch, fuzzyScore } from '../src/utils/fuzzy';
import { searchFoods, searchMeals } from '../src/utils/foodSearchIndex';
import type { FoodItem, PreBuiltMeal } from '../src/types';

// Reference: the implementation that shipped before the search performance round, kept verbatim so the faster
// version can be checked against it.
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = curr;
  }
  return prev[n];
}
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
function tokenDistance(q: string, w: string): number {
  if (w.length <= q.length + 1) return levenshtein(q, w);
  let best = levenshtein(q, w);
  for (let i = 0; i + q.length <= w.length; i++) best = Math.min(best, levenshtein(q, w.slice(i, i + q.length)));
  return best;
}
const maxDist = (q: string) => (q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3);
function refScore(query: string, target: string): number {
  const qs = words(query), ts = words(target);
  if (!qs.length || !ts.length) return 999;
  let total = 0;
  for (const q of qs) {
    let best = Infinity;
    for (const w of ts) {
      if (w === q) { best = 0; break; }
      if (w.startsWith(q)) best = Math.min(best, 0.5);
      else if (w.includes(q)) best = Math.min(best, 1);
      else best = Math.min(best, 2 + tokenDistance(q, w));
    }
    total += best;
  }
  return total;
}
function refMatch(query: string, targets: string[]): boolean {
  const qs = words(query);
  if (!qs.length) return false;
  const ts = targets.flatMap((t) => words(t));
  if (!ts.length) return false;
  return qs.every((q) => ts.some((w) => w.startsWith(q) || w.includes(q)) || ts.some((w) => tokenDistance(q, w) <= maxDist(q)));
}

const NAMES = [
  'Skyr natural', 'Chicken breast', 'Hähnchenbrust', 'Petto di pollo', 'Olive oil', 'Olio extra vergine di oliva', 'Whole wheat bread',
  'Pane integrale', 'Greek yoghurt 0% fat', 'Straße Müsli', 'Cottage cheese', 'Ricotta', 'Banana', 'Spaghetti alla carbonara', 'Salt', '',
];
const QUERIES = ['skir', 'chiken', 'oliv', 'pane int', 'yog', 'musli', 'strasse', 'sa', 'carbonra', 'xyzq', 'pollo', 'whole bred', 'a', 'grek yoghurt', 'cheeze'];

const food = (name: string, i: number, brand?: string): FoodItem => ({
  id: `f${i}`, name_de: name, name_it: NAMES[(i + 3) % NAMES.length], name_en: NAMES[(i + 7) % NAMES.length], brand,
  category: 'prepared', unit: 'g', calories: 100, carbs: 1, protein: 1, fat: 1, fiber: null, salt: null, sugar: null,
} as unknown as FoodItem);

describe('fuzzy search (performance round)', () => {
  it('scores and matches exactly like the previous implementation', () => {
    for (const q of QUERIES) {
      for (const name of NAMES) {
        expect(fuzzyScore(q, name)).toBe(refScore(q, name));
        expect(fuzzyMatch(q, [name, 'Brand X'])).toBe(refMatch(q, [name, 'Brand X']));
      }
    }
  });

  it('searchFoods = old map / filter / sort pipeline, and is cached per list', () => {
    const foods = NAMES.map((n, i) => food(n, i, i % 3 === 0 ? 'Acme' : undefined));
    for (const q of QUERIES) {
      const expected = foods
        .map((f) => ({ f, score: Math.min(refScore(q, f.name_de), refScore(q, f.name_it), refScore(q, f.name_en), refScore(q, f.brand || '')) }))
        .filter((x) => refMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']))
        .sort((a, b) => a.score - b.score);
      const got = searchFoods(foods, q);
      expect(got.map((x) => [x.f.id, x.score])).toEqual(expected.map((x) => [x.f.id, x.score]));
      expect(searchFoods(foods, `  ${q.toUpperCase()} `)).toBe(got); // same normalized query: cached array
    }
    expect(searchFoods(foods, '')).toEqual([]);
  });

  it('combined scoring matches the old concatenated-text score', () => {
    const foods = NAMES.map((n, i) => food(n, i, 'Acme'));
    for (const q of QUERIES) {
      const expected = foods
        .map((f) => ({ f, score: refScore(q, `${f.name_de} ${f.name_it} ${f.name_en} ${f.brand || ''}`) }))
        .filter((x) => refMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']))
        .sort((a, b) => a.score - b.score);
      expect(searchFoods(foods, q, { combined: true }).map((x) => [x.f.id, x.score])).toEqual(expected.map((x) => [x.f.id, x.score]));
    }
  });

  it('searchMeals matches the old pipeline', () => {
    const meals = NAMES.map((n, i) => ({ id: `m${i}`, name: n })) as unknown as PreBuiltMeal[];
    for (const q of QUERIES) {
      const expected = meals
        .map((m) => ({ m, score: refScore(q, m.name) }))
        .filter((x) => refMatch(q, [x.m.name]))
        .sort((a, b) => a.score - b.score);
      expect(searchMeals(meals, q).map((x) => x.m.id)).toEqual(expected.map((x) => x.m.id));
    }
  });
});
