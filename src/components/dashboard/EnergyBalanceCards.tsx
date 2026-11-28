import React from 'react';
import { ArrowDownLeft, Flame } from 'lucide-react';
import { useJournalData, useSettings } from '../../context/AppContext';
import { formatKcal } from '../../utils/formatters';
import { TileGoalOverlay } from '../common/GoalBadge';
import { TodayBalanceTarget } from './BalanceTargetCard';

/** Numbers shared by the Intake and Burned cards. */
function useEnergy() {
  const { t, settings } = useSettings();
  const { currentIntakeCalories, currentExpenditure, netBalance } = useJournalData();
  return {
    t,
    ultraMinimal: settings.ultraMinimal,
    currentIntakeCalories,
    currentExpenditure,
    netBalance,
    netPositive: netBalance > 0,
  };
}

/** Today > Intake card (also a movable / resizable field with the advanced layout). */
export const IntakeCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t, ultraMinimal, currentIntakeCalories, netBalance, netPositive } = useEnergy();

  // The badge follows the dominant side; its sign and value are unchanged.
  const surplusPill = (
    <span
      className={`kc-balance-badge kc-balance-badge-intake absolute ${
        ultraMinimal ? 'top-2.5 right-2.5' : 'top-3 right-3.5'
      } px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-intake-accent text-intake-soft`}
    >
      +{formatKcal(netBalance)}
    </span>
  );

  return (
    <div
      role="group"
      aria-label={`${t.energy.intake}: ${formatKcal(currentIntakeCalories)} kcal`}
      className={`kc-hero-intake bg-intake rounded-3xl relative h-full flex flex-col items-center justify-center text-center ${
        ultraMinimal ? 'min-h-[88px] pt-7 pb-6 px-3' : 'min-h-[114px] pt-9 pb-7 px-3.5 sm:px-4'
      }`}
    >
      <span
        className={`absolute ${
          ultraMinimal ? 'top-2.5' : 'top-[13px]'
        } left-1/2 -translate-x-1/2 max-w-[calc(100%-28px)] truncate text-center ${
          ultraMinimal ? 'inline-flex items-center text-intake-accent' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider text-intake-accent'
        }`}
        title={t.energy.intake}
      >
        {ultraMinimal && <ArrowDownLeft size={16} strokeWidth={2.4} aria-hidden="true" />}
        <span className={ultraMinimal ? 'sr-only' : ''}>{t.energy.intake}</span>
      </span>

      {netPositive && surplusPill}

      <div className="flex items-baseline justify-center gap-1" aria-label={`${formatKcal(currentIntakeCalories)} kcal`}>
        {/* key = value: a changed number re-mounts the span and plays the short settle-in. */}
        <span key={currentIntakeCalories} className="anim-value text-2xl sm:text-3xl font-extrabold tabular-nums text-intake-ink tracking-tight">
          {formatKcal(currentIntakeCalories)}
        </span>
        {!compact && !ultraMinimal && <span className="text-xs font-semibold text-intake-accent">kcal</span>}
      </div>

      <TileGoalOverlay
        goal="calories"
        amount={currentIntakeCalories}
        unit="kcal"
        ultraMinimal={ultraMinimal}
        formatNumber={formatKcal}
      />
    </div>
  );
};

/** Today > Burned card (also a movable / resizable field with the advanced layout). */
export const BurnedCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t, ultraMinimal, currentExpenditure, netBalance, netPositive } = useEnergy();

  const deficitPill = (
    <span
      className={`kc-balance-badge absolute ${
        ultraMinimal ? 'top-2.5 right-2.5' : 'top-3 right-3.5'
      } px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-activity-accent text-activity-soft`}
    >
      {netBalance === 0 ? '0' : `-${formatKcal(Math.abs(netBalance))}`}
    </span>
  );

  return (
    <div
      role="group"
      aria-label={`${t.energy.expenditure}: ${formatKcal(currentExpenditure.totalExpenditure)} kcal`}
      className={`kc-hero-burned bg-activity rounded-3xl relative h-full flex flex-col items-center justify-center text-center ${
        ultraMinimal ? 'min-h-[88px] pt-7 pb-6 px-3' : 'min-h-[114px] pt-9 pb-7 px-3.5 sm:px-4'
      }`}
    >
      <span
        className={`absolute ${
          ultraMinimal ? 'top-2.5' : 'top-[13px]'
        } left-1/2 -translate-x-1/2 max-w-[calc(100%-28px)] truncate text-center ${
          ultraMinimal ? 'inline-flex items-center text-activity-accent' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider text-activity-accent'
        }`}
        title={t.energy.expenditure}
      >
        {ultraMinimal && <Flame size={15} aria-hidden="true" />}
        <span className={ultraMinimal ? 'sr-only' : ''}>{t.energy.expenditure}</span>
      </span>

      {!netPositive && deficitPill}

      <div className="flex items-baseline justify-center gap-1" aria-label={`${formatKcal(currentExpenditure.totalExpenditure)} kcal`}>
        <span key={currentExpenditure.totalExpenditure} className="anim-value text-2xl sm:text-3xl font-extrabold tabular-nums text-activity-ink tracking-tight">
          {formatKcal(currentExpenditure.totalExpenditure)}
        </span>
        {!compact && !ultraMinimal && <span className="text-xs font-semibold text-activity-accent">kcal</span>}
      </div>

      <TileGoalOverlay
        goal="burned"
        amount={currentExpenditure.totalExpenditure}
        unit="kcal"
        ultraMinimal={ultraMinimal}
        formatNumber={formatKcal}
      />
    </div>
  );
};

export const EnergyBalanceCards: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <>
    <div data-energy-overview className="grid grid-cols-2 gap-2.5 sm:gap-4">
      <IntakeCard compact={compact} />
      <BurnedCard compact={compact} />
    </div>
    {/* Settings > Advanced: wanted intake / burned difference (renders nothing while off). */}
    <TodayBalanceTarget />
  </>
);
