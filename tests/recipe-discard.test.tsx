import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProvider } from '../src/context/AppContext';
import { usePreBuiltMealsState } from '../src/components/prebuilt/usePreBuiltMealsState';
import { VERIFIED_FOODS } from '../src/data/verifiedFoods';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';

const wrapper = ({ children }: { children: ReactNode }) => <StrictMode><AppProvider>{children}</AppProvider></StrictMode>;
const food = VERIFIED_FOODS[0];

beforeEach(async () => {
  await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
});
afterEach(async () => { cleanup(); await flushWrites(); });

/** Open the recipe builder with one ingredient in it, as an import leaves it. */
const openWithOneIngredient = (result: { current: ReturnType<typeof usePreBuiltMealsState> }) => {
  act(() => result.current.openRecipeModal());
  act(() => result.current.setRecipeRows([{ id: 'row', foodId: food.id, amount: 120 }]));
};

describe('closing the recipe builder', () => {
  it('closes at once when nothing was added', () => {
    const { result } = renderHook(() => usePreBuiltMealsState(), { wrapper });
    act(() => result.current.openRecipeModal());
    act(() => result.current.requestCloseRecipeModal());
    expect(result.current.isRecipeOpen).toBe(false);
    expect(result.current.confirmCloseRecipe).toBe(false);
  });

  it('asks before throwing away the ingredients, and keeps them while the question is open', () => {
    const { result } = renderHook(() => usePreBuiltMealsState(), { wrapper });
    openWithOneIngredient(result);

    act(() => result.current.requestCloseRecipeModal());
    expect(result.current.isRecipeOpen).toBe(true);
    expect(result.current.confirmCloseRecipe).toBe(true);

    act(() => result.current.cancelDiscardRecipe());
    expect(result.current.confirmCloseRecipe).toBe(false);
    expect(result.current.isRecipeOpen).toBe(true);
    expect(result.current.recipeIngs).toHaveLength(1);

    // The question comes back on the next attempt, and "Discard" then really closes.
    act(() => result.current.requestCloseRecipeModal());
    expect(result.current.confirmCloseRecipe).toBe(true);
    act(() => result.current.confirmDiscardRecipe());
    expect(result.current.confirmCloseRecipe).toBe(false);
    expect(result.current.isRecipeOpen).toBe(false);
    // The builder starts empty next time, with no ingredient of the discarded recipe left over.
    act(() => result.current.openRecipeModal());
    expect(result.current.recipeIngs).toHaveLength(0);
  });

  it('does not ask again once the recipe is saved', () => {
    const { result } = renderHook(() => usePreBuiltMealsState(), { wrapper });
    openWithOneIngredient(result);
    act(() => result.current.setRecipeName('Scalogno e patate'));

    act(() => result.current.saveRecipe());
    // Saved: the builder closes on its own, with no dialog left behind.
    expect(result.current.isRecipeOpen).toBe(false);
    expect(result.current.confirmCloseRecipe).toBe(false);
  });
});

describe('the quick portions of the builder', () => {
  it('are fractions of the whole recipe even when the portion is already set', async () => {
    const { portionFractions } = await import('../src/utils/portionFractions');
    const { result } = renderHook(() => usePreBuiltMealsState(), { wrapper });
    openWithOneIngredient(result);

    const whole = result.current.recipeTotals.grams;
    expect(whole).toBeGreaterThan(0);
    act(() => result.current.setRecipePortion(Math.round(whole / 2)));
    // 1/2 stays 1/2 of the dish: it is not halved again to a quarter.
    expect(portionFractions(whole).find((f) => f.parts === 2)?.grams).toBe(Math.round(whole / 2));
  });
});
