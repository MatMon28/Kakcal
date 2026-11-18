import React from 'react';
import { useApp } from '../../context/AppContext';
import { dailyWaterTargetMl } from '../../utils/waterTarget';
import { Droplets, Plus, Trash2, Check } from 'lucide-react';

const BLOCK = 250; // each block = one glass = 250 ml

interface Props {
  compact?: boolean;
}

export const WaterCard: React.FC<Props> = ({ compact = false }) => {
  const {
    currentDayLog,
    currentExpenditure,
    userProfile,
    settings,
    setIsWaterOpen,
    removeWaterEntry,
    t,
  } = useApp();

  // The water indicator appears only when the water quick-add button is active
  if (!settings.quickAdd.water) return null;

  const entries = currentDayLog.waterEntries || [];
  const totalMl = entries.reduce((a, w) => a + w.ml, 0);
  const targetMl = dailyWaterTargetMl(userProfile, currentExpenditure.activityExpenditure);
  const goalReached = totalMl >= targetMl && targetMl > 0;
  const progress = Math.min(100, targetMl > 0 ? (totalMl / targetMl) * 100 : 0);

  const blockCount = Math.max(1, Math.ceil(targetMl / BLOCK));
  const filledBlocks = totalMl / BLOCK; // fractional allowed (e.g. 120ml = 0.48 of a block)

  const addBtn = (
    <button
      type="button"
      onClick={() => setIsWaterOpen(true)}
      className="pressable size-7 shrink-0 rounded-full bg-[#FBF8F2] hover:bg-white text-[#183B5E] flex items-center justify-center"
      title={t.water.add}
      aria-label={t.water.add}
    >
      <Plus size={14} strokeWidth={2.5} />
    </button>
  );

  if (compact) {
    return (
      <div className="bg-[#CFE7FE] rounded-2xl p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 min-w-0 text-[13px] font-extrabold text-[#183B5E]">
            <Droplets size={14} className="shrink-0" />
            <span className="truncate">{t.quickAdd.water}</span>
            {goalReached && (
              <span className="inline-flex items-center justify-center size-4 rounded-full bg-[#1E5E3A] text-white">
                <Check size={10} strokeWidth={3} />
              </span>
            )}
          </span>
          {addBtn}
        </div>

        <p className="text-lg sm:text-xl font-extrabold leading-none tabular-nums text-[#183B5E]">
          {totalMl}
          <span className="text-[11px] font-bold ml-1">/ {targetMl} ml</span>
        </p>

        <div className="h-2.5 rounded-full bg-[#E8F3FF] overflow-hidden" title={t.water.targetNote}>
          <div className="h-full bg-[#2E7CC4] rounded-full transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#CFE7FE] rounded-3xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-full bg-[#E8F3FF] text-[#183B5E] flex items-center justify-center">
            <Droplets size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold text-[#183B5E]">
                {t.quickAdd.water}
              </span>
              {goalReached && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1E5E3A] text-white">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </div>
            <span className="text-xs font-medium tabular-nums text-[#436B94]" title={t.water.targetNote}>
              {totalMl} / {targetMl} ml
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsWaterOpen(true)}
          className="pressable w-9 h-9 shrink-0 rounded-full bg-[#FBF8F2] hover:bg-white text-[#183B5E] flex items-center justify-center"
          title={t.water.add}
          aria-label={t.water.add}
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      {/* Blocks bar: each block = 250 ml; partial fill allowed */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: blockCount }).map((_, i) => {
          const fill = Math.min(1, Math.max(0, filledBlocks - i));
          return (
            <div
              key={i}
              className="flex-1 min-w-[14px] h-7 rounded-md bg-[#E8F3FF] overflow-hidden"
              title={`${Math.round(fill * BLOCK)} ml`}
            >
              <div
                className="h-full bg-[#2E7CC4] transition-[width] duration-300 ease-out"
                style={{ width: `${fill * 100}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Every water addition is its own entry */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((w) => (
            <div
              key={w.id}
              className="px-3.5 py-2 rounded-2xl bg-[#E8F3FF] flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm tabular-nums">
                <Droplets size={13} className="text-[#2E7CC4]" />
                <span className="font-bold text-[#183B5E]">{w.ml} ml</span>
                <span className="text-[#436B94] font-medium">
                  {new Date(w.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeWaterEntry(w.id)}
                className="pressable w-8 h-8 rounded-full text-[#436B94] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
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
  );
};
