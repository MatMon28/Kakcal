import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { FoodItem, LoggedFoodItem, MealSlotId } from '../../types';
import { getLastAmount, setLastAmount } from '../../utils/amountMemory';
import { calculateTotalCalories } from '../../utils/calculations';
import { addDaysToDateString, formatDateDisplay } from '../../utils/formatters';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
import { matchesFirstChar, sortFavoritesFirst } from '../../utils/favorites';
import { FavoriteButton } from '../common/FavoriteButton';
import {
  Search,
  ScanBarcode,
  ArrowLeft,
  UtensilsCrossed,
  History,
  Check,
  Trash2,
  Plus,
  PlusCircle,
  X,
} from 'lucide-react';

interface QueuedEntry {
  key: string;
  food: FoodItem;
  amount: number;
}

const SLOTS: MealSlotId[] = [
  'breakfast',
  'mid_morning',
  'lunch',
  'midday_snack',
  'dinner',
  'extra',
];

export const AddFoodModal: React.FC = () => {
  const {
    isAddFoodOpen,
    setIsAddFoodOpen,
    targetMealSlot,
    setTargetMealSlot,
    allFoods,
    language,
    setIsBarcodeOpen,
    preBuiltMeals,
    logPreBuiltMealToSlot,
    logItemsToSlot,
    allDayLogs,
    selectedDate,
    settings,
    favoriteFoods,
    setIsCustomFoodOpen,
    t,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [currentAmount, setCurrentAmount] = useState<number>(100);
  const [queuedItems, setQueuedItems] = useState<QueuedEntry[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const activeSlotRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const blurTimer = useRef<number | null>(null);

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

  // Favourite foods: shown as the whole list while the field is focused and empty,
  // matching the first character as soon as typing starts, and pinned to the top later.
  const favoriteIds = favoriteFoods ?? [];
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
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = trimmedQuery;
    const foods = allFoods
      .map((f) => ({
        kind: 'food' as const,
        f,
        score: Math.min(
          fuzzyScore(q, f.name_de),
          fuzzyScore(q, f.name_it),
          fuzzyScore(q, f.name_en),
          ...(f.brand ? [fuzzyScore(q, f.brand)] : [])
        ),
      }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']));
    const meals = preBuiltMeals
      .map((m) => ({ kind: 'meal' as const, m, score: fuzzyScore(q, m.name) }))
      .filter((x) => fuzzyMatch(q, [x.m.name]));
    const ranked = [...meals, ...foods].sort((a, b) => a.score - b.score);
    return sortFavoritesFirst(ranked, favoriteIds, (r) => (r.kind === 'food' ? r.f.id : '')).slice(0, 30);
  }, [allFoods, preBuiltMeals, trimmedQuery, isSearching, favoriteIds]);

  // Saved meals tagged for this slot
  const slotMeals = useMemo(
    () => preBuiltMeals.filter((m) => m.slot === targetMealSlot),
    [preBuiltMeals, targetMealSlot]
  );

  // Recent foods/recipes logged in this slot over the last 7 days, up to 20
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
    return [...seen.values()].slice(0, 20);
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
    setIsAddFoodOpen(false);
    setActiveFood(null);
    setQueuedItems([]);
    setSearchTerm('');
    setSearchFocused(false);
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  };

  const handlePickFood = (food: FoodItem) => {
    setActiveFood(food);
    setCurrentAmount(getLastAmount(food.id));
  };

  const handleEditQueued = (entry: QueuedEntry) => {
    setQueuedItems((prev) => prev.filter((q) => q.key !== entry.key));
    setActiveFood(entry.food);
    setCurrentAmount(entry.amount);
  };

  const handleAddAnother = () => {
    if (!activeFood || currentAmount <= 0) return;
    setLastAmount(activeFood.id, currentAmount);
    setQueuedItems((prev) => [
      ...prev,
      { key: `${activeFood.id}-${Date.now()}`, food: activeFood, amount: currentAmount },
    ]);
    setActiveFood(null);
    setSearchTerm('');
  };

  const handleLogNow = () => {
    const finalEntries: QueuedEntry[] = [...queuedItems];
    if (activeFood && currentAmount > 0) {
      setLastAmount(activeFood.id, currentAmount);
      finalEntries.push({
        key: `${activeFood.id}-${Date.now()}`,
        food: activeFood,
        amount: currentAmount,
      });
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
      loggedAt: '',
    }));

    logItemsToSlot(targetMealSlot, toLog);
    close();
  };

  const removeQueued = (key: string) =>
    setQueuedItems((prev) => prev.filter((item) => item.key !== key));

  const preview = useMemo(() => {
    if (!activeFood) return null;
    const k = (currentAmount || 0) / 100;
    const r = (v: number | null, d = 10) => (v !== null ? Math.round(v * k * d) / d : null);
    return {
      kcal: Math.round(activeFood.calories * k),
      carbs: r(activeFood.carbs),
      protein: r(activeFood.protein),
      fat: r(activeFood.fat),
      fiber: r(activeFood.fiber),
      salt: r(activeFood.salt, 100),
    };
  }, [activeFood, currentAmount]);

  const queuedTotalKcal = queuedItems.reduce((s, e) => s + kcalOf(e.food, e.amount), 0);

  // Shared result row: whole row picks the food, the star toggles favourites.
  const FoodRow: React.FC<{ food: FoodItem; onClick: () => void }> = ({ food, onClick }) => (
    <div className="flex items-center gap-2 p-3 hover:bg-[var(--hover)] active:bg-[var(--border)] transition-colors">
      <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
        <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate block">
          {nameOf(food)}
          {food.isRecipe && (
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E2D6FF] text-[#4D3582] align-middle">
              {t.prebuilt.savedAsRecipe}
            </span>
          )}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-[var(--muted)]">
          {getLastAmount(food.id)}
          {food.unit}
          {food.brand ? ` · ${food.brand}` : ''}
        </span>
      </button>
      <span className="text-xs font-extrabold tabular-nums text-[var(--muted)] shrink-0">
        {food.calories} kcal/100{food.unit}
      </span>
      <FavoriteButton foodId={food.id} />
    </div>
  );

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
        <div ref={resultsRef} className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-[var(--border)]">
          {items.map((f) => (
            <FoodRow key={f.id} food={f} onClick={() => handlePickFood(f)} />
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
    <Modal
      isOpen={isAddFoodOpen}
      onClose={close}
      title={activeFood ? nameOf(activeFood) : t.foodModal.title}
      subtitle={t.mealSlots[targetMealSlot]}
      maxWidth="max-w-xl"
    >
      {activeFood && preview ? (
        /* ---------- QUANTITY SELECTION ---------- */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveFood(null)}
              className="pressable inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              <span>{t.common.back}</span>
            </button>
            <FavoriteButton foodId={activeFood.id} />
          </div>

          <div className="flex items-center justify-between bg-[#C9EFD3] rounded-2xl px-4 py-3">
            <span className="text-xs font-bold tabular-nums text-[#1D5C38]">
              {activeFood.calories} kcal / 100{activeFood.unit}
            </span>
            <div className="text-right tabular-nums">
              <span className="text-2xl font-extrabold text-[#142E1F]">{preview.kcal}</span>
              <span className="text-xs font-bold text-[#1D5C38] ml-1">kcal</span>
            </div>
          </div>

          <AmountSelector value={currentAmount} onChange={setCurrentAmount} unit={activeFood.unit} />

          <div className="grid grid-cols-5 gap-1.5 text-center tabular-nums">
            {(
              [
                ['C', preview.carbs, 'bg-[#CFE7FE] text-[#1A4670]'],
                ['P', preview.protein, 'bg-[#FAE0B4] text-[#7D4E14]'],
                ['F', preview.fat, 'bg-[#E2D6FF] text-[#4D3582]'],
                [t.macros.fiber, preview.fiber, 'bg-[var(--inset)] text-[var(--muted)]'],
                [t.macros.salt, preview.salt, 'bg-[var(--inset)] text-[var(--muted)]'],
              ] as const
            ).map(([label, val, cls]) => (
              <div key={label} className={`rounded-2xl p-2 ${cls}`}>
                <span className="text-[10px] font-bold uppercase block opacity-80 truncate">{label}</span>
                <span className="text-xs font-extrabold">{val !== null ? `${val}g` : '—'}</span>
              </div>
            ))}
          </div>

          {queuedItems.length > 0 && (
            <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
                {t.foodModal.queuedTitle} ({queuedItems.length})
              </span>
              {queuedItems.map((q) => (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleAddAnother}
              disabled={currentAmount <= 0}
              className="pressable w-full py-3 px-4 bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm disabled:opacity-40"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{t.foodModal.addAnotherBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleLogNow}
              disabled={currentAmount <= 0 && queuedItems.length === 0}
              className="pressable w-full py-3 px-4 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm tabular-nums disabled:opacity-40"
            >
              <Check size={17} strokeWidth={2.5} />
              <span>
                {queuedItems.length > 0
                  ? `${t.foodModal.finishBatchBtn.replace('{count}', String(queuedItems.length + 1))} · ${queuedTotalKcal + preview.kcal} kcal`
                  : `${t.foodModal.addBtn} · ${preview.kcal} kcal`}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* ---------- PICK STEP ---------- */
        <div className="space-y-3.5">
          {/* Slot selector */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {SLOTS.map((s) => {
              const active = targetMealSlot === s;
              return (
                <button
                  key={s}
                  ref={active ? activeSlotRef : null}
                  type="button"
                  onClick={() => setTargetMealSlot(s)}
                  className={pill(active)}
                >
                  {t.mealSlots[s]}
                </button>
              );
            })}
          </div>

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
                onClick={() => {
                  setIsAddFoodOpen(false);
                  setIsBarcodeOpen(true);
                }}
                className="pressable px-3.5 bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] rounded-2xl text-[var(--text)] flex items-center gap-1.5 text-xs font-bold shrink-0"
                title={t.foodModal.barcodeScan}
                aria-label={t.foodModal.barcodeScan}
              >
                <ScanBarcode size={17} />
              </button>
            </div>
            {trimmedQuery.length === 1 && (
              <p className="text-[11px] font-medium text-[var(--muted)] px-1">
                {t.foodModal.minCharsHint}
              </p>
            )}
          </div>

          {/* Search results: favourites pinned first (min 2 chars, fuzzy) */}
          {isSearching ? (
            <div ref={resultsRef} className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-[var(--border)] bg-[var(--inset)] border border-[var(--border)] rounded-2xl">
              {searchResults.length === 0 ? (
                <div className="p-5 space-y-3 text-center">
                  <p className="text-xs font-medium text-[var(--muted)]">{t.foodModal.noResults}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFoodOpen(false);
                        setIsCustomFoodOpen(true);
                      }}
                      className="pressable px-3.5 py-2 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-xs font-extrabold flex items-center gap-1.5"
                    >
                      <PlusCircle size={14} />
                      {t.foodModal.addCustomFood}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFoodOpen(false);
                        setIsBarcodeOpen(true);
                      }}
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
                      onClick={() => {
                        logPreBuiltMealToSlot(res.m.id, targetMealSlot);
                        close();
                      }}
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
                            {res.m.slot ? ` · ${t.mealSlots[res.m.slot]}` : ''}
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
                    <FoodRow
                      key={res.f.id}
                      food={res.f}
                      onClick={() => handlePickFood(res.f)}
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

              {/* 3 Quick food shortcuts (salt / bread / olive oil — configurable in settings) */}
              {quickFoods.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {quickFoods.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handlePickFood(f)}
                      className="pressable py-2.5 px-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-center"
                    >
                      <span className="block text-xs font-extrabold text-[var(--text)] truncate">
                        {nameOf(f)}
                      </span>
                      <span className="block text-[10px] font-bold tabular-nums text-[var(--muted)] mt-0.5">
                        {f.calories} kcal/100{f.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}

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
                          onClick={() => {
                            logPreBuiltMealToSlot(m.id, targetMealSlot);
                            close();
                          }}
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

              {/* Recent items in this slot (last 7 days, up to 20) */}
              {recentItems.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] px-1 block">
                    {t.foodModal.recentItems}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {recentItems.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handlePickFood(f)}
                        className="pressable px-3 py-1.5 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-bold text-[var(--text)]"
                      >
                        {nameOf(f)}
                      </button>
                    ))}
                  </div>
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
                          onClick={() => {
                            logItemsToSlot(targetMealSlot, p.items);
                            close();
                          }}
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
              <button
                type="button"
                onClick={handleLogNow}
                className="pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums"
              >
                <Check size={17} strokeWidth={2.5} />
                <span>
                  {t.foodModal.finishBatchBtn.replace('{count}', String(queuedItems.length))} ·{' '}
                  {queuedTotalKcal} kcal
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
