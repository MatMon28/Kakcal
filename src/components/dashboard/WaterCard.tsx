import React from 'react';
import { useApp } from '../../context/AppContext';
import { dailyWaterTargetMl } from '../../utils/waterTarget';
import { Droplets, Plus, Trash2, Check } from 'lucide-react';

const BLOCK = 250; // each block = one glass = 250 ml

export const WaterCard: React.FC = () => {
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

  const blockCount = Math.max(1, Math.ceil(targetMl / BLOCK));
  const filledBlocks = totalMl / BLOCK; // fractional allowed (e.g. 120ml = 0.48 of a block)

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
                <Droplets size={13} className="text-[#2E7CC4] shrink-0" />
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
                aria-label={t.common.delete}
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
