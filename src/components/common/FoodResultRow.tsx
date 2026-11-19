import React from 'react';
import type { FoodItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { getDefaultAmount } from '../../utils/amountMemory';
import { MacroPills } from './MacroPills';
import { FavoriteButton } from './FavoriteButton';

interface FoodResultRowProps {
  food: FoodItem;
  onClick: () => void;
  /** Show the favourite star (food search); recipe builders leave it out. */
  favorite?: boolean;
}

/**
 * One food in a search list: the name, then the weight that will be pre-filled (the last weight
 * used, else the product's classic portion, else 100 g/ml) with the carbs / protein / fat of
 * exactly that weight, and its calories on the right.
 */
export const FoodResultRow: React.FC<FoodResultRowProps> = ({ food, onClick, favorite = false }) => {
  const { language, t } = useApp();
  const amount = getDefaultAmount(food);
  const factor = amount / 100;
  const name = language === 'it' ? food.name_it : food.name_en || food.name_de;
  const scaled = (value: number | null) => (value == null ? null : value * factor);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--hover)] active:bg-[var(--border)] transition-colors">
      <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
        <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate block">
          {name}
          {food.isRecipe && (
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E2D6FF] text-[#4D3582] align-middle">
              {t.prebuilt.savedAsRecipe}
            </span>
          )}
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-[var(--text)]">
            {amount}
            {food.unit}
          </span>
          <MacroPills carbs={scaled(food.carbs)} protein={scaled(food.protein)} fat={scaled(food.fat)} sugar={scaled(food.sugar ?? null)} />
        </span>
        {(food.brand || food.store === 'Open Food Facts') && (
          <span className="block mt-0.5 text-[10px] font-medium text-[var(--muted)] truncate">
            {food.brand ?? 'Open Food Facts'}
          </span>
        )}
      </button>
      <span className="shrink-0 text-right tabular-nums leading-tight">
        <span className="block text-sm font-extrabold text-[var(--text)]">{Math.round(food.calories * factor)}</span>
        <span className="block text-[10px] font-bold text-[var(--muted)]">kcal</span>
      </span>
      {favorite && <FavoriteButton foodId={food.id} food={food} />}
    </div>
  );
};
