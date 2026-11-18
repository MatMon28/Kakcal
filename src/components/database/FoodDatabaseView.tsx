import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { FOOD_CATEGORIES } from '../../data/foodCategories';
import { FoodCategory, FoodItem, MealSlotId } from '../../types';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { getLastAmount, setLastAmount } from '../../utils/amountMemory';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
import { sortFavoritesFirst } from '../../utils/favorites';
import { FavoriteButton } from '../common/FavoriteButton';
import {
  BookOpen,
  Search,
  Plus,
  Egg,
  Fish,
  Croissant,
  Apple,
  Carrot,
  Wheat,
  Cookie,
  Coffee,
  Droplet,
  Utensils,
  Check,
  ScanBarcode,
  ArrowLeft,
  Trash2,
  Sparkles,
  X,
  Star,
  Bean,
  Nut,
  Soup,
  CakeSlice,
  ExternalLink,
} from 'lucide-react';

const PAGE_STEP = 100;
const categoryIcons: Record<FoodCategory, typeof Egg> = {
  dairy: Egg, meat_fish: Fish, bakery: Croissant, produce_fruit: Apple,
  produce_veg: Carrot, grains_pasta: Wheat, legumes: Bean, nuts_seeds: Nut,
  snacks_sweets: Cookie, desserts: CakeSlice, drinks: Coffee,
  condiments_oils: Droplet, prepared: Utensils, soups: Soup,
};

export const FoodDatabaseView: React.FC = () => {
  const {
    allFoods,
    deleteCustomFood,
    logFoodItem,
    targetMealSlot,
    setIsBarcodeOpen,
    setIsCustomFoodOpen,
    returnFromDatabase,
    favoriteFoods,
    language,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all' | 'custom' | 'favorites'>('all');
  const [visibleLimit, setVisibleLimit] = useState<number>(PAGE_STEP);
  const [searchFocused, setSearchFocused] = useState(false);
  const blurTimer = useRef<number | null>(null);

  // Quick log modal
  const [foodToLog, setFoodToLog] = useState<FoodItem | null>(null);
  const [logSlot, setLogSlot] = useState<MealSlotId>(targetMealSlot);
  const [logAmount, setLogAmount] = useState<number>(100);

  useEffect(() => {
    setVisibleLimit(PAGE_STEP);
  }, [search, selectedCategory]);

  useEffect(() => () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  }, []);

  const favoriteIds = favoriteFoods ?? [];
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const hasCustomFoods = useMemo(() => allFoods.some((f) => f.isCustom), [allFoods]);

  const filteredFoods = useMemo(() => {
    const q = search.trim();
    const matched = allFoods.filter((f) => {
      const matchCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'custom'
          ? Boolean(f.isCustom)
          : selectedCategory === 'favorites'
          ? favoriteSet.has(f.id)
          : f.category === selectedCategory;
      if (!matchCategory) return false;
      if (!q) return true;
      return fuzzyMatch(q, [f.name_de, f.name_it, f.name_en, f.brand || '']);
    });

    // Focusing the field with no query narrows the catalog to favourites only.
    if (!q) {
      return searchFocused && selectedCategory === 'all'
        ? matched.filter((f) => favoriteSet.has(f.id))
        : matched;
    }

    return sortFavoritesFirst(
      matched
        .map((f) => ({
          f,
          score: Math.min(
            fuzzyScore(q, f.name_en),
            fuzzyScore(q, f.name_it),
            fuzzyScore(q, f.name_de),
            ...(f.brand ? [fuzzyScore(q, f.brand)] : [])
          ),
        }))
        .sort((a, b) => a.score - b.score)
        .map((x) => x.f),
      favoriteIds,
      (f) => f.id
    );
  }, [allFoods, search, selectedCategory, searchFocused, favoriteIds, favoriteSet]);

  const handleConfirmQuickLog = () => {
    if (!foodToLog) return;
    const finalAmount = logAmount > 0 ? logAmount : 100;
    setLastAmount(foodToLog.id, finalAmount);
    logFoodItem(logSlot, foodToLog, finalAmount);
    setFoodToLog(null);
  };

  const mealSlots: { id: MealSlotId; label: string }[] = [
    { id: 'breakfast', label: t.mealSlots.breakfast },
    { id: 'mid_morning', label: t.mealSlots.mid_morning },
    { id: 'lunch', label: t.mealSlots.lunch },
    { id: 'midday_snack', label: t.mealSlots.midday_snack },
    { id: 'dinner', label: t.mealSlots.dinner },
    { id: 'extra', label: t.mealSlots.extra },
  ];

  const remaining = Math.max(0, filteredFoods.length - visibleLimit);

  return (
    <div className="space-y-4">
      {/* Header with Back button */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={returnFromDatabase}
            className="pressable w-9 h-9 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center shrink-0"
            title={t.common.back}
            aria-label={t.common.back}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#C9EFD3] text-[#1A5632] flex items-center justify-center shrink-0">
            <BookOpen size={17} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text)]">
              {t.database.title}
            </h2>
            <span className="text-xs font-medium tabular-nums text-[var(--muted)]">
              {t.database.itemsCount.replace('{count}', String(filteredFoods.length))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBarcodeOpen(true)}
            className="pressable px-3.5 py-2.5 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-bold text-xs flex items-center gap-1.5"
            title={t.prebuilt.barcode}
          >
            <ScanBarcode size={15} />
            <span className="hidden sm:inline">{t.prebuilt.barcode}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomFoodOpen(true)}
            className="pressable px-4 py-2.5 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center gap-1.5"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{t.database.createCustom}</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
          />
          <input
            type="text"
            enterKeyHint="search"
            aria-label={t.database.searchPlaceholder}
            value={search}
            onFocus={() => {
              if (blurTimer.current) window.clearTimeout(blurTimer.current);
              setSearchFocused(true);
            }}
            onBlur={() => {
              if (blurTimer.current) window.clearTimeout(blurTimer.current);
              blurTimer.current = window.setTimeout(() => setSearchFocused(false), 140);
            }}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.database.searchPlaceholder}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-10 pr-9 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-sm font-medium focus:outline-none focus:border-[var(--muted)] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchFocused(false);
                if (blurTimer.current) window.clearTimeout(blurTimer.current);
              }}
              className="pressable absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
              aria-label={t.common.clear}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs" data-no-swipe>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            aria-pressed={selectedCategory === 'all'}
            className={`pressable px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#C9EFD3] text-[#174A2B]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {t.database.allCategories}
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'favorites' ? 'all' : 'favorites')}
            aria-pressed={selectedCategory === 'favorites'}
            className={`pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
              selectedCategory === 'favorites'
                ? 'bg-[#FAE0B4] text-[#B45309]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Star size={13} fill={selectedCategory === 'favorites' ? 'currentColor' : 'none'} />
            <span>{t.database.favoriteFilter}</span>
          </button>

          {hasCustomFoods && (
            <button
              type="button"
              onClick={() => setSelectedCategory('custom')}
              aria-pressed={selectedCategory === 'custom'}
              className={`pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
                selectedCategory === 'custom'
                  ? 'bg-[#E2D6FF] text-[#4D3582]'
                  : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Sparkles size={13} />
              <span>{t.database.customFilter}</span>
            </button>
          )}

          {FOOD_CATEGORIES.map((cat) => {
            const Icon = categoryIcons[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className={`pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#C9EFD3] text-[#174A2B]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={13} />
                <span>{t.categories[cat]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Foods Grid */}
      {filteredFoods.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 text-center space-y-3">
          <p className="text-sm font-bold text-[var(--muted)]">
            {selectedCategory === 'favorites' || (searchFocused && !search.trim())
              ? t.favorites.empty
              : t.foodModal.noResults}
          </p>
          <button
            type="button"
            onClick={() => setIsCustomFoodOpen(true)}
            className="pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-xs font-extrabold"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>{t.database.createCustom}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFoods.slice(0, visibleLimit).map((food) => {
            const CategoryIcon = categoryIcons[food.category] ?? Utensils;
            const primaryName =
              language === 'it' ? food.name_it : food.name_en || food.name_de;
            const secondaryRaw = language === 'it' ? food.name_en || food.name_de : food.name_it;
            const secondaryName = secondaryRaw !== primaryName ? secondaryRaw : food.brand;

            return (
              <div
                key={food.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <CategoryIcon size={17} className="text-[var(--muted)] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-extrabold text-[var(--text)] truncate">
                            {primaryName}
                          </h4>
                          {food.isRecipe && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E2D6FF] text-[#4D3582]">
                              {t.prebuilt.savedAsRecipe}
                            </span>
                          )}
                        </div>
                        {secondaryName && (
                          <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                            {secondaryName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <span className="text-base font-extrabold text-[var(--text)]">
                        {food.calories}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--muted)] ml-0.5">
                        kcal
                      </span>
                    </div>
                  </div>

                  {/* Macros per 100g */}
                  <div className="grid grid-cols-5 gap-1.5 pt-3 text-center tabular-nums">
                    <div className="bg-[#FAE0B4] p-1.5 rounded-2xl text-[#7D4E14]">
                      <span className="text-[10px] font-bold block">C</span>
                      <span className="text-xs font-extrabold">
                        {food.carbs !== null ? `${food.carbs}g` : '—'}
                      </span>
                    </div>
                    <div className="bg-[#F6D0D0] p-1.5 rounded-2xl text-[#7A2727]">
                      <span className="text-[10px] font-bold block">P</span>
                      <span className="text-xs font-extrabold">
                        {food.protein !== null ? `${food.protein}g` : '—'}
                      </span>
                    </div>
                    <div className="bg-[#E2D6FF] p-1.5 rounded-2xl text-[#4D3582]">
                      <span className="text-[10px] font-bold block">F</span>
                      <span className="text-xs font-extrabold">
                        {food.fat !== null ? `${food.fat}g` : '—'}
                      </span>
                    </div>
                    <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]">
                      <span className="text-[10px] font-bold block">{t.macros.fiber}</span>
                      <span className="text-xs font-extrabold">
                        {food.fiber !== null ? `${food.fiber}g` : '—'}
                      </span>
                    </div>
                    <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]">
                      <span className="text-[10px] font-bold block">{t.macros.salt}</span>
                      <span className="text-xs font-extrabold">
                        {food.salt !== null ? `${food.salt}g` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
                  <div className="min-w-0 space-y-0.5 text-[11px] font-medium text-[var(--muted)]">
                    <p className="truncate">100{food.unit} · {t.categories[food.category]}</p>
                    {food.source?.url?.startsWith('https://') && (
                      <a href={food.source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 underline decoration-current/35 underline-offset-2 hover:text-[var(--text)]" aria-label={`${t.database.foodSource}: ${food.source.label}`}>
                        <span className="truncate">{food.source.label}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <FavoriteButton foodId={food.id} variant="card" />
                    {food.isCustom && (
                      <button
                        type="button"
                        onClick={() => deleteCustomFood(food.id)}
                        className="pressable w-7 h-7 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                        title={t.common.delete}
                        aria-label={t.common.delete}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFoodToLog(food);
                        setLogSlot(targetMealSlot);
                        setLogAmount(getLastAmount(food.id));
                      }}
                      className="pressable px-3.5 py-1.5 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-xs font-extrabold flex items-center gap-1"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>{t.mealSlots.addItem}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleLimit((v) => v + PAGE_STEP)}
          className="pressable w-full py-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold tabular-nums text-[var(--text)]"
        >
          {t.database.showMore.replace('{count}', String(remaining))}
        </button>
      )}

      {/* Quick Log Modal */}
      <Modal
        isOpen={foodToLog !== null}
        onClose={() => setFoodToLog(null)}
        title={
          foodToLog
            ? language === 'it'
              ? foodToLog.name_it
              : foodToLog.name_en || foodToLog.name_de
            : ''
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {foodToLog && (
            <div className="flex items-center justify-between bg-[#C9EFD3] rounded-2xl px-4 py-3 tabular-nums">
              <span className="text-xs font-bold text-[#1D5C38]">
                {foodToLog.calories} kcal / 100{foodToLog.unit}
              </span>
              <span className="text-xl font-extrabold text-[#142E1F]">
                {Math.round((foodToLog.calories * logAmount) / 100)} kcal
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5">
            {mealSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setLogSlot(slot.id)}
                className={`pressable py-2 px-1.5 text-center text-xs font-bold rounded-xl border truncate ${
                  logSlot === slot.id
                    ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>

          <AmountSelector
            value={logAmount}
            onChange={setLogAmount}
            unit={foodToLog?.unit || 'g'}
          />

          <button
            type="button"
            disabled={logAmount <= 0}
            onClick={handleConfirmQuickLog}
            className="pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>
              {t.foodModal.addBtn} ({t.mealSlots[logSlot]})
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
};
