import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MealSlotId, PreBuiltMeal, PreBuiltMealIngredient, FoodItem } from '../../types';
import { Modal } from '../common/Modal';
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
  ScanBarcode,
  ChefHat as ChefHatIcon,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { usePersistentState } from '../../utils/usePersistentState';

export const PreBuiltMealsView: React.FC = () => {
  const {
    preBuiltMeals,
    addPreBuiltMeal,
    addCustomFood,
    updatePreBuiltMeal,
    deletePreBuiltMeal,
    logPreBuiltMealToSlot,
    logFoodItem,
    allFoods,
    language,
    selectedDate,
    setIsBarcodeOpen,
    setIsCustomFoodOpen,
    t,
  } = useApp();

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

  const newMealNutrition = useMemo(() => calculateMealNutrition(newIngredients), [newIngredients, allFoods]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const fallbackName = validIngs.slice(0, 2).map((i) => {
      const f = allFoods.find((x) => x.id === i.foodId);
      return f ? nameOf(f).split(' ')[0] : 'Meal';
    }).join(' + ');
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
      .map((f) => ({ f, score: Math.min(fuzzyScore(q, f.name_de), fuzzyScore(q, f.name_it), fuzzyScore(q, f.name_en), fuzzyScore(q, f.brand || '')) }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']))
      .sort((a, b) => a.score - b.score)
      .slice(0, 35)
      .map((x) => x.f);
  }, [allFoods, ingredientSearch]);

  const recipeResults = useMemo(() => {
    const q = recipeSearch.trim();
    if (q.length < 2) return [];
    return allFoods
      .map((f) => ({ f, score: Math.min(fuzzyScore(q, f.name_de), fuzzyScore(q, f.name_it), fuzzyScore(q, f.name_en)) }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en]))
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
    setRecipeName('');
    setRecipeIngs([]);
    setRecipePendingFood(null);
    setRecipeSearch('');
    setIsRecipeOpen(true);
  };

  const saveRecipe = () => {
    if (!recipeName.trim() || recipeIngs.length === 0) return;
    const rt = recipeTotals;
    addCustomFood({
      id: 'recipe-' + Date.now(),
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
    });
    setIsRecipeOpen(false);
    alert(t.prebuilt.recipeSaved);
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

  const visibleMeals = mealQuery.trim().length >= 2 ? mealResults : preBuiltMeals;
  const visibleRecipes = recipeQuery.trim().length >= 2 ? recipeListResults : savedRecipes;

  const searchInput = (value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div className="relative">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t.settings.searchText}
        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl pl-9 pr-9 py-2 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs font-bold"
          aria-label={t.common.close}
        >
          ✕
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-24">
      {/* ============ MEALS (peach section, white buttons) ============ */}
      <section className="bg-[#FAE0B4] rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[var(--surface)] text-[#7D4E14] flex items-center justify-center shrink-0">
              <UtensilsCrossed size={17} />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#7D4E14]">{t.prebuilt.title}</h2>
          </div>
          <button
            type="button"
            onClick={openNewMealModal}
            className="shrink-0 px-4 py-2.5 rounded-full bg-[var(--surface)] hover:opacity-90 text-[#7D4E14] font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-opacity"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{t.prebuilt.createNew}</span>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">{searchInput(mealQuery, setMealQuery)}</div>
        </div>

        {visibleMeals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleMeals.map((meal) => {
              const nut = calculateMealNutrition(meal.ingredients);
              const isOpen = openMeals.includes(meal.id);
              return (
                <div key={meal.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 flex flex-col justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMeals((prev) => (prev.includes(meal.id) ? prev.filter((x) => x !== meal.id) : [...prev, meal.id]))
                    }
                    className="w-full flex items-start justify-between gap-2 text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-[var(--text)]">{meal.name}</h3>
                        {meal.slot && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14]">
                            {t.mealSlots[meal.slot]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-[var(--muted)] flex-wrap">
                        <span className="text-[var(--text)]">{formatKcal(nut.totalKcal)} kcal</span>
                        <span>·</span>
                        <span>C {nut.carbs}g</span>
                        <span>·</span>
                        <span>P {nut.protein}g</span>
                        <span>·</span>
                        <span>F {nut.fat}g</span>
                        <ChevronDown size={13} className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div>
                      {meal.description && <p className="text-xs text-[var(--muted)]">{meal.description}</p>}
                      <div className="grid grid-cols-5 gap-1.5 pt-3 text-center">
                        <div className="bg-[#FAE0B4] p-1.5 rounded-2xl text-[#7D4E14]">
                          <span className="text-[10px] font-bold block">C</span>
                          <span className="text-xs font-extrabold">{nut.carbs}g</span>
                        </div>
                        <div className="bg-[#F6D0D0] p-1.5 rounded-2xl text-[#7A2727]">
                          <span className="text-[10px] font-bold block">P</span>
                          <span className="text-xs font-extrabold">{nut.protein}g</span>
                        </div>
                        <div className="bg-[#E2D6FF] p-1.5 rounded-2xl text-[#4D3582]">
                          <span className="text-[10px] font-bold block">F</span>
                          <span className="text-xs font-extrabold">{nut.fat}g</span>
                        </div>
                        <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]">
                          <span className="text-[10px] font-bold block">Fib</span>
                          <span className="text-xs font-extrabold">{nut.fiber}g</span>
                        </div>
                        <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]">
                          <span className="text-[10px] font-bold block">Salt</span>
                          <span className="text-xs font-extrabold">{nut.salt}g</span>
                        </div>
                      </div>

                      <div className="mt-3 bg-[var(--inset)] rounded-2xl p-2.5 divide-y divide-[var(--border)]">
                        {meal.ingredients.map((ing, idx) => {
                          const food = allFoods.find((f) => f.id === ing.foodId);
                          return (
                            <div key={idx} className="py-1 flex items-center justify-between text-xs text-[var(--text)]">
                              <span className="font-medium truncate pr-2">{food ? nameOf(food) : ing.foodId}</span>
                              <span className="font-bold text-[var(--muted)] shrink-0">
                                {ing.amount}
                                {food?.unit || 'g'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => handleOpenLogModal(meal)}
                      className="flex-1 py-2.5 px-3 bg-[#FAE0B4] hover:bg-[#F7D69E] text-[#7D4E14] font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>{t.prebuilt.logMeal}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditMealModal(meal)}
                      className="w-9 h-9 rounded-2xl bg-[var(--inset)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
                      title={t.common.edit}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreBuiltMeal(meal.id)}
                      className="w-9 h-9 rounded-2xl bg-[var(--inset)] text-[var(--muted)] hover:text-[#8C2D32] flex items-center justify-center transition-colors"
                      title={t.common.delete}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ RECIPES (lavender section, white buttons) ============ */}
      <section className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[var(--surface)] text-[#4D3582] flex items-center justify-center shrink-0">
              <ChefHatIcon size={17} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-[#4D3582]">{t.prebuilt.recipesTitle}</h2>
              <p className="text-[11px] font-medium text-[#4D3582]/70 truncate">{t.prebuilt.recipesDesc}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openRecipeModal}
            className="shrink-0 px-4 py-2.5 rounded-full bg-[var(--surface)] hover:opacity-90 text-[#4D3582] font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-opacity"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{t.prebuilt.createRecipe}</span>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">{searchInput(recipeQuery, setRecipeQuery)}</div>
        </div>

        {visibleRecipes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleRecipes.map((recipe) => {
              const isOpen = openRecipes.includes(recipe.id);
              const kcal = (amt: number) => Math.round((recipe.calories * amt) / 100);
              return (
                <div key={recipe.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenRecipes((prev) => (prev.includes(recipe.id) ? prev.filter((x) => x !== recipe.id) : [...prev, recipe.id]))
                    }
                    className="w-full flex items-center justify-between gap-2 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm sm:text-base font-extrabold text-[var(--text)] truncate">
                        {nameOf(recipe)}
                      </span>
                      <span className="block text-[11px] font-bold text-[var(--muted)] mt-0.5">
                        {recipe.calories} kcal/100{recipe.unit} · C {recipe.carbs ?? '—'}g · P {recipe.protein ?? '—'}g · F {recipe.fat ?? '—'}g
                      </span>
                    </span>
                    <ChevronDown size={15} className={`shrink-0 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="pt-3 space-y-2.5">
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        <div className="bg-[#FAE0B4] p-1.5 rounded-2xl text-[#7D4E14]">
                          <span className="text-[10px] font-bold block">C</span>
                          <span className="text-xs font-extrabold">{recipe.carbs ?? '—'}g</span>
                        </div>
                        <div className="bg-[#F6D0D0] p-1.5 rounded-2xl text-[#7A2727]">
                          <span className="text-[10px] font-bold block">P</span>
                          <span className="text-xs font-extrabold">{recipe.protein ?? '—'}g</span>
                        </div>
                        <div className="bg-[#E2D6FF] p-1.5 rounded-2xl text-[#4D3582]">
                          <span className="text-[10px] font-bold block">F</span>
                          <span className="text-xs font-extrabold">{recipe.fat ?? '—'}g</span>
                        </div>
                        <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]">
                          <span className="text-[10px] font-bold block">Fib</span>
                          <span className="text-xs font-extrabold">{recipe.fiber ?? '—'}g</span>
                        </div>
                        <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]">
                          <span className="text-[10px] font-bold block">Salt</span>
                          <span className="text-xs font-extrabold">{recipe.salt ?? '—'}g</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRecipeToLog(recipe);
                          setRecipeLogSlot('lunch');
                          setRecipeLogAmount(100);
                        }}
                        className="w-full py-2.5 px-3 bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus size={15} strokeWidth={2.5} />
                        <span>
                          {t.prebuilt.logRecipe} · {kcal(100)} kcal/100g
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ FOODS (mint section, white buttons, with icon) ============ */}
      <section className="bg-[#C9EFD3] rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[var(--surface)] text-[#174A2B] flex items-center justify-center shrink-0">
            <BookOpen size={17} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-[#174A2B]">{t.database.title}</h2>
            <p className="text-[11px] font-medium text-[#174A2B]/70 truncate">{t.settings.foodsDesc}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsCustomFoodOpen(true)}
            className="w-full min-w-0 px-3 py-2.5 rounded-full bg-[var(--surface)] text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          >
            <Plus size={16} strokeWidth={2.5} className="shrink-0" />
            <span className="truncate">{t.prebuilt.addCustomFoodBtn}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBarcodeOpen(true)}
            className="w-full min-w-0 px-3 py-2.5 rounded-full bg-[var(--surface)] text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          >
            <ScanBarcode size={16} className="shrink-0" />
            <span className="truncate">{t.prebuilt.barcode}</span>
          </button>
        </div>
      </section>

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
                className={`p-3 rounded-2xl border text-xs font-bold text-center transition-colors ${
                  selectedSlot === slot.id
                    ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                    : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={confirmLogToSlot}
            className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
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
                className={`p-3 rounded-2xl border text-xs font-bold text-center transition-colors ${
                  recipeLogSlot === slot.id
                    ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                    : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
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
                logFoodItem(recipeLogSlot, activeRecipeToLog, recipeLogAmount, selectedDate);
                setActiveRecipeToLog(null);
              }
            }}
            disabled={recipeLogAmount <= 0}
            className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
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
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              <span>{t.common.back}</span>
            </button>

            <div className="flex items-center justify-between bg-[var(--inset)] rounded-2xl px-4 py-3">
              <span className="text-xs font-bold text-[var(--muted)]">
                {pendingFood.store} · {pendingFood.calories} kcal / 100{pendingFood.unit}
              </span>
              <div>
                <span className="text-2xl font-extrabold text-[#174A2B]">{pendingKcal}</span>
                <span className="text-xs font-bold text-[#25633E] ml-1">kcal</span>
              </div>
            </div>

            <AmountSelector value={pendingAmount} onChange={setPendingAmount} unit={pendingFood.unit} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirmAndAddAnother}
                disabled={pendingAmount <= 0}
                className="w-full py-3 px-4 bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-colors disabled:opacity-40"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>{t.prebuilt.addAnotherIngredient}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveMeal(true)}
                disabled={pendingAmount <= 0 && newIngredients.length === 0}
                className="w-full py-3 px-4 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-colors disabled:opacity-40"
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
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-sm font-bold focus:outline-none"
            />

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {mealSlots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setNewMealSlot(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                    newMealSlot === s.id
                      ? 'bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]'
                      : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
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
                  <span className="text-xs font-extrabold text-[#174A2B]">{newMealNutrition.totalKcal} kcal</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {newIngredients.map((ing, idx) => {
                    const food = allFoods.find((f) => f.id === ing.foodId);
                    const kcal = food ? Math.round((food.calories * ing.amount) / 100) : 0;
                    return (
                      <div key={idx} className="px-3 py-2 rounded-xl bg-[var(--surface)] flex items-center justify-between gap-2 text-xs">
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
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-[var(--muted)]">{kcal} kcal</span>
                          <button
                            type="button"
                            onClick={() => setNewIngredients((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-[#8C2D32] hover:opacity-75"
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
              <span className="text-xs font-bold text-[var(--muted)] block">{t.prebuilt.pickIngredientPrompt}</span>
              {searchInput(ingredientSearch, setIngredientSearch, t.foodModal.searchPlaceholder)}
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
                        className="w-full p-3 hover:bg-[var(--border)] text-left flex items-center justify-between gap-3 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="text-sm font-bold text-[var(--text)] truncate block">{nameOf(food)}</span>
                          <span className="text-[11px] text-[var(--muted)]">{food.store}</span>
                        </span>
                        <span className="text-xs font-extrabold text-[var(--muted)] shrink-0">
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
                className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
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

      {/* ============ Create recipe modal ============ */}
      <Modal
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
        title={recipePendingFood ? nameOf(recipePendingFood) : t.prebuilt.recipeTitle}
        maxWidth="max-w-xl"
      >
        {recipePendingFood ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setRecipePendingFood(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              <span>{t.common.back}</span>
            </button>

            <div className="flex items-center justify-between bg-[var(--inset)] rounded-2xl px-4 py-3">
              <span className="text-xs font-bold text-[var(--muted)]">
                {recipePendingFood.calories} kcal / 100{recipePendingFood.unit}
              </span>
              <span className="text-lg font-extrabold text-[#4D3582]">
                {Math.round((recipePendingFood.calories * recipePendingAmt) / 100)} kcal
              </span>
            </div>

            <AmountSelector value={recipePendingAmt} onChange={setRecipePendingAmt} unit={recipePendingFood.unit} />

            <button
              type="button"
              onClick={() => {
                if (recipePendingAmt > 0) {
                  setLastAmount(recipePendingFood.id, recipePendingAmt);
                  setRecipeIngs((prev) => [...prev, { foodId: recipePendingFood.id, amount: recipePendingAmt }]);
                }
                setRecipePendingFood(null);
                setRecipeSearch('');
              }}
              className="w-full py-3 bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
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
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none"
            />

            {recipeIngs.length > 0 && (
              <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[var(--text)]">
                    {t.prebuilt.ingredientsCount.replace('{count}', String(recipeIngs.length))} · {recipeTotals.grams}g
                  </span>
                  <span className="text-xs font-extrabold text-[#4D3582]">{recipeTotals.kcal100} kcal/100g</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-bold">
                  <span className="bg-[#FAE0B4] text-[#7D4E14] rounded-lg py-1">C {recipeTotals.c100}</span>
                  <span className="bg-[#F6D0D0] text-[#7A2727] rounded-lg py-1">P {recipeTotals.p100}</span>
                  <span className="bg-[#E2D6FF] text-[#4D3582] rounded-lg py-1">F {recipeTotals.f100}</span>
                  <span className="bg-[#CFE7FE] text-[#183B5E] rounded-lg py-1">Fib {recipeTotals.fib100}</span>
                  <span className="bg-[var(--surface)] text-[var(--muted)] rounded-lg py-1">Salt {recipeTotals.salt100}</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {recipeIngs.map((ing, idx) => {
                    const food = allFoods.find((f) => f.id === ing.foodId);
                    return (
                      <div key={idx} className="px-3 py-1.5 rounded-xl bg-[var(--surface)] flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text)] truncate">
                          {food ? nameOf(food) : ing.foodId} ({ing.amount}
                          {food?.unit || 'g'})
                        </span>
                        <button
                          type="button"
                          onClick={() => setRecipeIngs((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#8C2D32]"
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
                        className="w-full p-3 hover:bg-[var(--border)] text-left flex items-center justify-between gap-3 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="text-sm font-bold text-[var(--text)] truncate block">{nameOf(food)}</span>
                          <span className="text-[11px] text-[var(--muted)]">{food.store}</span>
                        </span>
                        <span className="text-xs font-extrabold text-[var(--muted)] shrink-0">
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
                disabled={!recipeName.trim()}
                className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
              >
                <Check size={18} strokeWidth={2.5} />
                <span>
                  {t.prebuilt.saveMeal} · {t.prebuilt.recipeNote}: {recipeTotals.kcal100} kcal
                </span>
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
