import { describe, expect, it } from 'vitest';
import { PORTION_PARTS, isSamePortion, portionFractions } from '../src/utils/portionFractions';

describe('portionFractions', () => {
  it('offers halves to eighths of the whole dish', () => {
    expect(PORTION_PARTS).toEqual([2, 3, 4, 6, 8]);
    expect(portionFractions(716).map((f) => f.grams)).toEqual([358, 238.7, 179, 119.3, 89.5]);
  });

  it('measures the whole dish, not the portion already chosen', () => {
    // The bug: an imported 716 g recipe arrives with its portion already at 358 g (2 servings), and
    // the 1/2 chip used to halve that 358 → 179. 1/2 of the dish is 358, whatever is in the field.
    const whole = portionFractions(716);
    expect(whole.find((f) => f.parts === 2)?.grams).toBe(358);
    expect(whole.find((f) => f.parts === 4)?.grams).toBe(179);
  });

  it('hides the chips for a recipe with no weight', () => {
    expect(portionFractions(0)).toEqual([]);
    expect(portionFractions(Number.NaN)).toEqual([]);
    expect(portionFractions(-10)).toEqual([]);
  });

  it('matches a chip to a stored portion with a small tolerance', () => {
    const half = portionFractions(715).find((f) => f.parts === 2)!.grams; // 357.5
    expect(isSamePortion(357.5, half)).toBe(true);
    expect(isSamePortion(358, 358)).toBe(true);
    expect(isSamePortion(357.4, 358)).toBe(false);
    expect(isSamePortion(356, 358)).toBe(false);
    expect(isSamePortion(0, 358)).toBe(false);
  });
});
