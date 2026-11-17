import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { FoodItem, LoggedFoodItem, MealSlotId } from '../../types';
import { getLastAmount, setLastAmount } from '../../utils/amountMemory';
import { calculateTotalCalories } from '../../utils/calculations';
import { addDaysToDateString, formatDateDisplay } from '../../utils/formatters';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
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
} from 'lucide-react';

interface QueuedEntry {
  key: string;
  food: FoodItem;
  amount: number;
}

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
    setIsCustomFoodOpen,
    t,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [currentAmount, setCurrentAmount] = useState<number>(100);
  const [queuedItems, setQueuedItems] = useState<QueuedEntry[]>([]);

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

  // Search results: only shown while typing, fuzzy matched.
  // Includes individual foods AND saved meals / recipes (whole-meal quick add).
  const searchResults = useMemo(() => {
    const q = searchTerm.trim();
    if (q.length < 2) return [];
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
    return [...meals, ...foods].sort((a, b) => a.score - b.score).slice(0, 30);
  }, [allFoods, preBuiltMeals, searchTerm]);

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
  };

  const handlePickFood = (food: FoodItem) => {
    setActiveFood(food);
    setCurrentAmount(getLastAmount(food.id));
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

  const slots: MealSlotId[] = [
    'breakfast',
    'mid_morning',
    'lunch',
    'midday_snack',
    'dinner',
    'extra',
  ];

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
      active
        ? 'bg-[#C9EFD3] text-[#1A5632] border-[#9ADBB0]'
        : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--text)]'
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
          <button
            type="button"
            onClick={() => {
              setActiveFood(null);
                      }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft size={14} />
            <span>{t.common.back}</span>
          </button>

          <div className="flex items-center justify-between bg-[var(--inset)] rounded-2xl px-4 py-3">
            <span className="text-xs font-bold text-[var(--muted)]">
              {activeFood.calories} kcal / 100{activeFood.unit}
            </span>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-[#1A5632]">{preview.kcal}</span>
              <span className="text-xs font-bold text-[#25633E] ml-1">kcal</span>
            </div>
          </div>

          <AmountSelector value={currentAmount} onChange={setCurrentAmount} unit={activeFood.unit} />

          <div className="grid grid-cols-5 gap-1.5 text-center">
            {(
              [
                ['C', preview.carbs, 'bg-[#FAE0B4] text-[#7D4E14]'],
                ['P', preview.protein, 'bg-[#F6D0D0] text-[#7A2727]'],
                ['F', preview.fat, 'bg-[#E2D6FF] text-[#4D3582]'],
                [t.macros.fiber, preview.fiber, 'bg-[var(--inset)] text-[var(--muted)]'],
                [t.macros.salt, preview.salt, 'bg-[var(--inset)] text-[var(--muted)]'],
              ] as const
            ).map(([label, val, cls]) => (
              <div key={label} className={`rounded-2xl p-2 ${cls}`}>
                <span className="text-[10px] font-bold uppercase block opacity-80">{label}</span>
                <span className="text-xs font-extrabold">{val ?? '—'}g</span>
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
                  className="flex items-center justify-between text-xs bg-[var(--surface)] rounded-xl px-3 py-1.5"
                >
                  <span className="font-bold text-[var(--text)] truncate pr-2">
                    {nameOf(q.food)} ({q.amount}
                    {q.food.unit})
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-[var(--muted)]">{kcalOf(q.food, q.amount)} kcal</span>
                    <button
                      type="button"
                      onClick={() => removeQueued(q.key)}
                      className="text-[#8C2D32] hover:opacity-75"
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
              className="w-full py-3 px-4 bg-[var(--inset)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text)] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-colors disabled:opacity-40"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{t.foodModal.addAnotherBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleLogNow}
              disabled={currentAmount <= 0 && queuedItems.length === 0}
              className="w-full py-3 px-4 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-colors disabled:opacity-40"
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
            {slots.map((s) => (
              <button key={s} type="button" onClick={() => setTargetMealSlot(s)} className={pill(targetMealSlot === s)}>
                {t.mealSlots[s]}
              </button>
            ))}
          </div>

          {/* Quick food shortcuts (salt / bread / olive oil — configurable in settings) */}
          <div className="grid grid-cols-3 gap-2">
            {quickFoods.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handlePickFood(f)}
                className="py-2.5 px-2 rounded-2xl bg-[var(--inset)] hover:bg-[var(--border)] text-center transition-colors"
              >
                <span className="block text-xs font-extrabold text-[var(--text)] truncate">
                  {nameOf(f)}
                </span>
                <span className="block text-[10px] font-bold text-[var(--muted)]">
                  {f.calories} kcal/100{f.unit}
                </span>
              </button>
            ))}
          </div>

          {/* Saved meals for this slot */}
          {slotMeals.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] px-1">
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
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#FAE0B4]/60 hover:bg-[#FAE0B4] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <UtensilsCrossed size={14} className="text-[#7D4E14] shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-[#2D1E0B] truncate">{m.name}</span>
                      </span>
                      <span className="text-xs font-extrabold text-[#7D4E14] shrink-0">{kcal} kcal</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent items in this slot (last 7 days) */}
          {recentItems.length > 0 && !searchTerm && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] px-1">
                {t.foodModal.recentItems}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recentItems.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handlePickFood(f)}
                    className="px-3 py-1.5 rounded-full bg-[var(--inset)] hover:bg-[var(--border)] text-xs font-bold text-[var(--text)] transition-colors"
                  >
                    {nameOf(f)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Whole-day quick copy from previous days */}
          {!searchTerm && previousMeals.length > 0 && (
            <div className="space-y-1.5">
              {previousMeals.slice(0, 3).map((p) => (
                <button
                  key={p.date}
                  type="button"
                  onClick={() => {
                    logItemsToSlot(targetMealSlot, p.items);
                    close();
                  }}
                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#CFE7FE]/60 hover:bg-[#CFE7FE] text-left transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <History size={14} className="text-[#1A4670] shrink-0" />
                    <span className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[#183B5E] block">
                        {formatDateDisplay(p.date, language)}
                      </span>
                      <span className="text-[11px] font-medium text-[#436B94] truncate block">
                        {p.items.map((i) => i.name).join(', ')}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs font-extrabold text-[#183B5E] shrink-0">
                    {calculateTotalCalories(p.items)} kcal
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Search — results appear only while typing (fuzzy) */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.foodModal.typeToSearch}
                className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-9 pr-3 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddFoodOpen(false);
                setIsBarcodeOpen(true);
              }}
              className="px-3.5 bg-[var(--inset)] hover:bg-[var(--border)] border border-[var(--border)] rounded-2xl text-[var(--text)] flex items-center gap-1.5 text-xs font-bold"
              title={t.foodModal.barcodeScan}
            >
              <ScanBarcode size={17} />
            </button>
          </div>

          {searchTerm.trim().length >= 2 && (
            <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border)] bg-[var(--inset)] border border-[var(--border)] rounded-2xl">
              {searchResults.length === 0 ? (
                <div className="p-4 space-y-2.5 text-center">
                  <p className="text-xs text-[var(--muted)]">{t.foodModal.noResults}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFoodOpen(false);
                        setIsCustomFoodOpen(true);
                      }}
                      className="px-3 py-2 rounded-full bg-[#C9EFD3] text-[#174A2B] text-xs font-extrabold flex items-center gap-1"
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
                      className="px-3 py-2 rounded-full bg-[#CFE7FE] text-[#183F66] text-xs font-extrabold flex items-center gap-1"
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
                      className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--border)] transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <UtensilsCrossed size={14} className="text-[#7D4E14] shrink-0" />
                        <span className="min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate block">
                            {res.m.name}
                          </span>
                          <span className="text-[10px] font-bold text-[#7D4E14]">
                            {t.prebuilt.savedAsRecipe}
                            {res.m.slot ? ` · ${t.mealSlots[res.m.slot]}` : ''}
                          </span>
                        </span>
                      </span>
                      <span className="text-xs font-extrabold text-[var(--muted)] shrink-0">
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
                    <button
                      key={res.f.id}
                      type="button"
                      onClick={() => handlePickFood(res.f)}
                      className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--border)] transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate block">
                          {nameOf(res.f)}
                          {res.f.isRecipe && (
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E2D6FF] text-[#4D3582] align-middle">
                              {t.prebuilt.savedAsRecipe}
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] font-medium text-[var(--muted)]">
                          {getLastAmount(res.f.id)}
                          {res.f.unit}
                        </span>
                      </span>
                      <span className="text-xs font-extrabold text-[var(--muted)] shrink-0">
                        {res.f.calories} kcal/100{res.f.unit}
                      </span>
                    </button>
                  )
                )
              )}
            </div>
          )}

          {/* Queued banner */}
          {queuedItems.length > 0 && (
            <button
              type="button"
              onClick={handleLogNow}
              className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
            >
              <Check size={17} strokeWidth={2.5} />
              <span>
                {t.foodModal.finishBatchBtn.replace('{count}', String(queuedItems.length))} ·{' '}
                {queuedTotalKcal} kcal
              </span>
            </button>
          )}
        </div>
      )}
    </Modal>
  );
};
