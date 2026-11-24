import { useSyncExternalStore } from 'react';
import type { Language, LoggedFoodItem, MealSlotId } from '../types';
import type { MealJournalData, MealMemory, MealPhoto, MealPlan } from '../types/journal';
import { DEMO_MODE } from '../config/demo';
import { makeDemoJournal } from '../data/journalDemo';
import { deletePhotoBlob, isPhotoRef, migrateInlinePhotos, photoIdOf, photosForBackup, photosFromBackup, PHOTO_REF_PATTERN, putPhotoBlob, photoRef } from '../storage/photoStore';
import { scheduleWrite } from '../storage/writeQueue';

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
          (/^data:image\/(jpeg|png|webp);base64,/.test(p.src) || PHOTO_REF_PATTERN.test(p.src) || ((p.src.startsWith(import.meta.env.BASE_URL + 'images/') || p.src.startsWith('/images/')) && !p.src.includes('..'))),
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
    const saved = localStorage.getItem(JOURNAL_KEY);
    if (!saved && DEMO_MODE) {
      const demo = makeDemoJournal();
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(demo));
      return demo;
    }
    return normalizeMealJournal(JSON.parse(saved || 'null'));
  } catch {
    return empty();
  }
}

let snapshot = load();
const subscribers = new Set<() => void>();
const publish = () => subscribers.forEach((fn) => fn());

// The journal JSON no longer contains image data (photos are IndexedDB blobs referenced by `idb:<id>`), so a commit is
// small: publish at once and persist through the coalescing queue. Failures are reported by the queue (StorageNotice).
function commit(next: MealJournalData) {
  snapshot = next;
  publish();
  scheduleWrite(`ls:${JOURNAL_KEY}`, () => localStorage.setItem(JOURNAL_KEY, JSON.stringify(snapshot)));
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
/** Backup form: photo references are replaced by self-contained data URLs. */
export async function exportMealJournalForBackup(): Promise<MealJournalData> {
  return { ...snapshot, photos: await photosForBackup(snapshot.photos) };
}
/** Converts the photos of a backup into blobs BEFORE anything else is imported, so a failure changes nothing. */
export async function prepareMealJournalImport(data: unknown): Promise<MealJournalData | undefined> {
  if (data === undefined) return undefined;
  const normalized = normalizeMealJournal(data);
  return { ...normalized, photos: await photosFromBackup(normalized.photos) };
}
export const importMealJournal = (data: unknown) => {
  if (data !== undefined) commit(normalizeMealJournal(data));
};
/** Moves legacy base64 photos into IndexedDB blobs (idle task after start-up). */
export async function migrateJournalPhotos(): Promise<void> {
  const next = await migrateInlinePhotos(snapshot.photos);
  if (!next) return;
  // Photos added meanwhile are kept; only the migrated entries change.
  const migrated = new Map(next.map((p) => [p.id, p]));
  commit({ ...snapshot, photos: snapshot.photos.map((p) => (p.src.startsWith('data:') ? migrated.get(p.id) ?? p : p)) });
}
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
/** Updates a photo's metadata (note, date, meal). The image itself is untouched. */
export const saveMealPhoto = (photo: MealPhoto) =>
  commit({ ...snapshot, photos: [photo, ...snapshot.photos.filter((p) => p.id !== photo.id)] });
/**
 * Adds a new photo: the blob is committed to IndexedDB FIRST and the entry is published only afterwards, so a full
 * device (QuotaExceededError) rejects here and never looks as though the photo was saved.
 */
export async function addMealPhoto(photo: Omit<MealPhoto, 'src'>, blob: Blob): Promise<void> {
  await putPhotoBlob(photo.id, blob);
  saveMealPhoto({ ...photo, src: photoRef(photo.id) });
}
export function removeMealPhoto(id: string) {
  const photo = snapshot.photos.find((p) => p.id === id);
  commit({ ...snapshot, photos: snapshot.photos.filter((p) => p.id !== id) });
  if (photo && isPhotoRef(photo.src)) void deletePhotoBlob(photoIdOf(photo.src)).catch((error) => console.error('Photo delete failed', error));
}

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
