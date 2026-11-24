import React from 'react';
import { Scale } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useAdvanced } from '../../utils/advancedStore';
import { formatKcal } from '../../utils/formatters';

interface BalanceTargetCardProps {
  /** Intake minus burned, in kcal (negative = deficit, positive = surplus). */
  net: number;
  /** Statistics: the net is a daily average over the selected range. */
  average?: boolean;
}

/**
 * Settings > Advanced > Goals & limits > Intake / burned difference. Shows how close the day (or the average of the
 * selected range) is to the wanted deficit or surplus. Both directions work the same way: the bar fills as the
 * difference gets closer to the target, and the line below says what is left or by how much it was passed.
 */
export const BalanceTargetCard: React.FC<BalanceTargetCardProps> = ({ net, average = false }) => {
  const { settings } = useApp();
  const { balance } = useAdvanced();
  const j = useJournalText();
  if (!balance.enabled || !(balance.kcal > 0)) return null;

  const ultraMinimal = settings.ultraMinimal;
  const deficit = balance.kind === 'deficit';
  // Amount moved in the wanted direction: positive when the wanted direction is reached.
  const progress = deficit ? -net : net;
  const left = Math.round(balance.kcal - progress);
  const reached = left <= 0;
  const pct = Math.max(0, Math.min(100, Math.round((progress / balance.kcal) * 100)));
  const signed = `${net > 0 ? '+' : net < 0 ? '-' : ''}${formatKcal(Math.abs(net))}`;
  const kindLabel = deficit ? j('Deficit', 'Deficit') : j('Surplus', 'Surplus');
  const title = j('Intake vs burned', 'Introdotte vs bruciate');
  const status = reached
    ? left === 0
      ? j('Target reached', 'Obiettivo raggiunto')
      : j(`${formatKcal(Math.abs(left))} kcal beyond the target`, `${formatKcal(Math.abs(left))} kcal oltre l'obiettivo`)
    : j(`${formatKcal(left)} kcal to go`, `Mancano ${formatKcal(left)} kcal`);

  return (
    <div
      role="group"
      data-balance-card
      aria-label={`${title}: ${signed} kcal, ${kindLabel} ${formatKcal(balance.kcal)} kcal`}
      className={`kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl ${ultraMinimal ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-[var(--text)]" title={title}>
          <span className="size-7 rounded-full bg-intake text-intake-ink flex items-center justify-center shrink-0">
            <Scale size={14} aria-hidden="true" />
          </span>
          <span className={ultraMinimal ? 'sr-only' : 'text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate'}>
            {title}
            {average ? ` · ${j('avg', 'media')}` : ''}
          </span>
        </span>
        <span className="text-sm font-extrabold tabular-nums text-[var(--text)] shrink-0">{signed} kcal</span>
      </div>
      <div className="mt-3 w-full h-2.5 rounded-full bg-[var(--inset)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${reached ? 'bg-[#4FA872]' : 'bg-intake-accent'}`}
          style={{ width: `${pct > 0 ? Math.max(4, pct) : 0}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold tabular-nums">
        <span className="text-[var(--muted)]">
          {kindLabel} {formatKcal(balance.kcal)} kcal
        </span>
        <span className={reached ? 'text-[#2E7D4F]' : 'text-[var(--muted)]'}>{status}</span>
      </div>
    </div>
  );
};

/** Today: the target for the selected day. */
export const TodayBalanceTarget: React.FC = () => {
  const { netBalance } = useApp();
  return <BalanceTargetCard net={Math.round(netBalance)} />;
};
