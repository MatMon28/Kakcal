import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { AmountStepper } from '../common/AmountStepper';
import { Droplets, Check } from 'lucide-react';
import { dailyWaterTargetMl } from '../../utils/waterTarget';

export const WaterModal: React.FC = () => {
  const {
    isWaterOpen,
    setIsWaterOpen,
    logWater,
    currentDayLog,
    userProfile,
    currentExpenditure,

    t,
  } = useApp();
  const [amount, setAmount] = useState(250);

  const total = (currentDayLog.waterEntries || []).reduce((a, w) => a + w.ml, 0);
  const target = dailyWaterTargetMl(userProfile, currentExpenditure.activityExpenditure);
  const currentPct = Math.min(100, Math.round((total / Math.max(1, target)) * 100));
  const previewPct = Math.min(100, Math.round(((total + Math.max(0, amount)) / Math.max(1, target)) * 100));

  const quick = [
    { label: '250ml', value: 250 },
    { label: '0.5 L', value: 500 },
    { label: '0.75 L', value: 750 },
    { label: '1 L', value: 1000 },
  ];

  const handleAdd = () => {
    if (amount <= 0) return;
    logWater(amount);
    setIsWaterOpen(false);
  };

  return (
    <Modal
      dockId="water"
      isOpen={isWaterOpen}
      onClose={() => setIsWaterOpen(false)}
      title={t.water.title}
      maxWidth="max-w-md"
      footer={
        <button
          type="button"
          onClick={handleAdd}
          disabled={amount <= 0}
          className="pressable w-full py-3 bg-carbs hover:bg-carbs-hover text-carbs-ink font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>
            {t.water.save} · {amount} ml
          </span>
        </button>
      }
    >
      <div className="space-y-4">
        <div className="bg-carbs rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2.5 text-sm font-extrabold text-[#183B5E]">
              <span className="w-9 h-9 rounded-full bg-[#E8F3FF] flex items-center justify-center shrink-0">
                <Droplets size={17} />
              </span>
              {t.water.totalToday}
            </span>
            <span className="text-lg sm:text-xl font-extrabold tabular-nums text-[#183B5E]">
              {total} / {target} ml
            </span>
          </div>
          <div className="relative w-full h-2.5 rounded-full bg-[#E8F3FF] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#8EC2F2] rounded-full transition-[width] duration-200"
              style={{ width: `${previewPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-[#2E7CC4] rounded-full transition-[width] duration-300"
              style={{ width: `${currentPct}%` }}
            />
          </div>
        </div>

        <AmountStepper value={amount} onChange={setAmount} unit="ml" />

        <div className="grid grid-cols-4 gap-1.5">
          {quick.map((q) => (
            <button
              key={q.value}
              type="button"
              onClick={() => setAmount(q.value)}
              className={`pressable py-2.5 px-1 rounded-2xl text-[11px] sm:text-xs font-extrabold tabular-nums border text-center ${
                amount === q.value
                  ? 'bg-carbs text-carbs-ink border-carbs-border'
                  : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
