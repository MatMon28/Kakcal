import { offerRemovalUndo, restoreAt } from './undoRemoval';
import { useSyncExternalStore } from 'react';
import type {
  CustomMealType,
  LayoutItemPrefs,
  LayoutPageId,
  LayoutState,
  PageLayout,
} from '../types/layout';

/**
 * Store for the advanced layout (Settings > Advanced > Advanced layout).
 *
 * Like `advancedStore.ts` it is a tiny module-level store (`useSyncExternalStore`) with its own
 * localStorage key. It keeps, per page (Today / Statistics / Body): the order of the fields, the removed
 * fields and the place / width / height chosen for each field, plus the meal types added by the user.
 * Everything is off by default; the originals are the defaults of every page.
 */

export const LAYOUT_STORAGE_KEY = 'kcalsync_layout';

export const LAYOUT_PAGES: LayoutPageId[] = ['today', 'stats', 'body'];

/** Width limits in columns of the 6-column grid, height limits and snapping in pixels. */
export const MIN_COLS = 2;
export const MAX_COLS = 6;
export const MIN_HEIGHT = 44;
export const MAX_HEIGHT = 900;
export const HEIGHT_STEP = 4;
/** Highest legacy row index (only used to migrate layouts saved by the previous row-based editor). */
export const MAX_ROW = 200;
/** Highest distance from the top of the page (px) a field can be placed at (free placement). */
export const MAX_TOP = 20000;

/** Widths stored by the first version of the advanced layout (1/3, 1/2, 2/3, full) as columns. */
const LEGACY_WIDTH_COLS: Record<string, number> = { third: 2, half: 3, twothirds: 4, full: 6 };

/** Ids of the built-in Today fields in their original order (custom meal types are added after the meals). */
export const TODAY_BUILTIN_ITEMS = [
  'intake',
  'burned',
  'carbs',
  'protein',
  'fat',
  'fiber',
  'salt',
  'sugar',
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

/** Fibre, salt and sugar used to be one field called `nutrients`; they are three independent fields now. */
const NUTRIENT_IDS = ['fiber', 'salt', 'sugar'];
const expandLegacyIds = (v: unknown): unknown =>
  Array.isArray(v) ? v.flatMap((id) => (id === 'nutrients' ? NUTRIENT_IDS : [id])) : v;

export function clampCols(cols: number): number {
  return Math.min(MAX_COLS, Math.max(MIN_COLS, Math.round(cols)));
}

export function clampTop(top: number): number {
  return Math.min(MAX_TOP, Math.max(0, Math.round(top)));
}

export function clampHeight(height: number): number {
  const snapped = Math.round(height / HEIGHT_STEP) * HEIGHT_STEP;
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, snapped));
}

function normalizePage(raw: unknown): PageLayout {
  const src = isObject(raw) ? raw : {};
  const items: Record<string, LayoutItemPrefs> = {};
  if (isObject(src.items)) {
    for (const [id, value] of Object.entries(src.items)) {
      if (!isObject(value) || id === 'nutrients') continue;
      const prefs: LayoutItemPrefs = {};
      if (typeof value.cols === 'number' && Number.isFinite(value.cols)) prefs.cols = clampCols(value.cols);
      else if (typeof value.width === 'string' && value.width in LEGACY_WIDTH_COLS) prefs.cols = LEGACY_WIDTH_COLS[value.width];
      if (typeof value.height === 'number' && Number.isFinite(value.height)) prefs.height = clampHeight(value.height);
      if (typeof value.col === 'number' && Number.isInteger(value.col)) {
        if (typeof value.top === 'number' && Number.isFinite(value.top)) {
          prefs.col = Math.min(MAX_COLS - 1, Math.max(0, value.col));
          prefs.top = clampTop(value.top);
        } else if (typeof value.row === 'number' && Number.isInteger(value.row)) {
          // Saved by the previous (row based) editor: kept until the page has been measured and converted to `top`.
          prefs.col = Math.min(MAX_COLS - 1, Math.max(0, value.col));
          prefs.row = Math.min(MAX_ROW, Math.max(0, value.row));
        }
      }
      if (prefs.cols || prefs.height || prefs.top !== undefined || prefs.row !== undefined) items[id] = prefs;
    }
  }
  return { order: strings(expandLegacyIds(src.order)), hidden: strings(expandLegacyIds(src.hidden)), items };
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
      mealTypes.push({ id: item.id as CustomMealType['id'], name, icon: typeof item.icon === 'string' && item.icon.length < 100000 ? item.icon : undefined });
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

function patchItem(layout: PageLayout, id: string, patch: Partial<LayoutItemPrefs>): PageLayout {
  const merged = { ...layout.items[id], ...patch };
  const { [id]: _old, ...rest } = layout.items;
  void _old;
  const clean: LayoutItemPrefs = {};
  if (merged.cols) clean.cols = clampCols(merged.cols);
  if (merged.height) clean.height = clampHeight(merged.height);
  if (merged.col !== undefined && merged.top !== undefined) {
    // `top` wins over a legacy `row`: the row is dropped as soon as the field has a pixel position.
    clean.col = Math.min(MAX_COLS - 1, Math.max(0, Math.round(merged.col)));
    clean.top = clampTop(merged.top);
  } else if (merged.col !== undefined && merged.row !== undefined) {
    clean.col = Math.min(MAX_COLS - 1, Math.max(0, Math.round(merged.col)));
    clean.row = Math.min(MAX_ROW, Math.max(0, Math.round(merged.row)));
  }
  return { ...layout, items: clean.cols || clean.height || clean.top !== undefined || clean.row !== undefined ? { ...rest, [id]: clean } : rest };
}

/** Sets the width (columns) and / or height (px) of a field. A key set to `undefined` goes back to the original. */
export function setItemSize(page: LayoutPageId, id: string, size: Partial<LayoutItemPrefs>) {
  updatePage(page, (layout) => patchItem(layout, id, size));
}

/**
 * Applies several changes at once (one write): a drop moves one field and may push others down; a resize changes
 * `col`, `top`, `cols` and `height`. A key set to `undefined` goes back to the original. Pass `col` and `top` together.
 */
export function applyItemChanges(page: LayoutPageId, changes: Record<string, Partial<LayoutItemPrefs>>) {
  updatePage(page, (layout) => {
    let next = layout;
    for (const [id, patch] of Object.entries(changes)) next = patchItem(next, id, patch);
    return next;
  });
}

/**
 * Removes a field. `others` can change the remaining fields at the same time. A removed field forgets its place.
 */
export function hideItem(page: LayoutPageId, id: string, others: Record<string, Partial<LayoutItemPrefs>> = {}) {
  const previous = state.pages[page];
  updatePage(page, (layout) => {
    let next = layout.hidden.includes(id) ? layout : { ...layout, hidden: [...layout.hidden, id] };
    for (const [other, patch] of Object.entries(others)) next = patchItem(next, other, patch);
    return patchItem(next, id, { col: undefined, top: undefined, row: undefined });
  });
  if (!previous.hidden.includes(id)) offerRemovalUndo(() => updatePage(page, (layout) => {
    if (!layout.hidden.includes(id)) return layout;
    const items = { ...layout.items };
    if (previous.items[id]) items[id] = previous.items[id];
    else delete items[id];
    return { ...layout, hidden: layout.hidden.filter((item) => item !== id), items };
  }));
}

/** Brings a removed field back. It has no place any more, so it appears after the placed fields. */
export function showItem(page: LayoutPageId, id: string) {
  updatePage(page, (layout) => patchItem({ ...layout, hidden: layout.hidden.filter((x) => x !== id) }, id, { col: undefined, top: undefined, row: undefined }));
}

// ----- Meal types -----

/** Adds a meal type (shown on Today right after the last meal, and in every meal selection). Returns its id. */
export function addMealType(name: string, icon = 'soup'): CustomMealType['id'] | null {
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
    mealTypes: [...state.mealTypes, { id, name: clean, icon }],
    pages: { ...state.pages, today: { ...state.pages.today, order } },
  });
  return id;
}

export function setMealTypeIcon(id: string, icon: string) {
  commit({ ...state, mealTypes: state.mealTypes.map((meal) => meal.id === id ? { ...meal, icon } : meal) });
}

/** Deletes a meal type. Food already logged in it stays in the journal and in the totals. */
export function removeMealType(id: string) {
  const index = state.mealTypes.findIndex((meal) => meal.id === id);
  const removed = state.mealTypes[index];
  if (!removed) return;
  const original = state.pages;
  const key = mealItemId(id);
  const pages = { ...state.pages };
  for (const page of LAYOUT_PAGES) {
    const layout = pages[page];
    const { [key]: _gone, ...items } = layout.items;
    void _gone;
    pages[page] = { order: layout.order.filter((x) => x !== key), hidden: layout.hidden.filter((x) => x !== key), items };
  }
  commit({ ...state, mealTypes: state.mealTypes.filter((m) => m.id !== id), pages });
  offerRemovalUndo(() => {
    const nextPages = { ...state.pages };
    for (const page of LAYOUT_PAGES) {
      const prior = original[page];
      const latest = nextPages[page];
      nextPages[page] = {
        order: prior.order.includes(key) ? restoreAt(latest.order, key, prior.order.indexOf(key)) : latest.order,
        hidden: prior.hidden.includes(key) ? restoreAt(latest.hidden, key, prior.hidden.indexOf(key)) : latest.hidden,
        items: prior.items[key] ? { ...latest.items, [key]: prior.items[key] } : latest.items,
      };
    }
    commit({ ...state, mealTypes: restoreAt(state.mealTypes, removed, index, (a, b) => a.id === b.id), pages: nextPages });
  });
}

// ----- Backup -----

export const exportLayout = (): LayoutState => state;

/** Restores a backup section. Missing data (backups made before this feature) leaves the current data untouched. */
export function importLayout(data: unknown) {
  if (data === undefined || data === null) return;
  editingPage = null;
  commit(normalizeLayout(data));
}
