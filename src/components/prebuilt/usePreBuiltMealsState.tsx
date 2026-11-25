import { useDeferredValue, useEffect, useState, useMemo } from 'react';
import { useApp, useNavActions } from '../../context/AppContext';
import { MealSlotId, PreBuiltMeal, PreBuiltMealIngredient, FoodItem, FoodSource } from '../../types';
import { useAutoMealSlot, useMealSlots } from '../../utils/mealSlots';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { useCatalogueSearch } from '../../utils/useCatalogueSearch';
import { searchCatalogue } from '../../utils/catalogueSearch';
import {
  importRecipeFromUrl,
  draftToRecipeIngredients,
  RecipeImportError,
  type FetchVia,
  type ImportStage,
  type ImportWarning,
  type RecipeImportErrorCode,
} from '../../utils/recipeImport';
import { catalogueScore } from '../../data/offCatalog';
import { searchFoods, searchMeals } from '../../utils/foodSearchIndex';
import { matchesFirstChar, pinCoherentFavorites } from '../../utils/favorites';
import { Search, X } from 'lucide-react';
import { usePersistentState } from '../../utils/usePersistentState';
import { useJournalText } from '../../i18n/journal';
import { useCustomDockActions } from '../journal/CustomShortcuts';

/** A failed import, as the modal shows it: a code to translate (when we have a translation) plus the
 * English message and the suggested next step from `recipeImport.ts`. */
export interface ImportErrorInfo {
  code: RecipeImportErrorCode;
  message: string;
  hint: string;
}

/** What the "imported from …" banner in the recipe builder shows. Null for a manually built recipe. */
export interface ImportSummary {
  source?: string;
  via: FetchVia;
  servings: number | null;
  portion: number;
  portionSource: 'servings' | 'default';
  coverage: number;
  matched: number;
  total: number;
  totalGrams: number;
  caloriesPer100: number;
  unmatched: Array<{ raw: string; query: string; grams: number | null; food: FoodItem | null }>;
  /** "Sale q.b.", "a pinch of pepper": not counted, one tap to add them. */
  seasonings: Array<{ raw: string; query: string; food: FoodItem | null; grams: number | null }>;
  lowConfidence: Array<{ index: number; foodId: string; confidence: 'high' | 'medium' | 'low' | null; raw: string }>;
  instructions: number;
  warnings: ImportWarning[];
}

/** All state, derived lists and handlers of the Custom page (Meals / Recipes / Foods). Rendered by `PreBuiltMealsView.tsx`. */
export function usePreBuiltMealsState() {
  const { setActiveTab } = useNavActions();
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
    favoriteFoods,
    rememberFood,
    language,
    selectedDate,
    setIsBarcodeOpen,
    setIsCustomFoodOpen,
    setTargetMealSlot,
    settings,

    t,
  } = useApp();
  const { options: mealSlots, label: slotLabel } = useMealSlots();
  const autoMealSlot = useAutoMealSlot();
  const j = useJournalText();
  const journalDockActions = useCustomDockActions();
  // The pages below are not opened from a meal: the meal preselected is the one that fits the time of day.
  const openBarcode = () => { setTargetMealSlot(autoMealSlot()); setIsBarcodeOpen(true); };
  const openCustomFood = () => { setTargetMealSlot(autoMealSlot()); setIsCustomFoodOpen(true); };
  const ultraMinimal = settings.ultraMinimal;

  const savedRecipes = useMemo(() => allFoods.filter((f) => f.isRecipe), [allFoods]);
  // id -> food, built once per change of the food list. The Custom page used to run `allFoods.find(...)` (a scan of
  // every bundled food) for each ingredient of each card on every render.
  const foodById = useMemo(() => new Map(allFoods.map((f) => [f.id, f])), [allFoods]);

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
  // Standard portion of the recipe in g (0 = none): the amount offered when the recipe is logged.
  const [recipePortion, setRecipePortion] = useState(0);

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
    // Closed by default: only a header row is built for each section until the user opens it (remembered after that).
    { meals: false, recipes: false, foods: false }
  );
  const toggleSection = (key: 'meals' | 'recipes' | 'foods') =>
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  // "Go to the meal" from the photo viewer: show the saved meal / recipe the picture belongs to.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<unknown>).detail;
      if (typeof id !== 'string') return;
      setSectionsOpen((prev) => ({ ...prev, meals: true, recipes: true }));
      setOpenMeals((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setOpenRecipes((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };
    window.addEventListener('kc:open-library', onOpen);
    return () => window.removeEventListener('kc:open-library', onOpen);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Delete confirmation for meals and recipes.
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'meal' | 'recipe'; id: string; name: string } | null>(null);

  const nameOf = (f: FoodItem) => (language === 'it' ? f.name_it : f.name_en || f.name_de);

  const calculateMealNutrition = (ingredients: PreBuiltMealIngredient[]) => {
    let totalKcal = 0, carbs = 0, protein = 0, fat = 0, fiber = 0, salt = 0, sugar = 0;
    for (const ing of ingredients) {
      const food = foodById.get(ing.foodId);
      if (!food) continue;
      const factor = ing.amount / 100;
      totalKcal += food.calories * factor;
      if (food.carbs !== null) carbs += food.carbs * factor;
      if (food.protein !== null) protein += food.protein * factor;
      if (food.fat !== null) fat += food.fat * factor;
      if (food.fiber !== null) fiber += food.fiber * factor;
      if (food.salt !== null) salt += food.salt * factor;
      if (food.sugar != null) sugar += food.sugar * factor;
    }
    return {
      totalKcal: Math.round(totalKcal),
      carbs: Math.round(carbs * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      salt: Math.round(salt * 100) / 100,
      sugar: Math.round(sugar * 10) / 10,
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const newMealNutrition = useMemo(() => calculateMealNutrition(newIngredients), [newIngredients, foodById]);
  // Nutrition of every saved meal, computed once per change of the meals / foods (not on each render of the page).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mealNutrition = useMemo(
    () => new Map(preBuiltMeals.map((m) => [m.id, calculateMealNutrition(m.ingredients)])),
    [preBuiltMeals, foodById],
  );

  const openNewMealModal = () => {
    setEditingMealId(null);
    setNewMealName('');
    setNewMealDesc('');
    setNewMealSlot(autoMealSlot());
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
    setSelectedSlot(meal.slot ?? autoMealSlot());
  };

  const confirmLogToSlot = () => {
    if (!activeMealToLog) return;
    logPreBuiltMealToSlot(activeMealToLog.id, selectedSlot, selectedDate);
    setActiveMealToLog(null);
  };

  const handleSelectFood = (food: FoodItem) => {
    rememberFood(food);
    setPendingFood(food);
    setPendingAmount(getDefaultAmount(food));
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

  // The offline Open Food Facts catalogue also feeds the ingredient searches. It is searched in a worker and only
  // once two characters are typed (utils/catalogueSearch.ts); the lists follow the typing a moment later.
  const ingredientQuery = useDeferredValue(ingredientSearch.trim());
  const recipeFoodQuery = useDeferredValue(recipeSearch.trim());
  const { foods: ingredientCatalogue } = useCatalogueSearch(ingredientQuery, isCreateOpen, 30);
  const { foods: recipeCatalogue } = useCatalogueSearch(recipeFoodQuery, isRecipeOpen, 30);

  const favoriteIds = useMemo(() => favoriteFoods ?? [], [favoriteFoods]);

  const filteredFoodsForSearch = useMemo(() => {
    const q = ingredientQuery;
    if (q.length < 2) return [];
    const local = searchFoods(allFoods, q);
    const seen = new Set(local.map((x) => x.f.id));
    const catalogue = ingredientCatalogue
      .filter((f) => !seen.has(f.id))
      .map((f) => ({ f, score: catalogueScore(q) }));
    const ranked = [...local, ...catalogue].sort((a, b) => a.score - b.score);
    // Favourites that directly match the text come first (same rule as Add Food).
    return pinCoherentFavorites(ranked, favoriteIds, (x) => x.f.id, (x) => x.score, q).slice(0, 40).map((x) => x.f);
  }, [allFoods, ingredientQuery, ingredientCatalogue, favoriteIds]);

  const recipeResults = useMemo(() => {
    const q = recipeFoodQuery;
    if (q.length < 2) return [];
    const local = searchFoods(allFoods, q);
    const seen = new Set(local.map((x) => x.f.id));
    const catalogue = recipeCatalogue
      .filter((f) => !seen.has(f.id))
      .map((f) => ({ f, score: catalogueScore(q) }));
    const ranked = [...local, ...catalogue].sort((a, b) => a.score - b.score);
    return pinCoherentFavorites(ranked, favoriteIds, (x) => x.f.id, (x) => x.score, q).slice(0, 40).map((x) => x.f);
  }, [allFoods, recipeFoodQuery, recipeCatalogue, favoriteIds]);

  // One typed character: the favourites starting with it (Add Food does the same), instead of only a hint.
  const favoriteOneChar = (query: string) => {
    const q = query.trim();
    if (q.length !== 1) return [];
    return favoriteIds
      .map((id) => foodById.get(id))
      .filter((f): f is FoodItem => Boolean(f) && matchesFirstChar(f as FoodItem, q));
  };

  // ---- Import a recipe from a link ---------------------------------------------------------
  // The import never saves anything: it fills the recipe builder, which the user checks and saves
  // with the normal saveRecipe below. `importSummary` drives the "imported from …" banner there.
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importStage, setImportStage] = useState<ImportStage | null>(null);
  const [importError, setImportError] = useState<ImportErrorInfo | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  // Provenance of an imported recipe, saved into FoodItem.source on save.
  const [recipeSource, setRecipeSource] = useState<FoodSource | undefined>(undefined);
  // "Discard this recipe?" dialog, opened when the builder is closed with ingredients in it.
  const [confirmCloseRecipe, setConfirmCloseRecipe] = useState(false);

  const openImportModal = () => {
    setImportUrl('');
    setImportError(null);
    setImportStage(null);
    setImportStage(null);
    setIsImportOpen(true);
  };

  const closeImportModal = () => {
    setIsImportOpen(false);
    setImportStage(null);
  };

  const runImport = async () => {
    if (importBusy) return;
    setImportBusy(true);
    setImportError(null);
    setImportStage('fetching');
    try {
      const result = await importRecipeFromUrl(importUrl, {
        localFoods: allFoods,
        search: searchCatalogue,
        onStage: (stage) => setImportStage(stage),
      });
      const { draft } = result;
      // A product found in the offline catalogue is only usable as a recipe ingredient once it is
      // in `allFoods` (that is what the recipe totals read), which is exactly what tapping a search
      // result does — so the import remembers them the same way.
      for (const item of draft.items) rememberFood(item.food);
      // Hand the draft to the existing builder: same editing tools, same save path as a manual recipe.
      setEditingRecipeId(null);
      setRecipeName(draft.name);
      setRecipeIngs(draftToRecipeIngredients(draft));
      setRecipePortion(draft.portion);
      setRecipeSource(draft.source);
      setRecipeSearch('');
      setRecipePendingFood(null);
      setImportSummary({
        source: draft.source?.label,
        via: result.via,
        servings: draft.servings,
        portion: draft.portion,
        portionSource: draft.portionSource,
        coverage: draft.coverage,
        matched: draft.items.length,
        total: draft.items.length + draft.unmatched.length,
        totalGrams: draft.totalGrams,
        caloriesPer100: draft.nutritionPer100.calories,
        unmatched: draft.unmatched,
        seasonings: draft.seasonings,
        warnings: draft.warnings,
        lowConfidence: draft.items
          .map((item, index) => ({ index, foodId: item.food.id, confidence: item.confidence, raw: item.raw }))
          .filter((entry) => entry.confidence !== 'high'),
        instructions: draft.instructions.length,
      });
      setIsImportOpen(false);
      setIsRecipeOpen(true);
    } catch (error) {
      setImportError(
        error instanceof RecipeImportError
          ? { code: error.code, message: error.message, hint: error.hint }
          : {
              code: 'unknown',
              message: 'Could not import this page.',
              hint: 'Check the link and your connection, then try again.',
            },
      );
    } finally {
      setImportBusy(false);
      setImportStage(null);
    }
  };

  /**
   * "Sale q.b." is a seasoning, not an ingredient: it is kept out of the totals, and one tap adds it
   * with the pinch the page implied (1 g when the page gave nothing at all).
   */
  const addSeasoning = (index: number) => {
    const entry = importSummary?.seasonings[index];
    if (!entry) return;
    if (entry.food) {
      const food = entry.food;
      rememberFood(food);
      const amount = entry.grams && entry.grams > 0 ? entry.grams : 1;
      setRecipeIngs((prev) => [...prev, { foodId: food.id, amount }]);
    } else {
      setRecipeSearch(entry.query); // no product known: let the user pick one
    }
    setImportSummary((prev) =>
      prev ? { ...prev, seasonings: prev.seasonings.filter((_, i) => i !== index) } : prev,
    );
  };

  /** Fix one unmatched line by hand: prefill the ingredient search with what the page said. */
  const searchUnmatched = (query: string, index: number) => {
    setRecipeSearch(query);
    setImportSummary((prev) => (prev ? { ...prev, unmatched: prev.unmatched.filter((_, i) => i !== index) } : prev));
  };

  const clearImportSummary = () => {
    setImportSummary(null);
    setRecipeSource(undefined);
  };

  const recipeTotals = useMemo(() => {
    let g = 0, kcal = 0, c = 0, p = 0, f = 0, fib = 0, salt = 0, sugar = 0;
    for (const ing of recipeIngs) {
      const food = foodById.get(ing.foodId);
      if (!food) continue;
      const k = ing.amount / 100;
      g += ing.amount;
      kcal += food.calories * k;
      if (food.carbs !== null) c += food.carbs * k;
      if (food.protein !== null) p += food.protein * k;
      if (food.fat !== null) f += food.fat * k;
      if (food.fiber !== null) fib += food.fiber * k;
      if (food.salt !== null) salt += food.salt * k;
      if (food.sugar != null) sugar += food.sugar * k;
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
      sugar100: Math.round(sugar * per100 * 10) / 10,
    };
  }, [recipeIngs, foodById]);

  const openRecipeModal = () => {
    setEditingRecipeId(null);
    setRecipeName('');
    setRecipePortion(0);
    setRecipeIngs([]);
    setRecipePendingFood(null);
    setRecipeSearch('');
    setImportSummary(null);
    setRecipeSource(undefined);
    setIsRecipeOpen(true);
  };

  /**
   * Closing the builder with ingredients already added throws them away (an import can be a whole
   * recipe from a link), so the close button, the backdrop and the Escape/back gesture all go
   * through here first and ask for confirmation.
   */
  const requestCloseRecipeModal = () => {
    if (recipeIngs.length > 0) {
      setConfirmCloseRecipe(true);
      return;
    }
    closeRecipeModal();
  };

  const confirmDiscardRecipe = () => {
    setConfirmCloseRecipe(false);
    closeRecipeModal();
  };

  const cancelDiscardRecipe = () => setConfirmCloseRecipe(false);

  const closeRecipeModal = () => {
    setConfirmCloseRecipe(false);
    setIsRecipeOpen(false);
    setRecipePendingFood(null);
    setEditingRecipeId(null);
    setImportSummary(null);
    setRecipeSource(undefined);
  };

  const openEditRecipeModal = (recipe: FoodItem) => {
    setEditingRecipeId(recipe.id);
    setRecipeName(nameOf(recipe));
    setRecipePortion(recipe.portion && recipe.portion > 0 ? recipe.portion : 0);
    setRecipeIngs(recipe.recipeIngredients ? [...recipe.recipeIngredients] : []);
    setRecipePendingFood(null);
    setRecipeSearch('');
    setImportSummary(null);
    setRecipeSource(recipe.source);
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
      sugar: rt.sugar100,
      isCustom: true,
      isRecipe: true,
      recipeIngredients: validIngs,
      portion: recipePortion > 0 ? Math.round(recipePortion * 10) / 10 : undefined,
      source: recipeSource ?? existing?.source,
    };
    addCustomFood(payload); // upsert by id: keeps an edited recipe's identity
    closeRecipeModal();
  };

  const pendingKcal = pendingFood ? Math.round((pendingFood.calories * pendingAmount) / 100) : 0;

  const mealResults = useMemo(() => {
    const q = mealQuery.trim();
    if (q.length < 2) return [];
    return searchMeals(preBuiltMeals, q).slice(0, 35).map((x) => x.m);
  }, [preBuiltMeals, mealQuery]);

  const recipeListResults = useMemo(() => {
    const q = recipeQuery.trim();
    if (q.length < 2) return [];
    return searchFoods(savedRecipes, q, { combined: true }).slice(0, 35).map((x) => x.f);
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

  return {
    preBuiltMeals,
    addPreBuiltMeal,
    addCustomFood,
    deleteCustomFood,
    updatePreBuiltMeal,
    deletePreBuiltMeal,
    logPreBuiltMealToSlot,
    logFoodItem,
    allFoods,
    favoriteFoods,
    rememberFood,
    language,
    selectedDate,
    setIsBarcodeOpen,
    setIsCustomFoodOpen,
    setTargetMealSlot,
    setActiveTab,
    settings,
    t,
    mealSlots,
    slotLabel,
    autoMealSlot,
    j,
    journalDockActions,
    openBarcode,
    openCustomFood,
    ultraMinimal,
    savedRecipes,
    mealQuery,
    setMealQuery,
    recipeQuery,
    setRecipeQuery,
    activeMealToLog,
    setActiveMealToLog,
    selectedSlot,
    setSelectedSlot,
    isCreateOpen,
    setIsCreateOpen,
    editingMealId,
    setEditingMealId,
    newMealName,
    setNewMealName,
    newMealDesc,
    setNewMealDesc,
    newMealSlot,
    setNewMealSlot,
    newIngredients,
    setNewIngredients,
    pendingFood,
    setPendingFood,
    pendingAmount,
    setPendingAmount,
    ingredientSearch,
    setIngredientSearch,
    isRecipeOpen,
    setIsRecipeOpen,
    editingRecipeId,
    setEditingRecipeId,
    recipeName,
    setRecipeName,
    recipeIngs,
    setRecipeIngs,
    recipePendingFood,
    setRecipePendingFood,
    recipePendingAmt,
    setRecipePendingAmt,
    recipeSearch,
    setRecipeSearch,
    recipePortion,
    setRecipePortion,
    activeRecipeToLog,
    setActiveRecipeToLog,
    recipeLogSlot,
    setRecipeLogSlot,
    recipeLogAmount,
    setRecipeLogAmount,
    openRecipes,
    setOpenRecipes,
    openMeals,
    setOpenMeals,
    sectionsOpen,
    setSectionsOpen,
    toggleSection,
    pendingDelete,
    setPendingDelete,
    nameOf,
    calculateMealNutrition,
    mealNutrition,
    foodById,
    newMealNutrition,
    openNewMealModal,
    openEditMealModal,
    handleOpenLogModal,
    confirmLogToSlot,
    handleSelectFood,
    handleConfirmAndAddAnother,
    handleSaveMeal,
    favoriteIds,
    filteredFoodsForSearch,
    recipeResults,
    favoriteOneChar,
    recipeTotals,
    openRecipeModal,
    closeRecipeModal,
    requestCloseRecipeModal,
    confirmCloseRecipe,
    confirmDiscardRecipe,
    cancelDiscardRecipe,
    openEditRecipeModal,
    saveRecipe,
    isImportOpen,
    openImportModal,
    closeImportModal,
    importUrl,
    setImportUrl,
    importBusy,
    importStage,
    importError,
    runImport,
    importSummary,
    clearImportSummary,
    searchUnmatched,
    addSeasoning,
    pendingKcal,
    mealResults,
    recipeListResults,
    isMealFiltering,
    isRecipeFiltering,
    visibleMeals,
    visibleRecipes,
    searchInput,
  };
}

export type LibraryState = ReturnType<typeof usePreBuiltMealsState>;
