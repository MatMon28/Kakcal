import { useSyncExternalStore } from 'react';
import type {
  AdvancedSettings,
  BodyEntries,
  BodyEntry,
  BodyGroup,
  CustomMeasure,
  DefaultMeasureId,
  GoalKey,
  GoalMode,
  GoalSetting,
  GoalsConfig,
} from '../types/advanced';

/**
 * Store for the advanced personalisation (Settings > Advanced): goals / limits and body measurements.
 *
 * It is a tiny module-level store (`useSyncExternalStore`) with its own localStorage keys, so it never
 * touches the main `kcalsync_settings` normalisation. Every option is off by default.
 */

export const ADVANCED_STORAGE_KEY = 'kcalsync_advanced';
export const BODY_STORAGE_KEY = 'kcalsync_body';

// ---------------------------------------------------------------------------------------------
// Goals and limits
// ---------------------------------------------------------------------------------------------

export const GOAL_KEYS: GoalKey[] = ['calories', 'burned', 'fiber', 'carbs', 'protein', 'fat', 'salt', 'sugar', 'water'];

/** Unit of each item's value. */
export const GOAL_UNITS: Record<GoalKey, string> = {
  calories: 'kcal',
  burned: 'kcal',
  fiber: 'g',
  carbs: 'g',
  protein: 'g',
  fat: 'g',
  salt: 'g',
  sugar: 'g',
  water: 'ml',
};

/** Largest value that can be typed for each item. */
export const GOAL_MAX: Record<GoalKey, number> = {
  calories: 20000,
  burned: 20000,
  fiber: 2000,
  carbs: 2000,
  protein: 2000,
  fat: 2000,
  salt: 2000,
  sugar: 2000,
  water: 20000,
};

/**
 * Which modes the user can choose per item. Every item can be a goal *or* a limit.
 * (The stored mode is still called 'objective' so saved settings and backups keep working; the user sees "Goal".)
 */
const BOTH_MODES: GoalMode[] = ['objective', 'limit'];
export const GOAL_MODE_CHOICES: Record<GoalKey, GoalMode[]> = {
  calories: BOTH_MODES,
  burned: BOTH_MODES,
  fiber: BOTH_MODES,
  carbs: BOTH_MODES,
  protein: BOTH_MODES,
  fat: BOTH_MODES,
  salt: BOTH_MODES,
  sugar: BOTH_MODES,
  water: BOTH_MODES,
};

const DEFAULT_GOALS: GoalsConfig = {
  calories: { enabled: false, mode: 'limit', value: 2000 },
  burned: { enabled: false, mode: 'objective', value: 500 },
  fiber: { enabled: false, mode: 'objective', value: 25 },
  carbs: { enabled: false, mode: 'limit', value: 250 },
  protein: { enabled: false, mode: 'limit', value: 120 },
  fat: { enabled: false, mode: 'limit', value: 70 },
  salt: { enabled: false, mode: 'limit', value: 5 },
  sugar: { enabled: false, mode: 'limit', value: 50 },
  water: { enabled: false, mode: 'objective', value: 2000 },
};

// ---------------------------------------------------------------------------------------------
// Body measures
// ---------------------------------------------------------------------------------------------

/** Built-in measures in display order (waist, neck, hips, chest, forearms, biceps, thighs, calves). */
export const DEFAULT_MEASURES: { id: DefaultMeasureId; group: Exclude<BodyGroup, 'custom'> }[] = [
  { id: 'waist', group: 'lower' },
  { id: 'neck', group: 'upper' },
  { id: 'hips', group: 'lower' },
  { id: 'chest', group: 'upper' },
  { id: 'forearms', group: 'upper' },
  { id: 'biceps', group: 'upper' },
  { id: 'thighs', group: 'lower' },
  { id: 'calves', group: 'lower' },
];

export const BODY_GROUPS: BodyGroup[] = ['upper', 'lower', 'custom'];

const DEFAULT_IDS = new Set<string>(DEFAULT_MEASURES.map((m) => m.id));

export const isDefaultMeasure = (id: string): id is DefaultMeasureId => DEFAULT_IDS.has(id);

export function groupOfMeasure(id: string): BodyGroup {
  return DEFAULT_MEASURES.find((m) => m.id === id)?.group ?? 'custom';
}

const DEFAULT_SETTINGS: AdvancedSettings = {
  goalsEnabled: false,
  goals: DEFAULT_GOALS,
  body: { enabled: false, tracked: [], custom: [] },
};

// ---------------------------------------------------------------------------------------------
// Normalisation (anything read from storage or from a backup goes through here)
// ---------------------------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function normalizeGoals(raw: unknown): GoalsConfig {
  const src = isObject(raw) ? raw : {};
  const out = {} as GoalsConfig;
  for (const key of GOAL_KEYS) {
    const item = isObject(src[key]) ? (src[key] as Partial<GoalSetting>) : {};
    const base = DEFAULT_GOALS[key];
    const choices = GOAL_MODE_CHOICES[key];
    out[key] = {
      enabled: item.enabled === true,
      mode: item.mode && choices.includes(item.mode) ? item.mode : base.mode,
      value: typeof item.value === 'number' && Number.isFinite(item.value) && item.value >= 0 ? item.value : base.value,
    };
  }
  return out;
}

function normalizeCustom(raw: unknown): CustomMeasure[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CustomMeasure[] = [];
  for (const item of raw) {
    if (!isObject(item) || typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    const name = item.name.trim();
    if (!name || !item.id || seen.has(item.id) || DEFAULT_IDS.has(item.id)) continue;
    seen.add(item.id);
    out.push({ id: item.id, name, unit: typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'cm' });
  }
  return out;
}

export function normalizeAdvanced(raw: unknown): AdvancedSettings {
  const src = isObject(raw) ? raw : {};
  const body = isObject(src.body) ? src.body : {};
  const custom = normalizeCustom(body.custom);
  const valid = new Set<string>([...DEFAULT_IDS, ...custom.map((c) => c.id)]);
  const tracked = Array.isArray(body.tracked)
    ? Array.from(new Set(body.tracked.filter((id): id is string => typeof id === 'string' && valid.has(id))))
    : [];
  return {
    goalsEnabled: src.goalsEnabled === true,
    goals: normalizeGoals(src.goals),
    body: { enabled: body.enabled === true, tracked, custom },
  };
}

export function normalizeBodyEntries(raw: unknown): BodyEntries {
  const out: BodyEntries = {};
  if (!isObject(raw)) return out;
  for (const [id, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    const byDate = new Map<string, number>();
    for (const item of list) {
      if (isObject(item) && isDate(item.date) && typeof item.value === 'number' && Number.isFinite(item.value) && item.value > 0) {
        byDate.set(item.date, item.value);
      }
    }
    if (byDate.size) {
      out[id] = Array.from(byDate, ([date, value]) => ({ date, value })).sort((a, b) => (a.date < b.date ? -1 : 1));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------------------------

function read<T>(key: string, normalize: (raw: unknown) => T): T {
  try {
    const saved = localStorage.getItem(key);
    return normalize(saved ? JSON.parse(saved) : null);
  } catch {
    return normalize(null);
  }
}

let settings: AdvancedSettings = typeof localStorage === 'undefined' ? DEFAULT_SETTINGS : read(ADVANCED_STORAGE_KEY, normalizeAdvanced);
let entries: BodyEntries = typeof localStorage === 'undefined' ? {} : read(BODY_STORAGE_KEY, normalizeBodyEntries);
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

function persist(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable or full */ }
}

// Another tab changed the data: reload it.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === ADVANCED_STORAGE_KEY || event.key === null) settings = read(ADVANCED_STORAGE_KEY, normalizeAdvanced);
    if (event.key === BODY_STORAGE_KEY || event.key === null) entries = read(BODY_STORAGE_KEY, normalizeBodyEntries);
    emit();
  });
}

export const getAdvanced = () => settings;
export const getBodyEntries = () => entries;

export function useAdvanced(): AdvancedSettings {
  return useSyncExternalStore(subscribe, () => settings, () => DEFAULT_SETTINGS);
}

export function useBodyEntries(): BodyEntries {
  return useSyncExternalStore(subscribe, () => entries, () => ({}));
}

function commitSettings(next: AdvancedSettings) {
  settings = next;
  persist(ADVANCED_STORAGE_KEY, next);
  emit();
}

function commitEntries(next: BodyEntries) {
  entries = next;
  persist(BODY_STORAGE_KEY, next);
  emit();
}

// ----- Goals -----

export function setGoalsEnabled(enabled: boolean) {
  commitSettings({ ...settings, goalsEnabled: enabled });
}

export function updateGoal(key: GoalKey, partial: Partial<GoalSetting>) {
  commitSettings({ ...settings, goals: { ...settings.goals, [key]: { ...settings.goals[key], ...partial } } });
}

export interface GoalState {
  mode: GoalMode;
  value: number;
  /** Objective: intake >= value. Limit: intake >= value (limit reached or exceeded). */
  reached: boolean;
  /** Limit only: intake is above the limit. */
  exceeded: boolean;
}

/** Pure helper: the state of one goal for an amount, or `null` when goals are off / this goal is off. */
export function goalState(config: AdvancedSettings, key: GoalKey, amount: number): GoalState | null {
  if (!config.goalsEnabled) return null;
  const goal = config.goals[key];
  if (!goal.enabled || !(goal.value > 0)) return null;
  const eps = 1e-6;
  return {
    mode: goal.mode,
    value: goal.value,
    reached: amount + eps >= goal.value,
    exceeded: goal.mode === 'limit' && amount > goal.value + eps,
  };
}

/** Hook used by the small goal icons: returns the goal state only when the goal is reached. */
export function useGoalState(key: GoalKey, amount: number): GoalState | null {
  const config = useAdvanced();
  const state = goalState(config, key, amount);
  return state && state.reached ? state : null;
}

// ----- Body measures -----

export function setBodyEnabled(enabled: boolean) {
  commitSettings({ ...settings, body: { ...settings.body, enabled } });
}

export function toggleTrackedMeasure(id: string) {
  const { tracked } = settings.body;
  const next = tracked.includes(id) ? tracked.filter((x) => x !== id) : [...tracked, id];
  commitSettings({ ...settings, body: { ...settings.body, tracked: next } });
}

/** Adds a personalised measure (tracked straight away) and returns its id. */
export function addCustomMeasure(name: string, unit: string): string | null {
  const clean = name.trim();
  if (!clean) return null;
  const id = `bm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const measure: CustomMeasure = { id, name: clean.slice(0, 40), unit: unit.trim().slice(0, 8) || 'cm' };
  commitSettings({
    ...settings,
    body: { ...settings.body, custom: [...settings.body.custom, measure], tracked: [...settings.body.tracked, id] },
  });
  return id;
}

/** Removes a personalised measure together with its recorded values. */
export function removeCustomMeasure(id: string) {
  commitSettings({
    ...settings,
    body: {
      ...settings.body,
      custom: settings.body.custom.filter((c) => c.id !== id),
      tracked: settings.body.tracked.filter((x) => x !== id),
    },
  });
  if (entries[id]) {
    const { [id]: _removed, ...rest } = entries;
    void _removed;
    commitEntries(rest);
  }
}

/** Saves one value for a day (replacing the day's previous value). */
export function setBodyEntry(id: string, date: string, value: number) {
  if (!isDate(date) || !Number.isFinite(value) || value <= 0) return;
  const rounded = Math.round(value * 10) / 10;
  const list = (entries[id] ?? []).filter((e) => e.date !== date);
  list.push({ date, value: rounded });
  list.sort((a, b) => (a.date < b.date ? -1 : 1));
  commitEntries({ ...entries, [id]: list });
}

export function removeBodyEntry(id: string, date: string) {
  const list = (entries[id] ?? []).filter((e) => e.date !== date);
  const { [id]: _old, ...rest } = entries;
  void _old;
  commitEntries(list.length ? { ...rest, [id]: list } : rest);
}

/** Entries of one measure inside an inclusive date range. */
export function entriesInRange(list: BodyEntry[] | undefined, from: string, to: string): BodyEntry[] {
  return (list ?? []).filter((e) => e.date >= from && e.date <= to);
}

// ----- Backup -----

export function exportAdvanced(): { settings: AdvancedSettings; entries: BodyEntries } {
  return { settings, entries };
}

/** Restores a backup section. Missing data (backups made before this feature) leaves the current data untouched. */
export function importAdvanced(data: unknown) {
  if (!isObject(data)) return;
  if (data.settings !== undefined) commitSettings(normalizeAdvanced(data.settings));
  if (data.entries !== undefined) commitEntries(normalizeBodyEntries(data.entries));
}
