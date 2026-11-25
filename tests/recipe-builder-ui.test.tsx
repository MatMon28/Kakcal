import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The dialog's own texts have to be unique to be found, so they are real; anything else the
// builder or a child asks for comes back as a plain string.
const labels = new Proxy({}, { get: () => 'label' });
const base = {
  common: { back: 'Back', close: 'Close', cancel: 'Cancel', confirmTitle: 'Confirm' },
  prebuilt: { edit: 'Edit recipe', recipeTitle: 'New recipe', ingredientsCount: '{count} ingredients' },
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
  allFoods: [food],
  rememberFood: () => {},
  settings: { trackSugar: false },
  t,
  j: (en: string) => en,
  isRecipeOpen: true,
  editingRecipeId: null,
  recipeName: 'Patate',
  setRecipeName: () => {},
  recipeIngs: [{ foodId: food.id, amount: 716 }],
  setRecipeIngs: () => {},
  recipePendingFood: null,
  setRecipePendingFood: () => {},
  recipePendingAmt: 100,
  setRecipePendingAmt: () => {},
  recipeSearch: '',
  setRecipeSearch: () => {},
  recipePortion: 0,
  setRecipePortion: () => {},
  nameOf: () => food.name_en,
  recipeResults: [],
  favoriteOneChar: () => [],
  recipeTotals: { grams: 716, kcal100: 90, c100: 10, p100: 2, f100: 1, fib100: 1, salt100: 0.1, sugar100: 1 },
  saveRecipe: () => {},
  searchInput: () => null,
  importSummary: null,
  clearImportSummary: () => {},
  searchUnmatched: () => {},
  addSeasoning: () => {},
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
    expect(chip('1/2 · 358 g').getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: '1/2 · 179 g' })).toBeNull();
    expect(chip('1/3 · 238.7 g').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText(/Fractions of the whole recipe \(716 g\)/)).toBeTruthy();
  });

  it('sets the fraction of the whole dish, and the active chip goes back to 100 g', () => {
    const setRecipePortion = vi.fn();
    render(<RecipeBuilderModal s={state({ recipePortion: 358, setRecipePortion })} />);
    fireEvent.click(chip('1/4 · 179 g'));
    expect(setRecipePortion).toHaveBeenLastCalledWith(179);
    fireEvent.click(chip('1/2 · 358 g'));
    expect(setRecipePortion).toHaveBeenLastCalledWith(0); // 0 = "logged as 100 g"
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
    expect(screen.getByText('The 1 ingredient you added will be lost.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(confirmDiscardRecipe).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelDiscardRecipe).toHaveBeenCalledTimes(1);
  });
});
