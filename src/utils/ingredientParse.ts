/**
 * Ingredient line parsing: "1 1/2 cups all-purpose flour, sifted" → 1.5 cups of flour ≈ 191 g.
 *
 * Recipe pages give ingredients as free text in one of a hundred formats. Kakcal needs two things
 * from each line: a *search query* (to find the matching FoodItem) and an *amount in grams*
 * (to put in `recipeIngredients`). This module produces both, with a bias towards returning
 * `null` rather than a wrong number.
 *
 * The gram estimate is only a starting value shown in the review screen: the user can fix any
 * amount before saving, and a wrong guess is obvious there ("1 g of onion"), while a missing one
 * is not.
 */

export type GramsBasis = 'mass' | 'volume' | 'count' | null;

/**
 * How precise the line's amount is.
 * - `exact`  a mass was written or can be derived exactly ("200 g", "1 (14 oz) can")
 * - `approx` converted from a volume or a piece count ("1 cup flour", "2 eggs")
 * - `vague`  "a pinch of salt", "sale q.b.", "pepper to taste": seasoning, not an amount
 * - `none`   no amount at all ("parsley for garnish")
 */
export type AmountKind = 'exact' | 'approx' | 'vague' | 'none';

export interface ParsedIngredient {
  /** The original line, shown in the UI so the user can compare. */
  raw: string;
  /** Cleaned food name used to search the food catalogue ("all-purpose flour"). */
  query: string;
  /** The amount as written ("1 1/2" → 1.5, "2-3" → 2.5). */
  quantity: number | null;
  /** Normalized unit ("cups", "tbsp", "cloves"…), null for a bare count ("2 eggs"). */
  unit: string | null;
  /** Estimated weight in grams (or millilitres for liquids), null when it cannot be guessed. */
  grams: number | null;
  gramsBasis: GramsBasis;
  /** "salt and pepper to taste": included only when the user keeps it. */
  optional: boolean;
  /** Whether the amount can be trusted, is a guess, or was never given. */
  amountKind: AmountKind;
}

/* ------------------------------------------------------------------ units */

type UnitKind = 'mass' | 'volume' | 'count';

/** Unit → kind + grams (mass) or millilitres (volume) per unit. Counts use the piece table. */
const UNITS: Record<string, { kind: UnitKind; factor: number }> = (() => {
  const table: Record<string, { kind: UnitKind; factor: number }> = {};
  const add = (kind: UnitKind, factor: number, names: string) => {
    for (const name of names.split(' ')) table[name] = { kind, factor };
  };
  // mass (grams per unit)
  add('mass', 1, 'g gr gram grams gramme grammes grammo grammi gramm');
  add('mass', 1000, 'kg kilo kilos kilogram kilograms chilogrammo chilogrammi kilogramm');
  add('mass', 0.001, 'mg milligram milligrams milligrammo milligrammi');
  add('mass', 28.3495, 'oz ounce ounces oncia once unze');
  add('mass', 453.592, 'lb lbs pound pounds libbra libbre pfund');
  add('mass', 0.5, 'pinch pinches pizzico pizzichi prise');
  add('mass', 1, 'dash dashes goccio spruzzo');
  // volume (millilitres per unit)
  add('volume', 1, 'ml milliliter milliliters millilitre millilitres millilitro millilitri');
  add('volume', 1000, 'l lt liter liters litre litres litro litri');
  add('volume', 10, 'cl centilitre centilitres centilitro centilitri');
  add('volume', 100, 'dl decilitre decilitres decilitro decilitri');
  add('volume', 5, 'tsp teaspoon teaspoons cucchiaino cucchiaini tl teelöffel');
  add('volume', 15, 'tbsp tablespoon tablespoons cucchiaio cucchiai el esslöffel');
  add('volume', 240, 'cup cups tazza tazze tasse becher');
  add('volume', 30, 'floz');
  add('volume', 473, 'pint pints pinta');
  add('volume', 946, 'quart quarts');
  add('volume', 3785, 'gallon gallons');
  // counts (grams come from the piece table; the factor is a last-resort default)
  add('count', 3, 'clove cloves spicchio spicchi zehe zehen');
  add('count', 30, 'slice slices fetta fette scheibe scheiben');
  add('count', 400, 'can cans tin tins lattina lattine dose barattolo barattoli büchse dose');
  add('count', 250, 'package packages packet packets pack packs busta bustine confezione pacco packung');
  add('count', 25, 'bunch bunches mazzetto mazzetti strauss');
  add('count', 30, 'handful handfuls manciata manciate handvoll');
  add('count', 2, 'sprig sprigs rametto rametti zweig');
  add('count', 15, 'stick sticks stecca');
  add('count', 15, 'knob knobs');
  add('count', 100, 'piece pieces pz pezzo pezzi stück');
  return table;
})();

/** Grams for one piece, by food keyword (first match wins, so specific entries come first). */
const PIECES: Array<[RegExp, number]> = [
  [/egg\s*white|albume/, 33],
  [/egg\s*yolk|tuorlo/, 17],
  [/\begg\b|\beggs\b|\buov/, 50],
  [/garlic|aglio|knoblauch/, 3],
  [/shallot|scalogn/, 25],
  [/\bonion\b|onions|cipoll/, 110],
  [/cherry tomato|pomodorin/, 15],
  [/tomato|pomodor/, 123],
  [/potato|patat|kartoffel/, 170],
  [/carrot|carot|karotte|möhre/, 61],
  [/celery stalk|cost/, 40],
  [/leek|porro|lauch/, 90],
  [/cucumber|cetriol|gurke/, 300],
  [/bell pepper|peperon|paprika/, 120],
  [/courgette|zucchini/, 200],
  [/aubergine|eggplant|melanzan/, 250],
  [/avocado/, 150],
  [/lemon|limon/, 60],
  [/lime|limett/, 45],
  [/orange|aranc/, 140],
  [/apple|mel[ae]\b|mela|apfel/, 180],
  [/banana/, 118],
  [/peach|pesca|pfirsich/, 150],
  [/pear|pera|birne/, 180],
  [/strawberr|fragol|erdbeer/, 12],
  [/blueberr|mirtill|heidelbeer/, 2],
  [/mushroom|champignon|funghi|pilz/, 15],
  [/prawn|shrimp|gamber|garnele/, 8],
  [/walnut|noce|walnuss/, 5],
  [/almond|mandorl|mandel/, 1.2],
  [/cashew|anacard/, 1.5],
  [/basil leaf|foglia di basilico/, 0.5],
  [/spinach|spinat|spinaci/, 10],
  [/bread roll|panino|brötchen/, 60],
  [/sliced bread|bread|pane|brot/, 30],
  [/chicken breast|petto di pollo/, 170],
  [/chicken thigh|cossa di pollo/, 90],
  [/bacon|pancetta|speck/, 15],
  [/sausage|salsicc|wurst/, 60],
];

/** Grams per millilitre for volume units, by food keyword (first match wins). */
const DENSITIES: Array<[RegExp, number]> = [
  [/almond flour|farina di mandorle/, 0.4],
  [/brown sugar|zucchero di canna|brauner zucker/, 0.72],
  [/powdered sugar|icing sugar|zucchero a velo|puderzucker/, 0.56],
  [/sugar|zucchero|zucker/, 0.85],
  [/corn\s?starch|maizena|amido|speisestärke/, 0.6],
  [/cocoa|cacao|kakao/, 0.42],
  [/breadcrumb|pangrattato|paniermehl/, 0.45],
  [/oats|oatmeal|fiocchi d'avena|haferflocken/, 0.39],
  [/flour|farina|mehl/, 0.53],
  [/semolina|semolino|grieß/, 0.7],
  [/\brice\b|riso|reis/, 0.85],
  [/\bpasta\b|spaghetti|penne|fusilli|maccheroni|nudel/, 0.5],
  [/grated cheese|parmesan|parmigiano|grana|pecorino|formaggio grattugiato|reibekäse/, 0.4],
  [/butter|burro|butter/, 0.911],
  [/ghee|lard|strutto|schmalz/, 0.9],
  [/honey|miele|honig/, 1.42],
  [/syrup|sciroppo|sirup/, 1.33],
  [/peanut butter|burro di arachidi|erdnussbutter/, 1.09],
  [/jam|marmalade|confettura|marmellata|konfitüre/, 1.3],
  [/tomato puree|passata|concentrato/, 1.06],
  [/tomato sauce|salsa di pomodoro|tomatensauce/, 1.03],
  [/cream|panna|sahne/, 1.01],
  [/yogurt|yoghurt/, 1.03],
  [/milk|latte|milch/, 1.03],
  [/oil|olio|öl/, 0.92],
  [/protein powder/, 0.45],
  [/salt|sale|salz/, 1.22],
  [/nuts|seeds|mandorle|nocciole|semi|nüsse|samen/, 0.6],
];

/* --------------------------------------------------------------- helpers */

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
  '⅐': '1/7', '⅑': '1/9', '⅒': '1/10',
};

/** "1½" → "1 1/2", "½" → "1/2". */
const expandFractions = (text: string) =>
  text.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⅐⅑⅒]/g, (ch) => ` ${UNICODE_FRACTIONS[ch]} `);

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, half: 0.5, un: 1, uno: 1, una: 1,
  ein: 1, eine: 1, einhalb: 0.5, mezzo: 0.5,
};

/** Noise before the amount: "about 2 cups", "ca. 500 g", "~1 tbsp". */
const LEADING_NOISE = /^(?:about|approximately|approx\.?|around|roughly|circa|ca\.?|env\.?|~|±|>\s*|just)\s+/i;

/** Preparation words that carry no product identity: removed from the search query only. */
const PREP_WORDS = new Set([
  // cooking / cutting
  'chopped', 'minced', 'diced', 'sliced', 'grated', 'shredded', 'crushed', 'peeled', 'trimmed',
  'rinsed', 'drained', 'cooked', 'uncooked', 'softened', 'melted', 'beaten', 'whisked',
  'halved', 'quartered', 'cubed', 'julienned', 'ground', 'pounded', 'sifted', 'packed',
  'heaping', 'scant', 'level', 'divided', 'plus', 'extra', 'optional', 'to', 'taste', 'for',
  'garnish', 'serving', 'decoration', 'freshly', 'fresh', 'raw', 'organic', 'cold', 'warm',
  'hot', 'room', 'temperature', 'into', 'pieces', 'strips', 'chunks', 'wedges', 'thinly',
  'finely', 'coarsely', 'roughly', 'lightly', 'well', 'very', 'thin', 'thick', 'cut', 'washed',
  'preferably', 'if', 'available', 'or', 'and', 'of', 'the', 'a', 'an', 'some', 'any',
  // italian
  'tritato', 'tritata', 'tagliato', 'tagliata', 'affettato', 'grattugiato', 'grattugiata',
  'sminuzzato', 'pelato', 'scolato', 'cotto', 'crudo', 'fresco', 'fresca', 'facoltativo',
  'q', 'b', 'qb', 'quanto', 'basta', 'per', 'di', 'del', 'della', 'dei', 'delle', 'e', 'o',
  'circa', 'possibilmente', 'fino', 'finemente', 'grossolanamente', 'a', 'da', 'in',
  // german
  'gehackt', 'gehackte', 'geschnitten', 'gerieben', 'gewürfelt', 'gekocht', 'roh', 'frisch',
  'frische', 'fein', 'grob', 'und', 'oder', 'nach', 'geschmack', 'zum', 'zur', 'für', 'optional',
  'zerkleinert', 'abgetropft', 'gewaschen', 'in', 'stücke', 'stücken',
]);

/** Size / shape words: dropped from the query so "1 large onion" searches "onion". */
const SIZE_WORDS = new Set([
  'large', 'medium', 'small', 'big', 'xl', 'extra-large', 'jumbo', 'whole', 'gran', 'große',
  'großer', 'kleine', 'mittelgroße', 'grande', 'grandi', 'piccolo', 'piccola', 'medio', 'media',
]);

/**
 * Lines whose amount is not an amount. "Sale quanto basta" is the Italian for "salt to taste" and
 * the single most common line in Italian recipes; "q.b." is its abbreviation. These must never
 * become an ingredient with an invented weight: 100 g of salt would be a disaster, and even 0.5 g
 * is noise in the totals, so they are kept apart as seasonings.
 */
const VAGUE_HINTS = new RegExp(
  [
    '\\b(to taste|as needed|as required|to serve|for serving|for garnish|to garnish|optional)\\b',
    '\\b(qb|q\\.\\s?b\\.?|q b|quanto basta|quanto occorre|q\\.\\s?s\\.?|quantum satis)\\b',
    '\\b(nach geschmack|wie ben(ö|oe)tigt|zum garnieren|optional)\\b',
    '\\b(sale e pepe|sal e piver)\\b',
  ].join('|'),
  'i',
);

/**
 * Words that are a seasoning in any quantity: "sale 1", "1 sale", "salt" are all "to taste".
 * Only salt and pepper — oil, water or flour are real ingredients as soon as they have a number.
 */
const SEASONING_WORDS = new Set([
  'salt', 'sale', 'salz', 'pepper', 'pepe', 'pfeffer', 'peperoncino', 'chili', 'peperoncini',
]);

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const clampAmount = (value: number) => (Number.isFinite(value) && value > 0 ? value : null);

/** First number in the text, as a range average: "2-3" → 2.5, "1 to 2" → 1.5. */
function leadingQuantity(text: string): { value: number; rest: string } | null {
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)\b/.exec(text);
  if (mixed) {
    const whole = Number(mixed[1]);
    const den = Number(mixed[3]);
    const value = den > 0 ? whole + Number(mixed[2]) / den : whole;
    return { value, rest: text.slice(mixed[0].length) };
  }
  const fraction = /^(\d+)\s*\/\s*(\d+)\b/.exec(text);
  if (fraction) {
    const den = Number(fraction[2]);
    if (den > 0) return { value: Number(fraction[1]) / den, rest: text.slice(fraction[0].length) };
  }
  const range = /^(\d+(?:[.,]\d+)?)\s*(?:-|–|—|to|a)\s*(\d+(?:[.,]\d+)?)\b/i.exec(text);
  if (range) {
    const a = Number(range[1].replace(',', '.'));
    const b = Number(range[2].replace(',', '.'));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { value: (a + b) / 2, rest: text.slice(range[0].length) };
    }
  }
  // "1.000 g" / "1,000 g" are a thousand grams, not one: only a group of exactly three digits
  // after a separator that is followed by another separator or by nothing can be a thousands mark.
  const thousands = /^(\d{1,3})([.,]\d{3})(?:\2\d{3})*/.exec(text);
  if (thousands) {
    const digits = text.slice(0, thousands[0].length).replace(/[.,]/g, '');
    const value = Number(digits);
    if (Number.isFinite(value) && value > 0) return { value, rest: text.slice(thousands[0].length) };
  }
  const plain = /^(\d+(?:[.,]\d+)?)/.exec(text);
  if (plain) {
    const value = Number(plain[1].replace(',', '.'));
    if (Number.isFinite(value)) return { value, rest: text.slice(plain[0].length) };
  }
  const word = /^([a-zäöüß]+)\b/i.exec(text);
  if (word) {
    const value = NUMBER_WORDS[word[1].toLowerCase()];
    if (value !== undefined) return { value, rest: text.slice(word[0].length) };
  }
  return null;
}

/**
 * Some recipes write the amount after the name: "scalogno 1", "uova 2", "farina 500 g",
 * "olio 2 cucchiai", "scalogno n. 1". The number (and its unit, when there is one) is moved in
 * front so the normal path handles it.
 *
 * Things that only look like a trailing amount are rejected:
 *  - zero-padded codes, "farina 00" (a specific grind) and "tipo 0-0";
 *  - percentages, "cioccolato 70%";
 *  - a number followed by a word that is not a unit, "scalogno 1 grosso";
 *  - a bare number that is too large to be a count, "ricetta 4 persone".
 */
function splitTrailingQuantity(text: string): { head: string; quantity: string; unit: string } | null {
  if (/%|°/.test(text)) return null;
  const match = /^(.+?)[\s,;]+(?:(?:n|nr|no)\.?\s*|x\s*|×\s*)?(\d{1,4}(?:[.,]\d{1,2})?|\d+\s*\/\s*\d+)\s*([a-zà-ÿ]+)?\.?$/i.exec(
    text.trim(),
  );
  if (!match) return null;
  const head = match[1].trim().replace(/[,;]+$/, '').trim();
  const rawQuantity = match[2];
  const rawUnit = (match[3] ?? '').toLowerCase();
  if (!/[a-zà-ÿ]/i.test(head)) return null; // nothing left to name the food
  if (/^0\d/.test(rawQuantity)) return null; // "00", "07": a code, not an amount
  const unit = rawUnit && (UNITS[rawUnit] ? rawUnit : UNITS[`${rawUnit}s`] ? `${rawUnit}s` : null);
  if (rawUnit && !unit) return null; // "scalogno 1 grosso": the word is part of the name
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(rawQuantity);
  const value = fraction ? Number(fraction[1]) / Math.max(1, Number(fraction[2])) : Number(rawQuantity.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  // With a unit, a few kilograms are fine; a bare number is a count of pieces.
  if (unit ? value > 5000 : value > 50) return null;
  return { head, quantity: rawQuantity, unit: unit ?? '' };
}

/** "(14 oz)" / "(400 g)" inside a line: the real weight of "1 can" or "1 package". */
function parentheticalWeight(text: string): { grams: number; rest: string } | null {
  const match = /^\s*\(\s*([^)]{1,24})\)/.exec(text);
  if (!match) return null;
  const inner = match[1].trim();
  const q = leadingQuantity(inner.toLowerCase());
  if (!q) return null;
  const unit = UNITS[q.rest.trim().split(/\s+/)[0]?.replace(/\.$/, '') ?? ''];
  if (unit?.kind !== 'mass') return null;
  return { grams: q.value * unit.factor, rest: text.slice(match[0].length) };
}

function densityOf(name: string): number {
  const text = name.toLowerCase();
  for (const [pattern, density] of DENSITIES) if (pattern.test(text)) return density;
  return 1;
}

function pieceWeight(name: string): number | null {
  const text = name.toLowerCase();
  for (const [pattern, grams] of PIECES) if (pattern.test(text)) return grams;
  return null;
}

/** The name as it should be searched: no parentheticals, no prep words, no size words. */
export function cleanIngredientName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\*+/g, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:%|(?:g|kg|mg|ml|cl|dl|l)\b)/gi, ' ')
    .split(',')[0]
    .replace(/[.;:]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-zà-ÿß0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((token) => token.length > 0 && !PREP_WORDS.has(token) && !SIZE_WORDS.has(token));
}

/** Parse one ingredient line. Never throws: an unparseable line keeps its text and null amounts. */
export function parseIngredientLine(raw: string): ParsedIngredient {
  const original = String(raw ?? '').trim();
  let text = expandFractions(original)
    .replace(/\u00a0/g, ' ')
    .replace(/^[\s\-•*·]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  text = text.replace(LEADING_NOISE, '');

  const vagueByWords = VAGUE_HINTS.test(text);
  const optional = vagueByWords;
  let quantity: number | null = null;
  let unit: string | null = null;
  let grams: number | null = null;
  let gramsBasis: GramsBasis = null;

  let q = leadingQuantity(text);
  if (!q) {
    // "scalogno 1" → "1 scalogno", then the usual path reads the unit and the piece weight.
    const trailing = splitTrailingQuantity(text);
    if (trailing) {
      text = `${trailing.quantity}${trailing.unit ? ` ${trailing.unit}` : ''} ${trailing.head}`;
      q = leadingQuantity(text);
    }
  }
  if (q) {
    quantity = q.value;
    text = q.rest.trim().replace(/^[.)]\s*/, ''); // "1. onion" / "1) onion"

    // "2 x 400 g cans chopped tomatoes": the second part is the size of one unit.
    const multiplied = /^(?:x|×|\*)\s*/i.exec(text);
    if (multiplied) {
      const inner = leadingQuantity(text.slice(multiplied[0].length));
      if (inner) {
        text = inner.rest.trim();
        const innerUnitKey = text.split(/\s+/)[0]?.replace(/\.$/, '').toLowerCase() ?? '';
        const innerUnit = UNITS[innerUnitKey];
        if (innerUnit?.kind === 'mass') grams = quantity * inner.value * innerUnit.factor;
        quantity = quantity * inner.value;
        if (innerUnit) {
          unit = innerUnitKey;
          text = text.slice(innerUnitKey.length).trim();
        }
      }
    }

    // "1 (14 oz) can diced tomatoes"
    if (grams === null) {
      const paren = parentheticalWeight(text);
      if (paren) {
        grams = quantity * paren.grams;
        gramsBasis = 'mass';
        text = paren.rest.trim();
      }
    }

    const words = text.split(/\s+/).filter(Boolean);
    const first = words[0]?.toLowerCase().replace(/[.,;:]$/, '') ?? '';
    const twoWords = `${first} ${words[1]?.toLowerCase().replace(/[.,;:]$/, '') ?? ''}`;
    const unitKey = UNITS[twoWords] ? twoWords : UNITS[first] ? first : null;
    if (unitKey) {
      unit = unitKey;
      text = text.slice(unitKey.length).trim();
      if (grams === null) {
        const { kind, factor } = UNITS[unitKey];
        if (kind === 'mass') {
          grams = quantity * factor;
          gramsBasis = 'mass';
        }
      }
    }
  }

  let name = text.replace(/^of\s+/i, '').replace(/\s+/g, ' ').trim();
  name = cleanIngredientName(name);
  const tokens = queryTokens(name);
  const query = tokens.join(' ').trim() || cleanIngredientName(name);

  // Volume and count amounts need the food name, so they are resolved after it is known.
  if (grams === null && quantity != null) {
    if (unit) {
      const def = UNITS[unit];
      if (def?.kind === 'volume') {
        grams = quantity * def.factor * densityOf(query);
        gramsBasis = 'volume';
      } else if (def?.kind === 'count') {
        const piece = pieceWeight(query);
        grams = quantity * (piece ?? def.factor);
        gramsBasis = 'count';
      }
    } else {
      const piece = pieceWeight(query);
      if (piece !== null) {
        grams = quantity * piece;
        gramsBasis = 'count';
      }
    }
  }

  // A pinch or a dash is a seasoning amount: keep the reference weight (0.5 g), flag it as vague.
  const pinchUnit = unit !== null && /^(pinch|pinches|pizzico|pizzichi|prise|dash|dashes|goccio|spruzzo)$/.test(unit);
  const seasoningOnly =
    (quantity === null || unit === null) &&
    query.length > 0 &&
    query.split(' ').every((token) => SEASONING_WORDS.has(token));

  const amountKind: AmountKind =
    vagueByWords || pinchUnit || seasoningOnly
      ? 'vague'
      : grams === null
        ? 'none'
        : gramsBasis === 'mass'
          ? 'exact'
          : 'approx';

  return {
    raw: original,
    query: query || name,
    quantity: quantity === null ? null : round(quantity, 2),
    unit,
    grams: grams === null ? null : clampAmount(round(grams, 1)),
    gramsBasis,
    optional,
    amountKind,
  };
}

/** The line's volume in millilitres when it was given in a volume unit ("2 cups" → 480), else null. */
export function volumeMillilitres(parsed: ParsedIngredient): number | null {
  const def = parsed.unit ? UNITS[parsed.unit] : undefined;
  if (!def || def.kind !== 'volume' || parsed.quantity === null) return null;
  return Math.round(parsed.quantity * def.factor * 10) / 10;
}

/** Convenience: the gram estimate of a line, or null. */
export const estimateIngredientGrams = (line: string): number | null => parseIngredientLine(line).grams;

/**
 * Group headings that recipe plugins put inside the ingredient list ("For the sauce:",
 * "Per il condimento") are not ingredients: no amount, ends with a colon, only a few words.
 */
function isGroupHeading(line: string): boolean {
  const text = line.trim();
  if (!text) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;
  if (!/:$/.test(text)) return false;
  return leadingQuantity(text) === null;
}

/** Whole lines at once: no empty lines, no group headings, no exact duplicates. */
export function parseIngredientLines(lines: readonly string[]): ParsedIngredient[] {
  const seen = new Set<string>();
  const out: ParsedIngredient[] = [];
  for (const line of lines) {
    if (!line || isGroupHeading(line)) continue;
    const parsed = parseIngredientLine(line);
    if (parsed.query.length === 0) continue;
    // The same line twice is one ingredient; different amounts of the same food are kept.
    const key = `${parsed.query}|${parsed.quantity ?? ''}|${parsed.unit ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}
