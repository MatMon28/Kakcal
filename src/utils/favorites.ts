// Favourite-food helpers shared by every search surface (Add Food, Foods catalog).

/** Stable ordering helper: favourites sort before non-favourites, everything else keeps its rank. */
export function sortFavoritesFirst<T>(items: T[], favoriteIds: readonly string[], getId: (item: T) => string): T[] {
  if (favoriteIds.length === 0) return items;
  const favorites = new Set(favoriteIds);
  return [...items].sort((a, b) => Number(favorites.has(getId(b))) - Number(favorites.has(getId(a))));
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
