import type { CustomButtonDef, CustomQuantityEntry, DayLog, Language } from '../types';
import { numberFormatter } from './formatters';

function legacyEntry(date: string, trackerId: string, amount: number): CustomQuantityEntry {
  return { id: `legacy-${date}-${trackerId}`, amount };
}

export function getCustomEntries(day: DayLog | undefined, trackerId: string): CustomQuantityEntry[] {
  if (!day) return [];
  const entries = day.customEntries?.[trackerId];
  if (Array.isArray(entries)) return entries;
  const legacy = day.custom?.[trackerId];
  return typeof legacy === 'number' && Number.isFinite(legacy) && legacy > 0
    ? [legacyEntry(day.date, trackerId, legacy)]
    : [];
}

export function getTrackerValue(day: DayLog | undefined, tracker: CustomButtonDef): number | boolean | undefined {
  if (tracker.type === 'toggle') {
    const value = day?.custom?.[tracker.id];
    return typeof value === 'boolean' ? value : undefined;
  }
  const entries = getCustomEntries(day, tracker.id);
  return entries.length ? entries.reduce((sum, entry) => sum + entry.amount, 0) : undefined;
}

export function formatTrackerAmount(value: number, language: Language): string {
  return numberFormatter(language === 'it' ? 'it-IT' : 'en-US', { maximumFractionDigits: 8 }).format(value);
}

/** Migrate a legacy numeric total once; boolean trackers stay in the daily toggle map. */
export function migrateCustomEntries(day: DayLog): DayLog {
  const amounts = Object.entries(day.custom ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number');
  if (amounts.length === 0) return day;
  const custom = { ...day.custom };
  const customEntries = {
    ...Object.fromEntries(amounts
      .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
      .map(([id, amount]) => [id, [legacyEntry(day.date, id, amount)]])),
    ...day.customEntries,
  };
  for (const [id] of amounts) delete custom[id];
  return { ...day, custom, customEntries };
}

export function withCustomEntries(day: DayLog, trackerId: string, entries: CustomQuantityEntry[]): DayLog {
  const migrated = migrateCustomEntries(day);
  const customEntries = { ...migrated.customEntries, [trackerId]: entries };
  if (entries.length === 0) delete customEntries[trackerId];
  return { ...migrated, customEntries };
}
