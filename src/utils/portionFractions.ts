/**
 * Quick portions of a recipe: "1/2 · 358 g", "1/3 · 238.7 g"…
 *
 * A fraction is always a fraction of the **whole dish**, never of the portion already chosen:
 * a 716 g recipe offers 358 g for 1/2 whether the standard portion currently is 100 g, 358 g or
 * empty. An imported recipe arrives with its portion already computed from the servings on the
 * page (716 g / 2 servings = 358 g), and the chips must still describe the whole recipe.
 */

/** The fractions offered, smallest portion first. */
export const PORTION_PARTS = [2, 3, 4, 6, 8] as const;

export interface PortionFraction {
  /** 2 = 1/2, 3 = 1/3 … */
  parts: number;
  /** The portion in grams: wholeGrams / parts, to one decimal. */
  grams: number;
}

/**
 * Every quick portion of a dish weighing `wholeGrams`. An empty list when the dish has no weight
 * (nothing added yet), so the caller can hide the chips instead of showing meaningless numbers.
 */
export function portionFractions(wholeGrams: number, parts: readonly number[] = PORTION_PARTS): PortionFraction[] {
  if (!Number.isFinite(wholeGrams) || wholeGrams <= 0) return [];
  return parts
    .filter((value) => Number.isFinite(value) && value >= 2)
    .map((value) => ({ parts: value, grams: Math.round((wholeGrams / value) * 10) / 10 }));
}

/**
 * Whether `portion` is that fraction. A tolerance of half a gram covers the rounding: a 715 g dish
 * gives 357.5 for 1/2, which is stored (and shown) as 358, and the chip must still look selected.
 * Bigger gaps are a different portion, not this chip.
 */
export const PORTION_MATCH_TOLERANCE = 0.51;

export const isSamePortion = (portion: number, grams: number): boolean =>
  Number.isFinite(portion) && Math.abs(portion - grams) < PORTION_MATCH_TOLERANCE;

/** Gram weight of one serving when dividing `wholeGrams` into `parts` servings (to one decimal). */
export function portionGramsForParts(wholeGrams: number, parts: number): number {
  if (!Number.isFinite(wholeGrams) || wholeGrams <= 0 || !Number.isFinite(parts) || parts <= 0) return 0;
  return Math.round((wholeGrams / parts) * 10) / 10;
}

/** Number of servings a `portionGrams` serving makes out of `wholeGrams` (to two decimals). */
export function partsForPortionGrams(wholeGrams: number, portionGrams: number): number {
  if (!Number.isFinite(wholeGrams) || wholeGrams <= 0 || !Number.isFinite(portionGrams) || portionGrams <= 0) return 1;
  return Math.round((wholeGrams / portionGrams) * 100) / 100;
}
