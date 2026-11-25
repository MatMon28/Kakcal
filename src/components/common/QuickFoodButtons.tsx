import type { FoodItem } from '../../types';

/**
 * The quick-add food shortcuts (Settings > Today > quick food shortcuts) exactly as Log food shows them: a
 * three-column grid of tiles with the food name and its kcal per 100 g / ml, without a heading. Log food and the
 * ingredient picker of the meal and recipe builders all render this one component, so the three cannot drift apart.
 */
export function QuickFoodButtons({ foods, nameOf, onPick }: {
  foods: FoodItem[];
  nameOf: (food: FoodItem) => string;
  onPick: (food: FoodItem) => void;
}) {
  if (foods.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2" data-quick-foods>
      {foods.map((food) => (
        <button
          key={food.id}
          type="button"
          onClick={() => onPick(food)}
          className="pressable py-2.5 px-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-center"
        >
          <span className="block text-xs font-extrabold text-[var(--text)] truncate">{nameOf(food)}</span>
          <span className="block text-[10px] font-bold tabular-nums text-[var(--muted)] mt-0.5">
            {food.calories} kcal/100{food.unit}
          </span>
        </button>
      ))}
    </div>
  );
}
