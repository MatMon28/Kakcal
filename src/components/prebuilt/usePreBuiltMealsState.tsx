import { useEffect, useState, useMemo } from 'react';
import { useApp, useNavActions } from '../../context/AppContext';
import { MealSlotId, PreBuiltMeal, PreBuiltMealIngredient, FoodItem, FoodSource } from '../../types';
import { useAutoMealSlot, useMealSlots } from '../../utils/mealSlots';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { searchCatalogue } from '../../utils/catalogueSearch';
import {
  importRecipeFromUrl,
  RecipeImportError,
  type ImportStage,
  type RecipeReviewLine,
  type ImportWarning,
  type RecipeImportErrorCode,
} from '../../utils/recipeImport';
import { searchFoods, searchMeals } from '../../utils/foodSearchIndex';
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

/** Import provenance shown while reviewing the recipe, never persisted separately. */
export interface ImportSummary {
  source?: string;
  servings: number | null;
  warnings: ImportWarning[];
}

export interface MealNutritionSummary {
  totalKcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  salt: number;
  sugar: number;
}

const foodByIdCache = new WeakMap<FoodItem[], Map<string, FoodItem>>();
const savedRecipesCache = new WeakMap<FoodItem[], FoodItem[]>();
const mealNutritionCache = new WeakMap<PreBuiltMeal[], WeakMap<Map<string, FoodItem>, Map<string, MealNutritionSummary>>>();

/** Returns a cached `id -> FoodItem` lookup map keyed by the `allFoods` array identity. */
export function getFoodByIdMap(allFoods: FoodItem[]): Map<string, FoodItem> {
  let cached = foodByIdCache.get(allFoods);
  if (!cached) {
    cached = new Map(allFoods.map((f) => [f.id, f]));
    foodByIdCache.set(allFoods, cached);
  }
  return cached;
}

/** Returns the cached `isRecipe` subset keyed by the `allFoods` array identity. */
export function getSavedRecipes(allFoods: FoodItem[]): FoodItem[] {
  let cached = savedRecipesCache.get(allFoods);
  if (!cached) {
    cached = allFoods.filter((f) => f.isRecipe);
    savedRecipesCache.set(allFoods, cached);
  }
  return cached;
}

function computeMealNutrition(ingredients: PreBuiltMealIngredient[], foodById: Map<string, FoodItem>): MealNutritionSummary {
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
}

/** Returns a cached `mealId -> MealNutritionSummary` map keyed by `(preBuiltMeals, foodById)`. */
export function getMealNutritionMap(
  preBuiltMeals: PreBuiltMeal[],
  foodById: Map<string, FoodItem>,
): Map<string, MealNutritionSummary> {
  let byFoodMap = mealNutritionCache.get(preBuiltMeals);
  if (!byFoodMap) {
    byFoodMap = new WeakMap();
    mealNutritionCache.set(preBuiltMeals, byFoodMap);
  }
  let cached = byFoodMap.get(foodById);
  if (!cached) {
    cached = new Map(preBuiltMeals.map((m) => [m.id, computeMealNutrition(m.ingredients, foodById)]));
    byFoodMap.set(foodById, cached);
  }
  return cached;
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
    rememberFood,
    language,
    selectedDate,
    setIsBarcodeOpen,
    setIsCustomFoodOpen,
    setIsAddFoodOpen,
    setFoodLogSeed,
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

  const savedRecipes = useMemo(() => getSavedRecipes(allFoods), [allFoods]);
  // id -> food, cached per `allFoods` identity so remounting Custom never rebuilds the map.
  const foodById = useMemo(() => getFoodByIdMap(allFoods), [allFoods]);

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
  const [pendingIngredient, setPendingIngredient] = useState<PreBuiltMealIngredient | null>(null);

  // Recipe builder (saves a multi-ingredient dish to the food database, per 100g)
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeRows, setRecipeRows] = useState<RecipeReviewLine[]>([]);
  const recipeIngs = useMemo(() => recipeRows.flatMap(({ foodId, amount }) => foodId && Number.isFinite(amount) && amount > 0 ? [{ foodId, amount }] : []), [recipeRows]);
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

  const calculateMealNutrition = (ingredients: PreBuiltMealIngredient[]) =>
    computeMealNutrition(ingredients, foodById);

  const newMealNutrition = useMemo(() => computeMealNutrition(newIngredients, foodById), [newIngredients, foodById]);
  // Nutrition of every saved meal, cached across remounts by `(preBuiltMeals, foodById)`.
  const mealNutrition = useMemo(
    () => getMealNutritionMap(preBuiltMeals, foodById),
    [preBuiltMeals, foodById],
  );

  const openNewMealModal = () => {
    setEditingMealId(null);
    setNewMealName('');
    setNewMealDesc('');
    setNewMealSlot(autoMealSlot());
    setNewIngredients([]);
    setPendingFood(null);
    setPendingIngredient(null);
    setIsCreateOpen(true);
  };

  const openEditMealModal = (meal: PreBuiltMeal) => {
    setEditingMealId(meal.id);
    setNewMealName(meal.name);
    setNewMealDesc(meal.description || '');
    setNewMealSlot(meal.slot || 'breakfast');
    setNewIngredients([...meal.ingredients]);
    setPendingFood(null);
    setPendingIngredient(null);
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

  const startFoodBatch = (slot: MealSlotId, items: { food: FoodItem; amount: number }[]) => {
    setFoodLogSeed(items);
    setTargetMealSlot(slot);
    setIsAddFoodOpen(true);
  };

  const handleSelectFood = (food: FoodItem, amount = getDefaultAmount(food), editing: PreBuiltMealIngredient | null = null) => {
    rememberFood(food);
    setPendingFood(food);
    setPendingAmount(amount);
    setPendingIngredient(editing);
  };

  const mergePending = (items: PreBuiltMealIngredient[]) => {
    if (!pendingFood || !Number.isFinite(pendingAmount) || pendingAmount <= 0) return items;
    const next = { foodId: pendingFood.id, amount: pendingAmount };
    return pendingIngredient ? items.map((item) => item === pendingIngredient ? next : item) : [...items, next];
  };

  const handleConfirmAndAddAnother = () => {
    if (!pendingFood || pendingAmount <= 0) return;
    setLastAmount(pendingFood.id, pendingAmount);
    setNewIngredients(mergePending);
    setPendingFood(null);
    setPendingIngredient(null);
  };

  const handleSaveMeal = (includePending = false) => {
    if (includePending && pendingFood && pendingAmount > 0) setLastAmount(pendingFood.id, pendingAmount);
    const validIngs = (includePending ? mergePending(newIngredients) : newIngredients).filter((i) => Number.isFinite(i.amount) && i.amount > 0);
    if (validIngs.length === 0) return;
    const fallbackName = validIngs
      .slice(0, 2)
      .map((i) => {
        const f = foodById.get(i.foodId);
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
        search: (q, limit) => searchCatalogue(q, limit, language),
        onStage: (stage) => setImportStage(stage),
      });
      const { draft } = result;
      // A product found in the offline catalogue is only usable as a recipe ingredient once it is
      // in `allFoods` (that is what the recipe totals read), which is exactly what tapping a search
      // result does — so the import remembers them the same way.
      for (const item of draft.items) rememberFood(item.food);
      setEditingRecipeId(null);
      setRecipeName(draft.name);
      setRecipeRows(draft.reviewLines);
      setRecipePortion(draft.portion);
      setRecipeSource(draft.source);
      setImportSummary({ source: draft.source?.label, servings: draft.servings, warnings: draft.warnings });
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
    setRecipeRows([]);
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
    if (recipeRows.length > 0 || recipeName.trim()) {
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
    setEditingRecipeId(null);
    setImportSummary(null);
    setRecipeSource(undefined);
  };

  const openEditRecipeModal = (recipe: FoodItem) => {
    setEditingRecipeId(recipe.id);
    setRecipeName(nameOf(recipe));
    setRecipePortion(recipe.portion && recipe.portion > 0 ? recipe.portion : 0);
    setRecipeRows((recipe.recipeIngredients ?? []).map((item, index) => ({ ...item, id: `saved-${index}` })));
    setImportSummary(null);
    setRecipeSource(recipe.source);
    setIsRecipeOpen(true);
  };

  const saveRecipe = (portion = recipePortion) => {
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
      portion: portion > 0 ? Math.round(portion * 10) / 10 : undefined,
      source: recipeSource ?? existing?.source,
    };
    addCustomFood(payload); // upsert by id: keeps an edited recipe's identity
    closeRecipeModal();
  };

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
    pendingIngredient,
    setPendingIngredient,
    isRecipeOpen,
    setIsRecipeOpen,
    editingRecipeId,
    setEditingRecipeId,
    recipeName,
    setRecipeName,
    recipeIngs,
    recipeRows,
    setRecipeRows,
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
    startFoodBatch,
    handleSelectFood,
    handleConfirmAndAddAnother,
    handleSaveMeal,
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
    mealResults,
    recipeListResults,
    isMealFiltering,
    isRecipeFiltering,
    visibleMeals,
    visibleRecipes,
  };
}

export type LibraryState = ReturnType<typeof usePreBuiltMealsState>;
