import { useSyncExternalStore } from 'react';
import type { Language, LoggedFoodItem, MealSlotId } from '../types';
import type { MealJournalData, MealMemory, MealPhoto, MealPlan, PlanGroup, ShoppingItem, ShoppingList } from '../types/journal';
import { DEMO_MODE } from '../config/demo';
import { makeDemoJournal } from '../data/journalDemo';
import { deletePhotoBlob, isPhotoRef, migrateInlinePhotos, photoIdOf, photosFromBackup, PHOTO_REF_PATTERN, putPhotoBlob, photoRef } from '../storage/photoStore';
import { journalWithoutPictures, mergePictureNotes, readPhotoNotes, type PhotoNote } from './backupFormat';
import { scheduleWrite } from '../storage/writeQueue';

export const JOURNAL_KEY = 'kcalsync_meal_journal';
const empty = (): MealJournalData => ({ version: 1, plans: [], planGroups: [], shoppingLists: [], memories: {}, photos: [] });
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
  const planGroups: PlanGroup[] = Array.isArray(data.planGroups)
    ? data.planGroups
        .filter((g) => g && typeof g.id === 'string' && typeof g.name === 'string' && g.name.trim())
        .map((g) => ({ id: g.id, name: g.name.slice(0, 80), createdAt: typeof g.createdAt === 'string' ? g.createdAt : '' }))
    : [];
  const shoppingLists: ShoppingList[] = Array.isArray(data.shoppingLists)
    ? data.shoppingLists
        .filter((l) => l && typeof l.planId === 'string' && Array.isArray(l.items))
        .map((l) => ({
          planId: l.planId,
          updatedAt: typeof l.updatedAt === 'string' ? l.updatedAt : '',
          dismissed: Array.isArray(l.dismissed) ? l.dismissed.filter((k): k is string => typeof k === 'string') : [],
          items: l.items
            .filter((i): i is ShoppingItem => Boolean(i) && typeof i.id === 'string' && typeof i.name === 'string' && i.name.trim().length > 0)
            .map((i) => ({
              id: i.id,
              name: i.name.slice(0, 120),
              amount: typeof i.amount === 'number' && Number.isFinite(i.amount) && i.amount > 0 ? i.amount : null,
              unit: i.unit === 'ml' ? 'ml' : i.unit === 'g' ? 'g' : '',
              foodId: typeof i.foodId === 'string' ? i.foodId : undefined,
              checked: i.checked === true,
              custom: i.custom === true ? true : undefined,
            })),
        }))
    : [];
  return { version: 1, plans, planGroups, shoppingLists, photos, memories };
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

/**
 * Photo lookups in O(1). Every expanded meal / recipe card asks "which photos belong to me?" and every meal card of
 * Today asks "which photos belong to this day and meal?"; with `photos.filter(...)` in each of them that was
 * cards x photos comparisons on every render. The index is built once per `photos` array (a new array is made by
 * every change, so a `WeakMap` keyed on it is always current) and the arrays it returns keep their identity until
 * a photo changes. Order is the order of `photos`, exactly as the filters gave it.
 */
interface PhotoIndex { byLinked: Map<string, MealPhoto[]>; bySlot: Map<string, MealPhoto[]> }
const photoIndexes = new WeakMap<MealPhoto[], PhotoIndex>();
const NO_PHOTOS: MealPhoto[] = [];

function photoIndex(photos: MealPhoto[]): PhotoIndex {
  let index = photoIndexes.get(photos);
  if (!index) {
    index = { byLinked: new Map(), bySlot: new Map() };
    for (const photo of photos) {
      const map = photo.linkedId ? index.byLinked : index.bySlot;
      const key = photo.linkedId ? photo.linkedId : memoryKey(photo.date, photo.slot);
      const list = map.get(key);
      if (list) list.push(photo); else map.set(key, [photo]);
    }
    photoIndexes.set(photos, index);
  }
  return index;
}

/** The photos attached to a saved meal / recipe (`linkedId`). */
export function usePhotosForLinked(linkedId: string): MealPhoto[] {
  return photoIndex(useMealJournal().photos).byLinked.get(linkedId) ?? NO_PHOTOS;
}

/** The photos of one day and meal that are not attached to a saved meal / recipe. */
export function usePhotosForSlot(date: string, slot: MealSlotId): MealPhoto[] {
  return photoIndex(useMealJournal().photos).bySlot.get(memoryKey(date, slot)) ?? NO_PHOTOS;
}
export const exportMealJournal = () => snapshot;
/**
 * Backup form (backup version 2): the whole journal WITHOUT any picture data. The notes of the pictures are kept in
 * `photoNotes` so they can be re-attached to pictures that are still on the device. See `utils/backupFormat.ts`.
 */
export function exportMealJournalForBackup(): MealJournalData & { photoNotes: PhotoNote[] } {
  return journalWithoutPictures(snapshot);
}
export interface PreparedJournalImport {
  journal: MealJournalData;
  /** The file embedded pictures (a version 1.x backup). */
  picturesInFile: boolean;
  /** Picture notes re-attached to pictures already on this device. */
  notesRestored: number;
  /** Picture notes whose picture is not on this device. */
  notesWithoutPicture: number;
}
/**
 * Prepares the journal of a backup BEFORE anything else is imported, so a failure changes nothing.
 * - Version 1.x file: embedded pictures (data URLs) become blobs, exactly as before.
 * - Version 2 file: no pictures; `photoNotes` are merged onto the pictures that are on this device, and the device's
 *   other pictures are kept.
 */
export async function prepareMealJournalImport(data: unknown): Promise<PreparedJournalImport | undefined> {
  if (data === undefined) return undefined;
  const normalized = normalizeMealJournal(data);
  const restored = await photosFromBackup(normalized.photos);
  const notes = readPhotoNotes((data as { photoNotes?: unknown } | null)?.photoNotes);
  if (!notes) return { journal: { ...normalized, photos: restored }, picturesInFile: restored.length > 0, notesRestored: 0, notesWithoutPicture: 0 };
  const merged = mergePictureNotes(notes, snapshot.photos, restored);
  return {
    journal: { ...normalized, photos: merged.photos },
    picturesInFile: restored.length > 0,
    notesRestored: merged.matched,
    notesWithoutPicture: merged.missing,
  };
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
/**
 * Saves a named plan: its meals replace every meal that already belongs to the group (so meals taken out of the plan
 * disappear) and the group itself is created or renamed.
 */
export const savePlanGroup = (group: PlanGroup, plans: MealPlan[]) =>
  commit({
    ...snapshot,
    plans: [...snapshot.plans.filter((p) => p.groupId !== group.id), ...plans.map((p) => ({ ...p, groupId: group.id }))],
    planGroups: [...snapshot.planGroups.filter((g) => g.id !== group.id), group],
  });
/** Deletes a named plan with all its meals and its shopping list. Logged food is not touched. */
export const removePlanGroup = (id: string) =>
  commit({
    ...snapshot,
    plans: snapshot.plans.filter((p) => p.groupId !== id),
    planGroups: snapshot.planGroups.filter((g) => g.id !== id),
    shoppingLists: snapshot.shoppingLists.filter((l) => l.planId !== id),
  });
/** Creates or replaces the shopping list of one plan (one list per plan). */
export const saveShoppingList = (list: ShoppingList) =>
  commit({ ...snapshot, shoppingLists: [...snapshot.shoppingLists.filter((l) => l.planId !== list.planId), list] });
export const removeShoppingList = (planId: string) =>
  commit({ ...snapshot, shoppingLists: snapshot.shoppingLists.filter((l) => l.planId !== planId) });
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
