import React from 'react';
import { useApp } from '../../context/AppContext';

export const MacroNutrientsOverview: React.FC = () => {
  const { currentMacros, t } = useApp();

  return (
    <div className="space-y-3">
      {/* Row 1: Carbs, Protein, Fat side by side with % below grams */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Carbs (Pastel Peach) */}
        <div className="bg-[#FAE0B4] rounded-3xl p-3.5 sm:p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A5617] block">
            {t.macros.carbs}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#2D1E0B] tracking-tight">
              {currentMacros.carbsGrams}
            </span>
            <span className="text-xs font-semibold text-[#8A5617]">g</span>
          </div>
          <span className="text-xs font-bold text-[#8A5617] block mt-0.5">
            {currentMacros.carbsPercent}%
          </span>
        </div>

        {/* Protein (Pastel Rose) */}
        <div className="bg-[#F6D0D0] rounded-3xl p-3.5 sm:p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C3A3A] block">
            {t.macros.protein}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#2B1818] tracking-tight">
              {currentMacros.proteinGrams}
            </span>
            <span className="text-xs font-semibold text-[#8C3A3A]">g</span>
          </div>
          <span className="text-xs font-bold text-[#8C3A3A] block mt-0.5">
            {currentMacros.proteinPercent}%
          </span>
        </div>

        {/* Fat (Pastel Lavender) */}
        <div className="bg-[#E2D6FF] rounded-3xl p-3.5 sm:p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#523A8C] block">
            {t.macros.fat}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#1F1636] tracking-tight">
              {currentMacros.fatGrams}
            </span>
            <span className="text-xs font-semibold text-[#523A8C]">g</span>
          </div>
          <span className="text-xs font-bold text-[#523A8C] block mt-0.5">
            {currentMacros.fatPercent}%
          </span>
        </div>
      </div>

      {/* Row 2: Fiber and Salt side by side */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-[#6E665E]">
            {t.macros.fiber}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base sm:text-lg font-extrabold text-[var(--text)]">
              {currentMacros.fiberGrams}
            </span>
            <span className="text-xs font-semibold text-[#6E665E]">g</span>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-[#6E665E]">
            {t.macros.salt}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base sm:text-lg font-extrabold text-[var(--text)]">
              {currentMacros.saltGrams}
            </span>
            <span className="text-xs font-semibold text-[#6E665E]">g</span>
          </div>
        </div>
      </div>
    </div>
  );
};
