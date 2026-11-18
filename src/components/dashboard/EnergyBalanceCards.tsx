import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatKcal } from '../../utils/formatters';

export const EnergyBalanceCards: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t, currentIntakeCalories, currentExpenditure, netBalance } = useApp();

  const scale = Math.max(currentIntakeCalories, currentExpenditure.totalExpenditure, 1);
  const intakePct = Math.round((currentIntakeCalories / scale) * 100);
  const expPct = Math.round((currentExpenditure.totalExpenditure / scale) * 100);
  const netPositive = netBalance > 0;

  // Surplus (more calories in than out): indicator only on the Intake side, reddish.
  // Deficit / balanced: indicator on the Burned side (mint).
  const surplusPill = (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-[#8A2D2D] text-[#FFE9E9]">
      +{formatKcal(netBalance)}
    </span>
  );
  const deficitPill = (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-[#1E5E3A] text-[#EDFFF2]">
      {netBalance === 0 ? '0' : `-${formatKcal(Math.abs(netBalance))}`}
    </span>
  );

  return (
    <div data-energy-overview className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Left: INTAKE (Pastel Rose) */}
      <div className="bg-[#F6D0D0] rounded-3xl p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1 min-h-[22px]">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8C3A3A]">
              {t.energy.intake}
            </span>
            {netPositive && surplusPill}
          </div>
          <div className="flex items-baseline gap-1 my-1" aria-label={`${formatKcal(currentIntakeCalories)} kcal`}>
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-[#2B1818] tracking-tight">
              {formatKcal(currentIntakeCalories)}
            </span>
            {!compact && <span className="text-xs font-semibold text-[#8C3A3A]">kcal</span>}
          </div>
        </div>

        <div className="w-full bg-[#FAEBEB] h-2.5 rounded-full overflow-hidden mt-3">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out bg-[#8A2D2D]"
            style={{ width: `${currentIntakeCalories > 0 ? Math.max(5, intakePct) : 0}%` }}
          />
        </div>
      </div>

      {/* Right: BURNED (Pastel Mint) */}
      <div className="bg-[#C9EFD3] rounded-3xl p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1 min-h-[22px]">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#25633E]">
              {t.energy.expenditure}
            </span>
            {!netPositive && deficitPill}
          </div>
          <div className="flex items-baseline gap-1 my-1" aria-label={`${formatKcal(currentExpenditure.totalExpenditure)} kcal`}>
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-[#142E1F] tracking-tight">
              {formatKcal(currentExpenditure.totalExpenditure)}
            </span>
            {!compact && <span className="text-xs font-semibold text-[#25633E]">kcal</span>}
          </div>
        </div>

        <div className="w-full bg-[#E6F8EB] h-2.5 rounded-full overflow-hidden mt-3">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out bg-[#1E5E3A]"
            style={{ width: `${Math.max(5, expPct)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
