import React from 'react';
import { Candy, Wheat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SaltCrystalIcon } from '../common/SaltCrystalIcon';

const icons = { fiber: Wheat, salt: SaltCrystalIcon, sugar: Candy };

interface MealNutrientTotalsProps {
  fiber: number;
  salt: number;
  sugar: number;
  /** Compact arrangement: icon and number only. */
  compact?: boolean;
}

/**
 * Whole-meal fibre, salt and (when Track sugar is on) sugar, in grams. Shown at the top of an expanded meal on Today,
 * above the list of items (each item shows its own values below it). Same yellow nutrient fields as the Today totals.
 *
 * Each field carries `data-nutrient`, the hook the theme CSS (`index.css`, "Secondary nutrients") uses to apply the
 * active theme's fibre colours, radius, border, shadow and clip-path. The icons use `currentColor`, so they follow the
 * theme's text colour on every style (the `[data-nutrient] *` rule makes children inherit it).
 */
export const MealNutrientTotals: React.FC<MealNutrientTotalsProps> = ({ fiber, salt, sugar, compact = false }) => {
  const { t, settings } = useApp();
  const values = { fiber, salt, sugar };
  const keys = (['fiber', 'salt', 'sugar'] as const).filter((key) => key !== 'sugar' || settings.trackSugar);

  return (
    <div
      data-meal-totals
      className={`grid ${keys.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 text-center tabular-nums`}
    >
      {keys.map((key) => {
        const Icon = icons[key];
        const name = t.macros[key];
        return (
          <div
            key={key}
            data-meal-total={key}
            data-nutrient={key}
            role="group"
            title={name}
            aria-label={`${name}: ${values[key]} g`}
            className="bg-nutrient text-nutrient-ink min-w-0 rounded-xl px-1 py-1.5 flex items-center justify-center gap-1.5"
          >
            <Icon size={15} aria-hidden="true" />
            {!compact && <span className="truncate text-[10px] font-bold uppercase tracking-wider">{name}</span>}
            <span className="whitespace-nowrap text-xs font-extrabold">{values[key]}g</span>
          </div>
        );
      })}
    </div>
  );
};
