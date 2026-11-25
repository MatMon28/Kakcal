import { describe, expect, it } from 'vitest';
import { cleanIngredientName, parseIngredientLine, parseIngredientLines } from '../src/utils/ingredientParse';

const parse = (line: string) => parseIngredientLine(line);

describe('parseIngredientLine — quantities', () => {
  it('reads plain, decimal and comma decimals', () => {
    expect(parse('200 g flour').quantity).toBe(200);
    expect(parse('1.5 kg potatoes').quantity).toBe(1.5);
    expect(parse('1,5 kg Kartoffeln').quantity).toBe(1.5);
  });

  it('reads fractions, mixed numbers and unicode fractions', () => {
    expect(parse('1/2 cup milk').quantity).toBe(0.5);
    expect(parse('1 1/2 cups flour').quantity).toBe(1.5);
    expect(parse('½ tsp salt').quantity).toBe(0.5);
    expect(parse('1½ cups oats').quantity).toBe(1.5);
  });

  it('averages ranges', () => {
    expect(parse('2-3 cloves garlic').quantity).toBe(2.5);
    expect(parse('2–3 cloves garlic').quantity).toBe(2.5);
    expect(parse('1 to 2 tbsp oil').quantity).toBe(1.5);
  });

  it('reads number words and ignores noise words', () => {
    expect(parse('a pinch of salt').quantity).toBe(1);
    expect(parse('about 2 cups rice').quantity).toBe(2);
    expect(parse('two eggs').quantity).toBe(2);
  });
});

describe('parseIngredientLine — grams', () => {
  it('uses the mass unit directly', () => {
    expect(parse('200 g flour').grams).toBe(200);
    expect(parse('1 kg potatoes').grams).toBe(1000);
    expect(parse('2 oz cheese').grams).toBeCloseTo(56.7, 1);
    expect(parse('1 lb ground beef').grams).toBeCloseTo(453.6, 0);
  });

  it('converts volume with a per-food density', () => {
    expect(parse('1 cup flour').grams).toBeCloseTo(127.2, 0); // 240 ml × 0.53
    expect(parse('1 tbsp olive oil').grams).toBeCloseTo(13.8, 1); // 15 ml × 0.92
    expect(parse('1 cup milk').grams).toBeCloseTo(247.2, 0); // 240 ml × 1.03
    expect(parse('250 ml water').grams).toBe(250); // unknown liquid → 1 g/ml
    expect(parse('1 cup sugar').grams).toBeCloseTo(204, 0); // 240 ml × 0.85
  });

  it('uses a piece weight for countable foods', () => {
    expect(parse('2 eggs').grams).toBe(100);
    expect(parse('1 large onion, finely chopped').grams).toBe(110);
    expect(parse('3 cloves garlic').grams).toBe(9);
    expect(parse('2 slices bread').grams).toBe(60);
    expect(parse('1 can chickpeas').grams).toBe(400);
  });

  it('prefers the weight in brackets over the unit', () => {
    const parsed = parse('1 (14 oz) can diced tomatoes');
    expect(parsed.grams).toBeCloseTo(396.9, 0); // 14 oz = 396.9 g
    expect(parsed.query).toBe('tomatoes'); // "diced" is a preparation word
  });

  it('multiplies "2 x 400 g cans"', () => {
    const parsed = parse('2 x 400 g cans chopped tomatoes');
    expect(parsed.grams).toBe(800);
    expect(parsed.query).toBe('tomatoes'); // "chopped" is a preparation word
  });

  it('returns null instead of guessing', () => {
    expect(parse('Salt and pepper to taste').grams).toBeNull();
    expect(parse('a handful of basil').grams).toBe(30); // handful is a known unit
    expect(parse('some parsley').grams).toBeNull();
  });
});

describe('parseIngredientLine — the search query', () => {
  it('drops preparation, size and trailing notes', () => {
    expect(parse('2 large onions, finely chopped').query).toBe('onions');
    expect(parse('200 g all-purpose flour, sifted, plus more for dusting').query).toBe('all purpose flour');
    // "extra" is a noise word ("plus extra for dusting"); the rest is what identifies the product
    expect(parse('1 tbsp extra-virgin olive oil (optional)').query).toBe('virgin olive oil');
    expect(parse('500 g chicken breast, cut into cubes').query).toBe('chicken breast');
  });

  it('keeps the words that identify the product', () => {
    expect(parse('100 g dark chocolate 70%').query).toBe('dark chocolate');
    expect(parse('200 g Greek yogurt').query).toBe('greek yogurt');
  });

  it('handles Italian and German lines', () => {
    expect(parse('200 g di farina 00').query).toBe('farina 00');
    expect(parse('2 cucchiai di olio extravergine di oliva').grams).toBeCloseTo(27.6, 1);
    expect(parse('1 Zwiebel, fein gehackt').query).toBe('zwiebel');
  });

  it('flags optional lines', () => {
    expect(parse('Freshly ground black pepper, to taste').optional).toBe(true);
    expect(parse('200 g flour').optional).toBe(false);
  });
});

describe('helpers', () => {
  it('cleanIngredientName strips notes and parentheticals', () => {
    expect(cleanIngredientName('tomatoes (ripe), chopped')).toBe('tomatoes');
  });

  it('parseIngredientLines keeps order and skips empty lines', () => {
    const parsed = parseIngredientLines(['200 g flour', '   ', '2 eggs']);
    expect(parsed.map((entry) => entry.query)).toEqual(['flour', 'eggs']);
  });
});

describe('seasonings: "a pinch", "sale quanto basta", "q.b."', () => {
  it('marks a pinch as a vague amount but keeps a reference weight', () => {
    const pinch = parse('a pinch of salt');
    expect(pinch.amountKind).toBe('vague');
    expect(pinch.grams).toBe(0.5);
    expect(pinch.query).toBe('salt');
    expect(parse('1 dash of Tabasco').amountKind).toBe('vague');
    expect(parse('un pizzico di sale').amountKind).toBe('vague');
  });

  it('reads the Italian "quanto basta" and its abbreviation', () => {
    for (const line of ['sale quanto basta', 'Sale q.b.', 'sale q b', 'pepe q.b.', 'olio q.b.', 'quanto basta di prezzemolo']) {
      expect(parse(line).amountKind).toBe('vague');
    }
    expect(parse('sale quanto basta').query).toBe('sale');
    expect(parse('Sale q.b.').query).toBe('sale');
  });

  it('reads "to taste" and its translations', () => {
    for (const line of ['salt and pepper to taste', 'pepper, to taste', 'salz nach Geschmack', 'prezzemolo q.s.']) {
      expect(parse(line).amountKind).toBe('vague');
    }
    expect(parse('salt and pepper to taste').optional).toBe(true);
  });

  it('never gives a vague line a real weight', () => {
    expect(parse('sale quanto basta').grams).toBeNull();
    expect(parse('salt to taste').grams).toBeNull();
    expect(parse('salt and pepper to taste').grams).toBeNull();
  });

  it('treats a bare seasoning word as vague too', () => {
    expect(parse('sale').amountKind).toBe('vague');
    expect(parse('pepe').amountKind).toBe('vague');
  });
});

describe('quantities that break naive parsing', () => {
  it('reads thousands separators', () => {
    expect(parse('1.000 g flour').grams).toBe(1000);
    expect(parse('1,000 g flour').grams).toBe(1000);
    expect(parse('1.5 kg potatoes').grams).toBe(1500); // still a decimal
    expect(parse('1,5 kg Kartoffeln').grams).toBe(1500);
  });

  it('drops group headings and duplicated lines', () => {
    const parsed = parseIngredientLines([
      'For the sauce:',
      'Per il condimento:',
      '400 g canned tomatoes',
      '400 g canned tomatoes',
      '2 tbsp olive oil',
    ]);
    expect(parsed.map((entry) => entry.query)).toEqual(['canned tomatoes', 'olive oil']);
  });

  it('keeps two different amounts of the same food', () => {
    const parsed = parseIngredientLines(['100 g butter', '50 g butter']);
    expect(parsed).toHaveLength(2);
  });
});
