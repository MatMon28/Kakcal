import type { MealSlotId } from '../types';
import type { PlannedFood } from '../types/journal';

/** What is planned for one day + meal inside the planner wizard. */
export interface PlanEntry {
  kind: 'food' | 'note';
  items: PlannedFood[];
  title: string;
  note: string;
}

/**
 * A meal plan that was closed half way and kept for later (planner wizard > close > *Save as draft*).
 * One draft at a time, stored only on this device under `kcak_planner_draft`.
 */
export interface PlannerDraft {
  version: 1;
  savedAt: string;
  step: 'setup' | 'plan';
  startDate: string;
  endDate: string;
  skippedWeekdays: number[];
  overrides: Record<string, boolean>;
  selectedSlots: MealSlotId[];
  entries: Record<string, PlanEntry>;
  preferredKind: PlanEntry['kind'];
  activeKey: string | null;
}

export const PLANNER_DRAFT_KEY = 'kcak_planner_draft';

const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function cleanEntry(raw: unknown): PlanEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Partial<PlanEntry>;
  if (e.kind !== 'food' && e.kind !== 'note') return null;
  const items = Array.isArray(e.items)
    ? e.items.filter(
        (i): i is PlannedFood =>
          Boolean(i) && typeof i === 'object' && typeof i.amount === 'number' && Boolean(i.food) && typeof i.food.id === 'string',
      )
    : [];
  return { kind: e.kind, items, title: typeof e.title === 'string' ? e.title : '', note: typeof e.note === 'string' ? e.note : '' };
}

/** The saved draft, or `null` when there is none (or it is unreadable). */
export function loadPlannerDraft(): PlannerDraft | null {
  try {
    const raw = localStorage.getItem(PLANNER_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<PlannerDraft>;
    if (!d || d.version !== 1 || !isDate(d.startDate) || !isDate(d.endDate)) return null;
    const entries: Record<string, PlanEntry> = {};
    for (const [key, value] of Object.entries(d.entries ?? {})) {
      const entry = cleanEntry(value);
      if (entry) entries[key] = entry;
    }
    const overrides: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(d.overrides ?? {})) if (isDate(key) && typeof value === 'boolean') overrides[key] = value;
    return {
      version: 1,
      savedAt: typeof d.savedAt === 'string' ? d.savedAt : new Date().toISOString(),
      step: d.step === 'plan' ? 'plan' : 'setup',
      startDate: d.startDate,
      endDate: d.endDate,
      skippedWeekdays: Array.isArray(d.skippedWeekdays) ? d.skippedWeekdays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : [],
      overrides,
      selectedSlots: Array.isArray(d.selectedSlots) ? d.selectedSlots.filter((s): s is MealSlotId => typeof s === 'string') : [],
      entries,
      preferredKind: d.preferredKind === 'note' ? 'note' : 'food',
      activeKey: typeof d.activeKey === 'string' ? d.activeKey : null,
    };
  } catch {
    return null;
  }
}

/** Keeps the draft. Returns `false` when the device storage is full. */
export function savePlannerDraft(draft: Omit<PlannerDraft, 'version' | 'savedAt'>): boolean {
  try {
    localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify({ ...draft, version: 1, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearPlannerDraft() {
  try {
    localStorage.removeItem(PLANNER_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Number of meals of a draft that already have food or a note. */
export function draftPlannedCount(draft: PlannerDraft): number {
  return Object.values(draft.entries).filter((e) =>
    e.kind === 'note' ? e.note.trim().length > 0 : e.items.length > 0,
  ).length;
}
