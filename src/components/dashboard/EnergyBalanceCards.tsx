import React from 'react';
import { ArrowDownLeft, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatKcal } from '../../utils/formatters';
import { GoalBadge } from '../common/GoalBadge';

/** Numbers shared by the Intake and Burned cards. */
function useEnergy() {
  const { t, settings, currentIntakeCalories, currentExpenditure, netBalance } = useApp();
  const scale = Math.max(currentIntakeCalories, currentExpenditure.totalExpenditure, 1);
  return {
    t,
    ultraMinimal: settings.ultraMinimal,
    currentIntakeCalories,
    currentExpenditure,
    netBalance,
    intakePct: Math.round((currentIntakeCalories / scale) * 100),
    expPct: Math.round((currentExpenditure.totalExpenditure / scale) * 100),
    netPositive: netBalance > 0,
  };
}

/** Today > Intake card (also a movable / resizable field with the advanced layout). */
export const IntakeCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t, ultraMinimal, currentIntakeCalories, netBalance, intakePct, netPositive } = useEnergy();

  // The badge follows the dominant side; its sign and value are unchanged.
  const surplusPill = (
    <span className="kc-balance-badge kc-balance-badge-intake px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-intake-accent text-intake-soft">
      +{formatKcal(netBalance)}
    </span>
  );

  return (
    <div role="group" aria-label={`${t.energy.intake}: ${formatKcal(currentIntakeCalories)} kcal`} className={`kc-hero-intake bg-intake rounded-3xl ${ultraMinimal ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'} flex flex-col justify-between`}>
      <div>
        <div className={`flex items-center justify-between gap-1 ${ultraMinimal ? 'min-h-5' : 'mb-1 min-h-[22px]'}`}>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className={`${ultraMinimal ? 'inline-flex items-center text-intake-accent' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider text-intake-accent'}`} title={t.energy.intake}>
              {ultraMinimal && <ArrowDownLeft size={16} strokeWidth={2.4} aria-hidden="true" />}
              <span className={ultraMinimal ? 'sr-only' : ''}>{t.energy.intake}</span>
            </span>
            {/* Settings > Advanced: calorie objective / limit reached */}
            <GoalBadge goal="calories" amount={currentIntakeCalories} />
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

      <div className="kc-hero-track w-full bg-intake-soft h-2.5 rounded-full overflow-hidden mt-3">
        <div
          className="kc-hero-fill h-full rounded-full transition-[width] duration-500 ease-out bg-intake-accent"
          style={{ width: `${currentIntakeCalories > 0 ? Math.max(5, intakePct) : 0}%` }}
        />
      </div>
    </div>
  );
};

/** Today > Burned card (also a movable / resizable field with the advanced layout). */
export const BurnedCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t, ultraMinimal, currentExpenditure, netBalance, expPct, netPositive } = useEnergy();

  const deficitPill = (
    <span className="kc-balance-badge px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-activity-accent text-activity-soft">
      {netBalance === 0 ? '0' : `-${formatKcal(Math.abs(netBalance))}`}
    </span>
  );

  return (
    <div role="group" aria-label={`${t.energy.expenditure}: ${formatKcal(currentExpenditure.totalExpenditure)} kcal`} className={`kc-hero-burned bg-activity rounded-3xl ${ultraMinimal ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'} flex flex-col justify-between`}>
      <div>
        <div className={`flex items-center justify-between gap-1 ${ultraMinimal ? 'min-h-5' : 'mb-1 min-h-[22px]'}`}>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className={`${ultraMinimal ? 'inline-flex items-center text-activity-accent' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider text-activity-accent'}`} title={t.energy.expenditure}>
              {ultraMinimal && <Flame size={15} aria-hidden="true" />}
              <span className={ultraMinimal ? 'sr-only' : ''}>{t.energy.expenditure}</span>
            </span>
            {/* Settings > Advanced: goal / limit for the calories burned */}
            <GoalBadge goal="burned" amount={currentExpenditure.totalExpenditure} />
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

      <div className="kc-hero-track w-full bg-activity-soft h-2.5 rounded-full overflow-hidden mt-3">
        <div
          className="kc-hero-fill h-full rounded-full transition-[width] duration-500 ease-out bg-activity-accent"
          style={{ width: `${Math.max(5, expPct)}%` }}
        />
      </div>
    </div>
  );
};

export const EnergyBalanceCards: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div data-energy-overview className="grid grid-cols-2 gap-3 sm:gap-4">
    <IntakeCard compact={compact} />
    <BurnedCard compact={compact} />
  </div>
);
