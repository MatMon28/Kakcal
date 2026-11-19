import React from 'react';
import { Droplets, Trash2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { dailyWaterTargetMl } from '../../utils/waterTarget';
import { TrackerCard } from './TrackerCard';

const BLOCK = 250; // one glass; the last block holds the remaining amount up to the goal

interface Props {
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
}

export const WaterCard: React.FC<Props> = ({ compact = false, open, onToggle }) => {
  const { currentDayLog, currentExpenditure, userProfile, settings, setIsWaterOpen, removeWaterEntry, t } = useApp();

  if (!settings.quickAdd.water) return null;

  const entries = currentDayLog.waterEntries || [];
  const totalMl = entries.reduce((a, w) => a + w.ml, 0);
  const targetMl = dailyWaterTargetMl(userProfile, currentExpenditure.activityExpenditure);
  const goalReached = totalMl >= targetMl && targetMl > 0;
  const progress = Math.min(100, targetMl > 0 ? (totalMl / targetMl) * 100 : 0);
  const blockCount = Math.max(1, Math.ceil(targetMl / BLOCK));

  const headline = (
    <span title={`${totalMl} / ${targetMl} ml`} aria-label={`${totalMl} / ${targetMl} ml`}>
      {totalMl}
      {!compact && <span className="text-[11px] font-semibold text-[var(--muted)] ml-1">/ {targetMl} ml</span>}
    </span>
  );

  // Compact keeps a continuous line. Normal/Expanded always show the blocky glass indicator,
  // even while collapsed; it is not repeated inside the expanded entry list.
  const summary = (
    <div className="flex items-center gap-2 w-full min-w-0" title={`${totalMl} / ${targetMl} ml — ${t.water.targetNote}`}>
      <div
        data-water-indicator={compact ? 'continuous' : 'blocks'}
        role="progressbar"
        aria-label={t.quickAdd.water}
        aria-valuemin={0}
        aria-valuemax={targetMl}
        aria-valuenow={Math.min(totalMl, targetMl)}
        aria-valuetext={`${totalMl} / ${targetMl} ml`}
        className={compact ? 'kc-water-track h-2.5 flex-1 rounded-full bg-[#E8F3FF] overflow-hidden' : 'flex flex-1 gap-1 min-w-0'}
      >
        {compact ? (
          <div className="kc-water-fill h-full bg-[#2E7CC4] rounded-full transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        ) : (
          Array.from({ length: blockCount }).map((_, i) => {
            const capacity = Math.max(1, Math.min(BLOCK, targetMl - i * BLOCK));
            const amount = Math.min(capacity, Math.max(0, totalMl - i * BLOCK));
            const fill = amount / capacity;
            return (
              <div
                key={i}
                data-water-block
                className="kc-water-track flex-1 min-w-0 h-7 rounded-md bg-[#E8F3FF] overflow-hidden"
                title={`${Math.round(amount)} / ${capacity} ml`}
              >
                <div className="kc-water-fill h-full bg-[#2E7CC4] transition-[width] duration-300 ease-out" style={{ width: `${fill * 100}%` }} />
              </div>
            );
          })
        )}
      </div>
      {goalReached && (
        <span className="inline-flex items-center justify-center size-4 rounded-full bg-[#1E5E3A] text-white shrink-0">
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </div>
  );

  return (
    <TrackerCard
      title={t.quickAdd.water}
      tone="water"
      icon={<Droplets size={compact ? 15 : 16} strokeWidth={2.2} />}
      headline={headline}
      summary={summary}
      summaryBelow
      onAdd={() => setIsWaterOpen(true)}
      addLabel={t.water.add}
      open={open}
      onToggle={onToggle}
      compact={compact}
    >
      <div className="space-y-2.5">
        {!settings.ultraMinimal && <p className="text-[11px] font-medium text-[var(--muted)]">
          {compact && <span className="tabular-nums">{totalMl} / {targetMl} ml · </span>}
          {t.water.targetNote}
        </p>}

        {entries.length === 0 && settings.ultraMinimal ? (
          <div className="min-h-7" aria-hidden="true" />
        ) : entries.length === 0 ? (
          <button
            type="button"
            onClick={() => setIsWaterOpen(true)}
            className="w-full py-1.5 flex items-center justify-between text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors text-left"
          >
            <span>{t.water.totalToday}: 0 ml</span>
            <span className="font-bold">{t.water.add}</span>
          </button>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {entries.map((w) => (
              <div key={w.id} className="py-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs sm:text-sm tabular-nums min-w-0">
                  <Droplets size={13} className="text-[#2E7CC4] shrink-0" />
                  <span className="font-bold text-[var(--text)]">{w.ml}{settings.ultraMinimal ? '' : ' ml'}</span>
                  <span className="text-[var(--muted)] font-medium">
                    {new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeWaterEntry(w.id)}
                  className="pressable size-8 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center shrink-0"
                  title={t.common.delete}
                  aria-label={`${t.common.delete} ${w.ml} ml`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </TrackerCard>
  );
};
