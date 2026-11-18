import React, { useId, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MealSlotId, PreBuiltMeal, PreBuiltMealIngredient, FoodItem } from '../../types';
import { Modal } from '../common/Modal';
import { ActionDock } from '../common/ActionDock';
import { AmountSelector } from '../common/AmountSelector';
import { getLastAmount, setLastAmount } from '../../utils/amountMemory';
import { formatKcal } from '../../utils/formatters';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Check,
  Search,
  ArrowLeft,
  Edit2,
  ChefHat as ChefHatIcon,
  ChevronDown,
  BookOpen,
  ScanBarcode,
  Wheat,
  X,
} from 'lucide-react';
import { usePersistentState } from '../../utils/usePersistentState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MacroPills } from '../common/MacroPills';
import { SaltCrystalIcon } from '../common/SaltCrystalIcon';

const libraryPalettes = {
  meals: { text: '#7D4E14', muted: '#8A5617', border: '#E8C68E' },
  recipes: { text: '#4D3582', muted: '#6E5BA8', border: '#C9B8F2' },
  foods: { text: '#174A2B', muted: '#1D5C38', border: '#9ADBB0' },
};

function LibrarySectionHeader({ title, tone, summary, icon, count, createLabel, onCreate, searchLabel, query, setQuery, open, onToggle }: {
  title: string;
  tone: keyof typeof libraryPalettes;
  summary?: string;
  icon: React.ReactNode;
  count?: number;
  createLabel: string;
  onCreate: () => void;
  searchLabel?: string;
  query?: string;
  setQuery?: (value: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const { settings, t } = useApp();
  const ultraMinimal = settings.ultraMinimal;
  const [searchOpen, setSearchOpen] = useState(false);
  const inputId = useId();
  const closeSearch = () => {
    setQuery?.('');
    setSearchOpen(false);
    document.getElementById(`${inputId}-toggle`)?.focus();
  };
  const palette = libraryPalettes[tone];
  // Only the coloured section header gets this palette; item cards retain the user's theme.
  const headerStyle = {
    '--text': palette.text, '--muted': palette.muted, '--border': palette.border,
    '--bg': '#FBF8F2', '--inset': '#FBF8F2', '--hover': '#FFFFFF',
  } as React.CSSProperties;
  // Circle rule: search and + circles are transparent (they take the section colour, no border or shadow).
  const iconBtn = 'pressable size-8 rounded-full bg-transparent hover:opacity-75 text-[var(--text)] flex items-center justify-center';
  return (
    <div className="space-y-2" style={headerStyle}>
      <div className="flex items-center justify-between gap-2">
        {/* Title row toggles the whole section, like a meal card header on Today */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${title}: ${open ? t.common.collapse : t.common.expand}`}
          className="min-w-0 flex-1 flex items-center gap-2.5 text-left"
        >
          <span className="size-9 rounded-full bg-transparent text-[var(--text)] flex items-center justify-center shrink-0">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <h2 className={`${ultraMinimal ? 'sr-only' : 'text-sm sm:text-base font-extrabold text-[var(--text)] truncate'}`}>{title}</h2>
              {typeof count === 'number' && !ultraMinimal && (
                <span className="text-[11px] font-bold tabular-nums text-[var(--muted)]">{count}</span>
              )}
            </span>
            {summary && !ultraMinimal && <span className="block text-[11px] font-medium text-[var(--muted)] truncate">{summary}</span>}
          </span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {setQuery && !ultraMinimal && (
            <button
              id={`${inputId}-toggle`}
              type="button"
              onClick={() => {
                if (searchOpen) closeSearch();
                else {
                  setSearchOpen(true);
                  if (!open) onToggle();
                }
              }}
              aria-label={searchLabel}
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? inputId : undefined}
              title={searchLabel}
              className={iconBtn}
            >
              <Search size={15} strokeWidth={searchOpen ? 3 : 2} />
            </button>
          )}
          <button type="button" onClick={onCreate} aria-label={createLabel} title={createLabel} className={iconBtn}>
            <Plus size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? t.common.collapse : t.common.expand}
            className="pressable size-8 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {searchOpen && setQuery && (
        <form
          id={inputId}
          role="search"
          aria-label={searchLabel}
          onSubmit={(event) => event.preventDefault()}
          className="relative w-full"
        >
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
          />
          <input
            autoFocus
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                closeSearch();
              }
            }}
            aria-label={searchLabel}
            placeholder={`${searchLabel}…`}
            className="w-full bg-[var(--inset)] rounded-2xl border border-[var(--border)] pl-9 pr-9 py-2.5 text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
          />
          <button
            type="button"
            onClick={closeSearch}
            aria-label={t.common.close}
            className="pressable absolute right-2 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
          >
            <X size={14} />
          </button>
        </form>
      )}
    </div>
  );
}

export const PreBuiltMealsView: React.FC<{ hideDock: boolean }> = ({ hideDock }) => {
  const {
    preBuiltMeals,
    addPreBuiltMeal,
    addCustomFood,
    deleteCustomFood,
    updatePreBuiltMeal,
    deletePreBuiltMeal,
    logPreBuiltMealToSlot,
    logFoodItem,
    allFoods,
    language,
    selectedDate,
    setIsBarcodeOpen,
    setIsCustomFoodOpen,
    setActiveTab,
    settings,

    t,
  } = useApp();
  const ultraMinimal = settings.ultraMinimal;

  const savedRecipes = useMemo(() => allFoods.filter((f) => f.isRecipe), [allFoods]);

  // section searches (type-to-search, fuzzy — identical to Add Food)
  const [mealQuery, setMealQuery] = useState('');
  const [recipeQuery, setRecipeQuery] = useState('');

  // Logging to slot modal state
  const [activeMealToLog, setActiveMealToLog] = useState<PreBuiltMeal | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<MealSlotId>('lunch');

  // Create / Edit meal modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealDesc, setNewMealDesc] = useState('');
  const [newMealSlot, setNewMealSlot] = useState<MealSlotId>('breakfast');
  const [newIngredients, setNewIngredients] = useState<PreBuiltMealIngredient[]>([]);

  // Immediate quantity selection when a food is tapped
  const [pendingFood, setPendingFood] = useState<FoodItem | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(100);
  const [ingredientSearch, setIngredientSearch] = useState('');

  // Recipe builder (saves a multi-ingredient dish to the food database, per 100g)
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeIngs, setRecipeIngs] = useState<PreBuiltMealIngredient[]>([]);
  const [recipePendingFood, setRecipePendingFood] = useState<FoodItem | null>(null);
  const [recipePendingAmt, setRecipePendingAmt] = useState<number>(100);
  const [recipeSearch, setRecipeSearch] = useState('');

  // Log a saved recipe to a slot (amount selectable)
  const [activeRecipeToLog, setActiveRecipeToLog] = useState<FoodItem | null>(null);
  const [recipeLogSlot, setRecipeLogSlot] = useState<MealSlotId>('lunch');
  const [recipeLogAmount, setRecipeLogAmount] = useState(100);

  // Collapsible lists (persisted)
  const [openRecipes, setOpenRecipes] = usePersistentState<string[]>('kcak_my_recipes_open', []);
  const [openMeals, setOpenMeals] = usePersistentState<string[]>('kcak_my_meals_open', []);
  // Whole-section collapse (Meals / Recipes / Foods), remembered like the Today layout.
  const [sectionsOpen, setSectionsOpen] = usePersistentState<Record<'meals' | 'recipes' | 'foods', boolean>>(
    'kcak_custom_sections_open',
    { meals: true, recipes: true, foods: true }
  );
  const toggleSection = (key: 'meals' | 'recipes' | 'foods') =>
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  // Delete confirmation for meals and recipes.
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'meal' | 'recipe'; id: string; name: string } | null>(null);

  const nameOf = (f: FoodItem) => (language === 'it' ? f.name_it : f.name_en || f.name_de);

  const calculateMealNutrition = (ingredients: PreBuiltMealIngredient[]) => {
    let totalKcal = 0, carbs = 0, protein = 0, fat = 0, fiber = 0, salt = 0;
    for (const ing of ingredients) {
      const food = allFoods.find((f) => f.id === ing.foodId);
      if (!food) continue;
      const factor = ing.amount / 100;
      totalKcal += food.calories * factor;
      if (food.carbs !== null) carbs += food.carbs * factor;
      if (food.protein !== null) protein += food.protein * factor;
      if (food.fat !== null) fat += food.fat * factor;
      if (food.fiber !== null) fiber += food.fiber * factor;
      if (food.salt !== null) salt += food.salt * factor;
    }
    return {
      totalKcal: Math.round(totalKcal),
      carbs: Math.round(carbs * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      salt: Math.round(salt * 100) / 100,
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const newMealNutrition = useMemo(() => calculateMealNutrition(newIngredients), [newIngredients, allFoods]);

  const openNewMealModal = () => {
    setEditingMealId(null);
    setNewMealName('');
    setNewMealDesc('');
    setNewMealSlot('breakfast');
    setNewIngredients([]);
    setPendingFood(null);
    setIngredientSearch('');
    setIsCreateOpen(true);
  };

  const openEditMealModal = (meal: PreBuiltMeal) => {
    setEditingMealId(meal.id);
    setNewMealName(meal.name);
    setNewMealDesc(meal.description || '');
    setNewMealSlot(meal.slot || 'breakfast');
    setNewIngredients([...meal.ingredients]);
    setPendingFood(null);
    setIngredientSearch('');
    setIsCreateOpen(true);
  };

  const handleOpenLogModal = (meal: PreBuiltMeal) => {
    setActiveMealToLog(meal);
    setSelectedSlot(meal.slot ?? 'lunch');
  };

  const confirmLogToSlot = () => {
    if (!activeMealToLog) return;
    logPreBuiltMealToSlot(activeMealToLog.id, selectedSlot, selectedDate);
    setActiveMealToLog(null);
  };

  const handleSelectFood = (food: FoodItem) => {
    setPendingFood(food);
    setPendingAmount(getLastAmount(food.id));
  };

  const handleConfirmAndAddAnother = () => {
    if (!pendingFood || pendingAmount <= 0) return;
    setLastAmount(pendingFood.id, pendingAmount);
    setNewIngredients((prev) => [...prev, { foodId: pendingFood.id, amount: pendingAmount }]);
    setPendingFood(null);
    setIngredientSearch('');
  };

  const handleSaveMeal = (includePending = false) => {
    const finalIngs = [...newIngredients];
    if (includePending && pendingFood && pendingAmount > 0) {
      setLastAmount(pendingFood.id, pendingAmount);
      finalIngs.push({ foodId: pendingFood.id, amount: pendingAmount });
    }
    const validIngs = finalIngs.filter((i) => i.amount > 0);
    if (validIngs.length === 0) return;
    const fallbackName = validIngs
      .slice(0, 2)
      .map((i) => {
        const f = allFoods.find((x) => x.id === i.foodId);
        return f ? nameOf(f).split(' ')[0] : 'Meal';
      })
      .join(' + ');
    const finalName = newMealName.trim() || fallbackName;

    if (editingMealId) {
      updatePreBuiltMeal({
        id: editingMealId,
        name: finalName,
        description: newMealDesc.trim() || undefined,
        slot: newMealSlot,
        ingredients: validIngs,
        createdAt: new Date().toISOString(),
      });
    } else {
      addPreBuiltMeal({
        name: finalName,
        description: newMealDesc.trim() || undefined,
        slot: newMealSlot,
        ingredients: validIngs,
      });
    }
    setIsCreateOpen(false);
    setPendingFood(null);
  };

  const filteredFoodsForSearch = useMemo(() => {
    const q = ingredientSearch.trim();
    if (q.length < 2) return [];
    return allFoods
      .map((f) => ({
        f,
        score: Math.min(
          fuzzyScore(q, f.name_de),
          fuzzyScore(q, f.name_it),
          fuzzyScore(q, f.name_en),
          fuzzyScore(q, f.brand || '')
        ),
      }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']))
      .sort((a, b) => a.score - b.score)
      .slice(0, 35)
      .map((x) => x.f);
  }, [allFoods, ingredientSearch]);

  const recipeResults = useMemo(() => {
    const q = recipeSearch.trim();
    if (q.length < 2) return [];
    return allFoods
      .map((f) => ({
        f,
        score: Math.min(fuzzyScore(q, f.name_de), fuzzyScore(q, f.name_it), fuzzyScore(q, f.name_en)),
      }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']))
      .sort((a, b) => a.score - b.score)
      .slice(0, 35)
      .map((x) => x.f);
  }, [allFoods, recipeSearch]);

  const recipeTotals = useMemo(() => {
    let g = 0, kcal = 0, c = 0, p = 0, f = 0, fib = 0, salt = 0;
    for (const ing of recipeIngs) {
      const food = allFoods.find((x) => x.id === ing.foodId);
      if (!food) continue;
      const k = ing.amount / 100;
      g += ing.amount;
      kcal += food.calories * k;
      if (food.carbs !== null) c += food.carbs * k;
      if (food.protein !== null) p += food.protein * k;
      if (food.fat !== null) f += food.fat * k;
      if (food.fiber !== null) fib += food.fiber * k;
      if (food.salt !== null) salt += food.salt * k;
    }
    const per100 = g > 0 ? 100 / g : 0;
    return {
      grams: Math.round(g),
      kcal100: Math.round(kcal * per100),
      c100: Math.round(c * per100 * 10) / 10,
      p100: Math.round(p * per100 * 10) / 10,
      f100: Math.round(f * per100 * 10) / 10,
      fib100: Math.round(fib * per100 * 10) / 10,
      salt100: Math.round(salt * per100 * 100) / 100,
    };
  }, [recipeIngs, allFoods]);

  const openRecipeModal = () => {
    setEditingRecipeId(null);
    setRecipeName('');
    setRecipeIngs([]);
    setRecipePendingFood(null);
    setRecipeSearch('');
    setIsRecipeOpen(true);
  };

  const closeRecipeModal = () => {
    setIsRecipeOpen(false);
    setRecipePendingFood(null);
    setEditingRecipeId(null);
  };

  const openEditRecipeModal = (recipe: FoodItem) => {
    setEditingRecipeId(recipe.id);
    setRecipeName(nameOf(recipe));
    setRecipeIngs(recipe.recipeIngredients ? [...recipe.recipeIngredients] : []);
    setRecipePendingFood(null);
    setRecipeSearch('');
    setIsRecipeOpen(true);
  };

  const saveRecipe = () => {
    const validIngs = recipeIngs.filter((i) => i.amount > 0);
    if (!recipeName.trim() || validIngs.length === 0) return;
    const rt = recipeTotals;
    const existing = editingRecipeId
      ? allFoods.find((f) => f.id === editingRecipeId && f.isRecipe)
      : undefined;
    const payload: FoodItem = {
      ...(existing ?? { id: 'recipe-' + Date.now(), store: 'Custom', unit: 'g', category: 'prepared' as const }),
      id: existing?.id ?? 'recipe-' + Date.now(),
      name_de: recipeName.trim(),
      name_it: recipeName.trim(),
      name_en: recipeName.trim(),
      store: 'Custom',
      category: 'prepared',
      unit: 'g',
      calories: rt.kcal100,
      carbs: rt.c100,
      protein: rt.p100,
      fat: rt.f100,
      fiber: rt.fib100,
      salt: rt.salt100,
      isCustom: true,
      isRecipe: true,
      recipeIngredients: validIngs,
      source: existing?.source,
    };
    addCustomFood(payload); // upsert by id: keeps an edited recipe's identity
    closeRecipeModal();
  };

  const pendingKcal = pendingFood ? Math.round((pendingFood.calories * pendingAmount) / 100) : 0;

  const mealSlots: { id: MealSlotId; label: string }[] = [
    { id: 'breakfast', label: t.mealSlots.breakfast },
    { id: 'mid_morning', label: t.mealSlots.mid_morning },
    { id: 'lunch', label: t.mealSlots.lunch },
    { id: 'midday_snack', label: t.mealSlots.midday_snack },
    { id: 'dinner', label: t.mealSlots.dinner },
    { id: 'extra', label: t.mealSlots.extra },
  ];

  const mealResults = useMemo(() => {
    const q = mealQuery.trim();
    if (q.length < 2) return [];
    return preBuiltMeals
      .map((m) => ({ m, score: fuzzyScore(q, m.name) }))
      .filter((x) => fuzzyMatch(q, [x.m.name]))
      .sort((a, b) => a.score - b.score)
      .slice(0, 35)
      .map((x) => x.m);
  }, [preBuiltMeals, mealQuery]);

  const recipeListResults = useMemo(() => {
    const q = recipeQuery.trim();
    if (q.length < 2) return [];
    return savedRecipes
      .map((f) => ({ f, score: fuzzyScore(q, `${f.name_de} ${f.name_it} ${f.name_en}`) }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en]))
      .sort((a, b) => a.score - b.score)
      .slice(0, 35)
      .map((x) => x.f);
  }, [savedRecipes, recipeQuery]);

  const isMealFiltering = mealQuery.trim().length >= 2;
  const isRecipeFiltering = recipeQuery.trim().length >= 2;
  const visibleMeals = isMealFiltering ? mealResults : preBuiltMeals;
  const visibleRecipes = isRecipeFiltering ? recipeListResults : savedRecipes;

  const searchInput = (value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div className="relative">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
      <input
        type="text"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t.settings.searchText}
        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl pl-9 pr-9 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="pressable absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
          aria-label={t.common.clear}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className={ultraMinimal ? 'grid grid-cols-3 gap-2 sm:gap-3 items-start' : 'space-y-4'}>
      {/* Section colours are restored; the individual meal cards stay neutral. In ultra minimal, all 3 sit next to one another. */}
      <section data-library-section="meals" className={`bg-[#FAE0B4] border border-[#E8C68E] rounded-3xl ${ultraMinimal ? 'p-2 sm:p-3 space-y-2' : 'p-4 sm:p-5 space-y-3'} ${ultraMinimal ? (sectionsOpen.meals ? 'col-span-3' : 'col-span-1') : ''}`}>
        <LibrarySectionHeader
          title={t.prebuilt.title}
          tone="meals"
          icon={<UtensilsCrossed size={16} strokeWidth={2.2} />}
          count={preBuiltMeals.length}
          createLabel={t.prebuilt.createNew}
          onCreate={openNewMealModal}
          searchLabel={t.prebuilt.searchMeals}
          query={mealQuery}
          setQuery={setMealQuery}
          open={sectionsOpen.meals}
          onToggle={() => toggleSection('meals')}
        />

        <div className="accordion-grid" data-open={sectionsOpen.meals} inert={!sectionsOpen.meals}>
        <div className="accordion-inner">
        {preBuiltMeals.length === 0 ? (
          ultraMinimal ? <div className="min-h-2" aria-hidden="true" /> :
          <p className="text-xs font-medium text-[#7D4E14] px-1 py-1">
            {t.common.emptyMeals}
          </p>
        ) : visibleMeals.length === 0 ? (
          ultraMinimal ? <div className="min-h-2" aria-hidden="true" /> :
          <p className="text-xs font-medium text-[#7D4E14] px-1 py-2 text-center">
            {t.prebuilt.noMatches}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {visibleMeals.map((meal) => {
              const nut = calculateMealNutrition(meal.ingredients);
              const isOpen = openMeals.includes(meal.id);
              return (
                <div
                  key={meal.id}
                  className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl ${ultraMinimal ? 'p-2.5 gap-2' : 'p-3.5 gap-2.5'} flex flex-col`}
                >
                  {/* Title/actions first; calories and number-only macros share the full-width row below. */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMeals((prev) =>
                          prev.includes(meal.id) ? prev.filter((x) => x !== meal.id) : [...prev, meal.id]
                        )
                      }
                      className="min-w-0 flex-1 flex items-start justify-between gap-1.5 text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text)]" title={meal.name}>
                            {meal.name}
                          </h3>
                          {meal.slot && !ultraMinimal && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                              {t.mealSlots[meal.slot]}
                            </span>
                          )}
                        </div>

                      </div>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 mt-1 text-[var(--muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditMealModal(meal)}
                        title={t.common.edit}
                        aria-label={`${t.common.edit}: ${meal.name}`}
                        className="pressable size-8 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: 'meal', id: meal.id, name: meal.name })}
                        title={t.common.delete}
                        aria-label={`${t.common.delete}: ${meal.name}`}
                        className="pressable size-8 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLogModal(meal)}
                        title={t.prebuilt.logMeal}
                        aria-label={`${t.prebuilt.logMeal}: ${meal.name}`}
                        className={`pressable ${ultraMinimal ? 'size-8 px-0' : 'h-8 px-3'} bg-[#FAE0B4] hover:bg-[#F7D69E] text-[#7D4E14] font-extrabold rounded-xl text-[11px] flex items-center justify-center gap-1`}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span className={ultraMinimal ? 'sr-only' : 'whitespace-nowrap'}>{t.common.log}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-nutrition-row
                    onClick={() => setOpenMeals((prev) => prev.includes(meal.id) ? prev.filter((id) => id !== meal.id) : [...prev, meal.id])}
                    aria-expanded={isOpen}
                    aria-label={`${meal.name}: ${isOpen ? t.common.collapse : t.common.expand}`}
                    className="flex w-full min-w-0 items-center gap-3 text-left"
                  >
                    <span data-calories className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)]">
                      {formatKcal(nut.totalKcal)} {!ultraMinimal && <span className="text-[11px] font-semibold text-[var(--muted)]">kcal</span>}
                    </span>
                    <MacroPills carbs={nut.carbs} protein={nut.protein} fat={nut.fat} stretch />
                  </button>

                  <div className="accordion-grid" data-open={isOpen} inert={!isOpen}>
                    <div className="accordion-inner">
                      <div className="pt-1 space-y-3 border-t border-[var(--border)]">
                        {meal.description && !ultraMinimal && (
                          <p className="text-xs text-[var(--muted)]">{meal.description}</p>
                        )}
                        <div className="grid grid-cols-5 gap-1.5 text-center tabular-nums pt-2">
                          <div className="bg-[#CFE7FE] p-1.5 rounded-2xl text-[#1A4670] flex items-center justify-center" role="img" aria-label={`${t.macros.carbs}: ${nut.carbs} g`} title={t.macros.carbs}>
                            <span className="text-xs font-extrabold">{nut.carbs}{!ultraMinimal && 'g'}</span>
                          </div>
                          <div className="bg-[#FAE0B4] p-1.5 rounded-2xl text-[#7D4E14] flex items-center justify-center" role="img" aria-label={`${t.macros.protein}: ${nut.protein} g`} title={t.macros.protein}>
                            <span className="text-xs font-extrabold">{nut.protein}{!ultraMinimal && 'g'}</span>
                          </div>
                          <div className="bg-[#E2D6FF] p-1.5 rounded-2xl text-[#4D3582] flex items-center justify-center" role="img" aria-label={`${t.macros.fat}: ${nut.fat} g`} title={t.macros.fat}>
                            <span className="text-xs font-extrabold">{nut.fat}{!ultraMinimal && 'g'}</span>
                          </div>
                          <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]" role="img" aria-label={`${t.macros.fiber}: ${nut.fiber} g`} title={t.macros.fiber}>
                            {ultraMinimal ? <Wheat size={12} className="mx-auto mb-0.5" /> : <span className="text-[10px] font-bold block">{t.macros.fiber}</span>}
                            <span className="text-xs font-extrabold">{nut.fiber}{!ultraMinimal && 'g'}</span>
                          </div>
                          <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]" role="img" aria-label={`${t.macros.salt}: ${nut.salt} g`} title={t.macros.salt}>
                            {ultraMinimal ? <SaltCrystalIcon size={12} className="mx-auto mb-0.5" /> : <span className="text-[10px] font-bold block">{t.macros.salt}</span>}
                            <span className="text-xs font-extrabold">{nut.salt}{!ultraMinimal && 'g'}</span>
                          </div>
                        </div>

                        <div className="bg-[var(--surface)] rounded-2xl p-2.5 divide-y divide-[var(--border)]">
                          {meal.ingredients.map((ing, idx) => {
                            const food = allFoods.find((f) => f.id === ing.foodId);
                            return (
                              <div
                                key={idx}
                                className="py-1.5 flex items-center justify-between text-xs text-[var(--text)]"
                              >
                                <span className="font-medium truncate pr-2">
                                  {food ? nameOf(food) : ing.foodId}
                                </span>
                                <span className="font-bold tabular-nums text-[var(--muted)] shrink-0">
                                  {ing.amount}
                                  {!ultraMinimal && (food?.unit || 'g')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
        </div>
      </section>

      {/* ============ RECIPES ============ */}
      <section data-library-section="recipes" className={`bg-[#E2D6FF] border border-[#C9B8F2] rounded-3xl ${ultraMinimal ? 'p-2 sm:p-3 space-y-2' : 'p-4 sm:p-5 space-y-3'} ${ultraMinimal ? (sectionsOpen.recipes ? 'col-span-3' : 'col-span-1') : ''}`}>
        <LibrarySectionHeader
          title={t.prebuilt.recipesTitle}
          tone="recipes"
          summary={t.prebuilt.recipesDesc}
          icon={<ChefHatIcon size={16} />}
          count={savedRecipes.length}
          createLabel={t.prebuilt.createRecipe}
          onCreate={openRecipeModal}
          searchLabel={t.prebuilt.searchRecipes}
          query={recipeQuery}
          setQuery={setRecipeQuery}
          open={sectionsOpen.recipes}
          onToggle={() => toggleSection('recipes')}
        />

        <div className="accordion-grid" data-open={sectionsOpen.recipes} inert={!sectionsOpen.recipes}>
        <div className="accordion-inner">
        {savedRecipes.length === 0 ? (
          ultraMinimal ? <div className="min-h-2" aria-hidden="true" /> :
          <p className="text-xs font-medium text-[#4D3582] px-1 py-1">
            {t.prebuilt.noRecipes}
          </p>
        ) : visibleRecipes.length === 0 ? (
          ultraMinimal ? <div className="min-h-2" aria-hidden="true" /> :
          <p className="text-xs font-medium text-[#4D3582] px-1 py-2 text-center">
            {t.prebuilt.noMatches}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {visibleRecipes.map((recipe) => {
              const isOpen = openRecipes.includes(recipe.id);
              return (
                <div key={recipe.id} className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl ${ultraMinimal ? 'p-2.5 gap-2' : 'p-3.5 gap-2.5'} flex flex-col`}>
                  {/* Title/actions first; calories and number-only macros share the full-width row below. */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenRecipes((prev) =>
                          prev.includes(recipe.id) ? prev.filter((x) => x !== recipe.id) : [...prev, recipe.id]
                        )
                      }
                      className="min-w-0 flex-1 flex items-start justify-between gap-1.5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm sm:text-base font-extrabold text-[var(--text)]" title={nameOf(recipe)}>
                          {nameOf(recipe)}
                        </span>

                      </span>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 mt-1 text-[var(--muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditRecipeModal(recipe)}
                        title={t.common.edit}
                        aria-label={`${t.common.edit}: ${nameOf(recipe)}`}
                        className="pressable size-8 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: 'recipe', id: recipe.id, name: nameOf(recipe) })}
                        title={t.common.delete}
                        aria-label={`${t.common.delete}: ${nameOf(recipe)}`}
                        className="pressable size-8 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRecipeToLog(recipe);
                          setRecipeLogSlot('lunch');
                          setRecipeLogAmount(getLastAmount(recipe.id));
                        }}
                        title={t.prebuilt.logRecipe}
                        aria-label={`${t.prebuilt.logRecipe}: ${nameOf(recipe)}`}
                        className={`pressable ${ultraMinimal ? 'size-8 px-0' : 'h-8 px-3'} bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-xl text-[11px] flex items-center justify-center gap-1`}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span className={ultraMinimal ? 'sr-only' : 'whitespace-nowrap'}>{t.common.log}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-nutrition-row
                    onClick={() => setOpenRecipes((prev) => prev.includes(recipe.id) ? prev.filter((id) => id !== recipe.id) : [...prev, recipe.id])}
                    aria-expanded={isOpen}
                    aria-label={`${nameOf(recipe)}: ${isOpen ? t.common.collapse : t.common.expand}`}
                    className="flex w-full min-w-0 items-center gap-3 text-left"
                  >
                    <span data-calories className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)]">
                      {recipe.calories} {!ultraMinimal && <span className="text-[11px] font-semibold text-[var(--muted)]">kcal/100{recipe.unit}</span>}
                    </span>
                    <MacroPills carbs={recipe.carbs} protein={recipe.protein} fat={recipe.fat} stretch />
                  </button>

                  <div className="accordion-grid" data-open={isOpen} inert={!isOpen}>
                    <div className="accordion-inner">
                      <div className="pt-1 space-y-2.5 border-t border-[var(--border)]">
                        <div className="grid grid-cols-5 gap-1.5 text-center tabular-nums pt-2">
                          <div className="bg-[#CFE7FE] p-1.5 rounded-2xl text-[#1A4670] flex items-center justify-center" role="img" aria-label={`${t.macros.carbs}: ${recipe.carbs ?? '—'} g`} title={t.macros.carbs}>
                            <span className="text-xs font-extrabold">{recipe.carbs ?? '—'}{!ultraMinimal && 'g'}</span>
                          </div>
                          <div className="bg-[#FAE0B4] p-1.5 rounded-2xl text-[#7D4E14] flex items-center justify-center" role="img" aria-label={`${t.macros.protein}: ${recipe.protein ?? '—'} g`} title={t.macros.protein}>
                            <span className="text-xs font-extrabold">{recipe.protein ?? '—'}{!ultraMinimal && 'g'}</span>
                          </div>
                          <div className="bg-[#E2D6FF] p-1.5 rounded-2xl text-[#4D3582] flex items-center justify-center" role="img" aria-label={`${t.macros.fat}: ${recipe.fat ?? '—'} g`} title={t.macros.fat}>
                            <span className="text-xs font-extrabold">{recipe.fat ?? '—'}{!ultraMinimal && 'g'}</span>
                          </div>
                          <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]" role="img" aria-label={`${t.macros.fiber}: ${recipe.fiber ?? '—'} g`} title={t.macros.fiber}>
                            {ultraMinimal ? <Wheat size={12} className="mx-auto mb-0.5" /> : <span className="text-[10px] font-bold block">{t.macros.fiber}</span>}
                            <span className="text-xs font-extrabold">{recipe.fiber ?? '—'}{!ultraMinimal && 'g'}</span>
                          </div>
                          <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]" role="img" aria-label={`${t.macros.salt}: ${recipe.salt ?? '—'} g`} title={t.macros.salt}>
                            {ultraMinimal ? <SaltCrystalIcon size={12} className="mx-auto mb-0.5" /> : <span className="text-[10px] font-bold block">{t.macros.salt}</span>}
                            <span className="text-xs font-extrabold">{recipe.salt ?? '—'}{!ultraMinimal && 'g'}</span>
                          </div>
                        </div>

                        {/* Ingredients with their original quantities */}
                        <div>
                          {!ultraMinimal && (
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                              {t.prebuilt.recipeIngredients.replace('{count}', String(recipe.recipeIngredients?.length ?? 0))}
                            </span>
                          )}
                          {recipe.recipeIngredients && recipe.recipeIngredients.length > 0 ? (
                            <div className="bg-[var(--surface)] rounded-2xl p-2.5 divide-y divide-[var(--border)]">
                              {recipe.recipeIngredients.map((ing, idx) => {
                                const food = allFoods.find((f) => f.id === ing.foodId);
                                const kcal = food ? Math.round((food.calories * ing.amount) / 100) : null;
                                return (
                                  <div key={idx} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                                    <span className="font-medium truncate text-[var(--text)]">
                                      {food ? nameOf(food) : ing.foodId}
                                    </span>
                                    <span className="flex items-center gap-2 shrink-0 tabular-nums">
                                      {kcal !== null && <span className="text-[var(--muted)]">{kcal}{!ultraMinimal && ' kcal'}</span>}
                                      <span className="font-bold text-[var(--muted)]">
                                        {ing.amount}
                                        {!ultraMinimal && (food?.unit || 'g')}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] font-medium text-[var(--muted)]">
                              {t.prebuilt.recipeNoIngredients}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
        </div>
      </section>

      {/* ============ FOODS ============ */}
      <section data-library-section="foods" className={`bg-[#C9EFD3] border border-[#9ADBB0] rounded-3xl ${ultraMinimal ? 'p-2 sm:p-3 space-y-2' : 'p-4 sm:p-5 space-y-3'} ${ultraMinimal ? (sectionsOpen.foods ? 'col-span-3' : 'col-span-1') : ''}`}>
        <LibrarySectionHeader
          title={t.database.title}
          tone="foods"
          summary={t.settings.foodsDesc}
          icon={<BookOpen size={16} />}
          createLabel={t.database.createCustom}
          onCreate={() => setIsCustomFoodOpen(true)}
          open={sectionsOpen.foods}
          onToggle={() => toggleSection('foods')}
        />
        <div className="accordion-grid" data-open={sectionsOpen.foods} inert={!sectionsOpen.foods}>
        <div className="accordion-inner">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsBarcodeOpen(true)}
            className="pressable w-full min-w-0 px-3 py-2.5 rounded-full bg-[#FBF8F2] hover:bg-white text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5"
            title={t.prebuilt.barcode}
            aria-label={t.prebuilt.barcode}
          >
            <ScanBarcode size={16} className="shrink-0" />
            <span className={ultraMinimal ? 'sr-only' : 'truncate'}>{t.prebuilt.barcode}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCustomFoodOpen(true)}
            className="pressable w-full min-w-0 px-3 py-2.5 rounded-full bg-[#FBF8F2] hover:bg-white text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5"
            title={t.database.customFood}
            aria-label={t.database.customFood}
          >
            <Plus size={16} strokeWidth={2.5} className="shrink-0" />
            <span className={ultraMinimal ? 'sr-only' : 'truncate'}>{t.database.customFood}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className="pressable col-span-2 w-full min-w-0 px-3 py-2.5 rounded-full bg-[#FBF8F2] hover:bg-white text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5"
            title={t.database.browseAll}
            aria-label={t.database.browseAll}
          >
            <BookOpen size={16} className="shrink-0" />
            <span className={ultraMinimal ? 'sr-only' : 'truncate'}>{t.database.browseAll}</span>
          </button>
        </div>
        </div>
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        message={
          pendingDelete
            ? (pendingDelete.kind === 'meal' ? t.common.confirmDeleteMeal : t.common.confirmDeleteRecipe).replace('{name}', pendingDelete.name)
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.kind === 'meal') deletePreBuiltMeal(pendingDelete.id);
          else if (pendingDelete) deleteCustomFood(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      {!hideDock && !isCreateOpen && !isRecipeOpen && !activeMealToLog && !activeRecipeToLog && (
        <ActionDock
          label={t.prebuilt.creationDock}
          actions={[
            { id: 'meal', icon: <UtensilsCrossed size={20} />, label: t.prebuilt.createNew, tone: 'bg-[#FAE0B4] text-[#7D4E14]', onClick: openNewMealModal },
            { id: 'recipe', icon: <ChefHatIcon size={20} />, label: t.prebuilt.createRecipe, tone: 'bg-[#E2D6FF] text-[#4D3582]', onClick: openRecipeModal },
            { id: 'food', icon: <BookOpen size={20} />, label: t.database.createCustom, tone: 'bg-[#C9EFD3] text-[#174A2B]', onClick: () => setIsCustomFoodOpen(true) },
          ]}
        />
      )}

      {/* ============ Log meal to slot picker ============ */}
      <Modal
        isOpen={activeMealToLog !== null}
        onClose={() => setActiveMealToLog(null)}
        title={t.prebuilt.selectSlotPrompt}
        subtitle={activeMealToLog?.name}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {mealSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot.id)}
                className={`pressable p-3 rounded-2xl border text-xs font-bold text-center ${
                  selectedSlot === slot.id
                    ? 'bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={confirmLogToSlot}
            className="pressable w-full py-3 bg-[#FAE0B4] hover:bg-[#F7D69E] text-[#7D4E14] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>
              {t.prebuilt.logMeal} → {t.mealSlots[selectedSlot]}
            </span>
          </button>
        </div>
      </Modal>

      {/* ============ Log recipe to slot (amount selectable) ============ */}
      <Modal
        isOpen={activeRecipeToLog !== null}
        onClose={() => setActiveRecipeToLog(null)}
        title={t.prebuilt.logRecipe}
        subtitle={activeRecipeToLog ? nameOf(activeRecipeToLog) : undefined}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {mealSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setRecipeLogSlot(slot.id)}
                className={`pressable p-3 rounded-2xl border text-xs font-bold text-center ${
                  recipeLogSlot === slot.id
                    ? 'bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F2]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
          {activeRecipeToLog && (
            <AmountSelector value={recipeLogAmount} onChange={setRecipeLogAmount} unit={activeRecipeToLog.unit} />
          )}
          <button
            type="button"
            onClick={() => {
              if (activeRecipeToLog && recipeLogAmount > 0) {
                setLastAmount(activeRecipeToLog.id, recipeLogAmount);
                logFoodItem(recipeLogSlot, activeRecipeToLog, recipeLogAmount, selectedDate);
                setActiveRecipeToLog(null);
              }
            }}
            disabled={recipeLogAmount <= 0}
            className="pressable w-full py-3 bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>
              {t.prebuilt.logRecipe} → {t.mealSlots[recipeLogSlot]} ·{' '}
              {activeRecipeToLog ? Math.round((activeRecipeToLog.calories * recipeLogAmount) / 100) : 0} kcal
            </span>
          </button>
        </div>
      </Modal>

      {/* ============ Create / Edit meal modal ============ */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setPendingFood(null);
        }}
        title={pendingFood ? nameOf(pendingFood) : editingMealId ? t.prebuilt.edit : t.prebuilt.newModalTitle}
        maxWidth="max-w-xl"
      >
        {pendingFood ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setPendingFood(null)}
              className="pressable inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              <span>{t.common.back}</span>
            </button>

            <div className="flex items-center justify-between bg-[#FAE0B4] rounded-2xl px-4 py-3 tabular-nums">
              <span className="text-xs font-bold text-[#7D4E14]">
                {pendingFood.calories} kcal / 100{pendingFood.unit}
              </span>
              <div>
                <span className="text-2xl font-extrabold text-[#2D1E0B]">{pendingKcal}</span>
                <span className="text-xs font-bold text-[#7D4E14] ml-1">kcal</span>
              </div>
            </div>

            <AmountSelector value={pendingAmount} onChange={setPendingAmount} unit={pendingFood.unit} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirmAndAddAnother}
                disabled={pendingAmount <= 0}
                className="pressable w-full py-3 px-4 bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm disabled:opacity-40"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>{t.prebuilt.addAnotherIngredient}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveMeal(true)}
                disabled={pendingAmount <= 0 && newIngredients.length === 0}
                className="pressable w-full py-3 px-4 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm tabular-nums disabled:opacity-40"
              >
                <Check size={17} strokeWidth={2.5} />
                <span>{t.prebuilt.saveMeal} ({newMealNutrition.totalKcal + pendingKcal} kcal)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <input
              type="text"
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              placeholder={t.prebuilt.mealNamePlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-sm font-bold focus:outline-none focus:border-[var(--muted)]"
            />

            <input
              type="text"
              value={newMealDesc}
              onChange={(e) => setNewMealDesc(e.target.value)}
              placeholder={t.prebuilt.descPlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2 text-[var(--text)] placeholder-[var(--muted)] text-xs font-medium focus:outline-none focus:border-[var(--muted)]"
            />

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {mealSlots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setNewMealSlot(s.id)}
                  className={`pressable px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                    newMealSlot === s.id
                      ? 'bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {newIngredients.length > 0 && (
              <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[var(--text)]">
                    {t.prebuilt.ingredientsCount.replace('{count}', String(newIngredients.length))}
                  </span>
                  <span className="text-xs font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-[#C9EFD3] text-[#174A2B]">
                    {newMealNutrition.totalKcal} kcal
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {newIngredients.map((ing, idx) => {
                    const food = allFoods.find((f) => f.id === ing.foodId);
                    const kcal = food ? Math.round((food.calories * ing.amount) / 100) : 0;
                    return (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-[var(--surface)] flex items-center justify-between gap-2 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (food) {
                              setNewIngredients((prev) => prev.filter((_, i) => i !== idx));
                              handleSelectFood(food);
                              setPendingAmount(ing.amount);
                            }
                          }}
                          className="font-bold text-[var(--text)] truncate text-left hover:underline"
                        >
                          {food ? nameOf(food) : ing.foodId} ({ing.amount}
                          {food?.unit || 'g'})
                        </button>
                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          <span className="font-bold text-[var(--muted)]">{kcal} kcal</span>
                          <button
                            type="button"
                            onClick={() => setNewIngredients((prev) => prev.filter((_, i) => i !== idx))}
                            className="pressable w-6 h-6 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                            aria-label={t.common.delete}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ingredient search — same behaviour as Add Food (fuzzy, results only while typing) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--muted)] block">
                {t.prebuilt.pickIngredientPrompt}
              </span>
              {searchInput(ingredientSearch, setIngredientSearch, t.foodModal.searchPlaceholder)}
              {ingredientSearch.trim().length === 1 && (
                <p className="text-[11px] font-medium text-[var(--muted)] px-1">{t.foodModal.minCharsHint}</p>
              )}
              {ingredientSearch.trim().length >= 2 && (
                <div className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] max-h-52 overflow-y-auto">
                  {filteredFoodsForSearch.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--muted)]">{t.foodModal.noResults}</div>
                  ) : (
                    filteredFoodsForSearch.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => handleSelectFood(food)}
                        className="w-full p-3 hover:bg-[var(--hover)] text-left flex items-center justify-between gap-3 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="text-sm font-bold text-[var(--text)] truncate block">
                            {nameOf(food)}
                          </span>
                          <span className="text-[11px] text-[var(--muted)]">{food.store}</span>
                        </span>
                        <span className="text-xs font-extrabold tabular-nums text-[var(--muted)] shrink-0">
                          {food.calories} kcal/100{food.unit}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {newIngredients.length > 0 && (
              <button
                type="button"
                onClick={() => handleSaveMeal(false)}
                className="pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums"
              >
                <Check size={18} strokeWidth={2.5} />
                <span>
                  {t.prebuilt.saveMeal} ({newMealNutrition.totalKcal} kcal)
                </span>
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* ============ Create / Edit recipe modal ============ */}
      <Modal
        isOpen={isRecipeOpen}
        onClose={closeRecipeModal}
        title={
          recipePendingFood
            ? nameOf(recipePendingFood)
            : editingRecipeId
            ? t.prebuilt.edit
            : t.prebuilt.recipeTitle
        }
        maxWidth="max-w-xl"
      >
        {recipePendingFood ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setRecipePendingFood(null)}
              className="pressable inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              <span>{t.common.back}</span>
            </button>

            <div className="flex items-center justify-between bg-[#E2D6FF] rounded-2xl px-4 py-3 tabular-nums">
              <span className="text-xs font-bold text-[#4D3582]">
                {recipePendingFood.calories} kcal / 100{recipePendingFood.unit}
              </span>
              <span className="text-xl font-extrabold text-[#1F1636]">
                {Math.round((recipePendingFood.calories * recipePendingAmt) / 100)} kcal
              </span>
            </div>

            <AmountSelector value={recipePendingAmt} onChange={setRecipePendingAmt} unit={recipePendingFood.unit} />

            <button
              type="button"
              disabled={recipePendingAmt <= 0}
              onClick={() => {
                if (recipePendingAmt > 0) {
                  setLastAmount(recipePendingFood.id, recipePendingAmt);
                  setRecipeIngs((prev) => [...prev, { foodId: recipePendingFood.id, amount: recipePendingAmt }]);
                }
                setRecipePendingFood(null);
                setRecipeSearch('');
              }}
              className="pressable w-full py-3 bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>{t.prebuilt.addIngredient}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <input
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder={t.prebuilt.recipeNamePlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)]"
            />

            {recipeIngs.length > 0 && (
              <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold tabular-nums text-[var(--text)]">
                    {t.prebuilt.ingredientsCount.replace('{count}', String(recipeIngs.length))} · {recipeTotals.grams}g
                  </span>
                </div>
                <div data-nutrition-row className="flex min-w-0 items-center gap-3">
                  <span data-calories className="shrink-0 whitespace-nowrap text-xs font-extrabold tabular-nums text-[var(--text)]">
                    {recipeTotals.kcal100} <span className="text-[11px] font-semibold text-[var(--muted)]">kcal/100g</span>
                  </span>
                  <MacroPills carbs={recipeTotals.c100} protein={recipeTotals.p100} fat={recipeTotals.f100} stretch />
                </div>
                <div className="grid grid-cols-2 gap-1 text-center text-[10px] font-bold tabular-nums">
                  <span className="bg-[#CFE7FE] text-[#183B5E] rounded-lg py-1">{t.macros.fiber} {recipeTotals.fib100}</span>
                  <span className="bg-[var(--surface)] text-[var(--muted)] rounded-lg py-1">{t.macros.salt} {recipeTotals.salt100}</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {recipeIngs.map((ing, idx) => {
                    const food = allFoods.find((f) => f.id === ing.foodId);
                    return (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-[var(--surface)] flex items-center justify-between gap-2 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (food) {
                              setRecipeIngs((prev) => prev.filter((_, i) => i !== idx));
                              setRecipePendingFood(food);
                              setRecipePendingAmt(ing.amount);
                            }
                          }}
                          className="font-bold text-[var(--text)] truncate text-left hover:underline"
                        >
                          {food ? nameOf(food) : ing.foodId} ({ing.amount}
                          {food?.unit || 'g'})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecipeIngs((prev) => prev.filter((_, i) => i !== idx))}
                          className="pressable w-6 h-6 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center shrink-0"
                          aria-label={t.common.delete}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ingredient search — same behaviour as Add Food */}
            <div className="space-y-2">
              {searchInput(recipeSearch, setRecipeSearch, t.foodModal.searchPlaceholder)}
              {recipeSearch.trim().length === 1 && (
                <p className="text-[11px] font-medium text-[var(--muted)] px-1">{t.foodModal.minCharsHint}</p>
              )}
              {recipeSearch.trim().length >= 2 && (
                <div className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] max-h-52 overflow-y-auto">
                  {recipeResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--muted)]">{t.foodModal.noResults}</div>
                  ) : (
                    recipeResults.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => {
                          setRecipePendingFood(food);
                          setRecipePendingAmt(getLastAmount(food.id));
                        }}
                        className="w-full p-3 hover:bg-[var(--hover)] text-left flex items-center justify-between gap-3 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="text-sm font-bold text-[var(--text)] truncate block">
                            {nameOf(food)}
                          </span>
                          <span className="text-[11px] text-[var(--muted)]">{food.store}</span>
                        </span>
                        <span className="text-xs font-extrabold tabular-nums text-[var(--muted)] shrink-0">
                          {food.calories} kcal/100{food.unit}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {recipeIngs.length > 0 && (
              <button
                type="button"
                onClick={saveRecipe}
                disabled={!recipeName.trim() || recipeIngs.every((i) => i.amount <= 0)}
                className="pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40"
              >
                <Check size={18} strokeWidth={2.5} />
                <span>
                  {t.common.save} · {t.prebuilt.recipeNote}: {recipeTotals.kcal100} kcal
                </span>
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
