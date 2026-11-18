import React from 'react';
import { useApp } from '../../context/AppContext';

export const MacroNutrientsOverview: React.FC = () => {
  const { currentMacros, t } = useApp();

  return (
    <div className="space-y-3">
      {/* Row 1: Carbs, Protein, Fat side by side with % below grams */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Carbs (Pastel Blue) */}
        <div className="bg-[#CFE7FE] rounded-3xl p-3.5 sm:p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A4670] block truncate">
            {t.macros.carbs}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-[#0F3355] tracking-tight">
              {currentMacros.carbsGrams}
            </span>
            <span className="text-xs font-semibold text-[#1A4670]">g</span>
          </div>
          <span className="text-xs font-bold tabular-nums text-[#1A4670] block mt-0.5">
            {currentMacros.carbsPercent}%
          </span>
        </div>

        {/* Protein (Pastel Peach) */}
        <div className="bg-[#FAE0B4] rounded-3xl p-3.5 sm:p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D4E14] block truncate">
            {t.macros.protein}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-[#2D1E0B] tracking-tight">
              {currentMacros.proteinGrams}
            </span>
            <span className="text-xs font-semibold text-[#7D4E14]">g</span>
          </div>
          <span className="text-xs font-bold tabular-nums text-[#7D4E14] block mt-0.5">
            {currentMacros.proteinPercent}%
          </span>
        </div>

        {/* Fat (Pastel Lavender) */}
        <div className="bg-[#E2D6FF] rounded-3xl p-3.5 sm:p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#523A8C] block truncate">
            {t.macros.fat}
          </span>
          <div className="flex items-baseline justify-center gap-0.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-[#1F1636] tracking-tight">
              {currentMacros.fatGrams}
            </span>
            <span className="text-xs font-semibold text-[#523A8C]">g</span>
          </div>
          <span className="text-xs font-bold tabular-nums text-[#523A8C] block mt-0.5">
            {currentMacros.fatPercent}%
          </span>
        </div>
      </div>

      {/* Row 2: Fiber and Salt side by side */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-[var(--muted)]">
            {t.macros.fiber}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base sm:text-lg font-extrabold tabular-nums text-[var(--text)]">
              {currentMacros.fiberGrams}
            </span>
            <span className="text-xs font-semibold text-[var(--muted)]">g</span>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-[var(--muted)]">
            {t.macros.salt}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base sm:text-lg font-extrabold tabular-nums text-[var(--text)]">
              {currentMacros.saltGrams}
            </span>
            <span className="text-xs font-semibold text-[var(--muted)]">g</span>
          </div>
        </div>
      </div>
    </div>
  );
};
