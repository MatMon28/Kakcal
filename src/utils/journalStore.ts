import { useSyncExternalStore } from 'react';
import type { Language, LoggedFoodItem, MealSlotId } from '../types';
import type { MealJournalData, MealMemory, MealPhoto, MealPlan } from '../types/journal';

export const JOURNAL_KEY = 'kcalsync_meal_journal';
const empty = (): MealJournalData => ({ version: 1, plans: [], memories: {}, photos: [] });
const validDate = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(new Date(`${v}T12:00:00`).getTime());
const validSlot = (v: unknown): v is MealSlotId =>
  typeof v === 'string' && /^(breakfast|mid_morning|lunch|midday_snack|dinner|extra|custom_.+)$/.test(v);

export function normalizeMealJournal(raw: unknown): MealJournalData {
  if (!raw || typeof raw !== 'object') return empty();
  const data = raw as Partial<MealJournalData>;
  const plans = Array.isArray(data.plans)
    ? data.plans.filter(
        (p) =>
          p &&
          typeof p.id === 'string' &&
          validDate(p.date) &&
          validSlot(p.slot) &&
          typeof p.title === 'string' &&
          typeof p.note === 'string' &&
          (p.kind === 'note' || p.kind === 'food') &&
          Array.isArray(p.items) &&
          p.items.every(
            (i) =>
              i &&
              Number.isFinite(i.amount) &&
              i.amount > 0 &&
              i.food &&
              typeof i.food.id === 'string' &&
              Number.isFinite(i.food.calories),
          ),
      )
    : [];
  const photos = Array.isArray(data.photos)
    ? data.photos.filter(
        (p) =>
          p &&
          typeof p.id === 'string' &&
          validDate(p.date) &&
          validSlot(p.slot) &&
          typeof p.note === 'string' &&
          typeof p.src === 'string' &&
          /^(data:image\/(jpeg|png|webp);base64,|\/images\/)/.test(p.src),
      )
    : [];
  const memories: Record<string, MealMemory> = {};
  if (data.memories && typeof data.memories === 'object') {
    for (const [key, value] of Object.entries(data.memories)) {
      const [date, slot] = key.split(':');
      if (validDate(date) && validSlot(slot) && value && typeof value === 'object')
        memories[key] = {
          favorite: value.favorite === true,
          note: typeof value.note === 'string' ? value.note.slice(0, 4000) : '',
        };
    }
  }
  return { version: 1, plans, photos, memories };
}

function load(): MealJournalData {
  try {
    return normalizeMealJournal(JSON.parse(localStorage.getItem(JOURNAL_KEY) || 'null'));
  } catch {
    return empty();
  }
}

let snapshot = load();
const subscribers = new Set<() => void>();
const publish = () => subscribers.forEach((fn) => fn());

// Persist first: a full device must never look as though it saved a photograph.
function commit(next: MealJournalData) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
  snapshot = next;
  publish();
}

window.addEventListener('storage', (event) => {
  if (event.key === JOURNAL_KEY || event.key === null) {
    snapshot = load();
    publish();
  }
});

export function useMealJournal() {
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    () => snapshot,
  );
}

export const journalId = () =>
  globalThis.crypto?.randomUUID?.() ?? `journal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const memoryKey = (date: string, slot: MealSlotId) => `${date}:${slot}`;
export const exportMealJournal = () => snapshot;
export const importMealJournal = (data: unknown) => {
  if (data !== undefined) commit(normalizeMealJournal(data));
};
export const saveMealPlans = (plans: MealPlan[], replacing?: string) =>
  commit({ ...snapshot, plans: [...snapshot.plans.filter((p) => p.id !== replacing), ...plans] });
export const removeMealPlan = (id: string) =>
  commit({ ...snapshot, plans: snapshot.plans.filter((p) => p.id !== id) });
export const updateMealPlan = (id: string, partial: Partial<Pick<MealPlan, 'read' | 'loggedAt'>>) =>
  commit({ ...snapshot, plans: snapshot.plans.map((p) => (p.id === id ? { ...p, ...partial } : p)) });
export const updateMealMemory = (date: string, slot: MealSlotId, partial: MealMemory) => {
  const key = memoryKey(date, slot);
  commit({
    ...snapshot,
    memories: { ...snapshot.memories, [key]: { ...snapshot.memories[key], ...partial } },
  });
};
export const saveMealPhoto = (photo: MealPhoto) =>
  commit({ ...snapshot, photos: [photo, ...snapshot.photos.filter((p) => p.id !== photo.id)] });
export const removeMealPhoto = (id: string) =>
  commit({ ...snapshot, photos: snapshot.photos.filter((p) => p.id !== id) });

export function plannedLogItems(plan: MealPlan, language: Language): LoggedFoodItem[] {
  return plan.items.map(({ food, amount }) => ({
    id: '',
    foodId: food.id,
    name: (language === 'it' ? food.name_it : food.name_en) || food.name_de,
    store: food.store,
    amount,
    unit: food.unit,
    calories: food.calories,
    carbs: food.carbs,
    protein: food.protein,
    fat: food.fat,
    fiber: food.fiber,
    salt: food.salt,
    sugar: food.sugar,
    loggedAt: '',
  }));
}
