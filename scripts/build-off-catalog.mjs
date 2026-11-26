#!/usr/bin/env node
/**
 * Builds the offline Open Food Facts catalogue: public/data/off-foods.bin (+ off-foods.meta.json).
 *
 *   node scripts/build-off-catalog.mjs [source] [--limit 550000] [--out public/data/off-foods.bin]
 *
 * `source` is the Open Food Facts CSV export, gzipped or plain, as a file path or an https URL.
 * It defaults to https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
 * (about 1.5 GB; it is streamed, never stored or loaded whole, so ~1.5 GB of RAM is enough).
 *
 * Selection: a product is kept only when it has a valid barcode, a Latin name, a target market
 * (Italy, EU, UK/IE/AU/NZ, US/CA), is not discontinued/obsolete/stale, and has a complete,
 * self-consistent set of per-100 g/ml values. Products are balanced across regional quotas using
 * popularity + completeness + recency, strictly deduplicated, and ranked descending by score.
 *
 * File format "KOFF" v2 (little-endian; every section is 8-byte aligned so the browser can wrap
 * it in typed arrays without copying; see src/data/offCatalog.ts for the reader):
 *   header       : u32 magic 'KOFF', version(2), count(N), builtAtDays, brandCount(B), vocabCount(V),
 *                  then u32[22] byte offsets for all sections + end (offset 108)
 *   barcode      : f64[N]            EAN/UPC digits as a number (length is kept in `flags`)
 *   barcodeOrder : u32[N]            row indices sorted ascending by numeric barcode
 *   nameOff      : u32[N+1]          offsets into nameBlob
 *   brandId      : u32[N]            deduplicated brand index (0 = "")
 *   brandOff     : u32[B+1]          offsets into brandBlob
 *   kcal         : u16[N]            kcal x 10 per 100 g/ml
 *   fat, carbs, sugar, protein, fiber : u16[N]  g x 10   (0xFFFF = unknown)
 *   salt         : u16[N]            g x 100                  (0xFFFF = unknown)
 *   portion      : u16[N]            classic portion (g or ml), 0 = unknown
 *   flags        : u8[N]             bit0=ml, bits1-3=barcodeLen-8, bits4-7=regionMask (IT/EU/US/UK)
 *   cat          : u8[N]             index into FOOD_CATEGORIES (src/data/foodCategories.ts)
 *   vocabOff     : u32[V+1]          offsets into vocabBlob (ASCII words sorted strictly by code unit)
 *   postOff      : u32[V+1]          offsets into postings
 *   postings     : u8[...]           unsigned LEB128 delta-varint ascending row indices per word
 *   vocabBlob    : u8[...]           pure ASCII unique word dictionary
 *   nameBlob     : u8[...]           UTF-8 product names
 *   brandBlob    : u8[...]           UTF-8 deduplicated brand names
 *
 * Data: (c) Open Food Facts contributors, Open Database Licence 1.0; see public/licenses/.
 */
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) throw new Error('Little-endian platform required.');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';

export const REGION_IT = 0x10;
export const REGION_EU = 0x20;
export const REGION_US = 0x40;
export const REGION_UK = 0x80;

const IT_TAGS = new Set(['en:italy', 'en:san-marino', 'en:vatican-city']);
const US_TAGS = new Set(['en:united-states', 'en:canada']);
const UK_TAGS = new Set(['en:united-kingdom', 'en:ireland', 'en:australia', 'en:new-zealand']);
const FR_TAGS = new Set(['en:france']);
const DACH_TAGS = new Set(['en:germany', 'en:austria', 'en:switzerland']);
const IBERIA_TAGS = new Set(['en:spain', 'en:portugal']);
const EU_TAGS = new Set([
  'en:france', 'en:germany', 'en:spain', 'en:switzerland', 'en:belgium', 'en:netherlands',
  'en:austria', 'en:portugal', 'en:poland', 'en:sweden', 'en:denmark', 'en:finland',
  'en:norway', 'en:greece', 'en:czech-republic', 'en:czechia', 'en:hungary', 'en:romania',
  'en:croatia', 'en:slovakia', 'en:slovenia', 'en:bulgaria', 'en:luxembourg', 'en:estonia',
  'en:latvia', 'en:lithuania', 'en:cyprus', 'en:malta', 'en:european-union',
]);

// Keep in sync with FOOD_CATEGORIES in src/data/foodCategories.ts.
const CATEGORIES = ['prepared', 'soups', 'grains_pasta', 'dairy', 'meat_fish', 'legumes', 'produce_fruit',
  'produce_veg', 'bakery', 'nuts_seeds', 'snacks_sweets', 'desserts', 'drinks', 'condiments_oils'];
const CATEGORY_RULES = [
  [/beverage|water|juice|soda|wine|beer|spirit|coffee|\btea|drink|smoothie|kombucha/, 'drinks'],
  [/dairies|milk|yogurt|yoghurt|cheese|butter|cream|kefir|skyr/, 'dairy'],
  [/meat|fish|seafood|sausage|ham\b|poultry|chicken|beef|pork|tuna|salmon|egg|cured|salami/, 'meat_fish'],
  [/legume|pulse|bean|lentil|chickpea|pea\b|tofu|soy/, 'legumes'],
  [/soup|broth|bouillon/, 'soups'],
  [/dessert|ice-cream|pudding|cake|pastr|tart|mousse|sorbet|gelato|tiramisu/, 'desserts'],
  [/snack|biscuit|cookie|chocolate|candy|candies|confection|chip|crisp|sweet|cracker|bar\b|wafer|gum/, 'snacks_sweets'],
  [/bread|bakery|brioche|croissant|baguette|rusk|toast|pizza-dough|focaccia/, 'bakery'],
  [/pasta|rice|cereal|flour|noodle|grain|oat|couscous|semolina|muesli|granola|polenta/, 'grains_pasta'],
  [/nut\b|nuts|seed|almond|hazelnut|peanut|walnut|cashew|pistachio/, 'nuts_seeds'],
  [/oil|sauce|condiment|vinegar|salt\b|spice|spread|jam|honey|ketchup|mayonnaise|pesto|herb|marmalade|dressing/, 'condiments_oils'],
  [/vegetable|salad|tomato|potato|mushroom|legumes-and|carrot|onion/, 'produce_veg'],
  [/fruit|berries|apple|banana|orange|citrus/, 'produce_fruit'],
];
export const categoryOf = (tags) => {
  for (const [re, name] of CATEGORY_RULES) if (re.test(tags)) return CATEGORIES.indexOf(name);
  return 0; // prepared
};

/** Shared with the reader: lowercase ASCII words separated by single spaces. */
export const normalize = (s) => s.toLowerCase().replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe')
  .replace(/ø/g, 'o').replace(/đ/g, 'd').replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

const LATIN_ONLY = /^[\u0020-\u024F\u2013\u2014\u2018-\u201D\u20AC\u00B0]+$/;
const DISCONTINUED_NAME_RE = /\b(?:discontinued|obsolete|fuori\s+produzione)\b/i;
const PACK_RE = /\b(?:\d+\s*[x×]\s*)?\d+(?:[.,]\d+)?\s*(?:kg|gr|g|mg|ml|cl|dl|l|lt|oz|fl\s*oz|lb|lbs|pack|pcs|pz|pezzi|stueck|stuck|bars?|caps?|pods?|bags?|bottles?|cans?|tins?|slices?|rolls?)\b/gi;
const MULTI_RE = /\b(?:x\s*\d+|\d+\s*x)\b/gi;

const num = (v) => {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s\-'(/])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const cleanName = (raw) => {
  let s = (raw || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  if (s.length < 2 || s.length > 140 || !LATIN_ONLY.test(s) || /^[\d\W]+$/u.test(s) || /https?:|www\./i.test(s)) return '';
  if (s === s.toUpperCase() && /[A-Z]/.test(s) && s.length > 4) s = titleCase(s);
  if (s.length > 72) { s = s.slice(0, 72); s = s.slice(0, Math.max(s.lastIndexOf(' '), 40)).trim(); }
  return s;
};
const cleanBrand = (raw) => {
  const first = (raw || '').split(',')[0].replace(/\s+/g, ' ').trim();
  if (!first || first.length > 60 || !LATIN_ONLY.test(first)) return '';
  const b = first === first.toUpperCase() && first.length > 4 ? titleCase(first) : first;
  return b.length > 28 ? b.slice(0, 28).trim() : b;
};

/** Checks whether a product row is flagged as obsolete or discontinued. */
export function isObsoleteRow({ statesTags = '', obsolete = '', obsoleteSince = '', rawName = '' }) {
  if (statesTags.includes('en:obsolete')) return true;
  const obs = obsolete.trim().toLowerCase();
  if (obs === '1' || obs === 'true' || obs === 'yes') return true;
  if (obsoleteSince.trim() !== '') return true;
  if (DISCONTINUED_NAME_RE.test(rawName)) return true;
  return false;
}

/** Extracts the 4-bit region bitmask and primary quota bucket from `countries_tags`. */
export function regionInfoOf(countriesTags = '') {
  if (!countriesTags) return { mask: 0, bucket: null };
  let mask = 0;
  let hasIt = false, hasUs = false, hasUk = false, hasFr = false, hasDach = false, hasIberia = false, hasEuOther = false;
  for (const raw of countriesTags.split(',')) {
    const tag = raw.trim();
    if (!tag) continue;
    if (IT_TAGS.has(tag)) { mask |= REGION_IT; hasIt = true; }
    else if (US_TAGS.has(tag)) { mask |= REGION_US; hasUs = true; }
    else if (UK_TAGS.has(tag)) { mask |= REGION_UK; hasUk = true; }
    else if (EU_TAGS.has(tag)) {
      mask |= REGION_EU;
      if (FR_TAGS.has(tag)) hasFr = true;
      else if (DACH_TAGS.has(tag)) hasDach = true;
      else if (IBERIA_TAGS.has(tag)) hasIberia = true;
      else hasEuOther = true;
    }
  }
  const bucket = hasIt ? 'it'
    : hasUs ? 'us'
    : hasUk ? 'uk'
    : hasFr ? 'fr'
    : hasDach ? 'dach'
    : hasIberia ? 'iberia'
    : hasEuOther ? 'eu_other'
    : null;
  return { mask, bucket };
}

/** Builds a strict deduplication key stripping pack sizes, repeated brand tokens, and rounding macros. */
export function dedupKey(f) {
  const stripped = (f.name || '').replace(PACK_RE, ' ').replace(MULTI_RE, ' ');
  const brandNorm = normalize(f.brand || '');
  const brandTokens = new Set(brandNorm ? brandNorm.split(' ').filter(Boolean) : []);
  const rawTokens = normalize(stripped).split(' ').filter(Boolean);
  const filtered = brandTokens.size ? rawTokens.filter((t) => !brandTokens.has(t)) : rawTokens;
  const baseTokens = filtered.length > 0 ? filtered : rawTokens;
  const collapsed = [];
  for (const t of baseTokens) {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== t) collapsed.push(t);
  }
  const coreName = collapsed.join(' ') || normalize(f.name || '');
  return `${coreName}|${brandNorm}|${Math.round(f.kcal / 5)}|${Math.round(f.fat)}|${Math.round(f.carbs)}|${Math.round(f.protein)}`;
}

// ---- bounded min-heap helper ----
function createMinHeap(capacity) {
  const heap = [];
  const swap = (i, j) => { const t = heap[i]; heap[i] = heap[j]; heap[j] = t; };
  const siftUp = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (heap[p].score <= heap[i].score) break; swap(p, i); i = p; } };
  const siftDown = (i) => {
    for (;;) {
      let m = i; const l = 2 * i + 1, r = l + 1;
      if (l < heap.length && heap[l].score < heap[m].score) m = l;
      if (r < heap.length && heap[r].score < heap[m].score) m = r;
      if (m === i) break; swap(i, m); i = m;
    }
  };
  return {
    items: heap,
    admits: (score) => heap.length < capacity || score > heap[0].score,
    offer: (rec) => {
      if (heap.length < capacity) { heap.push(rec); siftUp(heap.length - 1); }
      else { heap[0] = rec; siftDown(0); }
    },
  };
}

// V8 substrings are "sliced strings" that keep their whole parent line (kilobytes) alive.
const flat = (s) => Buffer.from(s, 'utf8').toString('utf8');

const HEADER_FIELDS = [
  'barcode', 'barcodeOrder', 'nameOff', 'brandId', 'brandOff',
  'kcal', 'fat', 'carbs', 'sugar', 'protein', 'fiber', 'salt', 'portion',
  'flags', 'cat', 'vocabOff', 'postOff', 'postings', 'vocabBlob', 'nameBlob', 'brandBlob', 'end',
];

/** Encodes a list of already-selected, popularity-ranked food records into a KOFF v2 ArrayBuffer. */
export function buildKoffV2Buffer(foods, builtAtDays = Math.floor(Date.now() / 86400000)) {
  const N = foods.length;
  if (N < 1) throw new Error('No usable products found.');

  const enc = new TextEncoder();
  const nameParts = new Array(N);
  const nameOff = new Uint32Array(N + 1);
  let nameBytesTotal = 0;

  // Deduplicate brands: id 0 is always ""
  const brandToId = new Map([['', 0]]);
  const brandList = [''];
  const brandIdA = new Uint32Array(N);

  // Build inverted index postings per ASCII word
  const wordPostings = new Map();

  for (let i = 0; i < N; i++) {
    const f = foods[i];
    const nb = enc.encode(f.name);
    nameOff[i] = nameBytesTotal;
    nameParts[i] = nb;
    nameBytesTotal += nb.length;

    const brand = f.brand || '';
    let bid = brandToId.get(brand);
    if (bid === undefined) {
      bid = brandList.length;
      brandToId.set(brand, bid);
      brandList.push(brand);
    }
    brandIdA[i] = bid;

    const words = new Set();
    const nNorm = normalize(f.name);
    if (nNorm) for (const w of nNorm.split(' ')) if (w) words.add(w);
    const bNorm = normalize(brand);
    if (bNorm) for (const w of bNorm.split(' ')) if (w) words.add(w);
    for (const w of words) {
      let list = wordPostings.get(w);
      if (!list) { list = []; wordPostings.set(w, list); }
      list.push(i);
    }
  }
  nameOff[N] = nameBytesTotal;

  const join = (parts, total) => {
    const o = new Uint8Array(total);
    let p = 0;
    for (const x of parts) { o.set(x, p); p += x.length; }
    return o;
  };
  const nameBlob = join(nameParts, nameBytesTotal);

  const B = brandList.length;
  const brandParts = new Array(B);
  const brandOff = new Uint32Array(B + 1);
  let brandBytesTotal = 0;
  for (let b = 0; b < B; b++) {
    const bb = enc.encode(brandList[b]);
    brandOff[b] = brandBytesTotal;
    brandParts[b] = bb;
    brandBytesTotal += bb.length;
  }
  brandOff[B] = brandBytesTotal;
  const brandBlob = join(brandParts, brandBytesTotal);

  // Strict ASCII code-unit sort (never localeCompare)
  const vocab = Array.from(wordPostings.keys()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const V = vocab.length;
  const vocabParts = new Array(V);
  const vocabOff = new Uint32Array(V + 1);
  let vocabBytesTotal = 0;
  for (let v = 0; v < V; v++) {
    const vb = enc.encode(vocab[v]);
    if (vb.length !== vocab[v].length) throw new Error('Vocab word must be pure ASCII.');
    vocabOff[v] = vocabBytesTotal;
    vocabParts[v] = vb;
    vocabBytesTotal += vb.length;
  }
  vocabOff[V] = vocabBytesTotal;
  const vocabBlob = join(vocabParts, vocabBytesTotal);

  // Encode delta-varint postings into a growable Uint8Array
  const postOff = new Uint32Array(V + 1);
  let postBuf = new Uint8Array(Math.max(1024, N * 8));
  let postPos = 0;
  const pushByte = (byte) => {
    if (postPos >= postBuf.length) {
      const next = new Uint8Array(postBuf.length * 2);
      next.set(postBuf);
      postBuf = next;
    }
    postBuf[postPos++] = byte;
  };
  for (let v = 0; v < V; v++) {
    postOff[v] = postPos;
    const rows = wordPostings.get(vocab[v]);
    let prev = 0;
    for (let j = 0; j < rows.length; j++) {
      let d = rows[j] - prev;
      prev = rows[j];
      while (d >= 0x80) {
        pushByte((d & 0x7f) | 0x80);
        d >>>= 7;
      }
      pushByte(d);
    }
  }
  postOff[V] = postPos;
  const postings = postBuf.subarray(0, postPos);

  const HEADER_BYTES = 24 + HEADER_FIELDS.length * 4; // 112 bytes
  const sizes = {
    barcode: 8 * N,
    barcodeOrder: 4 * N,
    nameOff: 4 * (N + 1),
    brandId: 4 * N,
    brandOff: 4 * (B + 1),
    vocabOff: 4 * (V + 1),
    postOff: 4 * (V + 1),
    postings: postings.length,
    vocabBlob: vocabBlob.length,
    nameBlob: nameBlob.length,
    brandBlob: brandBlob.length,
  };
  for (const k of ['kcal', 'fat', 'carbs', 'sugar', 'protein', 'fiber', 'salt', 'portion']) sizes[k] = 2 * N;
  sizes.flags = N;
  sizes.cat = N;

  const at = {};
  let cursor = Math.ceil(HEADER_BYTES / 8) * 8;
  for (const k of HEADER_FIELDS.slice(0, -1)) {
    at[k] = cursor;
    cursor += Math.ceil(sizes[k] / 8) * 8;
  }
  at.end = cursor;

  const buffer = new ArrayBuffer(cursor);
  const view = new DataView(buffer);
  view.setUint32(0, 0x464f464b, true); // 'K','O','F','F'
  view.setUint32(4, 2, true);          // version 2
  view.setUint32(8, N, true);
  view.setUint32(12, builtAtDays, true);
  view.setUint32(16, B, true);
  view.setUint32(20, V, true);
  HEADER_FIELDS.forEach((k, i) => view.setUint32(24 + i * 4, at[k], true));

  const bytes = new Uint8Array(buffer);
  new Uint32Array(buffer, at.nameOff, N + 1).set(nameOff);
  new Uint32Array(buffer, at.brandId, N).set(brandIdA);
  new Uint32Array(buffer, at.brandOff, B + 1).set(brandOff);
  new Uint32Array(buffer, at.vocabOff, V + 1).set(vocabOff);
  new Uint32Array(buffer, at.postOff, V + 1).set(postOff);
  bytes.set(postings, at.postings);
  bytes.set(vocabBlob, at.vocabBlob);
  bytes.set(nameBlob, at.nameBlob);
  bytes.set(brandBlob, at.brandBlob);

  const bc = new Float64Array(buffer, at.barcode, N);
  const barcodeOrder = new Uint32Array(buffer, at.barcodeOrder, N);
  const u16 = (k) => new Uint16Array(buffer, at[k], N);
  const [kcalA, fatA, carbsA, sugarA, proteinA, fiberA, saltA, portionA] =
    ['kcal', 'fat', 'carbs', 'sugar', 'protein', 'fiber', 'salt', 'portion'].map(u16);
  const flagsA = new Uint8Array(buffer, at.flags, N);
  const catA = new Uint8Array(buffer, at.cat, N);
  const tenth = (v) => (v === null || v === undefined ? 0xffff : Math.min(Math.round(v * 10), 0xfffe));

  for (let i = 0; i < N; i++) {
    const f = foods[i];
    bc[i] = Number(f.code);
    barcodeOrder[i] = i;
    kcalA[i] = Math.round(f.kcal * 10);
    fatA[i] = tenth(f.fat);
    carbsA[i] = tenth(f.carbs);
    proteinA[i] = tenth(f.protein);
    sugarA[i] = tenth(f.sugar);
    fiberA[i] = tenth(f.fiber);
    saltA[i] = f.salt === null || f.salt === undefined ? 0xffff : Math.min(Math.round(f.salt * 100), 0xfffe);
    portionA[i] = f.portion || 0;
    flagsA[i] = (f.ml ? 1 : 0) | ((f.code.length - 8) << 1) | ((f.regionMask ?? 0) & 0xf0);
    catA[i] = f.cat;
  }
  barcodeOrder.sort((a, b) => bc[a] - bc[b]);

  return { buffer, brandCount: B, vocabCount: V };
}

/** Selects up to `limit` unique products balanced across regional heaps with spillover. */
export function selectBalancedFoods(heaps, quotas, limit) {
  const seenKeys = new Set();
  const seenBarcodes = new Set();
  const foods = [];
  const spillover = [];

  for (const [name, heap] of Object.entries(heaps)) {
    const sorted = [...heap.items].sort((a, b) => b.score - a.score);
    const quota = quotas[name] ?? 0;
    let taken = 0;
    for (const f of sorted) {
      const bcNum = Number(f.code);
      if (seenBarcodes.has(bcNum)) continue;
      const key = dedupKey(f);
      if (seenKeys.has(key)) continue;
      if (taken < quota) {
        seenBarcodes.add(bcNum);
        seenKeys.add(key);
        foods.push(f);
        taken++;
      } else {
        spillover.push(f);
      }
    }
  }

  if (foods.length < limit && spillover.length > 0) {
    spillover.sort((a, b) => b.score - a.score);
    for (const f of spillover) {
      if (foods.length >= limit) break;
      const bcNum = Number(f.code);
      if (seenBarcodes.has(bcNum)) continue;
      const key = dedupKey(f);
      if (seenKeys.has(key)) continue;
      seenBarcodes.add(bcNum);
      seenKeys.add(key);
      foods.push(f);
    }
  }

  foods.sort((a, b) => b.score - a.score);
  return foods.slice(0, limit);
}

async function openSource(source) {
  let input;
  if (/^https?:/.test(source)) {
    const response = await fetch(source);
    if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`);
    input = Readable.fromWeb(response.body);
  } else input = createReadStream(source);
  return /\.gz(\?|$)/.test(source) ? input.pipe(createGunzip()) : input;
}

async function main() {
  let source = DEFAULT_SOURCE;
  let limit = 550000;
  let out = resolve(ROOT, 'public/data/off-foods.bin');
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--limit') limit = Number(a[++i]);
    else if (a[i] === '--out') out = resolve(a[++i]);
    else if (!a[i].startsWith('--')) source = a[i];
  }
  if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer');

  const quotas = {
    it: Math.round(limit * 0.25),
    us: Math.round(limit * 0.27),
    uk: Math.round(limit * 0.10),
    fr: Math.round(limit * 0.12),
    dach: Math.round(limit * 0.11),
    iberia: Math.round(limit * 0.08),
  };
  quotas.eu_other = Math.max(0, limit - Object.values(quotas).reduce((sum, n) => sum + n, 0));

  const heaps = Object.fromEntries(
    Object.entries(quotas).map(([k, q]) => [k, createMinHeap(Math.ceil(q * 1.4) + 500)]),
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const STALE_CUTOFF = nowSec - 6 * 365 * 86400;
  const stats = { lines: 0, noName: 0, noNutrition: 0, inconsistent: 0, obsolete: 0, stale: 0, nonTargetMarket: 0, valid: 0 };
  const started = Date.now();
  const lines = createInterface({ input: await openSource(source), crlfDelay: Infinity });
  let col = null;

  for await (const line of lines) {
    if (!col) {
      col = Object.fromEntries(line.split('\t').map((name, i) => [name, i]));
      for (const need of ['code', 'product_name', 'energy-kcal_100g', 'fat_100g', 'carbohydrates_100g', 'proteins_100g'])
        if (!(need in col)) throw new Error(`Column "${need}" is missing: is this the Open Food Facts CSV export?`);
      continue;
    }
    if (++stats.lines % 500000 === 0) {
      console.error(`  ${stats.lines.toLocaleString()} products read, ${stats.valid.toLocaleString()} usable (${Math.round((Date.now() - started) / 1000)} s)`);
    }
    const r = line.split('\t');
    const code = r[col.code];
    if (!/^\d{8,14}$/.test(code)) continue;
    const rawName = r[col.product_name];
    if (!rawName) { stats.noName++; continue; }

    if (isObsoleteRow({
      statesTags: col.states_tags !== undefined ? r[col.states_tags] || '' : '',
      obsolete: col.obsolete !== undefined ? r[col.obsolete] || '' : '',
      obsoleteSince: col.obsolete_since_date !== undefined ? r[col.obsolete_since_date] || '' : '',
      rawName,
    })) {
      stats.obsolete++;
      continue;
    }

    const lastMod = (col.last_modified_t !== undefined ? num(r[col.last_modified_t]) : null)
      ?? (col.last_updated_t !== undefined ? num(r[col.last_updated_t]) : null)
      ?? 0;
    const scans = (col.unique_scans_n !== undefined ? num(r[col.unique_scans_n]) : null) ?? 0;
    if (scans === 0 && lastMod > 0 && lastMod < STALE_CUTOFF) {
      stats.stale++;
      continue;
    }

    const countries = col.countries_tags !== undefined ? r[col.countries_tags] || '' : '';
    const { mask: regionMask, bucket } = regionInfoOf(countries);
    if (!bucket) {
      stats.nonTargetMarket++;
      continue;
    }

    let kcal = num(r[col['energy-kcal_100g']]);
    const kj = col['energy-kj_100g'] !== undefined ? num(r[col['energy-kj_100g']]) : null;
    if (kcal === null && kj !== null) kcal = kj / 4.184;
    const fat = num(r[col.fat_100g]), carbs = num(r[col.carbohydrates_100g]), protein = num(r[col.proteins_100g]);
    if (kcal === null || fat === null || carbs === null || protein === null) { stats.noNutrition++; continue; }
    if (kcal < 0 || kcal > 900 || [fat, carbs, protein].some((v) => v < 0 || v > 100) || fat + carbs + protein > 102) { stats.inconsistent++; continue; }
    const alcohol = Math.min(Math.max((col.alcohol_100g !== undefined ? num(r[col.alcohol_100g]) : null) ?? 0, 0), 100);
    const expected = 4 * protein + 4 * carbs + 9 * fat + 7 * alcohol;
    if (kcal > expected * 1.35 + 40 || kcal < expected * 0.65 - 30) { stats.inconsistent++; continue; }

    let sugar = col.sugars_100g !== undefined ? num(r[col.sugars_100g]) : null;
    if (sugar !== null && (sugar < 0 || sugar > carbs + 1 || sugar > 100)) sugar = null;
    let fiber = col.fiber_100g !== undefined ? num(r[col.fiber_100g]) : null;
    if (fiber !== null && (fiber < 0 || fiber > 100)) fiber = null;
    let salt = col.salt_100g !== undefined ? num(r[col.salt_100g]) : null;
    if (salt === null && col.sodium_100g !== undefined) {
      const sodium = num(r[col.sodium_100g]);
      if (sodium !== null) salt = sodium * 2.5;
    }
    if (salt !== null && (salt < 0 || salt > 100)) salt = null;

    const servingText = (col.serving_size !== undefined ? r[col.serving_size] || '' : '').toLowerCase();
    const tags = col.categories_tags !== undefined ? r[col.categories_tags] || '' : '';
    const ml = /\d\s*(ml|cl|dl)\b/.test(servingText) || /\d\s*l\b/.test(servingText) || /en:(beverages|waters)\b/.test(tags);
    let portion = col.serving_quantity !== undefined ? num(r[col.serving_quantity]) : null;
    portion = portion !== null && portion >= 1 && portion <= 2000 ? Math.round(portion) : 0;

    const name = cleanName(rawName);
    if (!name) { stats.noName++; continue; }

    const recencyBonus = lastMod > 0
      ? Math.max(0, 60 - Math.floor(Math.max(0, nowSec - lastMod) / (365 * 86400)) * 15)
      : 0;
    const score = Math.min(scans, 300) * 2 + Math.log1p(scans) * 25 +
      ((col.completeness !== undefined ? num(r[col.completeness]) : null) ?? 0) * 100 +
      recencyBonus +
      (sugar !== null ? 30 : 0) + (portion ? 40 : 0) + (fiber !== null ? 10 : 0) +
      (salt !== null ? 10 : 0) + (col.brands !== undefined && r[col.brands] ? 15 : 0);

    stats.valid++;
    const heap = heaps[bucket];
    if (!heap.admits(score)) continue;
    heap.offer({
      code: flat(code),
      name: flat(name),
      brand: flat(cleanBrand(col.brands !== undefined ? r[col.brands] : '')),
      kcal,
      fat,
      carbs,
      sugar,
      protein,
      fiber,
      salt,
      portion,
      ml,
      cat: categoryOf(tags),
      regionMask,
      score,
    });
  }

  console.error(
    `Read ${stats.lines.toLocaleString()} products in ${Math.round((Date.now() - started) / 1000)} s:`,
    `${stats.valid.toLocaleString()} usable, ${stats.obsolete.toLocaleString()} obsolete/discontinued,`,
    `${stats.stale.toLocaleString()} stale, ${stats.nonTargetMarket.toLocaleString()} non-target market,`,
    `${stats.noName.toLocaleString()} without usable name, ${stats.noNutrition.toLocaleString()} without complete nutrition,`,
    `${stats.inconsistent.toLocaleString()} inconsistent.`,
  );

  const foods = selectBalancedFoods(heaps, quotas, limit);
  const { buffer, brandCount, vocabCount } = buildKoffV2Buffer(foods);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, new Uint8Array(buffer));

  const N = foods.length;
  const withSugar = foods.filter((f) => f.sugar !== null).length;
  const withPortion = foods.filter((f) => f.portion > 0).length;
  const italian = foods.filter((f) => (f.regionMask & REGION_IT) !== 0).length;
  const eu = foods.filter((f) => (f.regionMask & REGION_EU) !== 0).length;
  const us = foods.filter((f) => (f.regionMask & REGION_US) !== 0).length;
  const uk = foods.filter((f) => (f.regionMask & REGION_UK) !== 0).length;

  writeFileSync(out.replace(/\.bin$/, '.meta.json'), JSON.stringify({
    format: 'KOFF',
    version: 2,
    count: N,
    bytes: buffer.byteLength,
    brandCount,
    vocabCount,
    withSugar,
    withPortion,
    italianMarket: italian,
    euMarket: eu,
    usMarket: us,
    ukMarket: uk,
    builtAt: new Date().toISOString().slice(0, 10),
    source: /^https?:/.test(source) ? source : 'local export',
    licence: 'Open Database Licence 1.0 (c) Open Food Facts contributors',
  }, null, 2) + '\n');

  console.error(
    `Wrote ${out}: ${N.toLocaleString()} foods, ${(buffer.byteLength / 1048576).toFixed(1)} MB (${brandCount.toLocaleString()} brands, ${vocabCount.toLocaleString()} vocab words);`,
    `${withSugar.toLocaleString()} with sugar, ${withPortion.toLocaleString()} with portion;`,
    `IT=${italian.toLocaleString()}, EU=${eu.toLocaleString()}, US=${us.toLocaleString()}, UK=${uk.toLocaleString()}.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
