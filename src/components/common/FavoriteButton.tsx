import React from 'react';
import { Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface FavoriteButtonProps {
  foodId: string;
  /** `row` sits in a list row, `card` in a catalog card corner. */
  variant?: 'row' | 'card';
}

/** Star toggle for the favourite-food list. Results reorder so these appear first. */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ foodId, variant = 'row' }) => {
  const { favoriteFoods, toggleFavoriteFood, t } = useApp();
  const active = favoriteFoods.includes(foodId);
  const size = variant === 'card' ? 'size-7' : 'size-8';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        toggleFavoriteFood(foodId);
      }}
      aria-pressed={active}
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
