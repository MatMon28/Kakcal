import { Candy, Wheat } from 'lucide-react';
import type { FoodItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { SaltCrystalIcon } from './SaltCrystalIcon';
import { TileGoalOverlay } from './GoalBadge';

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
  const ultraMinimal = settings.ultraMinimal;
  return (
    <div
      data-nutrient={nutrient}
      role="group"
      title={labels[nutrient]}
      aria-label={`${labels[nutrient]}: ${value} g`}
      className={`bg-nutrient text-nutrient-ink rounded-2xl relative h-full flex flex-col items-center justify-center text-center ${
        ultraMinimal ? 'min-h-[80px] pt-7 pb-5 px-2' : 'min-h-[96px] pt-8 pb-6 px-2 sm:px-3'
      }`}
    >
      {/* The name (or its icon in Ultra minimal) always sits centred at the top of the card. */}
      <span
        className={`absolute ${
          ultraMinimal ? 'top-2.5' : 'top-3'
        } left-1/2 -translate-x-1/2 max-w-[calc(100%-20px)] truncate text-center ${
          ultraMinimal ? 'inline-flex items-center' : 'text-[11px] font-bold uppercase leading-tight tracking-wider'
        }`}
      >
        {ultraMinimal ? <Icon size={15} aria-hidden="true" /> : labels[nutrient]}
      </span>
      <span className="whitespace-nowrap text-base sm:text-lg font-extrabold leading-tight">{value}
        {(!ultraMinimal || average) && <small className="ml-0.5 text-xs font-semibold">{ultraMinimal ? '/day' : 'g'}</small>}
      </span>
      {/* Settings > Advanced: perimeter ring + bottom-right readout (daily totals only, not period averages). */}
      {!average && <TileGoalOverlay goal={nutrient} amount={value} unit="g" ultraMinimal={ultraMinimal} />}
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
