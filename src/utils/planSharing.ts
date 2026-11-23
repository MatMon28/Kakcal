import { isAndroidApp, JournalDevice } from './android';
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

export function createPlanLink(plans: MealPlan[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(bundle(plans)));
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (encoded.length > 12000) throw new Error('too-large');
  const publicUrl = import.meta.env.VITE_PUBLIC_APP_URL || 'https://matmon28.github.io/Kakcal/';
  const url = new URL(isAndroidApp() ? publicUrl : window.location.href);
  if (!/^https?:$/.test(url.protocol)) throw new Error('unsupported-origin');
  url.search = '?view=app&tab=custom';
  url.hash = `meal-plan=${encoded}`;
  return url.toString();
}

export function createPlanText(plans: MealPlan[]) {
  const overview = plans.map((p) => `${p.date} | ${p.slot.replace(/_/g, ' ')} | ${p.title}\n${p.note}`).join('\n\n');
  return `Kakcal meal plan\n\n${overview}\n\n--- Kakcal data ---\n${JSON.stringify(bundle(plans), null, 2)}`;
}

export function parsePlanInput(input: string): MealPlan[] {
  if (input.length > 1000000) throw new Error('too-large');
  let json = input.trim();
  const marker = '#meal-plan=';
  if (json.includes(marker)) {
    const encoded = json.slice(json.indexOf(marker) + marker.length).split(/[\s&]/)[0];
    if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length > 100000) throw new Error('invalid');
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    json = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  } else if (json.includes('--- Kakcal data ---')) json = json.split('--- Kakcal data ---')[1].trim();
  const raw = JSON.parse(json) as Bundle;
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
/** The APK uses its existing document picker instead of unsupported WebView blob downloads. */
export async function saveLocalFile(blob: Blob, name: string): Promise<boolean> {
  if (!isAndroidApp()) { downloadFile(blob, name); return true; }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const result = await JournalDevice.exportFile({ base64, filename: name, kind: name.endsWith('.zip') ? 'zip' : 'txt' });
  return !result.cancelled;
}
