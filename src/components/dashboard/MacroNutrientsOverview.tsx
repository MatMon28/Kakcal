import React from 'react';
import { SecondaryNutrientRow } from '../common/FoodMacroGrid';
import { useApp } from '../../context/AppContext';

export const MacroNutrientsOverview: React.FC = () => {
  const { currentMacros, settings, t } = useApp();
  const ultraMinimal = settings.ultraMinimal;
  const macroPadding = ultraMinimal ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4';

  return (
    <div className={ultraMinimal ? 'space-y-2' : 'space-y-3'}>
      {/* Row 1: Carbs, Protein, Fat side by side with % below grams */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Carbs (Pastel Blue) */}
        <div role="group" aria-label={`${t.macros.carbs}: ${currentMacros.carbsGrams} g`} className={`bg-[#CFE7FE] rounded-3xl ${macroPadding} text-center`}>
          <span className={`${ultraMinimal ? 'sr-only' : 'text-[11px] font-bold uppercase tracking-wider text-[#1A4670] block truncate'}`}>
            {t.macros.carbs}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-[#0F3355] tracking-tight">
              {currentMacros.carbsGrams}
            </span>
            {!ultraMinimal && <span className="text-xs font-semibold text-[#1A4670]">g</span>}
          </div>
          <span className="text-xs font-bold tabular-nums text-[#1A4670] block mt-0.5">
            {currentMacros.carbsPercent}%
          </span>
        </div>

        {/* Protein (Pastel Peach) */}
        <div role="group" aria-label={`${t.macros.protein}: ${currentMacros.proteinGrams} g`} className={`bg-[#FAE0B4] rounded-3xl ${macroPadding} text-center`}>
          <span className={`${ultraMinimal ? 'sr-only' : 'text-[11px] font-bold uppercase tracking-wider text-[#7D4E14] block truncate'}`}>
            {t.macros.protein}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-[#2D1E0B] tracking-tight">
              {currentMacros.proteinGrams}
            </span>
            {!ultraMinimal && <span className="text-xs font-semibold text-[#7D4E14]">g</span>}
          </div>
          <span className="text-xs font-bold tabular-nums text-[#7D4E14] block mt-0.5">
            {currentMacros.proteinPercent}%
          </span>
        </div>

        {/* Fat (Pastel Lavender) */}
        <div role="group" aria-label={`${t.macros.fat}: ${currentMacros.fatGrams} g`} className={`bg-[#E2D6FF] rounded-3xl ${macroPadding} text-center`}>
          <span className={`${ultraMinimal ? 'sr-only' : 'text-[11px] font-bold uppercase tracking-wider text-[#523A8C] block truncate'}`}>
            {t.macros.fat}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-[#1F1636] tracking-tight">
              {currentMacros.fatGrams}
            </span>
            {!ultraMinimal && <span className="text-xs font-semibold text-[#523A8C]">g</span>}
          </div>
          <span className="text-xs font-bold tabular-nums text-[#523A8C] block mt-0.5">
            {currentMacros.fatPercent}%
          </span>
        </div>
      </div>

      <SecondaryNutrientRow fiber={currentMacros.fiberGrams} salt={currentMacros.saltGrams} sugar={currentMacros.sugarGrams} />
    </div>
  );
};
