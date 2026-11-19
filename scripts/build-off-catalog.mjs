#!/usr/bin/env node
/**
 * Builds the offline Open Food Facts catalogue: public/data/off-foods.bin (+ off-foods.meta.json).
 *
 *   node scripts/build-off-catalog.mjs [source] [--limit 130000] [--out public/data/off-foods.bin]
 *
 * `source` is the Open Food Facts CSV export, gzipped or plain, as a file path or an https URL.
 * It defaults to https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
 * (about 1.5 GB; it is streamed, never stored or loaded whole, so ~1 GB of RAM is enough).
 *
 * Selection: a product is kept only when it has a name, a barcode and a complete, self-consistent
 * set of per-100 g/ml values (energy, fat, carbohydrates, protein; energy must agree with the
 * macros within a generous tolerance). Products are ranked (Italian market first, then popularity,
 * then how complete the record is) and the best `--limit` are written.
 *
 * File format "KOFF" v1 (little-endian; every section is 8-byte aligned so the browser can wrap
 * it in typed arrays without copying; see src/data/offCatalog.ts for the reader):
 *   header  : u32 magic 'KOFF', version, count, builtAtDays, then the byte offset of every section
 *   barcode : f64[N]            EAN/UPC digits as a number (length is kept in `flags`)
 *   *Off    : u32[N+1] x 3      offsets into the search / name / brand blobs
 *   kcal    : u16[N]            kcal x 10 per 100 g/ml
 *   fat, carbs, sugar, protein, fiber : u16[N]  g x 10   (0xFFFF = unknown)
 *   salt    : u16[N]            g x 100                  (0xFFFF = unknown)
 *   portion : u16[N]            classic portion (g or ml), 0 = unknown
 *   flags   : u8[N]             bit0 = millilitres, bits1-3 = barcode length - 8
 *   cat     : u8[N]             index into FOOD_CATEGORIES (src/data/foodCategories.ts)
 *   blobs   : search text (ASCII, " word word\n" per record), names (UTF-8), brands (UTF-8)
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
let source = DEFAULT_SOURCE;
let limit = 130000;
let out = resolve(ROOT, 'public/data/off-foods.bin');
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--limit') limit = Number(a[++i]);
    else if (a[i] === '--out') out = resolve(a[++i]);
    else if (!a[i].startsWith('--')) source = a[i];
  }
}
if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer');

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
const categoryOf = (tags) => {
  for (const [re, name] of CATEGORY_RULES) if (re.test(tags)) return CATEGORIES.indexOf(name);
  return 0; // prepared
};

/** Shared with the reader: lowercase ASCII words separated by single spaces. */
export const normalize = (s) => s.toLowerCase().replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe')
  .replace(/ø/g, 'o').replace(/đ/g, 'd').replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

const LATIN_ONLY = /^[\u0020-\u024F\u2013\u2014\u2018-\u201D\u20AC\u00B0]+$/;
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

// ---- bounded min-heap on score: memory stays flat however large the export is ----
const heap = [];
const CAPACITY = Math.ceil(limit * 1.2) + 1000;
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
const admits = (score) => heap.length < CAPACITY || score > heap[0].score;
const offer = (rec) => {
  if (heap.length < CAPACITY) { heap.push(rec); siftUp(heap.length - 1); }
  else { heap[0] = rec; siftDown(0); }
};
// V8 substrings are "sliced strings" that keep their whole parent line (kilobytes) alive.
// Anything we retain must be copied into a flat string first, or 150k names would pin ~1 GB.
const flat = (s) => Buffer.from(s, 'utf8').toString('utf8');

const FAVOURED = { 'en:italy': 1000, 'en:san-marino': 900, 'en:switzerland': 300, 'en:vatican-city': 900 };
const COMMON = ['en:france', 'en:germany', 'en:spain', 'en:united-kingdom', 'en:united-states', 'en:belgium', 'en:austria',
  'en:portugal', 'en:netherlands', 'en:ireland', 'en:canada', 'en:australia'];

async function openSource() {
  let input;
  if (/^https?:/.test(source)) {
    const response = await fetch(source);
    if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`);
    input = Readable.fromWeb(response.body);
  } else input = createReadStream(source);
  return /\.gz(\?|$)/.test(source) ? input.pipe(createGunzip()) : input;
}

const stats = { lines: 0, noName: 0, noNutrition: 0, inconsistent: 0, valid: 0 };
const started = Date.now();
const lines = createInterface({ input: await openSource(), crlfDelay: Infinity });
let col = null;
for await (const line of lines) {
  if (!col) {
    col = Object.fromEntries(line.split('\t').map((name, i) => [name, i]));
    for (const need of ['code', 'product_name', 'energy-kcal_100g', 'fat_100g', 'carbohydrates_100g', 'proteins_100g'])
      if (!(need in col)) throw new Error(`Column "${need}" is missing: is this the Open Food Facts CSV export?`);
    continue;
  }
  if (++stats.lines % 500000 === 0) console.error(`  ${stats.lines.toLocaleString()} products read, ${stats.valid.toLocaleString()} usable (${Math.round((Date.now() - started) / 1000)} s)`);
  const r = line.split('\t');
  const code = r[col.code];
  if (!/^\d{8,14}$/.test(code)) continue;
  const rawName = r[col.product_name];
  if (!rawName) { stats.noName++; continue; }

  let kcal = num(r[col['energy-kcal_100g']]);
  const kj = num(r[col['energy-kj_100g']]);
  if (kcal === null && kj !== null) kcal = kj / 4.184;
  const fat = num(r[col.fat_100g]), carbs = num(r[col.carbohydrates_100g]), protein = num(r[col.proteins_100g]);
  if (kcal === null || fat === null || carbs === null || protein === null) { stats.noNutrition++; continue; }
  if (kcal < 0 || kcal > 900 || [fat, carbs, protein].some((v) => v < 0 || v > 100) || fat + carbs + protein > 102) { stats.inconsistent++; continue; }
  const alcohol = Math.min(Math.max(num(r[col.alcohol_100g]) ?? 0, 0), 100);
  const expected = 4 * protein + 4 * carbs + 9 * fat + 7 * alcohol;
  if (kcal > expected * 1.35 + 40 || kcal < expected * 0.65 - 30) { stats.inconsistent++; continue; }

  let sugar = num(r[col.sugars_100g]);
  if (sugar !== null && (sugar < 0 || sugar > carbs + 1 || sugar > 100)) sugar = null;
  let fiber = num(r[col.fiber_100g]);
  if (fiber !== null && (fiber < 0 || fiber > 100)) fiber = null;
  let salt = num(r[col.salt_100g]);
  if (salt === null) { const sodium = num(r[col.sodium_100g]); if (sodium !== null) salt = sodium * 2.5; }
  if (salt !== null && (salt < 0 || salt > 100)) salt = null;

  const servingText = (r[col.serving_size] || '').toLowerCase();
  const tags = r[col.categories_tags] || '';
  const ml = /\d\s*(ml|cl|dl)\b/.test(servingText) || /\d\s*l\b/.test(servingText) || /en:(beverages|waters)\b/.test(tags);
  let portion = num(r[col.serving_quantity]);
  portion = portion !== null && portion >= 1 && portion <= 2000 ? Math.round(portion) : 0;

  const countries = r[col.countries_tags] || '';
  let score = 0;
  for (const [tag, bonus] of Object.entries(FAVOURED)) if (countries.includes(tag)) score = Math.max(score, bonus);
  if (score === 0 && COMMON.some((tag) => countries.includes(tag))) score = 100;
  score += Math.min(num(r[col.unique_scans_n]) ?? 0, 300) * 2 + (num(r[col.completeness]) ?? 0) * 100 +
    (sugar !== null ? 30 : 0) + (portion ? 40 : 0) + (fiber !== null ? 10 : 0) + (salt !== null ? 10 : 0) + (r[col.brands] ? 15 : 0);

  const name = cleanName(rawName);
  if (!name) { stats.noName++; continue; }
  stats.valid++;
  if (!admits(score)) continue;
  offer({ code: flat(code), name: flat(name), brand: flat(cleanBrand(r[col.brands])), kcal, fat, carbs, sugar, protein, fiber, salt, portion, ml, cat: categoryOf(tags), score });
}
console.error(`Read ${stats.lines.toLocaleString()} products in ${Math.round((Date.now() - started) / 1000)} s:`,
  `${stats.valid.toLocaleString()} usable, ${stats.noName.toLocaleString()} without a usable name,`,
  `${stats.noNutrition.toLocaleString()} without complete nutrition, ${stats.inconsistent.toLocaleString()} inconsistent.`);

// ---- de-duplicate (same name + brand + energy), rank, trim ----
heap.sort((a, b) => b.score - a.score);
const seen = new Set();
const foods = [];
for (const f of heap) {
  const key = `${normalize(f.name)}|${normalize(f.brand)}|${Math.round(f.kcal)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  foods.push(f);
  if (foods.length === limit) break;
}
const N = foods.length;
if (N < 1) throw new Error('No usable products found.');

// ---- encode ----
const enc = new TextEncoder();
const searchParts = [], nameParts = [], brandParts = [];
const searchOff = new Uint32Array(N + 1), nameOff = new Uint32Array(N + 1), brandOff = new Uint32Array(N + 1);
let s = 0, n = 0, b = 0;
foods.forEach((f, i) => {
  const nameNorm = normalize(f.name);
  const brandNorm = normalize(f.brand);
  const text = ` ${nameNorm}${brandNorm && !nameNorm.includes(brandNorm) ? ' ' + brandNorm : ''}\n`;
  const nb = enc.encode(f.name), bb = enc.encode(f.brand);
  searchOff[i] = s; nameOff[i] = n; brandOff[i] = b;
  searchParts.push(text); nameParts.push(nb); brandParts.push(bb);
  s += text.length; n += nb.length; b += bb.length;
});
searchOff[N] = s; nameOff[N] = n; brandOff[N] = b;
const searchBlob = enc.encode(searchParts.join(''));
if (searchBlob.length !== s) throw new Error('Search text must be pure ASCII.');
const join = (parts, total) => { const o = new Uint8Array(total); let p = 0; for (const x of parts) { o.set(x, p); p += x.length; } return o; };
const nameBlob = join(nameParts, n), brandBlob = join(brandParts, b);

const HEADER_FIELDS = ['barcode', 'searchOff', 'nameOff', 'brandOff', 'kcal', 'fat', 'carbs', 'sugar', 'protein', 'fiber', 'salt',
  'portion', 'flags', 'cat', 'searchBlob', 'nameBlob', 'brandBlob', 'end'];
const HEADER_BYTES = 16 + HEADER_FIELDS.length * 4;
const sizes = { barcode: 8 * N, searchOff: 4 * (N + 1), nameOff: 4 * (N + 1), brandOff: 4 * (N + 1) };
for (const k of ['kcal', 'fat', 'carbs', 'sugar', 'protein', 'fiber', 'salt', 'portion']) sizes[k] = 2 * N;
sizes.flags = N; sizes.cat = N; sizes.searchBlob = searchBlob.length; sizes.nameBlob = nameBlob.length; sizes.brandBlob = brandBlob.length;
const at = {};
let cursor = Math.ceil(HEADER_BYTES / 8) * 8;
for (const k of HEADER_FIELDS.slice(0, -1)) { at[k] = cursor; cursor += Math.ceil(sizes[k] / 8) * 8; }
at.end = cursor;

const buffer = new ArrayBuffer(cursor);
const view = new DataView(buffer);
view.setUint32(0, 0x464f464b, true); // bytes 'K','O','F','F'
view.setUint32(4, 1, true);
view.setUint32(8, N, true);
view.setUint32(12, Math.floor(Date.now() / 86400000), true);
HEADER_FIELDS.forEach((k, i) => view.setUint32(16 + i * 4, at[k], true));
const bytes = new Uint8Array(buffer);
new Uint32Array(buffer, at.searchOff, N + 1).set(searchOff);
new Uint32Array(buffer, at.nameOff, N + 1).set(nameOff);
new Uint32Array(buffer, at.brandOff, N + 1).set(brandOff);
bytes.set(searchBlob, at.searchBlob); bytes.set(nameBlob, at.nameBlob); bytes.set(brandBlob, at.brandBlob);
const bc = new Float64Array(buffer, at.barcode, N);
const u16 = (k) => new Uint16Array(buffer, at[k], N);
const [kcalA, fatA, carbsA, sugarA, proteinA, fiberA, saltA, portionA] =
  ['kcal', 'fat', 'carbs', 'sugar', 'protein', 'fiber', 'salt', 'portion'].map(u16);
const flagsA = new Uint8Array(buffer, at.flags, N), catA = new Uint8Array(buffer, at.cat, N);
const tenth = (v) => (v === null ? 0xffff : Math.min(Math.round(v * 10), 0xfffe));
foods.forEach((f, i) => {
  bc[i] = Number(f.code);
  kcalA[i] = Math.round(f.kcal * 10);
  fatA[i] = tenth(f.fat); carbsA[i] = tenth(f.carbs); proteinA[i] = tenth(f.protein);
  sugarA[i] = tenth(f.sugar); fiberA[i] = tenth(f.fiber);
  saltA[i] = f.salt === null ? 0xffff : Math.min(Math.round(f.salt * 100), 0xfffe);
  portionA[i] = f.portion;
  flagsA[i] = (f.ml ? 1 : 0) | ((f.code.length - 8) << 1);
  catA[i] = f.cat;
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, new Uint8Array(buffer));
const withSugar = foods.filter((f) => f.sugar !== null).length, withPortion = foods.filter((f) => f.portion).length;
const italian = foods.filter((f) => f.score >= 900).length;
writeFileSync(out.replace(/\.bin$/, '.meta.json'), JSON.stringify({
  format: 'KOFF', version: 1, count: N, bytes: buffer.byteLength, withSugar, withPortion, italianMarket: italian,
  builtAt: new Date().toISOString().slice(0, 10), source: /^https?:/.test(source) ? source : 'local export',
  licence: 'Open Database Licence 1.0 (c) Open Food Facts contributors',
}, null, 2) + '\n');
console.error(`Wrote ${out}: ${N.toLocaleString()} foods, ${(buffer.byteLength / 1048576).toFixed(1)} MB;`,
  `${withSugar.toLocaleString()} with sugar, ${withPortion.toLocaleString()} with a classic portion, ${italian.toLocaleString()} from the Italian market.`);
