import { isAndroidApp, JournalDevice, type ExportResult } from './android';
import type { FoodItem } from '../types';
import type { MealPlan } from '../types/journal';
import { journalId, normalizeMealJournal } from './journalStore';

type PortablePlan = { d: string; s: string; t: string; k: string; n: string; i: [number, number][] };
type Bundle = { v: 1; p: PortablePlan[]; f: FoodItem[] };
const MAX_PLANS = 540;

function bundle(plans: MealPlan[]): Bundle {
  const foods: FoodItem[] = [];
  const indices = new Map<string, number>();
  return { v: 1, f: foods, p: plans.map((plan) => ({
    d: plan.date, s: plan.slot, t: plan.title, k: plan.kind, n: plan.note,
    i: plan.items.map(({ food, amount }) => {
      const key = JSON.stringify(food);
      let index = indices.get(key);
      if (index === undefined) {
        index = foods.length;
        indices.set(key, index);
        const { id, name_en, name_it, name_de, calories, carbs, protein, fat, fiber, salt, sugar, unit, store, category, portion } = food;
        foods.push({ id, name_en, name_it, name_de, calories, carbs, protein, fat, fiber, salt, sugar, unit, store, category, portion });
      }
      return [index, amount];
    }),
  })) };
}

/* ---- Short links (format 2) ------------------------------------------------------------------------------
 * Links stay serverless and work offline: no shortener, no API. They get short in four ways:
 *  - the address is only the app address plus `#p=` (the fragment alone opens the Custom page);
 *  - one compact positional array instead of verbose JSON keys, dates stored as day offsets;
 *  - the text is deflate-compressed with the browser's built-in CompressionStream when available;
 *  - base64url without padding.
 * Older `#meal-plan=` links (format 1, plain JSON) still import. */
type Food2 = (string | number | null)[];
type Plan2 = [number, string, string, 0 | 1, string, [number, number][]];
type Bundle2 = [2, string, Food2[], Plan2[]];
const DAY = 86400000;
const dayNumber = (date: string) => Math.floor(new Date(`${date}T12:00:00Z`).getTime() / DAY);
const dayString = (day: number) => new Date(day * DAY + DAY / 2).toISOString().slice(0, 10);

function toBytes(text: string) { return new TextEncoder().encode(text); }
function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(text: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length > 100000) throw new Error('invalid');
  return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}
async function pipe(bytes: Uint8Array, stream: { writable: WritableStream; readable: ReadableStream }) {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as BufferSource).then(() => writer.close()).catch(() => undefined);
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}
async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try { return await pipe(bytes, new CompressionStream('deflate-raw')); } catch { return null; }
}
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('unsupported');
  const out = await pipe(bytes, new DecompressionStream('deflate-raw'));
  if (out.length > 1000000) throw new Error('too-large');
  return out;
}

function bundle2(plans: MealPlan[]): Bundle2 {
  const base = plans.reduce((min, p) => (p.date < min ? p.date : min), plans[0].date);
  const baseDay = dayNumber(base);
  const foods: Food2[] = [];
  const indices = new Map<string, number>();
  const compactPlans = plans.map((plan): Plan2 => [
    dayNumber(plan.date) - baseDay, plan.slot, plan.title, plan.kind === 'note' ? 1 : 0, plan.note,
    plan.items.map(({ food, amount }): [number, number] => {
      const key = JSON.stringify(food);
      let index = indices.get(key);
      if (index === undefined) {
        index = foods.length;
        indices.set(key, index);
        const f: Food2 = [food.id, food.name_en, food.name_it === food.name_en ? 0 : food.name_it, food.name_de === food.name_en ? 0 : food.name_de,
          food.calories, food.carbs, food.protein, food.fat, food.fiber, food.salt, food.sugar ?? null, food.unit === 'ml' ? 1 : 0, food.store, food.category, food.portion ?? null];
        while (f.length > 12 && f[f.length - 1] === null) f.pop();
        foods.push(f);
      }
      return [index, amount];
    }),
  ]);
  return [2, base, foods, compactPlans];
}

function bundleFrom2(raw: unknown): Bundle {
  if (!Array.isArray(raw) || raw[0] !== 2 || typeof raw[1] !== 'string' || !Array.isArray(raw[2]) || !Array.isArray(raw[3]) || raw[2].length > 1000 || raw[3].length > MAX_PLANS) throw new Error('invalid');
  const baseDay = dayNumber(raw[1]);
  if (!Number.isFinite(baseDay)) throw new Error('invalid');
  const foods = (raw[2] as Food2[]).map((f) => {
    if (!Array.isArray(f) || f.length < 12 || typeof f[0] !== 'string' || typeof f[1] !== 'string') throw new Error('invalid');
    const name = (value: unknown) => (value === 0 ? (f[1] as string) : (value as string));
    return { id: f[0], name_en: f[1], name_it: name(f[2]), name_de: name(f[3]), calories: f[4] as number, carbs: f[5] as number | null, protein: f[6] as number | null,
      fat: f[7] as number | null, fiber: f[8] as number | null, salt: f[9] as number | null, sugar: (f[10] ?? undefined) as number | undefined,
      unit: f[11] === 1 ? 'ml' : 'g', store: f[12] as FoodItem['store'], category: f[13] as FoodItem['category'], portion: (f[14] ?? undefined) as number | undefined } as FoodItem;
  });
  const plans = (raw[3] as Plan2[]).map((p) => {
    if (!Array.isArray(p) || p.length !== 6 || !Number.isInteger(p[0]) || p[0] < 0 || p[0] > 36500) throw new Error('invalid');
    return { d: dayString(baseDay + p[0]), s: p[1], t: p[2], k: p[3] === 1 ? 'note' : 'food', n: p[4], i: p[5] } as PortablePlan;
  });
  return { v: 1, p: plans, f: foods };
}

export async function createPlanLink(plans: MealPlan[]) {
  const plain = toBytes(JSON.stringify(bundle2(plans)));
  const packed = await deflate(plain);
  const encoded = packed && packed.length + 1 < plain.length ? `z${toBase64Url(packed)}` : `j${toBase64Url(plain)}`;
  if (encoded.length > 12000) throw new Error('too-large');
  const publicUrl = import.meta.env.VITE_PUBLIC_APP_URL || 'https://matmon28.github.io/Kakcal/';
  const url = new URL(isAndroidApp() ? publicUrl : window.location.href);
  if (!/^https?:$/.test(url.protocol)) throw new Error('unsupported-origin');
  url.search = '';
  url.hash = `p=${encoded}`;
  return url.toString();
}

export function createPlanText(plans: MealPlan[]) {
  const overview = plans.map((p) => `${p.date} | ${p.slot.replace(/_/g, ' ')} | ${p.title}\n${p.note}`).join('\n\n');
  return `Kakcal meal plan\n\n${overview}\n\n--- Kakcal data ---\n${JSON.stringify(bundle(plans), null, 2)}`;
}

export async function parsePlanInput(input: string): Promise<MealPlan[]> {
  if (input.length > 1000000) throw new Error('too-large');
  let json = input.trim();
  const short = json.indexOf('#p=');
  const legacy = json.indexOf('#meal-plan=');
  let raw: unknown;
  if (short >= 0 || legacy >= 0) {
    const useShort = short >= 0;
    const marker = useShort ? '#p=' : '#meal-plan=';
    const encoded = json.slice((useShort ? short : legacy) + marker.length).split(/[\s&]/)[0];
    if (useShort) {
      const bytes = fromBase64Url(encoded.slice(1));
      const text = new TextDecoder('utf-8', { fatal: true }).decode(encoded[0] === 'z' ? await inflate(bytes) : bytes);
      raw = bundleFrom2(JSON.parse(text));
    } else {
      raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(encoded)));
    }
  } else {
    if (json.includes('--- Kakcal data ---')) json = json.split('--- Kakcal data ---')[1].trim();
    raw = JSON.parse(json);
  }
  return validateBundle(raw as Bundle);
}

function validateBundle(raw: Bundle): MealPlan[] {
  if (!raw || raw.v !== 1 || !Array.isArray(raw.p) || !raw.p.length || raw.p.length > MAX_PLANS || !Array.isArray(raw.f) || raw.f.length > 1000) throw new Error('invalid');
  const plans = raw.p.map((p) => {
    if (!p || typeof p.t !== 'string' || p.t.length > 500 || typeof p.n !== 'string' || p.n.length > 4000 || !Array.isArray(p.i) || p.i.length > 100) throw new Error('invalid');
    return { id: journalId(), date: p.d, slot: p.s, title: p.t, kind: p.k, note: p.n, read: false,
      items: p.i.map((item) => {
        if (!Array.isArray(item) || item.length !== 2 || !Number.isInteger(item[0]) || !raw.f[item[0]]) throw new Error('invalid');
        const food = raw.f[item[0]];
        if (!['g', 'ml'].includes(food.unit) || !['name_en', 'name_it', 'name_de'].every((key) => typeof food[key as keyof FoodItem] === 'string') || food.calories < 0 || food.calories > 10000) throw new Error('invalid');
        for (const nutrient of [food.carbs, food.protein, food.fat, food.fiber, food.salt, food.sugar]) if (nutrient != null && (typeof nutrient !== 'number' || !Number.isFinite(nutrient) || nutrient < 0)) throw new Error('invalid');
        if (!Number.isFinite(item[1]) || item[1] <= 0 || item[1] > 100000) throw new Error('invalid');
        return { food, amount: item[1] };
      }),
    };
  });
  const valid = normalizeMealJournal({ plans }).plans;
  if (valid.length !== raw.p.length || valid.some((p) => (p.kind === 'food' && !p.items.length) || (p.kind === 'note' && !p.note.trim()) || new Date(`${p.date}T12:00:00Z`).toISOString().slice(0, 10) !== p.date)) throw new Error('invalid');
  return valid;
}

export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export const formatBytes = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`);

/** "<text> (12.4 KB)": the one success grammar of every export (JSON, Excel, pictures). */
export const withSize = (text: string, bytes: number): string => `${text} (${formatBytes(bytes)})`;

/** A success without a byte count is a bug: it would let a 0 B file pass as "saved". */
function checkedResult(result: { cancelled?: boolean; bytes?: number } | undefined | null): ExportResult {
  if (result?.cancelled) return { cancelled: true };
  if (typeof result?.bytes !== 'number' || !Number.isFinite(result.bytes) || result.bytes <= 0) {
    throw new Error('The export finished without a byte count.');
  }
  return { bytes: result.bytes };
}

/**
 * The ONE save helper for Export JSON, Export to Excel and Export meal pictures.
 * - browser: downloads the Blob and returns its size;
 * - APK: the system document picker through the native plugin (staged in private storage, verified write).
 * Returns `{ cancelled: true }` when the user closes the picker (show nothing), `{ bytes }` when the file was written
 * (show "saved (size)"), and throws when nothing could be written (show the red error). Never a bare boolean.
 * A string is the JSON backup (kept as text so it is not base64-encoded on the main thread).
 */
export async function saveLocalFile(content: Blob | string, name: string): Promise<ExportResult> {
  const blob = typeof content === 'string' ? new Blob([content], { type: 'application/json' }) : content;
  if (blob.size === 0) throw new Error('Nothing to export: the file would be empty.');
  if (!isAndroidApp()) { downloadFile(blob, name); return { bytes: blob.size }; }
  if (typeof content === 'string') return checkedResult(await JournalDevice.exportBackup({ json: content, filename: name }));
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const kind = name.endsWith('.json') ? 'json' : name.endsWith('.zip') ? 'zip' : name.endsWith('.xlsx') ? 'xlsx' : name.endsWith('.pdf') ? 'pdf' : 'txt';
  return checkedResult(await JournalDevice.exportFile({ base64, filename: name, kind }));
}
