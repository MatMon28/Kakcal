import React from 'react';
import { Flame, Utensils } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatKcal } from '../../utils/formatters';

export const EnergyBalanceCards: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t, settings, currentIntakeCalories, currentExpenditure, netBalance } = useApp();
  const ultraMinimal = settings.ultraMinimal;

  const scale = Math.max(currentIntakeCalories, currentExpenditure.totalExpenditure, 1);
  const intakePct = Math.round((currentIntakeCalories / scale) * 100);
  const expPct = Math.round((currentExpenditure.totalExpenditure / scale) * 100);
  const netPositive = netBalance > 0;

  // The badge follows the dominant side; its sign and value are unchanged.
  const surplusPill = (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-intake-accent text-intake-soft">
      +{formatKcal(netBalance)}
    </span>
  );
  const deficitPill = (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-activity-accent text-activity-soft">
      {netBalance === 0 ? '0' : `-${formatKcal(Math.abs(netBalance))}`}
    </span>
  );

  return (
    <div data-energy-overview className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Intake */}
      <div role="group" aria-label={`${t.energy.intake}: ${formatKcal(currentIntakeCalories)} kcal`} className={`bg-intake rounded-3xl ${ultraMinimal ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'} flex flex-col justify-between`}>
        <div>
          <div className={`flex items-center justify-between gap-1 ${ultraMinimal ? 'min-h-5' : 'mb-1 min-h-[22px]'}`}>
            <span className={`${ultraMinimal ? 'inline-flex items-center text-intake-accent' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider text-intake-accent'}`} title={t.energy.intake}>
              {ultraMinimal && <Utensils size={15} aria-hidden="true" />}
              <span className={ultraMinimal ? 'sr-only' : ''}>{t.energy.intake}</span>
            </span>
            {netPositive && surplusPill}
          </div>
          <div className={`flex items-baseline gap-1 my-1 ${ultraMinimal ? 'justify-center text-center' : ''}`} aria-label={`${formatKcal(currentIntakeCalories)} kcal`}>
            {/* key = value: a changed number re-mounts the span and plays the short settle-in. */}
            <span key={currentIntakeCalories} className="anim-value text-2xl sm:text-3xl font-extrabold tabular-nums text-intake-ink tracking-tight">
              {formatKcal(currentIntakeCalories)}
            </span>
            {!compact && !ultraMinimal && <span className="text-xs font-semibold text-intake-accent">kcal</span>}
          </div>
        </div>

        <div className="w-full bg-intake-soft h-2.5 rounded-full overflow-hidden mt-3">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out bg-intake-accent"
            style={{ width: `${currentIntakeCalories > 0 ? Math.max(5, intakePct) : 0}%` }}
          />
        </div>
      </div>

      {/* Burned */}
      <div role="group" aria-label={`${t.energy.expenditure}: ${formatKcal(currentExpenditure.totalExpenditure)} kcal`} className={`bg-activity rounded-3xl ${ultraMinimal ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'} flex flex-col justify-between`}>
        <div>
          <div className={`flex items-center justify-between gap-1 ${ultraMinimal ? 'min-h-5' : 'mb-1 min-h-[22px]'}`}>
            <span className={`${ultraMinimal ? 'inline-flex items-center text-activity-accent' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider text-activity-accent'}`} title={t.energy.expenditure}>
              {ultraMinimal && <Flame size={15} aria-hidden="true" />}
              <span className={ultraMinimal ? 'sr-only' : ''}>{t.energy.expenditure}</span>
            </span>
            {!netPositive && deficitPill}
          </div>
          <div className={`flex items-baseline gap-1 my-1 ${ultraMinimal ? 'justify-center text-center' : ''}`} aria-label={`${formatKcal(currentExpenditure.totalExpenditure)} kcal`}>
            <span key={currentExpenditure.totalExpenditure} className="anim-value text-2xl sm:text-3xl font-extrabold tabular-nums text-activity-ink tracking-tight">
              {formatKcal(currentExpenditure.totalExpenditure)}
            </span>
            {!compact && !ultraMinimal && <span className="text-xs font-semibold text-activity-accent">kcal</span>}
          </div>
        </div>

        <div className="w-full bg-activity-soft h-2.5 rounded-full overflow-hidden mt-3">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out bg-activity-accent"
            style={{ width: `${Math.max(5, expPct)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
