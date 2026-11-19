import type { FoodItem } from '../types';
import { FOOD_CATEGORIES } from './foodCategories';

/**
 * Reader for public/data/off-foods.bin, the offline Open Food Facts catalogue (about 130,000
 * products with per-100 g/ml energy, macros, sugar, fibre, salt and the classic portion).
 * The file is produced by scripts/build-off-catalog.mjs; its layout is documented there.
 *
 * Why this is quick: the file is wrapped in typed arrays without any parsing or copying, only the
 * ASCII search text is turned into a JS string (one decode, a few milliseconds), and a FoodItem is
 * created only for the handful of rows a search returns. The file is fetched lazily, the first time
 * a food search needs it, so it costs nothing at app start. If it cannot be loaded the app simply
 * keeps using the bundled catalogue.
 */

const MAGIC = 0x464f464b; // "KOFF"
const MISSING = 0xffff;
const FIELDS = ['barcode', 'searchOff', 'nameOff', 'brandOff', 'kcal', 'fat', 'carbs', 'sugar', 'protein', 'fiber', 'salt',
  'portion', 'flags', 'cat', 'searchBlob', 'nameBlob', 'brandBlob', 'end'] as const;

/** Same normalisation as scripts/build-off-catalog.mjs: lowercase ASCII words separated by one space. */
export const normalizeSearch = (s: string): string => s.toLowerCase().replace(/ß/g, 'ss').replace(/æ/g, 'ae')
  .replace(/œ/g, 'oe').replace(/ø/g, 'o').replace(/đ/g, 'd').replace(/ł/g, 'l').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Rank of a catalogue hit on the scale of utils/fuzzy.ts (0 = exact word, 0.5 = word prefix, 2+ = typo only).
 * Every catalogue hit is a word-prefix match, so it ranks below an exact match in the bundled foods but
 * above the loose typo matches that would otherwise crowd the top of the list.
 */
export const catalogueScore = (query: string): number =>
  0.4 * Math.max(1, normalizeSearch(query).split(' ').filter(Boolean).length);

export interface OffCatalog {
  readonly count: number;
  /** Word-prefix search over name + brand; every word must match. Best matches first. */
  search(query: string, limit?: number): FoodItem[];
  findByBarcode(code: string): FoodItem | null;
}

function parse(buffer: ArrayBuffer): OffCatalog {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC || view.getUint32(4, true) !== 1) throw new Error('Unsupported food catalogue');
  const count = view.getUint32(8, true);
  const at = {} as Record<(typeof FIELDS)[number], number>;
  FIELDS.forEach((key, i) => { at[key] = view.getUint32(16 + i * 4, true); });

  const bytes = new Uint8Array(buffer);
  const barcode = new Float64Array(buffer, at.barcode, count);
  const searchOff = new Uint32Array(buffer, at.searchOff, count + 1);
  const nameOff = new Uint32Array(buffer, at.nameOff, count + 1);
  const brandOff = new Uint32Array(buffer, at.brandOff, count + 1);
  const u16 = (key: 'kcal' | 'fat' | 'carbs' | 'sugar' | 'protein' | 'fiber' | 'salt' | 'portion') =>
    new Uint16Array(buffer, at[key], count);
  const kcal = u16('kcal'), fat = u16('fat'), carbs = u16('carbs'), sugar = u16('sugar'), protein = u16('protein');
  const fiber = u16('fiber'), salt = u16('salt'), portion = u16('portion');
  const flags = new Uint8Array(buffer, at.flags, count);
  const category = new Uint8Array(buffer, at.cat, count);

  const decoder = new TextDecoder();
  const text = decoder.decode(bytes.subarray(at.searchBlob, at.searchBlob + searchOff[count]));
  const slice = (blob: number, offsets: Uint32Array, i: number) =>
    decoder.decode(bytes.subarray(blob + offsets[i], blob + offsets[i + 1]));

  const food = (i: number): FoodItem => {
    const name = slice(at.nameBlob, nameOff, i);
    const brand = slice(at.brandBlob, brandOff, i);
    const code = String(barcode[i]).padStart(((flags[i] >> 1) & 7) + 8, '0');
    const scaled = (a: Uint16Array, divisor: number) => (a[i] === MISSING ? null : a[i] / divisor);
    return {
      id: `off-${code}`,
      name_de: name,
      name_it: name,
      name_en: name,
      brand: brand || undefined,
      store: 'Open Food Facts',
      category: FOOD_CATEGORIES[category[i]] ?? 'prepared',
      unit: flags[i] & 1 ? 'ml' : 'g',
      calories: Math.round(kcal[i] / 10),
      carbs: carbs[i] / 10,
      protein: protein[i] / 10,
      fat: fat[i] / 10,
      fiber: scaled(fiber, 10),
      salt: scaled(salt, 100),
      sugar: scaled(sugar, 10),
      portion: portion[i] || undefined,
      barcode: code,
      source: { label: 'Open Food Facts', url: `https://world.openfoodfacts.org/product/${code}` },
    };
  };

  /** Record that contains character position `pos` of the search text. */
  const recordAt = (pos: number): number => {
    let lo = 0, hi = count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (searchOff[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return lo;
  };
  const textOf = (i: number) => text.substring(searchOff[i], searchOff[i + 1]);

  const search = (query: string, limit = 40): FoodItem[] => {
    const tokens = normalizeSearch(query).split(' ').filter(Boolean);
    if (!tokens.length) return [];
    const phrase = ` ${tokens.join(' ')}`;
    const anchor = tokens.reduce((a, b) => (b.length > a.length ? b : a));
    const needle = ` ${anchor}`;
    const chosen = new Set<number>();
    const phraseHits: number[] = [];

    // 1. Records that contain the whole phrase, in popularity order (the file is sorted by rank).
    if (tokens.length > 1) {
      for (let pos = text.indexOf(phrase); pos >= 0 && phraseHits.length < limit; pos = text.indexOf(phrase, searchOff[recordAt(pos) + 1])) {
        const rec = recordAt(pos);
        if (!chosen.has(rec)) { chosen.add(rec); phraseHits.push(rec); }
      }
    }
    // 2. Records where every word is the start of some word, anchored on the longest word.
    const loose: number[] = [];
    const budget = Math.max(limit * 8, 400);
    for (let pos = text.indexOf(needle); pos >= 0 && loose.length < budget; ) {
      const rec = recordAt(pos);
      if (!chosen.has(rec)) {
        const body = textOf(rec);
        if (tokens.every((token) => body.includes(` ${token}`))) loose.push(rec);
      }
      pos = text.indexOf(needle, searchOff[rec + 1]);
    }
    // Names that begin with the first word come before names that merely contain it.
    const lead = ` ${tokens[0]}`;
    const starts: number[] = [], rest: number[] = [];
    for (const rec of loose) (text.startsWith(lead, searchOff[rec]) ? starts : rest).push(rec);
    return [...phraseHits, ...starts, ...rest].slice(0, limit).map(food);
  };

  let byCode: Map<number, number> | null = null;
  const findByBarcode = (code: string): FoodItem | null => {
    const digits = code.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 14) return null;
    if (!byCode) {
      byCode = new Map();
      for (let i = 0; i < count; i++) byCode.set(barcode[i], i);
    }
    // A UPC-A code (12 digits) is the same product as its EAN-13 form with a leading zero.
    const index = byCode.get(Number(digits)) ?? byCode.get(Number(digits.replace(/^0+/, '')));
    return index === undefined ? null : food(index);
  };

  return { count, search, findByBarcode };
}

// ---- lazy loading + a tiny store so React can subscribe ----
let loaded: OffCatalog | null = null;
let pending: Promise<OffCatalog | null> | null = null;
const listeners = new Set<() => void>();

export function loadOffCatalog(): Promise<OffCatalog | null> {
  if (loaded) return Promise.resolve(loaded);
  if (!pending) {
    pending = (async () => {
      try {
        const response = await fetch(new URL('data/off-foods.bin', document.baseURI).href);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        loaded = parse(await response.arrayBuffer());
        listeners.forEach((notify) => notify());
        return loaded;
      } catch (error) {
        console.warn('Offline food catalogue unavailable; using the bundled foods only.', error);
        pending = null; // a later search may try again
        return null;
      }
    })();
  }
  return pending;
}

export const getLoadedOffCatalog = (): OffCatalog | null => loaded;
export const subscribeOffCatalog = (notify: () => void): (() => void) => {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
};
