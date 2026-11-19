import React from 'react';
import type { FoodItem } from '../../types';
import { useApp } from '../../context/AppContext';

/** Carbs, protein, fat, fibre and salt of `amount` g/ml of a food (same cells as the Add Food dialog). */
export const FoodMacroGrid: React.FC<{ food: FoodItem; amount: number }> = ({ food, amount }) => {
  const { t } = useApp();
  const k = (amount || 0) / 100;
  const value = (v: number | null, d = 10) => (v == null ? null : Math.round(v * k * d) / d);
  const cells = [
    ['C', value(food.carbs), 'bg-[#CFE7FE] text-[#1A4670]'],
    ['P', value(food.protein), 'bg-[#FAE0B4] text-[#7D4E14]'],
    ['F', value(food.fat), 'bg-[#E2D6FF] text-[#4D3582]'],
    [t.macros.fiber, value(food.fiber), 'bg-[var(--inset)] text-[var(--muted)]'],
    [t.macros.salt, value(food.salt, 100), 'bg-[var(--inset)] text-[var(--muted)]'],
  ] as const;

  return (
    <div className="grid grid-cols-5 gap-1.5 text-center tabular-nums" data-food-macros>
      {cells.map(([label, v, tone]) => (
        <div key={label} className={`rounded-2xl p-2 ${tone}`}>
          <span className="text-[10px] font-bold uppercase block opacity-80 truncate">{label}</span>
          <span className="text-xs font-extrabold">{v !== null ? `${v}g` : '—'}</span>
        </div>
      ))}
    </div>
  );
};
