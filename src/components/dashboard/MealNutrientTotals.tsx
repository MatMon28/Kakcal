import React from 'react';
import { Candy, Wheat } from 'lucide-react';
import { useSettings } from '../../context/AppContext';
import { SaltCrystalIcon } from '../common/SaltCrystalIcon';

const icons = { fiber: Wheat, salt: SaltCrystalIcon, sugar: Candy };

interface MealNutrientTotalsProps {
  fiber: number;
  salt: number;
  sugar: number;
  /** Compact arrangement: number only next to the icon, no unit. */
  compact?: boolean;
}

/**
 * Whole-meal fibre, salt and (when Track sugar is on) sugar. They sit in the same area as the meal's carbs / protein /
 * fat pills (directly under them in the header of the meal card, no dividing line) and show **only the icon and the
 * number**, never the name. The unit (g) is added in the Normal layout and left out in Compact and Ultra minimal.
 *
 * Each pill carries `data-macro`, the hook the theme CSS (`styles/themed-chrome.css`, "Numeric Macro Pills") uses to apply the active
 * style's pill colours, radius, border and clip-path, so they match the macro pills on every style. The icons use
 * `currentColor`. The name stays available as `title` and `aria-label`.
 */
export const MealNutrientTotals: React.FC<MealNutrientTotalsProps> = ({ fiber, salt, sugar, compact = false }) => {
  const { t, settings } = useSettings();
  const values = { fiber, salt, sugar };
  const keys = (['fiber', 'salt', 'sugar'] as const).filter((key) => key !== 'sugar' || settings.trackSugar);
  const showUnit = !compact && !settings.ultraMinimal;

  return (
    <div
      data-meal-totals
      className={`grid ${keys.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 w-full min-w-0 text-center tabular-nums`}
    >
      {keys.map((key) => {
        const Icon = icons[key];
        const name = t.macros[key];
        return (
          <span
            key={key}
            data-meal-total={key}
            data-macro={key}
            role="img"
            title={name}
            aria-label={`${name}: ${values[key]} g`}
            className="bg-nutrient text-nutrient-ink min-w-0 overflow-hidden rounded-lg px-1 py-1.5 flex items-center justify-center gap-1 text-[11px] font-extrabold leading-none whitespace-nowrap"
          >
            <Icon size={12} aria-hidden="true" className="shrink-0" />
            <span>{values[key]}{showUnit && 'g'}</span>
          </span>
        );
      })}
    </div>
  );
};
