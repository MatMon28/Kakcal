import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { AmountStepper } from '../common/AmountStepper';
import { Droplets, Check } from 'lucide-react';
import { dailyWaterTargetMl } from '../../utils/waterTarget';

export const WaterModal: React.FC = () => {
  const { isWaterOpen, setIsWaterOpen, logWater, currentDayLog, userProfile, currentExpenditure, t } = useApp();
  const [amount, setAmount] = useState(250);

  const total = (currentDayLog.waterEntries || []).reduce((a, w) => a + w.ml, 0);
  const target = dailyWaterTargetMl(userProfile, currentExpenditure.activityExpenditure);

  const quick = [
    { label: t.water.glass, value: 250 },
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
      isOpen={isWaterOpen}
      onClose={() => setIsWaterOpen(false)}
      title={t.water.title}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="bg-[#CFE7FE] rounded-3xl p-4 flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-sm font-extrabold text-[#183B5E]">
            <span className="w-9 h-9 rounded-full bg-[#E8F3FF] flex items-center justify-center">
              <Droplets size={17} />
            </span>
            {t.water.totalToday}
          </span>
          <span className="text-xl font-extrabold text-[#183B5E]">{total} / {target} ml</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {quick.map((q) => (
            <button
              key={q.value}
              type="button"
              onClick={() => setAmount(q.value)}
              className={`py-2.5 rounded-2xl text-xs font-extrabold transition-colors ${
                amount === q.value
                  ? 'bg-[#CFE7FE] text-[#183B5E]'
                  : 'bg-[var(--inset)] text-[var(--muted)]'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        <AmountStepper value={amount} onChange={setAmount} unit="ml" />

        <button
          type="button"
          onClick={handleAdd}
          disabled={amount <= 0}
          className="w-full py-3 bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183B5E] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>
            {t.water.add} · {amount} ml
          </span>
        </button>
      </div>
    </Modal>
  );
};
