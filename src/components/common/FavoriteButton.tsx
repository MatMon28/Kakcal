import React from 'react';
import { Star } from 'lucide-react';
import { useJournalData, useSettings } from '../../context/AppContext';
import type { FoodItem } from '../../types';

interface FavoriteButtonProps {
  /** Food id, or activity id when `kind="activity"`. */
  foodId: string;
  /** `row` sits in a list row, `card` in a catalog card corner. */
  variant?: 'row' | 'card';
  /** Which favourite list the star toggles. Defaults to foods. */
  kind?: 'food' | 'activity';
  /** The food itself: lets a catalogue (Open Food Facts) food be kept when it is starred. */
  food?: FoodItem;
}

/** Star toggle for the favourite-food / favourite-activity lists. Results reorder so these appear first. */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ foodId, variant = 'row', kind = 'food', food }) => {
  const { favoriteFoods, toggleFavoriteFood, favoriteActivities, toggleFavoriteActivity, t } = useSettings();
  const { rememberFood } = useJournalData();
  const active = (kind === 'activity' ? favoriteActivities : favoriteFoods).includes(foodId);
  const toggle = kind === 'activity' ? toggleFavoriteActivity : toggleFavoriteFood;
  const size = variant === 'card' ? 'size-7' : 'size-8';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (food && !active) rememberFood(food);
        toggle(foodId);
      }}
      aria-pressed={active}
      data-favorite-btn={active ? 'active' : 'idle'}
      aria-label={active ? t.favorites.remove : t.favorites.add}
      title={active ? t.favorites.remove : t.favorites.add}
      className={`pressable ${size} shrink-0 rounded-full flex items-center justify-center border ${
        active
          ? 'bg-[#FAE0B4] text-[#B45309] border-[#E8C68E]'
          : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)] hover:text-[#B45309] hover:border-[#E8C68E]'
      }`}
    >
      <Star size={variant === 'card' ? 14 : 15} strokeWidth={2.4} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
};
