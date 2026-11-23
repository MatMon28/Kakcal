/**
 * "Go to the meal" from a photo: expands the meal on Today, or the saved meal / recipe on Custom.
 *
 * The expanded state of those cards is remembered in localStorage (`usePersistentState`). The helpers write it
 * first (so a page that is not mounted yet opens correctly) and then notify a page that is already mounted.
 */
const readList = (key: string): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch { return []; }
};
const addToList = (key: string, id: string) => {
  const list = readList(key);
  if (list.includes(id)) return;
  try { localStorage.setItem(key, JSON.stringify([...list, id])); } catch { /* storage unavailable */ }
};

/** Brings an element into view once its page has been shown (tries twice, the page may still be sliding in). */
function scrollToSelector(selector: string) {
  [200, 600].forEach((delay) => window.setTimeout(() => {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, delay));
}

/** Expands a meal field of Today (the caller selects the date and switches to Today). */
export function revealMealSlot(slot: string) {
  addToList('kcak_today_meals_open', slot);
  window.dispatchEvent(new CustomEvent('kc:open-meal', { detail: slot }));
  scrollToSelector(`[data-meal-slot="${slot.replace(/["\\]/g, '')}"]`);
}

/** Expands a saved meal or recipe card on Custom (the caller switches to Custom). */
export function revealLibraryItem(id: string) {
  addToList('kcak_my_meals_open', id);
  addToList('kcak_my_recipes_open', id);
  try {
    const raw = JSON.parse(localStorage.getItem('kcak_custom_sections_open') || '{}');
    localStorage.setItem('kcak_custom_sections_open', JSON.stringify({ foods: true, ...raw, meals: true, recipes: true }));
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent('kc:open-library', { detail: id }));
  scrollToSelector(`[data-library-id="${id.replace(/["\\]/g, '')}"]`);
}
