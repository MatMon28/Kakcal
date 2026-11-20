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
export function FoodMacroGrid({ food, amount, mode = 'portion' }: {
  food: Nutrients; amount: number; mode?: 'portion' | 'facts' | 'minimal';
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
            className={`${tones[key]} min-w-0 rounded-2xl px-0.5 py-2 flex flex-col items-center justify-center gap-1`}>
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

export function SecondaryNutrientRow({ fiber, salt, sugar, average = false }: {
  fiber: number; salt: number; sugar: number; average?: boolean;
}) {
  const { t, settings } = useApp();
  const values = { fiber, salt, sugar };
  const labels = average ? { fiber: t.stats.avgFiber, salt: t.stats.avgSalt, sugar: t.stats.avgSugar } : t.macros;
  return (
    <div className={`grid ${settings.trackSugar ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 sm:gap-3.5 tabular-nums`}>
      {(['fiber', 'salt', 'sugar'] as const).filter((key) => key !== 'sugar' || settings.trackSugar).map((key) => {
        const Icon = extraIcons[key];
        return (
          <div key={key} data-nutrient={key} role="group" title={labels[key]} aria-label={`${labels[key]}: ${values[key]} g`}
            className={`bg-nutrient text-nutrient-ink rounded-2xl flex flex-wrap items-center justify-between gap-x-1.5 ${settings.ultraMinimal ? 'px-3 py-2.5' : 'px-3 py-3 sm:px-4'}`}>
            <span className="inline-flex items-center gap-1.5">
              {settings.ultraMinimal ? <Icon size={16} aria-hidden="true" /> : <span className="text-xs sm:text-sm font-semibold">{labels[key]}</span>}
              {/* Settings > Advanced: objective / limit reached (daily totals only, not the period averages) */}
              {!average && <GoalBadge goal={key} amount={values[key]} />}
            </span>
            <span className="whitespace-nowrap text-base sm:text-lg font-extrabold">{values[key]}
              {(!settings.ultraMinimal || average) && <small className="ml-0.5 text-xs font-semibold">{settings.ultraMinimal ? '/day' : 'g'}</small>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
