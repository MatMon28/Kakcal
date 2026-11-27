import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The dialog's own texts have to be unique to be found, so they are real; anything else the
// builder or a child asks for comes back as a plain string.
const labels = new Proxy({}, { get: () => 'label' });
const base = {
  common: { back: 'Back', close: 'Close', cancel: 'Cancel', confirmTitle: 'Confirm' },
  prebuilt: { addIngredient: 'Add ingredient', edit: 'Edit recipe', recipeTitle: 'New recipe', ingredientsCount: '{count} ingredients' },
  macros: { fiber: 'Fiber', salt: 'Salt', sugar: 'Sugar' },
  foodModal: { searchPlaceholder: 'Search' },
};
const t: unknown = new Proxy(base, { get: (target, key: string) => (key in target ? (target as Record<string, unknown>)[key] : labels) });

vi.mock('../src/context/AppContext', () => ({
  useApp: () => ({ t, settings: { trackSugar: false } }),
  useSettings: () => ({ t, settings: { trackSugar: false } }),
}));

import { RecipeBuilderModal } from '../src/components/prebuilt/RecipeBuilderModal';
import type { LibraryState } from '../src/components/prebuilt/usePreBuiltMealsState';
import { VERIFIED_FOODS } from '../src/data/verifiedFoods';

const food = VERIFIED_FOODS[0];
afterEach(() => { cleanup(); document.body.innerHTML = ''; });

interface Stubs {
  recipePortion?: number;
  setRecipePortion?: (grams: number) => void;
  requestCloseRecipeModal?: () => void;
  confirmCloseRecipe?: boolean;
  confirmDiscardRecipe?: () => void;
  cancelDiscardRecipe?: () => void;
}

/** The builder needs its whole library state; only the parts these tests read are meaningful. */
const state = (stubs: Stubs) => ({
  foodById: new Map([[food.id, food]]),
  rememberFood: () => {},
  settings: { trackSugar: false },
  t,
  j: (en: string) => en,
  isRecipeOpen: true,
  editingRecipeId: null,
  recipeName: 'Patate',
  setRecipeName: () => {},
  recipeIngs: [{ foodId: food.id, amount: 716 }],
  recipeRows: [{ id: 'row', foodId: food.id, amount: 716 }],
  setRecipeRows: () => {},
  recipePortion: 0,
  setRecipePortion: () => {},
  nameOf: () => food.name_en,
  recipeTotals: { grams: 716, kcal100: 90, c100: 10, p100: 2, f100: 1, fib100: 1, salt100: 0.1, sugar100: 1 },
  saveRecipe: () => {},
  importSummary: null,
  requestCloseRecipeModal: () => {},
  confirmCloseRecipe: false,
  confirmDiscardRecipe: () => {},
  cancelDiscardRecipe: () => {},
  ...stubs,
}) as unknown as LibraryState;

const chip = (label: string) => screen.getByRole('button', { name: label });

describe('quick portions in the builder', () => {
  it('shows fractions of the whole dish even when the portion is already set', () => {
    // An imported 716 g recipe for 2 servings: the portion arrived at 358 g. 1/2 must still be 358.
    render(<RecipeBuilderModal s={state({ recipePortion: 358 })} />);
    fireEvent.click(chip('Continue to portions'));
    const section = screen.getByRole('button', { name: /Standard portion/ });
    expect(section.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(section);
    expect(chip('1/2 · 358 g').getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: '1/2 · 179 g' })).toBeNull();
    expect(chip('1/3 · 238.7 g').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText(/Whole recipe: 716 g/)).toBeTruthy();
  });

  it('sets the fraction of the whole dish, and the active chip goes back to 100 g', () => {
    const setRecipePortion = vi.fn();
    render(<RecipeBuilderModal s={state({ recipePortion: 358, setRecipePortion })} />);
    fireEvent.click(chip('Continue to portions'));
    fireEvent.click(screen.getByRole('button', { name: /Standard portion/ }));
    fireEvent.click(chip('1/4 · 179 g'));
    expect(setRecipePortion).toHaveBeenLastCalledWith(179);
    fireEvent.click(chip('1/2 · 358 g'));
    expect(setRecipePortion).toHaveBeenLastCalledWith(0); // 0 = "logged as 100 g"
  });

  it('lets the user choose any serving count (including decimals) or switch to weight mode', () => {
    const setRecipePortion = vi.fn();
    render(<RecipeBuilderModal s={state({ recipePortion: 358, setRecipePortion })} />);
    fireEvent.click(chip('Continue to portions'));
    fireEvent.click(screen.getByRole('button', { name: /Standard portion/ }));

    expect(document.querySelector('[data-recipe-servings-panel]')).toBeTruthy();
    expect(document.querySelector('[data-portion-weight-pill]')?.textContent).toBe('358 g');

    // Step servings up from 2 -> 3 servings (238.7 g)
    fireEvent.click(screen.getByLabelText('More portions'));
    expect(setRecipePortion).toHaveBeenLastCalledWith(238.7);

    // Type arbitrary decimal serving count (e.g. 2,5 -> 286.4 g)
    const servingsInput = screen.getByLabelText('Number of portions in the recipe') as HTMLInputElement;
    fireEvent.focus(servingsInput);
    fireEvent.change(servingsInput, { target: { value: '2,5' } });
    expect(setRecipePortion).toHaveBeenLastCalledWith(286.4);

    // Switch to By weight (g) and pick 200 g
    fireEvent.click(screen.getByRole('button', { name: 'By weight (g)' }));
    expect(document.querySelector('[data-recipe-weight-panel]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '200 g' }));
    expect(setRecipePortion).toHaveBeenLastCalledWith(200);
  });

  it('separates the recipe recap summary card from the ingredient cards', () => {
    render(<RecipeBuilderModal s={state({ recipePortion: 358 })} />);
    fireEvent.click(chip('Continue to portions'));
    const summary = document.querySelector('[data-recipe-summary]')!;
    const ingredients = document.querySelector('[data-recipe-ingredients]')!;
    expect(summary).toBeTruthy();
    expect(ingredients).toBeTruthy();
    expect(summary.contains(ingredients)).toBe(false);
    expect(summary.querySelector('[data-ingredient-edit]')).toBeNull();
    expect(ingredients.querySelector('[data-ingredient-edit]')).toBeTruthy();
    expect(ingredients.className).toContain('border-t');
  });
});

describe('closing the builder from the UI', () => {
  it('sends the close button through the confirmation handler', () => {
    const requestCloseRecipeModal = vi.fn();
    render(<RecipeBuilderModal s={state({ requestCloseRecipeModal })} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(requestCloseRecipeModal).toHaveBeenCalledTimes(1);
  });

  it('draws the discard dialog over the builder and wires both answers', () => {
    const confirmDiscardRecipe = vi.fn();
    const cancelDiscardRecipe = vi.fn();
    render(<RecipeBuilderModal s={state({ confirmCloseRecipe: true, confirmDiscardRecipe, cancelDiscardRecipe })} />);
    expect(screen.getByText('Discard this recipe?')).toBeTruthy();
    expect(screen.getByText('Your unsaved recipe changes will be lost.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(confirmDiscardRecipe).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelDiscardRecipe).toHaveBeenCalledTimes(1);
  });
});
