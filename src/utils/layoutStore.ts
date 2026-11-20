import { useSyncExternalStore } from 'react';
import type {
  CustomMealType,
  LayoutItemPrefs,
  LayoutPageId,
  LayoutState,
  LayoutWidth,
  PageLayout,
} from '../types/layout';

/**
 * Store for the advanced layout (Settings > Advanced > Advanced layout).
 *
 * Like `advancedStore.ts` it is a tiny module-level store (`useSyncExternalStore`) with its own
 * localStorage key. It keeps, per page (Today / Statistics / Body): the order of the fields, the removed
 * fields and the width / size chosen for each field, plus the meal types added by the user.
 * Everything is off by default; the originals are the defaults of every page.
 */

export const LAYOUT_STORAGE_KEY = 'kcalsync_layout';

export const LAYOUT_PAGES: LayoutPageId[] = ['today', 'stats', 'body'];
export const WIDTHS: LayoutWidth[] = ['third', 'half', 'twothirds', 'full'];

/** Size steps (-2 ... 2) and the CSS zoom factor each one applies to a field. */
export const MIN_SCALE = -2;
export const MAX_SCALE = 2;
export const SCALE_ZOOM: Record<number, number> = { [-2]: 0.75, [-1]: 0.88, 0: 1, 1: 1.15, 2: 1.3 };

/** Ids of the built-in Today fields in their original order (custom meal types are added after the meals). */
export const TODAY_BUILTIN_ITEMS = [
  'intake',
  'burned',
  'carbs',
  'protein',
  'fat',
  'nutrients',
  'layoutSwitch',
  'meal:breakfast',
  'meal:mid_morning',
  'meal:lunch',
  'meal:midday_snack',
  'meal:dinner',
  'meal:extra',
  'tracker:activity',
  'tracker:water',
  'tracker:poop',
  'tracker:custom',
];

export const mealItemId = (slot: string) => `meal:${slot}`;

const emptyPage = (): PageLayout => ({ order: [], hidden: [], items: {} });
const emptyState = (): LayoutState => ({
  enabled: false,
  pages: { today: emptyPage(), stats: emptyPage(), body: emptyPage() },
  mealTypes: [],
});

// ---------------------------------------------------------------------------------------------
// Normalisation (anything read from storage or from a backup goes through here)
// ---------------------------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0))) : [];

function normalizePage(raw: unknown): PageLayout {
  const src = isObject(raw) ? raw : {};
  const items: Record<string, LayoutItemPrefs> = {};
  if (isObject(src.items)) {
    for (const [id, value] of Object.entries(src.items)) {
      if (!isObject(value)) continue;
      const prefs: LayoutItemPrefs = {};
      if (typeof value.width === 'string' && (WIDTHS as string[]).includes(value.width)) prefs.width = value.width as LayoutWidth;
      if (typeof value.scale === 'number' && Number.isInteger(value.scale) && value.scale >= MIN_SCALE && value.scale <= MAX_SCALE && value.scale !== 0) {
        prefs.scale = value.scale;
      }
      if (prefs.width || prefs.scale) items[id] = prefs;
    }
  }
  return { order: strings(src.order), hidden: strings(src.hidden), items };
}

export function normalizeLayout(raw: unknown): LayoutState {
  const src = isObject(raw) ? raw : {};
  const pages = isObject(src.pages) ? src.pages : {};
  const seen = new Set<string>();
  const mealTypes: CustomMealType[] = [];
  if (Array.isArray(src.mealTypes)) {
    for (const item of src.mealTypes) {
      if (!isObject(item) || typeof item.id !== 'string' || typeof item.name !== 'string') continue;
      const name = item.name.trim().slice(0, 30);
      if (!item.id.startsWith('custom_') || item.id.length < 8 || !name || seen.has(item.id)) continue;
      seen.add(item.id);
      mealTypes.push({ id: item.id as CustomMealType['id'], name });
    }
  }
  return {
    enabled: src.enabled === true,
    pages: { today: normalizePage(pages.today), stats: normalizePage(pages.stats), body: normalizePage(pages.body) },
    mealTypes,
  };
}

// ---------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------

/** The stored order, restricted to the fields that exist now; new fields keep their original place at the end. */
export function mergeOrder(stored: string[], ids: string[]): string[] {
  const known = new Set(ids);
  const kept = stored.filter((id) => known.has(id));
  const keptSet = new Set(kept);
  return [...kept, ...ids.filter((id) => !keptSet.has(id))];
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(scale)));
}

// ---------------------------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------------------------

function read(): LayoutState {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return normalizeLayout(saved ? JSON.parse(saved) : null);
  } catch {
    return emptyState();
  }
}

let state: LayoutState = typeof localStorage === 'undefined' ? emptyState() : read();
let editingPage: LayoutPageId | null = null;
const EMPTY_STATE = emptyState();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

function commit(next: LayoutState) {
  state = next;
  try { localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable or full */ }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === LAYOUT_STORAGE_KEY || event.key === null) {
      state = read();
      emit();
    }
  });
}

export const getLayout = () => state;

export function useLayout(): LayoutState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY_STATE);
}

/** The page being edited (pencil pressed) or `null`. Never persisted. */
export function useEditingPage(): LayoutPageId | null {
  return useSyncExternalStore(subscribe, () => editingPage, () => null);
}

export function setEditingPage(page: LayoutPageId | null) {
  if (editingPage === page) return;
  editingPage = page;
  emit();
}

// ----- Master switch / reset -----

export function setLayoutEnabled(enabled: boolean) {
  if (!enabled) editingPage = null;
  commit({ ...state, enabled });
}

/** Restores the original arrangement of every page. Meal types added by the user are data and are kept. */
export function resetLayout() {
  editingPage = null;
  commit({ ...state, pages: emptyState().pages });
}

export function resetPageLayout(page: LayoutPageId) {
  commit({ ...state, pages: { ...state.pages, [page]: emptyPage() } });
}

// ----- Fields -----

function updatePage(page: LayoutPageId, fn: (layout: PageLayout) => PageLayout) {
  commit({ ...state, pages: { ...state.pages, [page]: fn(state.pages[page]) } });
}

/** Moves a field one place earlier (-1) or later (1) among the fields that are shown. `ids` = all current field ids. */
export function moveItem(page: LayoutPageId, id: string, direction: -1 | 1, ids: string[]) {
  updatePage(page, (layout) => {
    const order = mergeOrder(layout.order, ids);
    const shown = order.filter((x) => !layout.hidden.includes(x));
    const at = shown.indexOf(id);
    const other = shown[at + direction];
    if (at < 0 || other === undefined) return { ...layout, order };
    const next = [...order];
    const a = next.indexOf(id);
    const b = next.indexOf(other);
    next[a] = other;
    next[b] = id;
    return { ...layout, order: next };
  });
}

function patchItem(layout: PageLayout, id: string, patch: Partial<LayoutItemPrefs>): PageLayout {
  const merged = { ...layout.items[id], ...patch };
  const { [id]: _old, ...rest } = layout.items;
  void _old;
  const clean: LayoutItemPrefs = {};
  if (merged.width) clean.width = merged.width;
  if (merged.scale) clean.scale = merged.scale;
  return { ...layout, items: clean.width || clean.scale ? { ...rest, [id]: clean } : rest };
}

/** `undefined` = back to the field's original width. */
export function setItemWidth(page: LayoutPageId, id: string, width: LayoutWidth | undefined) {
  updatePage(page, (layout) => patchItem(layout, id, { width }));
}

export function setItemScale(page: LayoutPageId, id: string, scale: number) {
  updatePage(page, (layout) => patchItem(layout, id, { scale: clampScale(scale) }));
}

export function hideItem(page: LayoutPageId, id: string) {
  updatePage(page, (layout) => (layout.hidden.includes(id) ? layout : { ...layout, hidden: [...layout.hidden, id] }));
}

export function showItem(page: LayoutPageId, id: string) {
  updatePage(page, (layout) => ({ ...layout, hidden: layout.hidden.filter((x) => x !== id) }));
}

// ----- Meal types -----

/** Adds a meal type (shown on Today right after the last meal, and in every meal selection). Returns its id. */
export function addMealType(name: string): CustomMealType['id'] | null {
  const clean = name.trim().slice(0, 30);
  if (!clean) return null;
  const id: CustomMealType['id'] = `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const ids = [...TODAY_BUILTIN_ITEMS, ...state.mealTypes.map((m) => mealItemId(m.id))];
  const order = mergeOrder(state.pages.today.order, ids);
  let lastMeal = -1;
  order.forEach((x, i) => { if (x.startsWith('meal:')) lastMeal = i; });
  order.splice(lastMeal + 1, 0, mealItemId(id));
  commit({
    ...state,
    mealTypes: [...state.mealTypes, { id, name: clean }],
    pages: { ...state.pages, today: { ...state.pages.today, order } },
  });
  return id;
}

/** Deletes a meal type. Food already logged in it stays in the journal and in the totals. */
export function removeMealType(id: string) {
  const key = mealItemId(id);
  const pages = { ...state.pages };
  for (const page of LAYOUT_PAGES) {
    const layout = pages[page];
    const { [key]: _gone, ...items } = layout.items;
    void _gone;
    pages[page] = { order: layout.order.filter((x) => x !== key), hidden: layout.hidden.filter((x) => x !== key), items };
  }
  commit({ ...state, mealTypes: state.mealTypes.filter((m) => m.id !== id), pages });
}

// ----- Backup -----

export const exportLayout = (): LayoutState => state;

/** Restores a backup section. Missing data (backups made before this feature) leaves the current data untouched. */
export function importLayout(data: unknown) {
  if (data === undefined || data === null) return;
  editingPage = null;
  commit(normalizeLayout(data));
}
