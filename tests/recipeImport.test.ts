import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FoodItem } from '../src/types';
import {
  RecipeImportError,
  cleanRecipeName,
  readIngredientLines,
  readRecipeName,
  buildImportedRecipe,
  draftToRecipeIngredients,
  extractRecipeJsonLd,
  fetchPageHtml,
  importRecipeFromUrl,
  normalizeUrl,
  parseDuration,
  parseRecipePage,
  parseServings,
} from '../src/utils/recipeImport';

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
  food('spaghetti', 'Spaghetti', { calories: 356, carbs: 71, protein: 12, fat: 1.5, fiber: 3, salt: 0.01 }),
  food('tomatoes', 'Tomatoes, canned', { calories: 24, carbs: 4, protein: 1.2, fat: 0.2, fiber: 1.5 }),
  food('oil', 'Olive oil, extra virgin', { calories: 884, carbs: 0, protein: 0, fat: 100, fiber: 0, salt: 0 }),
  food('garlic', 'Garlic, raw', { calories: 149, carbs: 33, protein: 6, fat: 0.5, fiber: 2.1 }),
  food('basil', 'Basil, fresh', { calories: 23, carbs: 2.6, protein: 3.2, fat: 0.6, fiber: 1.6 }),
];

const recipeJson = (overrides: Record<string, unknown> = {}) => ({
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Pasta al pomodoro',
  image: 'https://example.com/pasta.jpg',
  recipeYield: '2 servings',
  prepTime: 'PT10M',
  cookTime: 'PT20M',
  author: { '@type': 'Person', name: 'Jane' },
  recipeIngredient: ['200 g spaghetti', '400 g canned tomatoes', '2 tbsp olive oil', '2 cloves garlic', 'a handful of basil'],
  recipeInstructions: [
    { '@type': 'HowToStep', text: 'Boil the pasta.' },
    { '@type': 'HowToStep', text: '<p>Add the sauce &amp; the basil.</p>' },
  ],
  nutrition: {
    '@type': 'NutritionInformation',
    calories: '450 calories',
    proteinContent: '15 g',
    carbohydrateContent: '60 g',
    fatContent: '12 g',
    fiberContent: '4 g',
    sodiumContent: '400 mg',
  },
  ...overrides,
});

const pageHtml = (json: unknown) =>
  `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head><body></body></html>`;

const html = pageHtml(recipeJson());

/* --------------------------------------------------------------------- url */

describe('normalizeUrl', () => {
  it('accepts links without a scheme', () => {
    expect(normalizeUrl('example.com/pasta')).toBe('https://example.com/pasta');
    expect(normalizeUrl('  https://example.com/pasta  ')).toBe('https://example.com/pasta');
    expect(normalizeUrl('//example.com/pasta')).toBe('https://example.com/pasta');
  });

  it('rejects what is not a link', () => {
    for (const bad of ['', 'pasta', 'not a link', 'javascript:alert(1)']) {
      expect(() => normalizeUrl(bad)).toThrow(RecipeImportError);
    }
  });
});

/* ------------------------------------------------------------------ json-ld */

describe('extractRecipeJsonLd', () => {
  it('reads a top-level Recipe', () => {
    expect(extractRecipeJsonLd(html)?.['name']).toBe('Pasta al pomodoro');
  });

  it('reads a Recipe inside @graph and inside arrays', () => {
    const graph = pageHtml({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'WebPage', name: 'Blog' }, { '@type': 'Recipe', name: 'From graph' }],
    });
    expect(extractRecipeJsonLd(graph)?.['name']).toBe('From graph');
    const list = pageHtml([{ '@type': 'Article' }, { '@type': 'Recipe', name: 'From list' }]);
    expect(extractRecipeJsonLd(list)?.['name']).toBe('From list');
  });

  it('skips broken blocks instead of failing', () => {
    const broken = `<script type="application/ld+json">{ oops </script>${html}`;
    expect(extractRecipeJsonLd(broken)?.['name']).toBe('Pasta al pomodoro');
  });

  it('returns null when the page has no recipe', () => {
    expect(extractRecipeJsonLd('<html><body>Nothing here</body></html>')).toBeNull();
  });
});

/* --------------------------------------------------------------- page parse */

describe('parseRecipePage', () => {
  const page = parseRecipePage(html, 'https://www.example.com/pasta-al-pomodoro');

  it('reads the recipe fields', () => {
    expect(page.name).toBe('Pasta al pomodoro');
    expect(page.servings).toBe(2);
    expect(page.prepMinutes).toBe(10);
    expect(page.cookMinutes).toBe(20);
    expect(page.author).toBe('Jane');
    expect(page.sourceLabel).toBe('example.com');
    expect(page.imageUrl).toBe('https://example.com/pasta.jpg');
    expect(page.ingredients).toHaveLength(5);
  });

  it('strips HTML and decodes entities in the steps', () => {
    expect(page.instructions).toEqual(['Boil the pasta.', 'Add the sauce & the basil.']);
  });

  it('converts the nutrition panel, including sodium → salt', () => {
    expect(page.nutritionPerServing).toEqual({
      calories: 450,
      carbs: 60,
      protein: 15,
      fat: 12,
      fiber: 4,
      salt: 1,
      sugar: null,
    });
  });

  it('throws a readable error for a page without a recipe', () => {
    expect(() => parseRecipePage('<html></html>', 'https://example.com')).toThrow(/No recipe found/);
  });
});

describe('servings and durations', () => {
  it('reads servings from every shape', () => {
    expect(parseServings('2 servings')).toBe(2);
    expect(parseServings('Serves 6')).toBe(6);
    expect(parseServings(4)).toBe(4);
    expect(parseServings('4-6 people')).toBe(5);
    expect(parseServings(['8 pieces'])).toBe(8);
    expect(parseServings(undefined)).toBeNull();
    expect(parseServings('a lot')).toBeNull();
  });

  it('reads ISO durations', () => {
    expect(parseDuration('PT10M')).toBe(10);
    expect(parseDuration('PT1H20M')).toBe(80);
    expect(parseDuration('PT1H')).toBe(60);
    expect(parseDuration(undefined)).toBeNull();
  });
});

/* ----------------------------------------------------------------- fetching */

describe('fetchPageHtml', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const setFetch = (impl: (url: string) => Promise<Response> | Response) => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => impl(String(input))) as unknown as typeof fetch;
  };

  it('uses the page directly when the site allows it', async () => {
    setFetch(() => new Response(html, { status: 200 }));
    const result = await fetchPageHtml('https://example.com/pasta');
    expect(result).toContain('Pasta al pomodoro');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the free proxies when the direct request is blocked', async () => {
    const calls: string[] = [];
    setFetch((url) => {
      calls.push(url);
      if (url.startsWith('https://example.com')) throw new TypeError('Failed to fetch');
      return new Response(html, { status: 200 });
    });
    const result = await fetchPageHtml('https://example.com/pasta');
    expect(result).toContain('Pasta al pomodoro');
    expect(calls[0]).toBe('https://example.com/pasta');
    expect(calls[1]).toContain('api.allorigins.win');
  });

  it('reports a network error when every route fails', async () => {
    setFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchPageHtml('https://example.com/pasta')).rejects.toMatchObject({ code: 'network' });
  });
});

/* ---------------------------------------------------------------- the draft */

describe('buildImportedRecipe', () => {
  const page = parseRecipePage(html, 'https://example.com/pasta');

  const matchesFor = (page: ReturnType<typeof parseRecipePage>) => page.ingredients.map((line) => {
    const query = line.toLowerCase();
    const found = CATALOGUE.find((entry) => query.includes(entry.name_en.split(',')[0].toLowerCase().split(' ')[0]));
    return {
      parsed: {
        raw: line,
        query,
        quantity: 1,
        unit: 'g',
        grams: 100,
        gramsBasis: 'mass' as const,
        optional: false,
        amountKind: 'exact' as const,
      },
      food: found ?? null,
      amount: found ? 200 : null,
      amountSource: found ? ('parsed' as const) : null,
      confidence: found ? ('high' as const) : null,
      score: found ? 1 : 0,
      alternatives: [],
    };
  });

  it('divides the dish by the servings on the page', () => {
    const draft = buildImportedRecipe(page, matchesFor(page));
    expect(draft.servings).toBe(2);
    expect(draft.portionSource).toBe('servings');
    expect(draft.portion).toBe(draft.totalGrams / 2);
  });

  it('falls back to a 100 g portion when the page does not say', () => {
    const noYield = parseRecipePage(pageHtml(recipeJson({ recipeYield: undefined })), 'https://example.com/pasta');
    const draft = buildImportedRecipe(noYield, matchesFor(noYield));
    expect(draft.servings).toBeNull();
    expect(draft.portion).toBe(100);
    expect(draft.portionSource).toBe('default');
  });

  it('keeps the unmatched lines and reports coverage', () => {
    const draft = buildImportedRecipe(page, matchesFor(page));
    expect(draft.items.length).toBeGreaterThan(0);
    expect(draft.unmatched).toHaveLength(5 - draft.items.length);
    expect(draft.coverage).toBeGreaterThan(0);
    expect(draft.coverage).toBeLessThanOrEqual(1);
    for (const line of draft.unmatched) expect(line.raw).toBeTruthy();
  });

  it('computes nutrition per 100 g of the matched mass', () => {
    // Fixed matches so the arithmetic is visible: 634 g matched, 30 g of basil left over.
    const fixed = [
      { food: CATALOGUE[0], amount: 200, raw: '200 g spaghetti', confidence: 'high' as const, grams: 200 },
      { food: CATALOGUE[1], amount: 400, raw: '400 g canned tomatoes', confidence: 'high' as const, grams: 400 },
      { food: CATALOGUE[2], amount: 28, raw: '2 tbsp olive oil', confidence: 'high' as const, grams: 28 },
      { food: CATALOGUE[3], amount: 6, raw: '2 cloves garlic', confidence: 'high' as const, grams: 6 },
      { food: null, amount: null, raw: 'a handful of basil', confidence: null, grams: 30 },
    ].map((entry) => ({
      parsed: {
        raw: entry.raw,
        query: entry.raw,
        quantity: 1,
        unit: null,
        grams: entry.grams,
        gramsBasis: 'mass' as const,
        optional: false,
        amountKind: 'exact' as const,
      },
      food: entry.food,
      amount: entry.amount,
      amountSource: entry.food ? ('parsed' as const) : null,
      confidence: entry.confidence,
      score: entry.food ? 0.9 : 0,
      alternatives: [] as FoodItem[],
    }));

    const draft = buildImportedRecipe(page, fixed);
    const kcal = (356 * 200 + 24 * 400 + 884 * 28 + 149 * 6) / 100; // 1064.4 kcal
    expect(draft.matchedGrams).toBe(634);
    expect(draft.totalGrams).toBe(664);
    expect(draft.unmatched).toHaveLength(1);
    expect(draft.unmatched[0].grams).toBe(30);
    expect(draft.coverage).toBe(0.95);
    expect(draft.nutritionPer100.calories).toBe(Math.round((kcal / 634) * 100)); // 168
    expect(draft.portion).toBe(332); // 664 g of dish / 2 servings
  });

  it('marks the source for provenance', () => {
    const draft = buildImportedRecipe(page, matchesFor(page));
    expect(draft.source).toEqual({ label: 'example.com', url: 'https://example.com/pasta' });
  });

  it('produces recipeIngredients ready for the builder', () => {
    const draft = buildImportedRecipe(page, matchesFor(page));
    const ingredients = draftToRecipeIngredients(draft);
    expect(ingredients).toHaveLength(draft.items.length);
    expect(ingredients[0]).toEqual({ foodId: draft.items[0].food.id, amount: draft.items[0].amount });
  });
});

/* ------------------------------------------------------------- end to end */

describe('importRecipeFromUrl', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('goes link → matched recipe draft without a server of its own', async () => {
    globalThis.fetch = vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch;
    const stages: string[] = [];
    const result = await importRecipeFromUrl('example.com/pasta', {
      localFoods: CATALOGUE,
      onStage: (stage) => stages.push(stage),
    });

    expect(stages).toEqual(['fetching', 'parsing', 'matching', 'done']);
    expect(result.page.name).toBe('Pasta al pomodoro');
    expect(result.via).toBe('direct');
    expect(result.draft.items.map((item) => item.food.id)).toContain('spaghetti');
    expect(result.draft.portion).toBeGreaterThan(0);
  });

  it('surfaces a friendly error for a page without a recipe', async () => {
    const blogPost = `<!doctype html><html><head><title>A blog post</title></head><body>${'<p>Some text about food.</p>'.repeat(10)}</body></html>`;
    globalThis.fetch = vi.fn(async () => new Response(blogPost, { status: 200 })) as unknown as typeof fetch;
    await expect(importRecipeFromUrl('https://example.com/blog', { localFoods: CATALOGUE })).rejects.toMatchObject({
      code: 'no-recipe',
    });
  });
});

/* --------------------------------------------------------------- the name */

describe('the recipe name', () => {
  it('comes from the JSON-LD name', () => {
    expect(parseRecipePage(html, 'https://example.com/p').name).toBe('Pasta al pomodoro');
  });

  it('falls back to the page title when the recipe has no name', () => {
    const noName = `<html><head><title>Pasta al pomodoro</title><script type="application/ld+json">${JSON.stringify(
      recipeJson({ name: undefined }),
    )}</script></head><body></body></html>`;
    expect(parseRecipePage(noName, 'https://example.com/p').name).toBe('Pasta al pomodoro');
  });

  it('falls back to OpenGraph, then <title>, then <h1>', () => {
    const og = `<html><head><meta property="og:title" content="Risotto ai funghi"></head><body></body></html>`;
    expect(readRecipeName(og, null)).toBe('Risotto ai funghi');
    const title = `<html><head><title>Carbonara | Cucina Facile</title></head><body></body></html>`;
    expect(readRecipeName(title, null)).toBe('Carbonara');
    const h1 = `<html><body><h1>Zuppa di ceci</h1></body></html>`;
    expect(readRecipeName(h1, null)).toBe('Zuppa di ceci');
  });

  it('never leaves the recipe unnamed', () => {
    expect(readRecipeName('<html></html>', null)).toBe('Imported recipe');
    expect(readRecipeName('<html><title>   </title></html>', null)).toBe('Imported recipe');
  });

  it('strips a site name but keeps a meaningful second part', () => {
    expect(cleanRecipeName('Pasta al pomodoro | Cucina Facile')).toBe('Pasta al pomodoro');
    expect(cleanRecipeName('Pasta al pomodoro - Ricette della Nonna')).toBe('Pasta al pomodoro');
    expect(cleanRecipeName('Pasta - 4 ways to cook it')).toBe('Pasta - 4 ways to cook it');
    expect(cleanRecipeName('"Pasta al pomodoro"')).toBe('Pasta al pomodoro');
  });
});

/* ----------------------------------------------------------------- errors */

describe('every failure says what went wrong', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const respond = (body: string | Uint8Array, init: ResponseInit = {}) => {
    globalThis.fetch = vi.fn(async () => new Response(body as BodyInit, init)) as unknown as typeof fetch;
  };

  const codeOf = async (promise: Promise<unknown>): Promise<string> => {
    try {
      await promise;
      return 'no-error';
    } catch (error) {
      return (error as RecipeImportError).code;
    }
  };

  it('"not a link"', async () => {
    expect(() => normalizeUrl('pasta')).toThrow(/does not look like a link/);
    expect(() => normalizeUrl('')).toThrow(/No link given/);
    expect(() => normalizeUrl('ftp://example.com/recipe')).toThrow(/Only web links/);
  });

  it('hammering every route fails with a network error', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await codeOf(fetchPageHtml('https://example.com/r'))).toBe('network');
  });

  it('a 403 or 429 is reported as blocked, not as a network error', async () => {
    respond('Forbidden', { status: 403 });
    expect(await codeOf(fetchPageHtml('https://example.com/r'))).toBe('blocked');
    respond('Too many', { status: 429 });
    expect(await codeOf(fetchPageHtml('https://example.com/r'))).toBe('blocked');
  });

  it('a PDF or an image is not HTML', async () => {
    respond('%PDF-1.4 not really', { status: 200, headers: { 'content-type': 'application/pdf' } });
    expect(await codeOf(fetchPageHtml('https://example.com/menu.pdf'))).toBe('not-html');
  });

  it('an oversized page is refused', async () => {
    respond('<html><body>huge</body></html>', { status: 200, headers: { 'content-length': String(50 * 1024 * 1024) } });
    expect(await codeOf(fetchPageHtml('https://example.com/r'))).toBe('too-large');
  });

  it('a human-check page is reported as blocked', async () => {
    const wall = `<html><head><title>Just a moment…</title></head><body>Checking your browser before accessing</body></html>`;
    expect(() => parseRecipePage(wall, 'https://example.com/r')).toThrow(
      expect.objectContaining({ code: 'blocked' }) as unknown as Error,
    );
    expect(await codeOf(Promise.resolve().then(() => parseRecipePage(wall, 'https://example.com/r')))).toBe('blocked');
  });

  it('a login wall is reported as such', async () => {
    const wall = `<html><body><p>Sign in to continue reading this recipe.</p></body></html>`;
    expect(await codeOf(Promise.resolve().then(() => parseRecipePage(wall, 'https://example.com/r')))).toBe('login-wall');
  });

  it('an article without a recipe says so', async () => {
    const article = `<html><body>${'<p>A blog post about food.</p>'.repeat(10)}</body></html>`;
    expect(await codeOf(Promise.resolve().then(() => parseRecipePage(article, 'https://example.com/r')))).toBe('no-recipe');
  });

  it('a recipe without ingredients says so', async () => {
    const empty = pageHtml(recipeJson({ recipeIngredient: [] }));
    expect(await codeOf(Promise.resolve().then(() => parseRecipePage(empty, 'https://example.com/r')))).toBe('empty');
  });

  it('a list made only of headings is empty too', async () => {
    const headings = pageHtml(recipeJson({ recipeIngredient: ['For the sauce:', 'Per il condimento:'] }));
    expect(await codeOf(Promise.resolve().then(() => parseRecipePage(headings, 'https://example.com/r')))).toBe('empty');
  });

  it('carries a readable English message and a hint for every code', async () => {
    try {
      parseRecipePage('<html></html>', 'https://example.com/r');
      throw new Error('should have thrown');
    } catch (error) {
      const failure = error as RecipeImportError;
      expect(failure.message).toMatch(/No recipe found/);
      expect(failure.hint.length).toBeGreaterThan(10);
    }
  });

  it('decodes a page that is not UTF-8', async () => {
    // "Pasta à la crème" in ISO-8859-1: à is 0xE0 and è is 0xE8, one byte each.
    const latin1 = (text: string) => Uint8Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);
    const body = latin1(
      '<html><head><meta charset="iso-8859-1"></head><body><script type="application/ld+json">' +
        JSON.stringify(recipeJson({ name: 'Pasta \u00e0 la cr\u00e8me' })) +
        '</script></body></html>',
    );
    globalThis.fetch = vi.fn(async () => new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=iso-8859-1' } })) as unknown as typeof fetch;
    const parsed = parseRecipePage(await fetchPageHtml('https://example.com/r'), 'https://example.com/r');
    expect(parsed.name).toBe('Pasta à la crème');
  });
});

/* -------------------------------------------------------- seasonings & warnings */

const matchOf = (
  raw: string,
  food: FoodItem | null,
  amount: number | null,
  amountKind: 'exact' | 'approx' | 'vague' | 'none' = 'exact',
  grams: number | null = amount,
) => ({
  parsed: {
    raw,
    query: raw,
    quantity: amount,
    unit: null,
    grams,
    gramsBasis: 'mass' as const,
    optional: amountKind === 'vague',
    amountKind,
  },
  food,
  amount,
  amountSource: food && amount !== null ? ('parsed' as const) : null,
  confidence: food ? ('high' as const) : null,
  score: food ? 0.9 : 0,
  alternatives: [] as FoodItem[],
});

describe('seasonings and warnings', () => {
  const page = parseRecipePage(html, 'https://example.com/pasta');
  const salt = food('salt', 'Table salt', { calories: 0 });

  it('keeps "sale q.b." out of the ingredients and out of the totals', () => {
    const draft = buildImportedRecipe(page, [
      matchOf('200 g spaghetti', CATALOGUE[0], 200),
      matchOf('sale quanto basta', salt, null, 'vague'),
      matchOf('a pinch of pepper', null, 0.5, 'vague'),
    ]);
    expect(draft.items).toHaveLength(1);
    expect(draft.seasonings).toHaveLength(2);
    expect(draft.seasonings[0]).toMatchObject({ raw: 'sale quanto basta', food: { id: 'salt' } });
    expect(draft.totalGrams).toBe(200); // the seasonings add nothing
    expect(draft.warnings).toContain('seasonings');
  });

  it('offers the matched product of a seasoning so it can be added in one tap', () => {
    const draft = buildImportedRecipe(page, [matchOf('a pinch of salt', salt, 0.5, 'vague')]);
    expect(draft.seasonings[0].food?.id).toBe('salt');
    expect(draft.seasonings[0].grams).toBe(0.5);
  });

  it('warns when nothing matched', () => {
    const draft = buildImportedRecipe(page, [matchOf('200 g unobtainium', null, 200)]);
    expect(draft.items).toHaveLength(0);
    expect(draft.unmatched).toHaveLength(1);
    expect(draft.warnings).toContain('no-matches');
  });

  it('leaves a line with no amount unmatched instead of inventing a portion', () => {
    const draft = buildImportedRecipe(page, [matchOf('1 scoop protein powder', CATALOGUE[0], null, 'none')]);
    expect(draft.items).toHaveLength(0);
    expect(draft.unmatched[0].food?.id).toBe(CATALOGUE[0].id); // still offered to the user
  });

  it('warns about the portions, the duplicates and the extra recipes on the page', () => {
    const multi = parseRecipePage(
      `${html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(recipeJson({ name: 'Second' }))}</script></head>`)}`,
      'https://example.com/pasta',
    );
    const draft = buildImportedRecipe(multi, [matchOf('200 g spaghetti', CATALOGUE[0], 200)]);
    expect(multi.recipeCount).toBe(2);
    expect(draft.warnings).toContain('multiple-recipes');
    expect(draft.warnings).not.toContain('no-servings');
  });
});

describe('ingredient shapes', () => {
  it('reads objects, single big strings and bullets', () => {
    expect(readIngredientLines([{ '@type': 'HowToIngredient', name: '200 g flour' }, '2 eggs'])).toEqual([
      '200 g flour',
      '2 eggs',
    ]);
    expect(readIngredientLines(['200 g flour\n2 eggs\n• 1 tsp salt'])).toEqual(['200 g flour', '2 eggs', '1 tsp salt']);
  });
});
