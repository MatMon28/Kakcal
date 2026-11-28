import type { FoodCategory, FoodItem } from '../types';
import { FOOD_CATEGORIES } from './foodCategories';

/**
 * Reader for public/data/off-foods.bin, the offline Open Food Facts catalogue (KOFF v2).
 * Produced by scripts/build-off-catalog.mjs; its layout is documented there.
 *
 * Why this stays fast at 550,000+ products:
 * - Zero-copy typed-array views over the downloaded ArrayBuffer.
 * - Inverted word-prefix index with delta-varint postings (sub-millisecond intersection).
 * - O(log N) binary search over a sorted barcode index (no JS Map heap overhead).
 * - Deduplicated brand table and lazy UTF-8 decoding only for returned rows.
 */

const MAGIC = 0x464f464b; // "KOFF"
const VERSION = 2;
const MISSING = 0xffff;

export const REGION_IT = 0x10;
export const REGION_EU = 0x20;
export const REGION_US = 0x40;
export const REGION_UK = 0x80;

export type CatalogLang = 'en' | 'it';

const FIELDS = [
  'barcode', 'barcodeOrder', 'nameOff', 'brandId', 'brandOff',
  'kcal', 'fat', 'carbs', 'sugar', 'protein', 'fiber', 'salt', 'portion',
  'flags', 'cat', 'vocabOff', 'postOff', 'postings', 'vocabBlob', 'nameBlob', 'brandBlob', 'end',
] as const;

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
  search(query: string, limit?: number, lang?: CatalogLang): FoodItem[];
  findByBarcode(code: string): FoodItem | null;
  browse(query: string, category: FoodCategory | null, excluded: ReadonlySet<number>, lang?: CatalogLang): {
    count: number;
    page(offset: number, limit: number): FoodItem[];
  };
}

const preferMaskOf = (lang?: CatalogLang): number =>
  lang === 'it' ? REGION_IT : lang === 'en' ? (REGION_US | REGION_UK) : 0;

/** Wraps the KOFF v2 catalogue file in typed arrays. Also used by src/workers/offCatalogSearch.worker.ts. */
export function parseOffCatalog(buffer: ArrayBuffer): OffCatalog {
  if (buffer.byteLength < 112) throw new Error('Incomplete food catalogue');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC || view.getUint32(4, true) !== VERSION) {
    throw new Error('Unsupported food catalogue');
  }
  const count = view.getUint32(8, true);
  const brandCount = view.getUint32(16, true);
  const vocabCount = view.getUint32(20, true);
  const at = {} as Record<(typeof FIELDS)[number], number>;
  FIELDS.forEach((key, i) => { at[key] = view.getUint32(24 + i * 4, true); });
  if (!count || !brandCount || !vocabCount || at.end !== buffer.byteLength) {
    throw new Error('Incomplete food catalogue');
  }

  const bytes = new Uint8Array(buffer);
  const barcode = new Float64Array(buffer, at.barcode, count);
  const barcodeOrder = new Uint32Array(buffer, at.barcodeOrder, count);
  const nameOff = new Uint32Array(buffer, at.nameOff, count + 1);
  const brandId = new Uint32Array(buffer, at.brandId, count);
  const brandOff = new Uint32Array(buffer, at.brandOff, brandCount + 1);
  const u16 = (key: 'kcal' | 'fat' | 'carbs' | 'sugar' | 'protein' | 'fiber' | 'salt' | 'portion') =>
    new Uint16Array(buffer, at[key], count);
  const kcal = u16('kcal'), fat = u16('fat'), carbs = u16('carbs'), sugar = u16('sugar'), protein = u16('protein');
  const fiber = u16('fiber'), salt = u16('salt'), portion = u16('portion');
  const flags = new Uint8Array(buffer, at.flags, count);
  const category = new Uint8Array(buffer, at.cat, count);
  const vocabOff = new Uint32Array(buffer, at.vocabOff, vocabCount + 1);
  const postOff = new Uint32Array(buffer, at.postOff, vocabCount + 1);
  const postings = new Uint8Array(buffer, at.postings, postOff[vocabCount]);
  const vocabBytes = new Uint8Array(buffer, at.vocabBlob, vocabOff[vocabCount]);

  const decoder = new TextDecoder();
  const nameOf = (i: number) => decoder.decode(bytes.subarray(at.nameBlob + nameOff[i], at.nameBlob + nameOff[i + 1]));
  const brandOf = (i: number) => {
    const bid = brandId[i];
    return bid ? decoder.decode(bytes.subarray(at.brandBlob + brandOff[bid], at.brandBlob + brandOff[bid + 1])) : '';
  };

  const food = (i: number): FoodItem => {
    const name = nameOf(i);
    const brand = brandOf(i);
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

  const lookupNum = (target: number): number => {
    if (!Number.isFinite(target) || target <= 0) return -1;
    let lo = 0, hi = count - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const row = barcodeOrder[mid];
      const v = barcode[row];
      if (v === target) return row;
      if (v < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  };

  const findRowByBarcode = (code: string): number => {
    const digits = code.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 14) return -1;
    let row = lookupNum(Number(digits));
    if (row < 0) {
      const trimmed = digits.replace(/^0+/, '');
      if (trimmed && trimmed !== digits) row = lookupNum(Number(trimmed));
    }
    return row;
  };

  const findByBarcode = (code: string): FoodItem | null => {
    const row = findRowByBarcode(code);
    return row < 0 ? null : food(row);
  };

  // ---- Inverted index helpers ----
  const compareWord = (w: number, target: string): number => {
    const start = vocabOff[w];
    const end = vocabOff[w + 1];
    const wLen = end - start;
    const tLen = target.length;
    const minLen = wLen < tLen ? wLen : tLen;
    for (let i = 0; i < minLen; i++) {
      const diff = vocabBytes[start + i] - target.charCodeAt(i);
      if (diff !== 0) return diff;
    }
    return wLen - tLen;
  };

  const lowerBound = (target: string): number => {
    let lo = 0, hi = vocabCount;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (compareWord(mid, target) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const prefixRange = (prefix: string): [number, number] => {
    const lo = lowerBound(prefix);
    const last = prefix.length - 1;
    const nextPrefix = prefix.slice(0, last) + String.fromCharCode(prefix.charCodeAt(last) + 1);
    const hi = lowerBound(nextPrefix);
    return [lo, hi];
  };

  const seen = new Uint16Array(count);
  let epoch = 0;

  const rowNorms = (i: number) => {
    const nNorm = normalizeSearch(nameOf(i));
    const bNorm = normalizeSearch(brandOf(i));
    const combined = bNorm && !nNorm.includes(bNorm) ? ` ${nNorm} ${bNorm} ` : ` ${nNorm} `;
    return { nNorm, combined };
  };

  const matchTokens = (tokens: string[]): { cand: number[]; sorted: boolean; mark: number; usedSeen: boolean } | null => {
    const uniq = Array.from(new Set(tokens));
    const ranges = uniq.map((token) => {
      const [lo, hi] = prefixRange(token);
      return { token, lo, hi, span: lo < hi ? postOff[hi] - postOff[lo] : 0 };
    });
    if (ranges.some((r) => r.lo >= r.hi || r.span === 0)) return null;
    ranges.sort((a, b) => a.span - b.span);

    const k = ranges.length;
    if (epoch + k + 2 > 0xffff) {
      seen.fill(0);
      epoch = 0;
    }
    const base = epoch + 1;
    epoch += k + 1;

    const cand: number[] = [];
    const first = ranges[0];
    for (let w = first.lo; w < first.hi; w++) {
      let p = postOff[w];
      const end = postOff[w + 1];
      let row = 0;
      while (p < end) {
        let delta = 0, shift = 0, byte = 0;
        do {
          byte = postings[p++];
          delta |= (byte & 0x7f) << shift;
          shift += 7;
        } while (byte >= 0x80);
        row += delta;
        if (seen[row] !== base) {
          seen[row] = base;
          cand.push(row);
        }
      }
    }
    const sorted = first.hi - first.lo === 1;
    if (k === 1) return { cand, sorted, mark: base, usedSeen: true };

    for (let j = 1; j < k; j++) {
      const range = ranges[j];
      if (cand.length <= 1500 && range.span > cand.length * 10) {
        const rem = ranges.slice(j).map((r) => ` ${r.token}`);
        const kept: number[] = [];
        for (let idx = 0; idx < cand.length; idx++) {
          const row = cand[idx];
          const { combined } = rowNorms(row);
          if (rem.every((word) => combined.includes(word))) kept.push(row);
        }
        return { cand: kept, sorted, mark: 0, usedSeen: false };
      }
      const prevMark = base + j - 1;
      const nextMark = base + j;
      for (let w = range.lo; w < range.hi; w++) {
        let p = postOff[w];
        const end = postOff[w + 1];
        let row = 0;
        while (p < end) {
          let delta = 0, shift = 0, byte = 0;
          do {
            byte = postings[p++];
            delta |= (byte & 0x7f) << shift;
            shift += 7;
          } while (byte >= 0x80);
          row += delta;
          if (seen[row] === prevMark) seen[row] = nextMark;
        }
      }
      let write = 0;
      for (let idx = 0; idx < cand.length; idx++) {
        const row = cand[idx];
        if (seen[row] === nextMark) cand[write++] = row;
      }
      cand.length = write;
      if (write === 0) return null;
    }
    return { cand, sorted, mark: base + k - 1, usedSeen: true };
  };

  const orderedCandidates = (matched: { cand: number[]; sorted: boolean; mark: number; usedSeen: boolean }): number[] => {
    if (matched.sorted) return matched.cand;
    if (matched.usedSeen && matched.cand.length > 2000) {
      const out = new Array<number>(matched.cand.length);
      let pos = 0;
      const mark = matched.mark;
      for (let r = 0; r < count; r++) {
        if (seen[r] === mark) out[pos++] = r;
      }
      out.length = pos;
      return out;
    }
    matched.cand.sort((a, b) => a - b);
    return matched.cand;
  };

  const search = (query: string, limit = 40, lang?: CatalogLang): FoodItem[] => {
    const tokens = normalizeSearch(query).split(' ').filter(Boolean);
    if (!tokens.length || limit <= 0) return [];
    const matched = matchTokens(tokens);
    if (!matched || matched.cand.length === 0) return [];

    const preferMask = preferMaskOf(lang);
    const budget = Math.max(limit * 8, 400);
    const prefRows: number[] = [];
    const otherRows: number[] = [];

    if (!matched.sorted && matched.usedSeen && matched.cand.length > 2000) {
      const mark = matched.mark;
      for (let r = 0; r < count; r++) {
        if (seen[r] !== mark) continue;
        if (preferMask && (flags[r] & preferMask) !== 0) {
          if (prefRows.length < budget) prefRows.push(r);
        } else if (otherRows.length < budget) {
          otherRows.push(r);
        }
        if (preferMask ? (prefRows.length >= budget && otherRows.length >= budget) : otherRows.length >= budget) break;
      }
    } else {
      if (!matched.sorted) matched.cand.sort((a, b) => a - b);
      const list = matched.cand;
      for (let idx = 0; idx < list.length; idx++) {
        const r = list[idx];
        if (preferMask && (flags[r] & preferMask) !== 0) {
          if (prefRows.length < budget) prefRows.push(r);
        } else if (otherRows.length < budget) {
          otherRows.push(r);
        }
        if (preferMask ? (prefRows.length >= budget && otherRows.length >= budget) : otherRows.length >= budget) break;
      }
    }

    const phrase = tokens.length > 1 ? ` ${tokens.join(' ')}` : '';
    const lead = ` ${tokens[0]}`;
    const t1: number[] = [], t2: number[] = [], t3: number[] = [], t4: number[] = [], t5: number[] = [], t6: number[] = [];

    const classify = (r: number, isPref: boolean) => {
      const { nNorm, combined } = rowNorms(r);
      if (phrase && combined.includes(phrase)) {
        (isPref ? t1 : t2).push(r);
      } else if (` ${nNorm}`.startsWith(lead)) {
        (isPref ? t3 : t4).push(r);
      } else {
        (isPref ? t5 : t6).push(r);
      }
    };

    for (let i = 0; i < prefRows.length; i++) classify(prefRows[i], true);
    for (let i = 0; i < otherRows.length; i++) classify(otherRows[i], false);

    return [...t1, ...t2, ...t3, ...t4, ...t5, ...t6].slice(0, limit).map(food);
  };

  // Keep only matching row indices. Decode names, brands and nutrition for the requested page.
  const browse: OffCatalog['browse'] = (query, filter, excluded, lang) => {
    const trimmed = query.trim();
    const tokens = normalizeSearch(query).split(' ').filter(Boolean);
    const group = filter === null ? -1 : FOOD_CATEGORIES.indexOf(filter);
    const exactCode = /^\d{8,14}$/.test(trimmed) ? trimmed : null;
    const preferMask = preferMaskOf(lang);
    const accept = (i: number) => (group < 0 || category[i] === group) && !excluded.has(barcode[i]);
    const all = !trimmed && group < 0 && excluded.size === 0;

    if (all && !preferMask) {
      return {
        count,
        page(offset, limit) {
          const start = Math.max(0, offset);
          const end = Math.min(count, start + limit);
          return Array.from({ length: Math.max(0, end - start) }, (_, n) => food(start + n));
        },
      };
    }

    let matches: Uint32Array | number[] = [];
    let prefSlice: Uint32Array | null = null;
    let otherSlice: Uint32Array | null = null;
    let total = 0;

    if (exactCode !== null) {
      const row = findRowByBarcode(exactCode);
      matches = row >= 0 && accept(row) ? [row] : [];
      total = matches.length;
    } else if (!trimmed) {
      const pref = new Uint32Array(count);
      const other = new Uint32Array(count);
      let pLen = 0, oLen = 0;
      for (let i = 0; i < count; i++) {
        if (!accept(i)) continue;
        if (preferMask && (flags[i] & preferMask) !== 0) pref[pLen++] = i;
        else other[oLen++] = i;
      }
      if (!preferMask) {
        matches = other.subarray(0, oLen);
        total = oLen;
      } else {
        prefSlice = pref.subarray(0, pLen);
        otherSlice = other.subarray(0, oLen);
        total = pLen + oLen;
      }
    } else if (tokens.length) {
      const matched = matchTokens(tokens);
      if (!matched || matched.cand.length === 0) {
        matches = [];
        total = 0;
      } else {
        const rows = orderedCandidates(matched);
        const prefList: number[] = [];
        const otherList: number[] = [];
        for (let idx = 0; idx < rows.length; idx++) {
          const r = rows[idx];
          if (!accept(r)) continue;
          if (preferMask && (flags[r] & preferMask) !== 0) prefList.push(r);
          else otherList.push(r);
        }
        const phrase = ` ${tokens.join(' ')}`;
        const promotePhrases = (list: number[], cap: number) => {
          if (list.length === 0) return list;
          const head: number[] = [], tail: number[] = [];
          const checkLimit = Math.min(list.length, cap);
          for (let i = 0; i < checkLimit; i++) {
            const r = list[i];
            (rowNorms(r).combined.startsWith(phrase) ? head : tail).push(r);
          }
          for (let i = checkLimit; i < list.length; i++) tail.push(list[i]);
          return [...head, ...tail];
        };
        const totalAccepted = prefList.length + otherList.length;
        const cap = totalAccepted <= 5000 ? totalAccepted : 1000;
        const orderedPref = promotePhrases(prefList, cap);
        const orderedOther = promotePhrases(otherList, cap);
        const combined = [...orderedPref, ...orderedOther];
        matches = combined;
        total = combined.length;
      }
    } else {
      matches = [];
      total = 0;
    }

    return {
      count: total,
      page(offset, limit) {
        const start = Math.max(0, offset);
        const end = Math.min(total, start + limit);
        if (prefSlice && otherSlice) {
          const pLen = prefSlice.length;
          return Array.from({ length: Math.max(0, end - start) }, (_, n) => {
            const idx = start + n;
            return food(idx < pLen ? prefSlice![idx] : otherSlice![idx - pLen]);
          });
        }
        return Array.from({ length: Math.max(0, end - start) }, (_, n) => food(matches[start + n]));
      },
    };
  };

  return { count, search, findByBarcode, browse };
}

// ---- lazy loading + a tiny store so React can subscribe (fallback when Workers are unavailable) ----
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
        loaded = parseOffCatalog(await response.arrayBuffer());
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
