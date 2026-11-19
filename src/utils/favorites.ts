// Favourite-food helpers shared by every search surface (Add Food, Foods catalog).

/** Stable ordering helper: favourites sort before non-favourites, everything else keeps its rank. */
export function sortFavoritesFirst<T>(items: T[], favoriteIds: readonly string[], getId: (item: T) => string): T[] {
  if (favoriteIds.length === 0) return items;
  const favorites = new Set(favoriteIds);
  return [...items].sort((a, b) => Number(favorites.has(getId(b))) - Number(favorites.has(getId(a))));
}

/**
 * Search ordering: only favourites that are a *direct* hit for the typed text (every query word is an exact,
 * prefix or substring match, `fuzzyScore` <= number of words) are pinned above the other results. Favourites
 * that only match through typo tolerance, or not at all, keep their normal rank. `items` must already be
 * sorted by score (best first); the order inside both groups is preserved.
 */
export function pinCoherentFavorites<T>(
  items: T[],
  favoriteIds: readonly string[],
  getId: (item: T) => string,
  getScore: (item: T) => number,
  query: string
): T[] {
  if (favoriteIds.length === 0) return items;
  const favorites = new Set(favoriteIds);
  const directLimit = Math.max(1, query.trim().split(/\s+/).length);
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    (favorites.has(getId(item)) && getScore(item) <= directLimit ? pinned : rest).push(item);
  }
  return [...pinned, ...rest];
}

export const isFavorite = (favoriteIds: readonly string[], foodId: string): boolean =>
  favoriteIds.includes(foodId);

/** Prefix-style match used while the first character is still being typed (too loose for fuzzy search). */
export function matchesFirstChar(food: { name_de: string; name_it: string; name_en: string; brand?: string }, char: string): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = normalize(char).trim();
  if (!q) return false;
  return [food.name_de, food.name_it, food.name_en, food.brand || '']
    .flatMap((value) => normalize(value).split(/[^a-z0-9]+/))
    .filter(Boolean)
    .some((word) => word.startsWith(q));
}
