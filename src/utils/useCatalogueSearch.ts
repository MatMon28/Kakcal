import { useEffect, useState } from 'react';
import type { FoodItem } from '../types';
import { normalizeSearch } from '../data/offCatalog';
import { peekCatalogueSearch, searchCatalogue } from './catalogueSearch';

const NONE: FoodItem[] = [];
/** Typing pauses shorter than this do not start a catalogue search (a cached query skips the wait). */
const DEBOUNCE_MS = 90;

/**
 * Catalogue foods for the text being typed, found off the main thread (see utils/catalogueSearch.ts).
 *
 * - Nothing runs (and nothing is downloaded) unless `enabled` and the trimmed text has two or more characters.
 * - A short debounce keeps a burst of keystrokes down to one search; cached queries answer without waiting.
 * - `pending` is true until the answer for the current text has arrived, so a dialog can hold back its
 *   "no results" message instead of flashing it while the catalogue is still being searched.
 * - While the next answer is on its way the previous list stays on screen if the new text extends or shortens
 *   the old one (normal typing / backspace), so the result list does not blink empty between keystrokes.
 */
export function useCatalogueSearch(query: string, enabled: boolean, limit = 30): { foods: FoodItem[]; pending: boolean } {
  const text = query.trim();
  const active = enabled && text.length >= 2;
  const key = active ? normalizeSearch(text) : '';
  const [answer, setAnswer] = useState<{ key: string; foods: FoodItem[] }>({ key: '', foods: NONE });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const deliver = () => {
      void searchCatalogue(text, limit).then((foods) => {
        if (!cancelled) setAnswer({ key, foods });
      });
    };
    if (peekCatalogueSearch(text, limit)) {
      deliver();
      return () => { cancelled = true; };
    }
    const timer = window.setTimeout(deliver, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, text, limit]);

  if (!active) return { foods: NONE, pending: false };
  if (answer.key === key) return { foods: answer.foods, pending: false };
  const related = answer.key !== '' && (key.startsWith(answer.key) || answer.key.startsWith(key));
  return { foods: related ? answer.foods : NONE, pending: true };
}
