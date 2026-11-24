/**
 * Format of the JSON backup (Settings > Data Backup).
 *
 * Version 2 ("full backup, no pictures") contains everything the user saved EXCEPT the picture files:
 * profile, day logs (meals, activities, water, weight, poop, custom trackers), custom foods, picked catalogue foods,
 * meals / recipes (`preBuiltMeals`), settings (favourites, quick foods, custom buttons, notifications, theme...),
 * period data, custom activities, language, advanced goals + body measurements, advanced layout, the meal journal
 * (plans, plan names, shopping lists, meal notes, favourites per meal and the NOTES of the pictures), remembered portions,
 * the unfinished planner draft and the interface preferences (which cards are open...).
 *
 * Pictures (IndexedDB blobs) are never part of a version 2 backup: they would make the file huge. Each picture keeps its
 * metadata in `mealJournal.photoNotes`; on import the note is re-attached to a picture that is already on the device.
 * Version 1.x backups (which embedded pictures as data URLs) still import, pictures included.
 */
import type { MealJournalData, MealPhoto } from '../types/journal';
import type { MealSlotId } from '../types';
import { PLANNER_DRAFT_KEY } from './plannerDraft';

export const BACKUP_FORMAT = 'kakcal-backup';
export const BACKUP_VERSION = '2.0';
/** Highest major version this build can read. Files from a newer app are refused instead of half-imported. */
export const BACKUP_MAJOR_SUPPORTED = 2;

/** Picture metadata without the image: what a version 2 backup stores for every meal picture. */
export interface PhotoNote {
  id: string;
  date: string;
  slot: MealSlotId;
  note: string;
  createdAt: string;
  linkedId?: string;
}

/** Major version of a backup: `2.0` -> 2, `1.2` -> 1, missing / unreadable -> 1 (the oldest files had no version). */
export function backupMajorVersion(data: unknown): number {
  const raw = data && typeof data === 'object' ? (data as { version?: unknown }).version : undefined;
  const major = parseInt(String(raw ?? '1'), 10);
  return Number.isFinite(major) && major > 0 ? major : 1;
}

export const isSupportedBackup = (data: unknown): boolean =>
  Boolean(data) && typeof data === 'object' && !Array.isArray(data) && backupMajorVersion(data) <= BACKUP_MAJOR_SUPPORTED;

// ---------------------------------------------------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------------------------------------------------

export const toPhotoNote = (p: MealPhoto): PhotoNote => ({
  id: p.id,
  date: p.date,
  slot: p.slot,
  note: p.note,
  createdAt: p.createdAt,
  ...(p.linkedId ? { linkedId: p.linkedId } : {}),
});

/** The journal as it goes into a version 2 backup: no picture data at all, only the notes of the pictures. */
export function journalWithoutPictures(journal: MealJournalData): MealJournalData & { photoNotes: PhotoNote[] } {
  return { ...journal, photos: [], photoNotes: journal.photos.map(toPhotoNote) };
}

const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const validSlot = (v: unknown): v is MealSlotId =>
  typeof v === 'string' && /^(breakfast|mid_morning|lunch|midday_snack|dinner|extra|custom_.+)$/.test(v);

/** Valid picture notes of a backup (anything malformed is dropped). `undefined` when the field is absent. */
export function readPhotoNotes(raw: unknown): PhotoNote[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const notes: PhotoNote[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const n = p as Partial<PhotoNote>;
    if (typeof n.id !== 'string' || !n.id || !validDate(n.date) || !validSlot(n.slot)) continue;
    notes.push({
      id: n.id,
      date: n.date,
      slot: n.slot,
      note: typeof n.note === 'string' ? n.note.slice(0, 4000) : '',
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : '',
      ...(typeof n.linkedId === 'string' ? { linkedId: n.linkedId } : {}),
    });
  }
  return notes;
}

/**
 * Re-attaches the picture notes of a version 2 backup to the pictures that are already on this device (same id).
 * Notes whose picture is not on this device cannot be shown and are counted in `missing`. Pictures on the device that
 * the backup does not mention are kept: restoring a backup never deletes a picture.
 */
export function mergePictureNotes(
  notes: PhotoNote[],
  local: MealPhoto[],
  restored: MealPhoto[] = [],
): { photos: MealPhoto[]; matched: number; missing: number } {
  const byId = new Map(local.map((p) => [p.id, p]));
  const out = new Map<string, MealPhoto>(restored.map((p) => [p.id, p]));
  let matched = 0;
  let missing = 0;
  for (const note of notes) {
    const existing = byId.get(note.id);
    if (existing) { out.set(note.id, { ...existing, ...note, src: existing.src }); matched++; }
    else if (!out.has(note.id)) missing++;
  }
  for (const p of local) if (!out.has(p.id)) out.set(p.id, p);
  return { photos: [...out.values()], matched, missing };
}

// ---------------------------------------------------------------------------------------------------------------------
// Interface preferences (small UI keys stored in localStorage)
// ---------------------------------------------------------------------------------------------------------------------

/** Which localStorage keys count as saved interface preferences: open / closed cards, selected tabs, ranges, layouts. */
const PREFERENCE_KEY = /^(kcak_[a-z0-9_]{1,80}|kcalsync_body_range|kcalsync_stats_(daily|weight)_open)$/;
export const isPreferenceKey = (key: string) => PREFERENCE_KEY.test(key) && key !== PLANNER_DRAFT_KEY;
const MAX_PREFERENCES = 100;
const MAX_PREFERENCE_CHARS = 20_000;

/** Every stored interface preference, parsed. Unreadable values are skipped. */
export function collectPreferences(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !isPreferenceKey(key)) continue;
      try { out[key] = JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { /* not JSON: skip */ }
    }
  } catch { /* storage unavailable */ }
  return out;
}

/** Writes the preferences of a backup back. Only whitelisted keys are accepted. Returns how many were applied. */
export function applyPreferences(raw: unknown): number {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  let applied = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_PREFERENCES)) {
    if (!isPreferenceKey(key) || value === undefined) continue;
    try {
      const text = JSON.stringify(value);
      if (text.length > MAX_PREFERENCE_CHARS) continue;
      localStorage.setItem(key, text);
      applied++;
    } catch { /* storage full: the preference is simply not restored */ }
  }
  return applied;
}

// ---------------------------------------------------------------------------------------------------------------------
// Import report
// ---------------------------------------------------------------------------------------------------------------------

export interface ImportReport {
  /** Major version of the file that was imported. */
  version: number;
  /** The file contained pictures (a version 1.x backup). */
  picturesInFile: boolean;
  /** Picture notes restored onto pictures that were already on this device. */
  notesRestored: number;
  /** Picture notes whose picture is not on this device (pictures are not part of a version 2 backup). */
  notesWithoutPicture: number;
}

let lastReport: ImportReport | null = null;
export const setLastImportReport = (report: ImportReport | null) => { lastReport = report; };
/** Details of the last successful `importDataJson`, for the message under the backup buttons. */
export const getLastImportReport = () => lastReport;
