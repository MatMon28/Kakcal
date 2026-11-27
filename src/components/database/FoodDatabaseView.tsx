import { QuickLogFoodModal } from '../common/QuickLogFoodModal';
import { useJournalText } from '../../i18n/journal';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp, useNavActions } from '../../context/AppContext';
import { FOOD_CATEGORIES } from '../../data/foodCategories';
import { catalogueScore } from '../../data/offCatalog';
import { browseCatalogue, findCatalogueBarcodes } from '../../utils/catalogueSearch';
import { FoodCategory, FoodItem, MealSlotId } from '../../types';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { useAutoMealSlot, useMealSlots } from '../../utils/mealSlots';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
import { FavoriteButton } from '../common/FavoriteButton';
import { ConfirmDialog } from '../common/ConfirmDialog';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { scrollFadeX } from '../../utils/scrollFade';

const PAGE_SIZE = 36;
type CatalogFilter = FoodCategory | 'all' | 'custom' | 'favorites';
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
    rememberFood,
    logFoodItem,
    setFoodLogSeed,
    setIsAddFoodOpen,
    setIsBarcodeOpen,
    setIsCustomFoodOpen,
    setTargetMealSlot,
    favoriteFoods,
    language,
    settings,
    t,
  } = useApp();
  const ultraMinimal = settings.ultraMinimal;
  const { returnFromDatabase } = useNavActions();
  const { options: mealSlots } = useMealSlots();
  const autoMealSlot = useAutoMealSlot();
  // This page is not opened from a meal: the barcode and custom food popups log to the meal of the moment.
  const openBarcode = () => { setTargetMealSlot(autoMealSlot()); setIsBarcodeOpen(true); };
  const openCustomFood = () => { setTargetMealSlot(autoMealSlot()); setIsCustomFoodOpen(true); };

  const [search, updateQuery] = useState('');
  const [selectedCategory, updateCategory] = useState<CatalogFilter>('all');
  const [page, setPage] = useState(0);
  const [extraFavorites, setExtraFavorites] = useState<FoodItem[]>([]);
  const [offState, setOffState] = useState<{ ready: boolean; failed: boolean; total: number; foods: FoodItem[] }>({
    ready: false,
    failed: false,
    total: 0,
    foods: [],
  });
  const [attempt, setAttempt] = useState(0);
  const filters = useRef<HTMLDivElement>(null);

  // Quick log modal
  const j = useJournalText();
  const [foodToLog, setFoodToLog] = useState<FoodItem | null>(null);
  const [foodToDelete, setFoodToDelete] = useState<FoodItem | null>(null);
  const [logSlot, setLogSlot] = useState<MealSlotId>(() => autoMealSlot());
  const [logAmount, setLogAmount] = useState<number>(100);

  const setSearch = (value: string) => { updateQuery(value); setPage(0); };
  const setSelectedCategory = (value: CatalogFilter) => { updateCategory(value); setPage(0); };

  const favoriteIds = useMemo(() => favoriteFoods ?? [], [favoriteFoods]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const missingFavCodes = useMemo(() => {
    const known = new Set(allFoods.map((f) => f.id));
    return favoriteIds
      .filter((id) => id.startsWith('off-') && !known.has(id))
      .map((id) => id.slice(4));
  }, [allFoods, favoriteIds]);

  useEffect(() => {
    if (missingFavCodes.length === 0) {
      setExtraFavorites((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    let current = true;
    void findCatalogueBarcodes(missingFavCodes).then((resolved) => {
      if (current) setExtraFavorites(resolved);
    });
    return () => { current = false; };
  }, [missingFavCodes]);

  const hasCustomFoods = useMemo(() => allFoods.some((f) => f.isCustom), [allFoods]);

  const library = useMemo(() => {
    const byId = new Map(allFoods.map((food) => [food.id, food]));
    for (const food of extraFavorites) {
      if (!byId.has(food.id)) byId.set(food.id, food);
    }
    return [...byId.values()];
  }, [allFoods, extraFavorites]);

  const excluded = useMemo(() => {
    const codes: number[] = [];
    for (const f of library) {
      if (f.barcode) {
        const n = Number(f.barcode);
        if (Number.isFinite(n)) codes.push(n);
      }
    }
    return codes;
  }, [library]);

  const localResults = useMemo(() => {
    const q = search.trim();
    const matched = library.filter((f) => {
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
      return f.barcode === q || fuzzyMatch(q, [f.name_de, f.name_it, f.name_en, f.brand || '']);
    });
    const ranked = matched.map((food) => ({ food, score: !q || food.barcode === q ? 0 : Math.min(
      ...[food.name_en, food.name_it, food.name_de, food.brand || ''].map((name) => fuzzyScore(q, name)),
    ) }));
    // Typing: only favourites that are a direct hit for the text go above the rest (see pinCoherentFavorites).
    // Browsing without a search keeps all favourites first.
    const directLimit = Math.max(1, q.split(/\s+/).length);
    const pinned = (food: FoodItem, score: number) => favoriteSet.has(food.id) && (!q || score <= directLimit);
    ranked.sort((a, b) => Number(pinned(b.food, b.score)) - Number(pinned(a.food, a.score)) || a.score - b.score);
    const first: FoodItem[] = [], last: FoodItem[] = [];
    const cutoff = catalogueScore(q);
    for (const { food, score } of ranked) (pinned(food, score) || score <= cutoff ? first : last).push(food);
    return { first, last, matchedCount: matched.length };
  }, [library, search, selectedCategory, favoriteSet]);

  const needsOff = selectedCategory !== 'custom' && selectedCategory !== 'favorites';
  const offCount = needsOff ? offState.total : 0;
  const totalCount = localResults.matchedCount + offCount;
  const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * PAGE_SIZE;
  const head = localResults.first.slice(start, start + PAGE_SIZE);
  const offOffset = Math.max(0, start - localResults.first.length);
  const offLimit = PAGE_SIZE - head.length;

  useEffect(() => {
    if (!needsOff) return;
    let current = true;
    void browseCatalogue({
      query: search.trim(),
      category: selectedCategory === 'all' ? null : selectedCategory,
      excluded,
      offset: offOffset,
      limit: offLimit,
      lang: language,
    }).then((res) => {
      if (!current) return;
      if (!res) {
        setOffState((prev) => ({ ...prev, failed: true }));
      } else {
        setOffState({ ready: true, failed: false, total: res.total, foods: res.foods });
      }
    });
    return () => { current = false; };
  }, [needsOff, search, selectedCategory, excluded, offOffset, offLimit, language, attempt]);

  const foods = useMemo(() => {
    const middle = needsOff ? offState.foods.slice(0, offLimit) : [];
    const tailStart = Math.max(0, start - localResults.first.length - offCount);
    return [...head, ...middle, ...localResults.last.slice(tailStart, tailStart + PAGE_SIZE - head.length - middle.length)];
  }, [needsOff, offState.foods, offLimit, start, localResults.first.length, localResults.last, offCount, head]);

  const handleConfirmQuickLog = () => {
    if (!foodToLog || !Number.isFinite(logAmount) || logAmount <= 0) return;
    const finalAmount = logAmount;
    setLastAmount(foodToLog.id, finalAmount);
    rememberFood(foodToLog);
    logFoodItem(logSlot, foodToLog, finalAmount);
    setFoodToLog(null);
  };

  const changePage = (next: number) => {
    setPage(next);
    filters.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  return (
    <div className={ultraMinimal ? 'space-y-2.5' : 'space-y-4'}>
      {/* Header with Back button */}
      <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-3xl ${ultraMinimal ? 'p-3' : 'p-4 sm:p-5'} flex items-center justify-between gap-3 flex-wrap`}>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={returnFromDatabase}
            className="pressable w-9 h-9 rounded-full bg-transparent hover:opacity-75 text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center shrink-0"
            title={t.common.back}
            aria-label={t.common.back}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-9 h-9 rounded-full bg-transparent text-[var(--intake-on-surface)] flex items-center justify-center shrink-0">
            <BookOpen size={17} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text)]">
              {t.database.title}
            </h2>
            <span aria-live="polite" data-catalogue-count className="text-xs font-medium tabular-nums text-[var(--muted)]">
              {needsOff && !offState.ready && !offState.failed
                ? t.database.loadingCatalogue
                : t.database.itemsCount.replace('{count}', totalCount.toLocaleString(language))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openBarcode}
            className={`pressable ${ultraMinimal ? 'size-9 p-0 justify-center' : 'px-3.5 py-2.5'} rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-bold text-xs flex items-center gap-1.5`}
            title={t.prebuilt.barcode}
            aria-label={t.prebuilt.barcode}
          >
            <ScanBarcode size={15} />
            <span className={ultraMinimal ? 'sr-only' : 'hidden sm:inline'}>{t.prebuilt.barcode}</span>
          </button>

          <button
            type="button"
            onClick={openCustomFood}
            title={t.database.createCustom}
            aria-label={t.database.createCustom}
            className={`kc-primary-btn pressable ${ultraMinimal ? 'size-9 p-0 justify-center' : 'px-4 py-2.5'} rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center gap-1.5`}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className={ultraMinimal ? 'sr-only' : ''}>{t.database.createCustom}</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filters */}
      <div ref={filters} className={`scroll-mt-32 bg-[var(--surface)] border border-[var(--border)] rounded-3xl ${ultraMinimal ? 'p-3 space-y-2.5' : 'p-4 sm:p-5 space-y-3'}`}>
        {offState.failed && <p role="status" className="text-xs font-semibold text-[var(--muted)]">
          {t.database.catalogueUnavailable}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => { setOffState((prev) => ({ ...prev, failed: false })); setAttempt((n) => n + 1); }}
          >
            {t.database.retry}
          </button>
        </p>}
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.database.searchPlaceholder}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-10 pr-9 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-sm font-medium focus:outline-none focus:border-[var(--muted)] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="pressable absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
              aria-label={t.common.clear}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div ref={scrollFadeX} className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs" data-no-swipe>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            aria-pressed={selectedCategory === 'all'}
            title={t.database.allCategories}
            aria-label={t.database.allCategories}
            className={`pressable ${ultraMinimal ? 'size-8 p-0 justify-center' : 'px-3 py-1.5'} rounded-full font-bold whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'kc-chip-active bg-[#C9EFD3] text-[#174A2B]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {ultraMinimal && <Utensils size={13} aria-hidden="true" />}
            <span className={ultraMinimal ? 'sr-only' : ''}>{t.database.allCategories}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'favorites' ? 'all' : 'favorites')}
            aria-pressed={selectedCategory === 'favorites'}
            title={t.database.favoriteFilter}
            aria-label={t.database.favoriteFilter}
            className={`pressable flex items-center justify-center gap-1.5 ${ultraMinimal ? 'size-8 p-0' : 'px-3 py-1.5'} rounded-full font-bold whitespace-nowrap ${
              selectedCategory === 'favorites'
                ? 'kc-chip-active bg-[#FAE0B4] text-[#B45309]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Star size={13} fill={selectedCategory === 'favorites' ? 'currentColor' : 'none'} />
            <span className={ultraMinimal ? 'sr-only' : ''}>{t.database.favoriteFilter}</span>
          </button>

          {hasCustomFoods && (
            <button
              type="button"
              onClick={() => setSelectedCategory('custom')}
              aria-pressed={selectedCategory === 'custom'}
              title={t.database.customFilter}
              aria-label={t.database.customFilter}
              className={`pressable flex items-center justify-center gap-1.5 ${ultraMinimal ? 'size-8 p-0' : 'px-3 py-1.5'} rounded-full font-bold whitespace-nowrap ${
                selectedCategory === 'custom'
                  ? 'kc-chip-active bg-[#E2D6FF] text-[#4D3582]'
                  : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Sparkles size={13} />
              <span className={ultraMinimal ? 'sr-only' : ''}>{t.database.customFilter}</span>
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
                title={t.categories[cat]}
                aria-label={t.categories[cat]}
                className={`pressable flex items-center justify-center gap-1.5 ${ultraMinimal ? 'size-8 p-0' : 'px-3 py-1.5'} rounded-full font-bold whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'kc-chip-active bg-[#C9EFD3] text-[#174A2B]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={13} />
                <span className={ultraMinimal ? 'sr-only' : ''}>{t.categories[cat]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Foods Grid */}
      {totalCount === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 text-center space-y-3">
          <p className="text-sm font-bold text-[var(--muted)]">
            {selectedCategory === 'favorites'
              ? t.favorites.empty
              : t.foodModal.noResults}
          </p>
          <button
            type="button"
            onClick={openCustomFood}
            className="kc-primary-btn pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-xs font-extrabold"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>{t.database.createCustom}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {foods.map((food) => {
            const CategoryIcon = categoryIcons[food.category] ?? Utensils;
            const primaryName =
              language === 'it' ? food.name_it : food.name_en || food.name_de;
            const secondaryRaw = language === 'it' ? food.name_en || food.name_de : food.name_it;
            const secondaryName = secondaryRaw !== primaryName ? secondaryRaw : food.brand;

            return (
              <div
                key={food.id}
                data-food-id={food.id}
                className={`bg-[var(--surface)] border border-[var(--border)] rounded-3xl ${ultraMinimal ? 'p-3 gap-2.5' : 'p-4 sm:p-5 gap-3'} flex flex-col justify-between`}
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
                      {!ultraMinimal && (
                        <span className="text-[10px] font-bold text-[var(--muted)] ml-0.5">
                          kcal
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3"><FoodMacroGrid food={food} amount={100} mode={ultraMinimal ? 'minimal' : 'facts'} /></div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
                  <div className="min-w-0 space-y-0.5 text-[11px] font-medium text-[var(--muted)]">
                    {!ultraMinimal && <p className="truncate">100{food.unit} · {t.categories[food.category]}</p>}
                    {food.source?.url?.startsWith('https://') && (
                      <a href={food.source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 underline decoration-current/35 underline-offset-2 hover:text-[var(--text)]" aria-label={`${t.database.foodSource}: ${food.source.label}`}>
                        <span className="truncate">{food.source.label}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <FavoriteButton foodId={food.id} food={food} variant="card" />
                    {food.isCustom && (
                      <button
                        type="button"
                        onClick={() => setFoodToDelete(food)}
                        className="pressable size-8 rounded-full text-[var(--muted)] hover:text-activity-ink hover:bg-activity flex items-center justify-center"
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
                        setLogSlot(autoMealSlot());
                        setLogAmount(getDefaultAmount(food));
                      }}
                      title={t.mealSlots.addItem}
                      aria-label={`${t.mealSlots.addItem}: ${primaryName}`}
                      className={`kc-action-pill pressable ${ultraMinimal ? 'size-8 p-0 justify-center' : 'px-3.5 py-1.5'} rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-xs font-extrabold flex items-center gap-1`}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span className={ultraMinimal ? 'sr-only' : ''}>{t.mealSlots.addItem}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label={t.database.title} className="flex items-center justify-center gap-4 py-2 text-xs font-bold tabular-nums">
          <button type="button" aria-label={t.database.prevPage} disabled={!currentPage} onClick={() => changePage(currentPage - 1)}
            className="pressable grid size-11 place-items-center rounded-full bg-[var(--surface)] border border-[var(--border)] disabled:opacity-40"><ChevronLeft size={17} /></button>
          <span aria-live="polite">{t.database.pageOf.replace('{page}', String(currentPage + 1)).replace('{pages}', pages.toLocaleString(language))}</span>
          <button type="button" aria-label={t.database.nextPage} disabled={currentPage + 1 === pages} onClick={() => changePage(currentPage + 1)}
            className="pressable grid size-11 place-items-center rounded-full bg-[var(--surface)] border border-[var(--border)] disabled:opacity-40"><ChevronRight size={17} /></button>
        </nav>
      )}

      {/* Quick Log Modal */}
      <QuickLogFoodModal
        food={foodToLog}
        title={
          foodToLog
            ? language === 'it'
              ? foodToLog.name_it
              : foodToLog.name_en || foodToLog.name_de
            : ''
        }
        onClose={() => setFoodToLog(null)}
        onBack={() => setFoodToLog(null)}
        mealSlots={mealSlots}
        slot={logSlot}
        onSlotChange={setLogSlot}
        amount={logAmount}
        onAmountChange={setLogAmount}
        primaryLabel={j('Log food', 'Registra alimento')}
        onConfirm={handleConfirmQuickLog}
        moreLabel={j('Add more', 'Aggiungi altro')}
        onMore={() => {
          if (!foodToLog || !Number.isFinite(logAmount) || logAmount <= 0) return;
          rememberFood(foodToLog);
          setFoodLogSeed([{ food: foodToLog, amount: logAmount }]);
          setTargetMealSlot(logSlot);
          setIsAddFoodOpen(true);
          setFoodToLog(null);
        }}
      />

      <ConfirmDialog
        open={foodToDelete !== null}
        message={
          foodToDelete
            ? t.common.confirmDeleteFood.replace('{name}', language === 'it' ? foodToDelete.name_it : foodToDelete.name_en || foodToDelete.name_de)
            : ''
        }
        onCancel={() => setFoodToDelete(null)}
        onConfirm={() => {
          if (foodToDelete) deleteCustomFood(foodToDelete.id);
          setFoodToDelete(null);
        }}
      />
    </div>
  );
};
