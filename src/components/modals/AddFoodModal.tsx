import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { WorkflowFooter } from '../common/WorkflowFooter';
import { CustomFoodModal } from './CustomFoodModal';
import { useRemovalScope } from '../common/UndoRemovalNotice';
import { removeWithUndo } from '../../utils/undoRemoval';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { AmountSelector } from '../common/AmountSelector';
import { FoodItem, LoggedFoodItem, PreBuiltMeal } from '../../types';
import { useMealSlots } from '../../utils/mealSlots';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { FoodResultRow } from '../common/FoodResultRow';
import { useCatalogueSearch } from '../../utils/useCatalogueSearch';
import { catalogueScore } from '../../data/offCatalog';
import { calculateTotalCalories } from '../../utils/calculations';
import { addDaysToDateString, formatDateDisplay } from '../../utils/formatters';
import { searchFoods, searchMeals } from '../../utils/foodSearchIndex';
import { matchesFirstChar, pinCoherentFavorites } from '../../utils/favorites';
import { FavoriteButton } from '../common/FavoriteButton';
import { SaveBeforeCloseDialog } from '../common/SaveBeforeCloseDialog';
import {
  Search,
  ScanBarcode,
  UtensilsCrossed,
  History,
  Trash2,
  PlusCircle,
  X,
} from 'lucide-react';
import { scrollFadeRef, scrollFadeX } from '../../utils/scrollFade';
import { PlannedMeals } from '../journal/MealPlanner';
import { MealNoteField } from '../journal/MealDiary';
import { RecentChips, RECENT_MORE, RECENT_SHOWN } from '../common/RecentChips';
import { QuickFoodButtons } from '../common/QuickFoodButtons';
import { memoryKey, updateMealMemory, updateMealPlan, useMealJournal } from '../../utils/journalStore';
import type { MealPlan } from '../../types/journal';

interface QueuedEntry {
  key: string;
  food: FoodItem;
  amount: number;
  planId?: string;
}

const BarcodeLookupModal = React.lazy(() => import('./BarcodeLookupModal').then((module) => ({ default: module.BarcodeLookupModal })));

const RECENT_CHIP_CLASS =
  'pressable px-3 py-1.5 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-bold text-[var(--text)]';

export const AddFoodModal: React.FC = () => {
  const {
    isAddFoodOpen,
    setIsAddFoodOpen,
    foodLogSeed,
    setFoodLogSeed,
    targetMealSlot,
    setTargetMealSlot,
    allFoods,
    language,
    preBuiltMeals,
    logItemsToSlot,
    allDayLogs,
    selectedDate,
    settings,
    favoriteFoods,
    rememberFood,
    t,
  } = useApp();
  const { options: slotOptions, label: slotLabel } = useMealSlots();
  const journal = useMealJournal();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const noteKey = memoryKey(selectedDate, targetMealSlot);
  const mealNote = noteDrafts[noteKey] ?? journal.memories[noteKey]?.note ?? '';

  const undoScope = useRemovalScope();
  const [child, setChild] = useState<'barcode' | 'custom' | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [currentAmount, setCurrentAmount] = useState<number>(100);
  const [queuedItems, setQueuedItems] = useState<QueuedEntry[]>(() => (foodLogSeed ?? []).map((item, index) => ({ ...item, key: `seed-${index}` })));
  useEffect(() => { if (foodLogSeed?.length) setFoodLogSeed([]); }, [foodLogSeed, setFoodLogSeed]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const activeSlotRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const blurTimer = useRef<number | null>(null);
  // The results list keeps its own ref (scroll to top on a new query) and gets the edge-fade.
  const setResultsEl = useMemo(
    () => scrollFadeRef('y', (el) => { resultsRef.current = el as HTMLDivElement | null; }),
    [],
  );

  useEffect(() => {
    if (isAddFoodOpen && !activeFood) {
      activeSlotRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [isAddFoodOpen, targetMealSlot, activeFood]);


  const nameOf = (f: FoodItem) =>
    language === 'it' ? f.name_it : f.name_en || f.name_de;

  const kcalOf = (f: FoodItem, amt: number) => Math.round((f.calories * amt) / 100);

  // Quick shortcut foods configured in Settings (default: salt, bread, olive oil)
  const quickFoods = useMemo(
    () =>
      settings.quickFoods
        .map((id) => allFoods.find((f) => f.id === id))
        .filter((f): f is FoodItem => Boolean(f)),
    [settings.quickFoods, allFoods]
  );

  const trimmedQuery = searchTerm.trim();
  const isSearching = trimmedQuery.length >= 2;
  // Searching never blocks typing: the input follows the keystrokes at once, the results follow a moment later
  // (`useDeferredValue`), and the 130,000-product catalogue is searched in a Web Worker (utils/catalogueSearch.ts).
  // Item 6 still holds: the catalogue file is fetched only once two characters are typed, never when the dialog opens.
  const resultsQuery = useDeferredValue(trimmedQuery);
  const { foods: catalogueFoods, pending: cataloguePending } = useCatalogueSearch(resultsQuery, isAddFoodOpen, 40);

  // Favourite foods: shown as the whole list while the field is focused and empty,
  // matching the first character as soon as typing starts, and pinned to the top later.
  const favoriteIds = useMemo(() => favoriteFoods ?? [], [favoriteFoods]);
  const favoriteItems = useMemo(
    () =>
      favoriteIds
        .map((id) => allFoods.find((f) => f.id === id))
        .filter((f): f is FoodItem => Boolean(f)),
    [favoriteIds, allFoods]
  );
  const oneCharMatches = useMemo(
    () => (trimmedQuery.length === 1 ? favoriteItems.filter((f) => matchesFirstChar(f, trimmedQuery)) : []),
    [favoriteItems, trimmedQuery]
  );
  const showFavoritesPanel = searchFocused && trimmedQuery.length === 0;

  const onSearchFocus = () => {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setSearchFocused(true);
  };
  const onSearchBlur = () => {
    // Short delay so a tap on a favourite star inside the panel still registers.
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    blurTimer.current = window.setTimeout(() => setSearchFocused(false), 140);
  };
  useEffect(() => () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  }, []);
  // A new query should start at the top of the results list.
  useEffect(() => {
    resultsRef.current?.scrollTo({ top: 0 });
  }, [trimmedQuery]);
  // Search results: only shown while typing (>=2 chars), fuzzy matched.
  // Includes individual foods, recipes (tagged), AND saved meals (one-tap log).
  // Local names are tokenized once and finished queries are cached (utils/foodSearchIndex.ts).
  const searchResults = useMemo(() => {
    if (resultsQuery.length < 2) return [];
    const q = resultsQuery;
    const foods = searchFoods(allFoods, q).map((x) => ({ kind: 'food' as const, f: x.f, score: x.score }));
    const meals = searchMeals(preBuiltMeals, q).map((x) => ({ kind: 'meal' as const, m: x.m, score: x.score }));
    // The offline Open Food Facts catalogue is ranked on the same scale: below an exact match in the
    // bundled foods, above their loose typo matches (catalogue foods the user already picked are in allFoods).
    const knownIds = new Set(foods.map((x) => x.f.id));
    const catalogue = catalogueFoods
      .filter((f) => !knownIds.has(f.id))
      .map((f) => ({ kind: 'food' as const, f, score: catalogueScore(q) }));
    const ranked = [...meals, ...foods, ...catalogue].sort((a, b) => a.score - b.score);
    return pinCoherentFavorites(ranked, favoriteIds, (r) => (r.kind === 'food' ? r.f.id : ''), (r) => r.score, q).slice(0, 50);
  }, [allFoods, preBuiltMeals, resultsQuery, favoriteIds, catalogueFoods]);
  // Hold the "no results" message back while the answer for the typed text is still being worked out.
  const resultsPending = cataloguePending || resultsQuery !== trimmedQuery;

  // Saved meals tagged for this slot
  const slotMeals = useMemo(
    () => preBuiltMeals.filter((m) => m.slot === targetMealSlot),
    [preBuiltMeals, targetMealSlot]
  );

  // Recent foods/recipes logged in this slot over the last 7 days, up to 15 (5 shown, the "..." chip reveals 10 more)
  const recentItems = useMemo(() => {
    const seen = new Map<string, FoodItem>();
    for (let i = 1; i <= 7; i++) {
      const d = addDaysToDateString(selectedDate, -i);
      const items = allDayLogs[d]?.meals[targetMealSlot] || [];
      for (const it of items) {
        if (!seen.has(it.foodId)) {
          const f = allFoods.find((x) => x.id === it.foodId);
          if (f) seen.set(it.foodId, f);
        }
      }
    }
    return [...seen.values()].slice(0, RECENT_SHOWN + RECENT_MORE);
  }, [allDayLogs, selectedDate, targetMealSlot, allFoods]);

  const previousMeals = useMemo(() => {
    const out: { date: string; items: LoggedFoodItem[] }[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = addDaysToDateString(selectedDate, -i);
      const items = allDayLogs[d]?.meals[targetMealSlot];
      if (items && items.length) out.push({ date: d, items });
    }
    return out;
  }, [allDayLogs, selectedDate, targetMealSlot]);

  const close = () => {
    setConfirmCloseOpen(false);
    setIsAddFoodOpen(false);
    setActiveFood(null);
    setQueuedItems([]);
    setSearchTerm('');
    setSearchFocused(false);
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  };

  /** Foods waiting in the batch, or a food picked with a weight but not added yet: closing would lose them. */
  const hasUnsaved = queuedItems.length > 0 || (activeFood !== null && currentAmount > 0);

  /**
   * Every dismissal of the dialog (tap outside, swipe down, X, Back) comes through here: with unsaved items it asks
   * first (Save / Don't save / Keep editing) instead of silently dropping them. The dialog stays open meanwhile.
   */
  const requestClose = () => {
    if (hasUnsaved) setConfirmCloseOpen(true);
    else close();
  };

  const handlePickFood = (food: FoodItem, amount = getDefaultAmount(food)) => {
    setEditingKey(null);
    rememberFood(food);
    setActiveFood(food);
    // Last weight used for this food, else its classic portion, else 100 g/ml.
    setCurrentAmount(amount);
  };

  const handleEditQueued = (entry: QueuedEntry) => {
    setEditingKey(entry.key);
    setActiveFood(entry.food);
    setCurrentAmount(entry.amount);
  };

  const handleAddAnother = () => {
    if (!activeFood || currentAmount <= 0) return;
    setLastAmount(activeFood.id, currentAmount);
    const entry = { key: editingKey ?? `${activeFood.id}-${Date.now()}`, food: activeFood, amount: currentAmount };
    setQueuedItems((prev) => editingKey ? prev.map((item) => item.key === editingKey ? { ...item, ...entry } : item) : [...prev, entry]);
    setEditingKey(null);
    setActiveFood(null);
    setSearchTerm('');
  };

  /** Queue a saved meal instead of logging and closing: more foods can be added afterwards. */
  const queueMeal = (meal: PreBuiltMeal) => {
    const entries: QueuedEntry[] = [];
    for (const ingredient of meal.ingredients) {
      const food = allFoods.find((item) => item.id === ingredient.foodId);
      if (!food) continue;
      rememberFood(food);
      entries.push({ key: `${meal.id}-${ingredient.foodId}-${Date.now()}-${entries.length}`, food, amount: ingredient.amount });
    }
    if (!entries.length) return;
    setQueuedItems((prev) => [...prev, ...entries]);
    setActiveFood(null);
    setSearchTerm('');
  };

  /** Previous-day entries also join the batch, including foods deleted from the catalogue. */
  const queueLoggedItems = (items: LoggedFoodItem[]) => {
    const entries = items.map((item, index): QueuedEntry => ({
      key: `previous-${item.id}-${Date.now()}-${index}`,
      amount: item.amount,
      food: allFoods.find((food) => food.id === item.foodId) ?? {
        id: item.foodId,
        name_de: item.name,
        name_it: item.name,
        name_en: item.name,
        store: item.store,
        category: 'prepared',
        unit: item.unit,
        calories: item.calories,
        carbs: item.carbs,
        protein: item.protein,
        fat: item.fat,
        fiber: item.fiber,
        salt: item.salt,
        sugar: item.sugar ?? null,
      },
    }));
    if (!entries.length) return;
    setQueuedItems((prev) => [...prev, ...entries]);
    setActiveFood(null);
    setSearchTerm('');
  };

  const handleLogNow = () => {
    const finalEntries: QueuedEntry[] = [...queuedItems];
    if (activeFood && Number.isFinite(currentAmount) && currentAmount > 0) {
      setLastAmount(activeFood.id, currentAmount);
      const index = finalEntries.findIndex((item) => item.key === editingKey);
      if (index >= 0) finalEntries[index] = { ...finalEntries[index], amount: currentAmount };
      else finalEntries.push({ key: `${activeFood.id}-${Date.now()}`, food: activeFood, amount: currentAmount });
    }
    if (finalEntries.length === 0) return;

    const toLog: LoggedFoodItem[] = finalEntries.map((e) => ({
      id: '',
      foodId: e.food.id,
      name: nameOf(e.food),
      store: e.food.store,
      amount: e.amount,
      unit: e.food.unit,
      calories: e.food.calories,
      carbs: e.food.carbs,
      protein: e.food.protein,
      fat: e.food.fat,
      fiber: e.food.fiber,
      salt: e.food.salt,
      sugar: e.food.sugar ?? null,
      loggedAt: '',
    }));

    logItemsToSlot(targetMealSlot, toLog);
    if (settings.inlineMealNotes && noteDrafts[noteKey] !== undefined) updateMealMemory(selectedDate, targetMealSlot, { note: mealNote.trim() });
    for (const id of new Set(finalEntries.map((e) => e.planId).filter((id): id is string => Boolean(id)))) {
      const plan = journal.plans.find((p) => p.id === id);
      if (plan?.date === selectedDate && plan.slot === targetMealSlot && finalEntries.filter((e) => e.planId === id).length === plan.items.length) updateMealPlan(id, { loggedAt: new Date().toISOString() });
    }
    close();
  };

  const removeQueued = (key: string) =>
    removeWithUndo(queuedItems, queuedItems.findIndex((item) => item.key === key), setQueuedItems, undoScope, (a, b) => a.key === b.key);

  const portionKcal = activeFood ? kcalOf(activeFood, currentAmount) : 0;
  const otherQueued = queuedItems.filter((item) => item.key !== editingKey);
  const validAmount = Number.isFinite(currentAmount) && currentAmount > 0;
  const logCount = queuedItems.length + (activeFood && !editingKey && validAmount ? 1 : 0);

  // Panel shown while the search field is empty/focused or only one char is typed.
  const favoritesPanel = (items: FoodItem[]) => (
    <div className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-[var(--border)]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
          {t.favorites.title}
        </span>
        <span className="text-[10px] font-medium text-[var(--muted)]">{t.favorites.hint}</span>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-center text-xs font-medium text-[var(--muted)]">{t.favorites.empty}</p>
      ) : (
        <div ref={setResultsEl} className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-[var(--border)]">
          {items.map((f) => (
            <FoodResultRow key={f.id} food={f} onClick={() => handlePickFood(f)} favorite />
          ))}
        </div>
      )}
    </div>
  );

  const pill = (active: boolean) =>
    `pressable px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
      active
        ? 'bg-[#C9EFD3] text-[#1A5632] border-[#9ADBB0]'
        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
    }`;

  return (
    <>
    <Modal
      dockId="food"
      isOpen={isAddFoodOpen}
      onClose={requestClose}
      bodyKey={activeFood?.id ?? 'picker'}
      onBack={activeFood ? () => { setActiveFood(null); setEditingKey(null); } : undefined}
      footer={<WorkflowFooter
        onMore={activeFood ? handleAddAnother : undefined}
        more={language === 'it' ? 'Aggiungi altro' : 'Add more'} moreDisabled={!validAmount}
        primary={logCount <= 1 ? (language === 'it' ? 'Registra' : 'Log food') : t.foodModal.finishBatchBtn.replace('{count}', String(logCount))}
        onPrimary={handleLogNow} disabled={!logCount || Boolean(activeFood && !validAmount)}
      />}
      title={activeFood ? nameOf(activeFood) : t.foodModal.title}
      subtitle={slotLabel(targetMealSlot)}
      maxWidth="max-w-xl"
    >
      {activeFood ? (
        /* ---------- QUANTITY SELECTION ---------- */
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <FavoriteButton foodId={activeFood.id} />
          </div>

          <div className="flex items-center justify-between bg-[#C9EFD3] rounded-2xl px-4 py-3">
            <span className="text-xs font-bold tabular-nums text-[#1D5C38]">
              {activeFood.calories} kcal / 100{activeFood.unit}
            </span>
            <div className="text-right tabular-nums">
              <span className="text-2xl font-extrabold text-[#142E1F]">{portionKcal}</span>
              <span className="text-xs font-bold text-[#1D5C38] ml-1">kcal</span>
            </div>
          </div>

          <AmountSelector value={currentAmount} onChange={setCurrentAmount} unit={activeFood.unit} />

          <FoodMacroGrid food={activeFood} amount={currentAmount} />

          {otherQueued.length > 0 && (
            <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
                {t.foodModal.queuedTitle} ({otherQueued.length})
              </span>
              {otherQueued.map((q) => (
                <div
                  key={q.key}
                  className="flex items-center justify-between text-xs bg-[var(--surface)] rounded-xl px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => handleEditQueued(q)}
                    className="font-bold text-[var(--text)] hover:underline truncate pr-2 text-left"
                  >
                    {nameOf(q.food)} ({q.amount}
                    {q.food.unit})
                  </button>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="font-bold text-[var(--muted)]">{kcalOf(q.food, q.amount)} kcal</span>
                    <button
                      type="button"
                      onClick={() => removeQueued(q.key)}
                      className="pressable w-6 h-6 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                      aria-label={t.common.delete}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        /* ---------- PICK STEP ---------- */
        <div className="space-y-3.5">
          {/* Slot selector */}
          <div ref={scrollFadeX} className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {slotOptions.map(({ id: s, label }) => {
              const active = targetMealSlot === s;
              return (
                <button
                  key={s}
                  ref={active ? activeSlotRef : null}
                  type="button"
                  onClick={() => setTargetMealSlot(s)}
                  data-slot-chip
                  className={pill(active)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <PlannedMeals date={selectedDate} slot={targetMealSlot} queuedIds={queuedItems.flatMap((e) => e.planId ? [e.planId] : [])} onQueue={(plan: MealPlan) => { setQueuedItems((prev) => [...prev, ...plan.items.map(({ food, amount }, index) => ({ key: `${plan.id}-${index}-${Date.now()}`, food, amount, planId: plan.id }))]); plan.items.forEach(({ food }) => rememberFood(food)); }} />

          {/* Search + Barcode — immediately accessible without scrolling */}
          <div className="space-y-1">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  enterKeyHint="search"
                  value={searchTerm}
                  onFocus={onSearchFocus}
                  onBlur={onSearchBlur}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.foodModal.typeToSearch}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchFocused(false);
                      if (blurTimer.current) window.clearTimeout(blurTimer.current);
                    }
                  }}
                  className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-9 pr-9 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSearchFocused(false);
                      if (blurTimer.current) window.clearTimeout(blurTimer.current);
                      searchInputRef.current?.focus();
                    }}
                    className="pressable absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center"
                    aria-label={t.common.clear}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setChild('barcode')}
                className="pressable px-3.5 bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] rounded-2xl text-[var(--text)] flex items-center gap-1.5 text-xs font-bold shrink-0"
                title={t.foodModal.barcodeScan}
                aria-label={t.foodModal.barcodeScan}
              >
                <ScanBarcode size={17} />
              </button>
            </div>
            <button type="button" onClick={() => setChild('custom')} className="pressable px-3 min-h-9 inline-flex items-center gap-1.5 rounded-full bg-[var(--inset)] border border-[var(--border)] text-xs font-bold">
              <PlusCircle size={14} /> {t.foodModal.addCustomFood}
            </button>
            {trimmedQuery.length === 1 && (
              <p className="text-[11px] font-medium text-[var(--muted)] px-1">
                {t.foodModal.minCharsHint}
              </p>
            )}
          </div>

          {/* Search results: favourites pinned first (min 2 chars, fuzzy) */}
          {isSearching ? (
            <div ref={setResultsEl} className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-[var(--border)] bg-[var(--inset)] border border-[var(--border)] rounded-2xl">
              {searchResults.length === 0 && resultsPending ? (
                <div className="p-5 text-center text-xs font-medium text-[var(--muted)]" aria-live="polite">…</div>
              ) : searchResults.length === 0 ? (
                <div className="p-5 space-y-3 text-center">
                  <p className="text-xs font-medium text-[var(--muted)]">{t.foodModal.noResults}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setChild('barcode')}
                      className="pressable px-3.5 py-2 rounded-full bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183F66] text-xs font-extrabold flex items-center gap-1.5"
                    >
                      <ScanBarcode size={14} />
                      {t.foodModal.orBarcode}
                    </button>
                  </div>
                </div>
              ) : (
                searchResults.map((res) =>
                  res.kind === 'meal' ? (
                    <button
                      key={res.m.id}
                      type="button"
                      onClick={() => queueMeal(res.m)}
                      className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--hover)] active:bg-[var(--border)] transition-colors"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[#FAE0B4] text-[#7D4E14] flex items-center justify-center shrink-0">
                          <UtensilsCrossed size={13} />
                        </span>
                        <span className="min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate block">
                            {res.m.name}
                          </span>
                          <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14]">
                            {t.prebuilt.title}
                            {res.m.slot ? ` · ${slotLabel(res.m.slot)}` : ''}
                          </span>
                        </span>
                      </span>
                      <span className="text-xs font-extrabold tabular-nums text-[var(--text)] shrink-0">
                        {Math.round(
                          res.m.ingredients.reduce((s, ing) => {
                            const f = allFoods.find((x) => x.id === ing.foodId);
                            return s + (f ? (f.calories * ing.amount) / 100 : 0);
                          }, 0)
                        )}{' '}
                        kcal
                      </span>
                    </button>
                  ) : (
                    <FoodResultRow
                      key={res.f.id}
                      food={res.f}
                      onClick={() => handlePickFood(res.f)}
                      favorite
                    />
                  )
                )
              )}
            </div>
          ) : trimmedQuery.length === 1 && oneCharMatches.length > 0 ? (
            favoritesPanel(oneCharMatches)
          ) : (
            <>
              {/* Favourites: shown while the field is focused, with a hint when still empty */}
              {showFavoritesPanel && (
                favoriteItems.length > 0 ? (
                  favoritesPanel(favoriteItems)
                ) : (
                  <p className="text-[11px] font-medium text-[var(--muted)] px-1">{t.favorites.empty}</p>
                )
              )}

              {/* 3 Quick food shortcuts (salt / bread / olive oil — configurable in settings); shared with the ingredient picker */}
              <QuickFoodButtons foods={quickFoods} nameOf={nameOf} onPick={handlePickFood} />

              {/* Saved meals tagged for this slot */}
              {slotMeals.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] px-1 block">
                    {t.foodModal.savedMeals}
                  </span>
                  <div className="space-y-1.5">
                    {slotMeals.map((m) => {
                      const kcal = Math.round(
                        m.ingredients.reduce((s, ing) => {
                          const f = allFoods.find((x) => x.id === ing.foodId);
                          return s + (f ? (f.calories * ing.amount) / 100 : 0);
                        }, 0)
                      );
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => queueMeal(m)}
                          className="pressable w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[#FAE0B4] hover:bg-[#F7D69E] text-left"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <UtensilsCrossed size={14} className="text-[#7D4E14] shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-[#2D1E0B] truncate">{m.name}</span>
                          </span>
                          <span className="text-xs font-extrabold tabular-nums text-[#7D4E14] shrink-0">{kcal} kcal</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent items in this slot (last 7 days): 5, then "..." for 10 more */}
              {recentItems.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] px-1 block">
                    {t.foodModal.recentItems}
                  </span>
                  <RecentChips
                    items={recentItems}
                    getKey={(f) => f.id}
                    toggleClassName={RECENT_CHIP_CLASS}
                    renderChip={(f) => (
                      <button type="button" onClick={() => handlePickFood(f)} className={RECENT_CHIP_CLASS}>
                        {nameOf(f)}
                      </button>
                    )}
                  />
                </div>
              )}

              {/* Whole-slot quick copy from previous days */}
              {previousMeals.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] px-1 block">
                    {t.foodModal.previousDays}
                  </span>
                  <div className="space-y-1.5">
                    {previousMeals.slice(0, 3).map((p) => {
                      const prevKcal = calculateTotalCalories(p.items);
                      return (
                        <button
                          key={p.date}
                          type="button"
                          onClick={() => queueLoggedItems(p.items)}
                          className="pressable w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[#CFE7FE] hover:bg-[#BDDDFC] text-left"
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <History size={14} className="text-[#1A4670] shrink-0" />
                            <span className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-[#183B5E] block">
                                {formatDateDisplay(p.date, language)}
                              </span>
                              <span className="text-[11px] font-medium text-[#396088] truncate block">
                                {p.items.map((i) => i.name).join(', ')}
                              </span>
                            </span>
                          </span>
                          <span className="text-xs font-extrabold tabular-nums text-[#183B5E] shrink-0">
                            {prevKcal} kcal
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Queued summary & one-tap log button */}
          {queuedItems.length > 0 && (
            <div className="pt-1 space-y-2 border-t border-[var(--border)]">
              <div className="flex flex-wrap gap-1.5">
                {queuedItems.map((q) => (
                  <span
                    key={q.key}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-[var(--inset)] border border-[var(--border)] text-xs font-bold text-[var(--text)]"
                  >
                    <button
                      type="button"
                      onClick={() => handleEditQueued(q)}
                      className="truncate max-w-[150px] hover:underline"
                    >
                      {nameOf(q.food)} · {q.amount}{q.food.unit}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQueued(q.key)}
                      className="w-5 h-5 rounded-full text-[var(--muted)] hover:text-[#8C2D32] flex items-center justify-center"
                      aria-label={t.common.delete}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {settings.inlineMealNotes && <div className="mt-4"><MealNoteField value={mealNote} onChange={(value) => setNoteDrafts((prev) => ({ ...prev, [noteKey]: value }))} /></div>}
    </Modal>
    {child === 'barcode' && <React.Suspense fallback={null}><BarcodeLookupModal onReturn={() => setChild(null)} onPick={handlePickFood} /></React.Suspense>}
    {child === 'custom' && <CustomFoodModal onReturn={() => setChild(null)} onPick={handlePickFood} />}
    <SaveBeforeCloseDialog
      open={confirmCloseOpen && isAddFoodOpen}
      onSave={handleLogNow}
      onDiscard={close}
      onKeepEditing={() => setConfirmCloseOpen(false)}
      detail={`${queuedItems.length + (activeFood && currentAmount > 0 ? 1 : 0)} ${language === 'it' ? 'alimenti' : 'foods'}`}
    />
    </>
  );
};
