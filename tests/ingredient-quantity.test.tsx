import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FoodItem } from '../src/types';
import type { RecipeReviewLine } from '../src/utils/recipeImport';

// Quantity when choosing an ingredient, the pencil / Swap actions of a line, the meal builder laid out like the recipe
// builder, and the quick-add buttons shared with Log food.
const rice = { id: 'rice', name_de: 'Rice', name_it: 'Riso', name_en: 'Rice', store: 'Other', category: 'other', unit: 'g', calories: 130, carbs: 28, protein: 2, fat: 0, fiber: 0, salt: 0 } as unknown as FoodItem;
const oil = { id: 'oil', name_de: 'Olive oil', name_it: 'Olio', name_en: 'Olive oil', store: 'Other', category: 'other', unit: 'ml', calories: 884, carbs: 0, protein: 0, fat: 100, fiber: 0, salt: 0 } as unknown as FoodItem;

const labels = new Proxy({}, { get: () => 'label' });
const base = {
  common: { back: 'Back', close: 'Close', cancel: 'Cancel', confirmTitle: 'Confirm', delete: 'Delete' },
  prebuilt: { addIngredient: 'Add ingredient', saveMeal: 'Save meal', edit: 'Edit', newModalTitle: 'New meal', ingredientsCount: '{count} ingredients' },
  macros: { fiber: 'Fiber', salt: 'Salt', sugar: 'Sugar', carbs: 'Carbs', protein: 'Protein', fat: 'Fat' },
  foodModal: { searchPlaceholder: 'Search', recentItems: 'Recent', addCustomFood: 'Add custom food', barcodeScan: 'Barcode' },
};
const t: unknown = new Proxy(base, { get: (target, key: string) => (key in target ? (target as Record<string, unknown>)[key] : labels) });
const app = { t, language: 'en', settings: { trackSugar: false, quickFoods: ['rice', 'oil'] }, allFoods: [rice, oil], allDayLogs: {}, selectedDate: '2099-03-02', favoriteFoods: [] };

vi.mock('../src/context/AppContext', () => ({ useApp: () => app, useSettings: () => app }));
vi.mock('../src/utils/useCatalogueSearch', () => ({ useCatalogueSearch: () => ({ foods: [], pending: false }) }));

import { IngredientPicker } from '../src/components/common/IngredientPicker';
import { QuickFoodButtons } from '../src/components/common/QuickFoodButtons';
import { CreateMealModal } from '../src/components/prebuilt/CreateMealModal';
import { RecipeBuilderModal } from '../src/components/prebuilt/RecipeBuilderModal';
import type { LibraryState } from '../src/components/prebuilt/usePreBuiltMealsState';

afterEach(() => { cleanup(); document.body.innerHTML = ''; localStorage.clear(); });

const nameOf = (food: FoodItem) => food.name_en;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const has = (name: string | RegExp) => screen.queryByRole('button', { name }) !== null;
const quantityStep = () => document.querySelector('[data-ingredient-amount-step]');

describe('quick-add buttons', () => {
  it('are a three-column grid of tiles with the name and the kcal per 100 g / ml', () => {
    const onPick = vi.fn();
    render(<QuickFoodButtons foods={[rice, oil]} nameOf={nameOf} onPick={onPick} />);
    const grid = document.querySelector('[data-quick-foods]')!;
    expect(grid.className).toContain('grid-cols-3');
    expect([...grid.querySelectorAll('button')].map((tile) => tile.textContent)).toEqual(['Rice130 kcal/100g', 'Olive oil884 kcal/100ml']);
    fireEvent.click(button(/Olive oil/));
    expect(onPick).toHaveBeenCalledWith(oil);
  });

  it('render nothing without shortcuts', () => {
    render(<QuickFoodButtons foods={[]} nameOf={nameOf} onPick={() => {}} />);
    expect(document.querySelector('[data-quick-foods]')).toBeNull();
  });

  it('are the same tiles in the ingredient picker of the meal and recipe builders (no "Quick foods" pills)', () => {
    const onPick = vi.fn();
    render(<IngredientPicker onPick={onPick} />);
    const tiles = document.querySelectorAll('[data-ingredient-picker] [data-quick-foods] button');
    expect([...tiles].map((tile) => tile.textContent)).toEqual(['Rice130 kcal/100g', 'Olive oil884 kcal/100ml']);
    expect(screen.queryByText('Quick foods')).toBeNull();
    fireEvent.click(tiles[0]);
    expect(onPick).toHaveBeenCalledWith(rice);
  });

  it('Log food and the ingredient picker render the one shared component', () => {
    const logFood = readFileSync('src/components/modals/AddFoodModal.tsx', 'utf8');
    const picker = readFileSync('src/components/common/IngredientPicker.tsx', 'utf8');
    expect(logFood).toContain('<QuickFoodButtons foods={quickFoods}');
    expect(picker).toContain('<QuickFoodButtons foods={quick}');
    expect(logFood).not.toContain('grid grid-cols-3 gap-2'); // no private copy of the tiles is left behind
  });
});

interface RecipeStubs { recipeRows?: RecipeReviewLine[]; setRecipeRows?: (change: (rows: RecipeReviewLine[]) => RecipeReviewLine[]) => void; imported?: boolean }
const recipeState = ({ recipeRows = [{ id: 'row', foodId: 'rice', amount: 150 }], setRecipeRows = () => {}, imported = false }: RecipeStubs = {}) => ({
  foodById: new Map([[rice.id, rice], [oil.id, oil]]),
  rememberFood: () => {},
  settings: app.settings,
  t,
  j: (en: string) => en,
  isRecipeOpen: true,
  editingRecipeId: null,
  recipeName: 'Risotto',
  setRecipeName: () => {},
  recipeIngs: recipeRows.flatMap(({ foodId, amount }) => (foodId ? [{ foodId, amount }] : [])),
  recipeRows,
  setRecipeRows,
  recipePortion: 0,
  setRecipePortion: () => {},
  nameOf,
  recipeTotals: { grams: 150, kcal100: 130, c100: 28, p100: 2, f100: 0, fib100: 0, salt100: 0, sugar100: 0 },
  saveRecipe: () => {},
  importSummary: imported ? { source: 'example.org', servings: 2, warnings: [] } : null,
  requestCloseRecipeModal: () => {},
  confirmCloseRecipe: false,
  confirmDiscardRecipe: () => {},
  cancelDiscardRecipe: () => {},
}) as unknown as LibraryState;

describe('recipe builder: quantity and nutrition when choosing a food', () => {
  it('shows the quantity, kcal and macros of every chosen ingredient', () => {
    render(<RecipeBuilderModal s={recipeState()} />);
    const line = document.querySelector('[data-review-line]')!;
    expect(line.querySelector('[data-ingredient-amount]')!.textContent).toBe(' · 150 g');
    expect(line.querySelector('[data-calories]')!.textContent).toBe('195 kcal');
    expect(line.querySelector('[data-macro-pills]')).toBeTruthy();
  });

  it('asks for the quantity after a food is picked and only then adds it', () => {
    const setRecipeRows = vi.fn();
    render(<RecipeBuilderModal s={recipeState({ setRecipeRows })} />);
    fireEvent.click(button('Add ingredient'));
    fireEvent.click(button(/Olive oil/)); // a quick-add tile of the picker
    expect(quantityStep()?.getAttribute('data-ingredient-amount-step')).toBe('add');
    expect(setRecipeRows).not.toHaveBeenCalled();
    expect(has('Add more')).toBe(true);
    fireEvent.click(button('Add to recipe'));
    const rows = setRecipeRows.mock.calls[0][0]([{ id: 'row', foodId: 'rice', amount: 150 }]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ foodId: 'oil' });
    expect(rows[1].amount).toBeGreaterThan(0);
    expect(quantityStep()).toBeNull();
    expect(document.querySelector('[data-ingredient-review]')).toBeTruthy(); // back on the ingredient list
  });

  it('"Add more" keeps the food and opens the picker again; Back returns to the search', () => {
    const setRecipeRows = vi.fn();
    render(<RecipeBuilderModal s={recipeState({ setRecipeRows })} />);
    fireEvent.click(button('Add ingredient'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'r' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(button(/Rice/));
    fireEvent.click(button('Back'));
    expect(quantityStep()).toBeNull();
    expect(document.querySelector('[data-ingredient-picker]')).toBeTruthy();
    expect(setRecipeRows).not.toHaveBeenCalled();
    fireEvent.click(button(/Rice/));
    fireEvent.click(button('Add more'));
    expect(setRecipeRows).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-ingredient-picker]')).toBeTruthy();
    expect(quantityStep()).toBeNull();
  });
});

describe('recipe builder: pencil and Swap', () => {
  it('a recipe made by hand: the pencil (icon only) changes the quantity, there is no swap', () => {
    const setRecipeRows = vi.fn();
    render(<RecipeBuilderModal s={recipeState({ setRecipeRows })} />);
    expect(document.querySelector('[data-ingredient-swap]')).toBeNull();
    const pencil = button('Change amount for Rice');
    expect(pencil.textContent).toBe('');
    expect(pencil.querySelector('svg')).toBeTruthy();
    fireEvent.click(pencil);
    expect(quantityStep()?.getAttribute('data-ingredient-amount-step')).toBe('edit');
    expect(document.querySelector('[data-ingredient-picker]')).toBeNull(); // the food is not replaced
    expect(has('Add more')).toBe(false);
    const field = quantityStep()!.querySelector('input')!;
    fireEvent.change(field, { target: { value: '240' } });
    fireEvent.blur(field);
    fireEvent.click(button('Save amount'));
    expect(setRecipeRows.mock.calls[0][0]([{ id: 'row', foodId: 'rice', amount: 150 }])).toEqual([{ id: 'row', foodId: 'rice', amount: 240 }]);
  });

  it('a recipe read from a website: pencil without text for the quantity, Swap with icon and text for the food', () => {
    const setRecipeRows = vi.fn();
    const rows: RecipeReviewLine[] = [{ id: 'row', raw: '150 g rice', query: 'rice', automatic: rice, foodId: 'rice', amount: 150 }];
    render(<RecipeBuilderModal s={recipeState({ recipeRows: rows, setRecipeRows, imported: true })} />);
    const pencil = button('Change amount for 150 g rice');
    expect(pencil.textContent).toBe('');
    const swap = button('Swap 150 g rice');
    expect(swap.textContent).toBe('Swap');
    expect(swap.querySelector('svg')).toBeTruthy();

    fireEvent.click(pencil);
    expect(quantityStep()?.getAttribute('data-ingredient-amount-step')).toBe('edit');
    fireEvent.click(button('Back'));

    fireEvent.click(button('Swap 150 g rice'));
    expect(document.querySelector('[data-ingredient-picker]')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(button(/Olive oil/));
    expect(quantityStep()?.getAttribute('data-ingredient-amount-step')).toBe('swap');
    fireEvent.click(button('Use this food'));
    const next = setRecipeRows.mock.calls[0][0](rows);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: 'row', raw: '150 g rice', foodId: 'oil' });
  });

  it('a line without a food offers Search and Use match, not the pencil', () => {
    const rows: RecipeReviewLine[] = [{ id: 'row', raw: '1 cup rice', query: 'rice', automatic: rice, amount: 150 }];
    render(<RecipeBuilderModal s={recipeState({ recipeRows: rows, imported: true })} />);
    expect(button('Search for 1 cup rice').textContent).toBe('Search');
    expect(has('Use match')).toBe(true);
    expect(document.querySelector('[data-ingredient-edit]')).toBeNull();
  });
});

interface MealStubs { pendingFood?: FoodItem | null; pendingIngredient?: { foodId: string; amount: number } | null; handleSelectFood?: () => void; handleConfirmAndAddAnother?: () => void; handleSaveMeal?: () => void }
const ingredient = { foodId: 'rice', amount: 150 };
const mealState = (stubs: MealStubs = {}) => ({
  foodById: new Map([[rice.id, rice], [oil.id, oil]]),
  settings: app.settings,
  t,
  j: (en: string) => en,
  mealSlots: [{ id: 'lunch', label: 'Lunch' }, { id: 'dinner', label: 'Dinner' }],
  isCreateOpen: true,
  setIsCreateOpen: () => {},
  editingMealId: null,
  newMealName: 'Rice bowl',
  setNewMealName: () => {},
  newMealDesc: '',
  setNewMealDesc: () => {},
  newMealSlot: 'lunch',
  setNewMealSlot: () => {},
  newIngredients: [ingredient],
  setNewIngredients: () => {},
  pendingFood: null,
  setPendingFood: () => {},
  pendingAmount: 20,
  setPendingAmount: () => {},
  pendingIngredient: null,
  setPendingIngredient: () => {},
  nameOf,
  newMealNutrition: { totalKcal: 195, carbs: 42, protein: 3, fat: 0, fiber: 0, salt: 0, sugar: 0 },
  handleSelectFood: () => {},
  handleConfirmAndAddAnother: () => {},
  handleSaveMeal: () => {},
  ...stubs,
}) as unknown as LibraryState;

describe('meal builder laid out like the recipe builder', () => {
  it('uses the recipe builder line: quantity, kcal, macros, icon-only pencil, bin, and a recap', () => {
    const handleSelectFood = vi.fn();
    const handleSaveMeal = vi.fn();
    render(<CreateMealModal s={mealState({ handleSelectFood, handleSaveMeal })} />);
    const line = document.querySelector('[data-ingredient-review] [data-review-line]')!;
    expect(line.querySelector('[data-ingredient-amount]')!.textContent).toBe(' · 150 g');
    expect(line.querySelector('[data-calories]')!.textContent).toBe('195 kcal');
    expect(document.querySelector('[data-ingredient-swap]')).toBeNull();
    expect(document.querySelector('[data-meal-recap] [data-calories]')!.textContent).toBe('195 kcal');
    const pencil = button('Change amount for Rice');
    expect(pencil.textContent).toBe('');
    fireEvent.click(pencil);
    expect(handleSelectFood).toHaveBeenCalledWith(rice, 150, ingredient);
    expect(has('Delete: Rice')).toBe(true);
    expect(has('Add ingredient')).toBe(true);
    fireEvent.click(button('Save meal'));
    expect(handleSaveMeal).toHaveBeenCalledTimes(1);
  });

  it('opens the picker with the quick-add tiles of Log food and hands the food to the quantity step', () => {
    const handleSelectFood = vi.fn();
    render(<CreateMealModal s={mealState({ handleSelectFood })} />);
    fireEvent.click(button('Add ingredient'));
    expect(document.querySelectorAll('[data-ingredient-picker] [data-quick-foods] button')).toHaveLength(2);
    fireEvent.click(button(/Olive oil/));
    expect(handleSelectFood.mock.calls[0][0]).toBe(oil);
  });

  it('a new food: Add more / Add to meal; the pencil: Save amount only', () => {
    const handleConfirmAndAddAnother = vi.fn();
    const view = render(<CreateMealModal s={mealState({ pendingFood: oil, handleConfirmAndAddAnother })} />);
    expect(quantityStep()?.getAttribute('data-ingredient-amount-step')).toBe('add');
    expect(has('Add more')).toBe(true);
    expect(has('Save meal')).toBe(false);
    fireEvent.click(button('Add to meal'));
    expect(handleConfirmAndAddAnother).toHaveBeenCalledTimes(1);
    view.rerender(<CreateMealModal s={mealState({ pendingFood: rice, pendingIngredient: ingredient, handleConfirmAndAddAnother })} />);
    expect(quantityStep()?.getAttribute('data-ingredient-amount-step')).toBe('edit');
    expect(has('Add more')).toBe(false);
    expect(has('Save amount')).toBe(true);
  });
});
