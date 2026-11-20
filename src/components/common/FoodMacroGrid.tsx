import { Candy, Wheat } from 'lucide-react';
import type { FoodItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { SaltCrystalIcon } from './SaltCrystalIcon';
import { GoalBadge } from './GoalBadge';

const extraIcons = { fiber: Wheat, salt: SaltCrystalIcon, sugar: Candy };
type Extra = keyof typeof extraIcons;
const tones = {
  carbs: 'bg-[#CFE7FE] text-[#1A4670]', protein: 'bg-[#FAE0B4] text-[#7D4E14]', fat: 'bg-[#E2D6FF] text-[#4D3582]',
  fiber: 'bg-nutrient text-nutrient-ink', salt: 'bg-nutrient text-nutrient-ink', sugar: 'bg-nutrient text-nutrient-ink',
};
type Nutrients = Pick<FoodItem, keyof typeof tones>;
const keys = ['carbs', 'protein', 'fat', 'fiber', 'salt', 'sugar'] as const;

/** All values describe the same portion. Unknown values are not treated as zero. */
export function FoodMacroGrid({ food, amount, mode = 'portion', dense = false }: {
  food: Nutrients; amount: number; mode?: 'portion' | 'facts' | 'minimal';
  /** Smaller fields, used for the items listed inside an expanded meal. */
  dense?: boolean;
}) {
  const { t, settings } = useApp();
  return (
    <div data-food-macros className={`grid ${settings.trackSugar ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 text-center tabular-nums`}>
      {keys.filter((key) => key !== 'sugar' || settings.trackSugar).map((key) => {
        const unit = key === 'salt' ? 100 : 10;
        const raw = food[key];
        const value = raw == null ? null : Math.round(raw * amount / 100 * unit) / unit;
        const Icon = key in extraIcons ? extraIcons[key as Extra] : null;
        const name = t.macros[key];
        return (
          <div key={key} data-nutrient={key} role="group" aria-label={`${name}: ${value == null ? '-' : `${value} g`}`} title={name}
            className={`${tones[key]} min-w-0 ${dense ? 'rounded-xl py-1.5' : 'rounded-2xl py-2'} px-0.5 flex flex-col items-center justify-center gap-1`}>
            {Icon && mode !== 'facts' ? <Icon size={15} aria-hidden="true" /> : (
              <span className={mode === 'minimal' ? 'sr-only' : 'text-[10px] font-bold leading-[15px]'}>
                {Icon ? name : key[0].toUpperCase()}
              </span>
            )}
            <span className="text-xs font-extrabold leading-tight">{value == null ? '\u2013' : `${value}${mode === 'minimal' ? '' : 'g'}`}</span>
          </div>
        );
      })}
    </div>
  );
}

export type SecondaryNutrient = 'fiber' | 'salt' | 'sugar';

/**
 * One of the yellow fields fibre / salt / sugar (daily totals on Today, averages on Statistics). Each one is a card
 * of its own, so the advanced layout can place and resize them independently.
 */
export function SecondaryNutrientCard({ nutrient, value, average = false }: {
  nutrient: SecondaryNutrient; value: number; average?: boolean;
}) {
  const { t, settings } = useApp();
  const labels = average ? { fiber: t.stats.avgFiber, salt: t.stats.avgSalt, sugar: t.stats.avgSugar } : t.macros;
  const Icon = extraIcons[nutrient];
  return (
    <div data-nutrient={nutrient} role="group" title={labels[nutrient]} aria-label={`${labels[nutrient]}: ${value} g`}
      className={`bg-nutrient text-nutrient-ink rounded-2xl relative flex flex-col items-center justify-center gap-0.5 text-center ${settings.ultraMinimal ? 'px-2 py-2.5' : 'px-2 py-3 sm:px-3'}`}>
      {/* Settings > Advanced: objective / limit reached (daily totals only, not the period averages). Corner placement like the macro cards. */}
      {!average && <GoalBadge goal={nutrient} amount={value} className="absolute top-1.5 right-1.5" />}
      {/* The name (or its icon in Ultra minimal) always sits above the number, both centred like the macro cards. */}
      {settings.ultraMinimal
        ? <Icon size={16} aria-hidden="true" />
        : <span className="block max-w-full text-[11px] font-bold uppercase leading-tight tracking-wider">{labels[nutrient]}</span>}
      <span className="whitespace-nowrap text-base sm:text-lg font-extrabold leading-tight">{value}
        {(!settings.ultraMinimal || average) && <small className="ml-0.5 text-xs font-semibold">{settings.ultraMinimal ? '/day' : 'g'}</small>}
      </span>
    </div>
  );
}

export function SecondaryNutrientRow({ fiber, salt, sugar, average = false }: {
  fiber: number; salt: number; sugar: number; average?: boolean;
}) {
  const { settings } = useApp();
  const values = { fiber, salt, sugar };
  return (
    <div className={`grid ${settings.trackSugar ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 sm:gap-3.5 tabular-nums`}>
      {(['fiber', 'salt', 'sugar'] as const).filter((key) => key !== 'sugar' || settings.trackSugar).map((key) => (
        <SecondaryNutrientCard key={key} nutrient={key} value={values[key]} average={average} />
      ))}
    </div>
  );
}
