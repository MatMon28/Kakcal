import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react';
import { PlusCircle, ScanBarcode, Search } from 'lucide-react';
import type { FoodItem, MealSlotId } from '../../types';
import { useApp } from '../../context/AppContext';
import { catalogueScore } from '../../data/offCatalog';
import { matchesFirstChar, pinCoherentFavorites } from '../../utils/favorites';
import { searchFoods } from '../../utils/foodSearchIndex';
import { addDaysToDateString } from '../../utils/formatters';
import { useCatalogueSearch } from '../../utils/useCatalogueSearch';
import { useJournalText } from '../../i18n/journal';
import { CustomFoodModal } from '../modals/CustomFoodModal';
import { FoodResultRow } from './FoodResultRow';
import { RecentChips, RECENT_MORE, RECENT_SHOWN } from './RecentChips';

const BarcodeLookupModal = lazy(() => import('../modals/BarcodeLookupModal').then((module) => ({ default: module.BarcodeLookupModal })));
const chip = 'pressable px-3 min-h-8 rounded-full bg-[var(--inset)] border border-[var(--border)] hover:bg-[var(--hover)] text-xs font-bold text-[var(--text)]';

/** The ingredient mode of food selection: results, quick foods, recents and favorites, without logging to Today. */
export function IngredientPicker({ onPick, slot, initialQuery = '', excludeId, suggestions = [] }: {
  onPick: (food: FoodItem, amount?: number) => void;
  slot?: MealSlotId;
  initialQuery?: string;
  excludeId?: string | null;
  suggestions?: FoodItem[];
}) {
  const { allFoods, allDayLogs, selectedDate, favoriteFoods, language, settings, t } = useApp();
  const j = useJournalText();
  const [query, setQuery] = useState(initialQuery);
  const [child, setChild] = useState<'barcode' | 'custom' | null>(null);
  const trimmed = query.trim();
  const deferred = useDeferredValue(trimmed);
  const { foods: catalogue, pending } = useCatalogueSearch(deferred, true, 35);
  const byId = useMemo(() => new Map(allFoods.map((food) => [food.id, food])), [allFoods]);
  const favorites = useMemo(() => (favoriteFoods ?? []).flatMap((id) => {
    const food = byId.get(id);
    return food && id !== excludeId ? [food] : [];
  }), [byId, favoriteFoods, excludeId]);
  const results = useMemo(() => {
    if (deferred.length < 2) return [];
    const local = searchFoods(allFoods, deferred);
    const seen = new Set(local.map(({ f }) => f.id));
    const ranked = [...local, ...catalogue.filter((f) => !seen.has(f.id)).map((f) => ({ f, score: catalogueScore(deferred) }))]
      .filter(({ f }) => f.id !== excludeId).sort((a, b) => a.score - b.score);
    return pinCoherentFavorites(ranked, favoriteFoods ?? [], ({ f }) => f.id, ({ score }) => score, deferred).slice(0, 40).map(({ f }) => f);
  }, [allFoods, catalogue, deferred, excludeId, favoriteFoods]);
  const recent = useMemo(() => {
    const found = new Map<string, FoodItem>();
    for (let offset = 0; offset <= 7 && found.size < RECENT_SHOWN + RECENT_MORE; offset++) {
      const meals = allDayLogs[addDaysToDateString(selectedDate, -offset)]?.meals;
      if (!meals) continue;
      const entries = slot ? meals[slot] ?? [] : Object.values(meals).flat();
      for (const item of [...entries].reverse()) {
        if (!item) continue;
        const food = byId.get(item.foodId);
        if (food && food.id !== excludeId) found.set(food.id, food);
        if (found.size >= RECENT_SHOWN + RECENT_MORE) break;
      }
    }
    return [...found.values()];
  }, [allDayLogs, selectedDate, slot, byId, excludeId]);
  const quick = settings.quickFoods.flatMap((id) => {
    const food = byId.get(id);
    return food && id !== excludeId ? [food] : [];
  });
  const label = (food: FoodItem) => language === 'it' ? food.name_it : food.name_en || food.name_de;
  const renderChip = (food: FoodItem) => <button type="button" onClick={() => onPick(food)} className={chip}>{label(food)}</button>;
  const list = (foods: FoodItem[]) => <div className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] divide-y divide-[var(--border)]">
    {foods.map((food) => <FoodResultRow key={food.id} food={food} favorite onClick={() => onPick(food)} />)}
  </div>;
  const picks = suggestions.filter((food) => food.id !== excludeId);
  const one = trimmed.length === 1 ? favorites.filter((food) => matchesFirstChar(food, trimmed)) : [];

  return (
    <div className="space-y-3.5" data-ingredient-picker>
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]" />
          <input type="search" autoComplete="off" aria-label={t.foodModal.searchPlaceholder} placeholder={t.foodModal.searchPlaceholder}
            value={query} onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-10 pr-3 min-h-11 text-sm font-bold" />
        </div>
        <button type="button" onClick={() => setChild('barcode')} aria-label={t.foodModal.barcodeScan} title={t.foodModal.barcodeScan}
          className="pressable w-11 shrink-0 rounded-2xl grid place-items-center border border-[var(--border)] bg-[var(--inset)] hover:bg-[var(--hover)]"><ScanBarcode size={18} /></button>
      </div>
      <button type="button" className={`${chip} inline-flex items-center gap-1.5`} onClick={() => setChild('custom')}><PlusCircle size={14} /> {t.foodModal.addCustomFood}</button>
      {picks.length > 0 && <section className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--muted)]">{j('Suggested foods', 'Alimenti suggeriti')}</h3>{list(picks)}
      </section>}
      {trimmed.length >= 2 ? (
        results.length && deferred === trimmed ? list(results) : (
          <p role="status" className="text-xs py-2 text-[var(--muted)]">{pending || deferred !== trimmed ? j('Searching…', 'Ricerca…') : t.foodModal.noResults}</p>
        )
      ) : trimmed.length === 1 ? (one.length ? list(one) : <p className="text-xs text-[var(--muted)]">{t.foodModal.minCharsHint}</p>) : (
        <>
          {quick.length > 0 && <section className="space-y-1.5">
            <h3 className="text-xs font-extrabold text-[var(--muted)]">{j('Quick foods', 'Alimenti rapidi')}</h3>
            <div className="flex flex-wrap gap-1.5">{quick.map((food) => <span key={food.id}>{renderChip(food)}</span>)}</div>
          </section>}
          {recent.length > 0 && <section className="space-y-1.5">
            <h3 className="text-xs font-extrabold text-[var(--muted)]">{j('Recent foods', 'Alimenti recenti')}</h3>
            <RecentChips items={recent} getKey={(food) => food.id} renderChip={renderChip} toggleClassName={chip} />
          </section>}
          {favorites.length > 0 && <section className="space-y-1.5">
            <h3 className="text-xs font-extrabold text-[var(--muted)]">{j('Favorite foods', 'Alimenti preferiti')}</h3>{list(favorites.slice(0, 8))}
          </section>}
        </>
      )}
      {child === 'custom' && <CustomFoodModal onReturn={() => setChild(null)} onPick={onPick} initialName={trimmed} />}
      {child === 'barcode' && <Suspense fallback={null}><BarcodeLookupModal onReturn={() => setChild(null)} onPick={onPick} /></Suspense>}
    </div>
  );
}
