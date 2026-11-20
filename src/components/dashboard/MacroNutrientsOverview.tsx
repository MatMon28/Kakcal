import React from 'react';
import { SecondaryNutrientCard, SecondaryNutrientRow, type SecondaryNutrient } from '../common/FoodMacroGrid';
import { useApp } from '../../context/AppContext';
import { GoalBadge } from '../common/GoalBadge';

type MacroKey = 'carbs' | 'protein' | 'fat';

// Pastel palette of each macro (Carbs blue, Protein peach, Fat lavender).
const MACRO_TONES: Record<MacroKey, { card: string; label: string; number: string }> = {
  carbs: { card: 'kc-macro-carbs bg-[#CFE7FE]', label: 'text-[#1A4670]', number: 'text-[#0F3355]' },
  protein: { card: 'kc-macro-protein bg-[#FAE0B4]', label: 'text-[#7D4E14]', number: 'text-[#2D1E0B]' },
  fat: { card: 'kc-macro-fat bg-[#E2D6FF]', label: 'text-[#523A8C]', number: 'text-[#1F1636]' },
};

/** One macro card of Today (carbs, protein or fat): grams with the share of the day's energy below. */
export const MacroCard: React.FC<{ macro: MacroKey }> = ({ macro }) => {
  const { currentMacros, settings, t } = useApp();
  const ultraMinimal = settings.ultraMinimal;
  const macroPadding = ultraMinimal ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4';
  const tone = MACRO_TONES[macro];
  const grams = currentMacros[`${macro}Grams`];
  const percent = currentMacros[`${macro}Percent`];

  return (
    <div role="group" aria-label={`${t.macros[macro]}: ${grams} g`} className={`${tone.card} rounded-3xl ${macroPadding} relative text-center h-full min-w-0 flex flex-col justify-center`}>
      <GoalBadge goal={macro} amount={grams} className="absolute top-1.5 right-1.5" />
      <span className={`${ultraMinimal ? 'sr-only' : `text-[11px] font-bold uppercase tracking-wider ${tone.label} block truncate`}`}>
        {t.macros[macro]}
      </span>
      <div className="flex items-baseline justify-center gap-0.5 mt-1">
        <span className={`text-xl sm:text-2xl font-extrabold tabular-nums ${tone.number} tracking-tight`}>
          {grams}
        </span>
        {!ultraMinimal && <span className={`text-xs font-semibold ${tone.label}`}>g</span>}
      </div>
      <span className={`text-xs font-bold tabular-nums ${tone.label} block mt-0.5`}>
        {percent}%
      </span>
    </div>
  );
};

/** One of fibre, salt or sugar of the day, as a field of its own (advanced layout). */
export const NutrientCard: React.FC<{ nutrient: SecondaryNutrient }> = ({ nutrient }) => {
  const { currentMacros } = useApp();
  const value = { fiber: currentMacros.fiberGrams, salt: currentMacros.saltGrams, sugar: currentMacros.sugarGrams }[nutrient];
  return <SecondaryNutrientCard nutrient={nutrient} value={value} />;
};

/** Fibre, salt and (optional) sugar of the day. */
export const NutrientsRow: React.FC = () => {
  const { currentMacros } = useApp();
  return <SecondaryNutrientRow fiber={currentMacros.fiberGrams} salt={currentMacros.saltGrams} sugar={currentMacros.sugarGrams} />;
};

export const MacroNutrientsOverview: React.FC = () => {
  const { settings } = useApp();
  const ultraMinimal = settings.ultraMinimal;

  return (
    <div className={ultraMinimal ? 'space-y-2' : 'space-y-3'}>
      {/* Row 1: Carbs, Protein, Fat side by side with % below grams */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <MacroCard macro="carbs" />
        <MacroCard macro="protein" />
        <MacroCard macro="fat" />
      </div>

      <NutrientsRow />
    </div>
  );
};
