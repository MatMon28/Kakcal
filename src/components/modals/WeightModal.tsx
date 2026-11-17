import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { addDaysToDateString, formatDateDisplay } from '../../utils/formatters';
import { Minus, Plus, Check, Scale } from 'lucide-react';

export const WeightModal: React.FC = () => {
  const {
    isWeightOpen,
    setIsWeightOpen,
    logWeight,
    allDayLogs,
    selectedDate,
    userProfile,
    language,
    t,
  } = useApp();

  // Most recent weight before the selected day (default for the stepper)
  const previous = useMemo(() => {
    for (let i = 1; i <= 60; i++) {
      const d = addDaysToDateString(selectedDate, -i);
      const w = allDayLogs[d]?.weightKg;
      if (typeof w === 'number') return { kg: w, date: d };
    }
    return null;
  }, [allDayLogs, selectedDate]);

  const [kg, setKg] = useState(userProfile.weightKg);

  useEffect(() => {
    if (isWeightOpen) {
      setKg(previous?.kg ?? userProfile.weightKg);
    }
  }, [isWeightOpen, previous, userProfile.weightKg]);

  const step = (delta: number) =>
    setKg((v) => Math.max(20, Math.round((v + delta) * 10) / 10));

  const handleSave = () => {
    if (kg <= 0) return;
    logWeight(kg);
    setIsWeightOpen(false);
  };

  return (
    <Modal
      isOpen={isWeightOpen}
      onClose={() => setIsWeightOpen(false)}
      title={t.weight.title}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="bg-[#F6D0D0] rounded-3xl p-4 flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-sm font-extrabold text-[#7A2727]">
            <span className="w-9 h-9 rounded-full bg-[#FBE9E9] flex items-center justify-center">
              <Scale size={17} />
            </span>
            {t.weight.lastRecorded}
          </span>
          <span className="text-right">
            <span className="block text-lg font-extrabold text-[#7A2727]">
              {previous ? `${previous.kg} kg` : `${userProfile.weightKg} kg`}
            </span>
            {previous && (
              <span className="block text-[11px] font-bold text-[#A05A5A]">
                {formatDateDisplay(previous.date, language)}
              </span>
            )}
          </span>
        </div>

        {/* Stepper: ± 100 g (0.1 kg) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-0.1)}
            className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center active:scale-95"
            aria-label="-100 g"
          >
            <Minus size={19} />
          </button>
          <div className="flex-1">
            <NumericInput
              value={kg}
              onChange={setKg}
              unit="kg"
              min={20}
              className="text-center text-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => step(0.1)}
            className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center active:scale-95"
            aria-label="+100 g"
          >
            <Plus size={19} />
          </button>
        </div>

        <div className="flex gap-1.5">
          {[-1, -0.5, 0.5, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => step(d)}
              className="flex-1 py-2 rounded-xl bg-[var(--inset)] text-[var(--muted)] text-xs font-extrabold"
            >
              {d > 0 ? `+${d}` : d} kg
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={kg <= 0}
          className="w-full py-3 bg-[#F6D0D0] hover:bg-[#F2BFBF] text-[#7A2727] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>
            {t.weight.save} · {kg.toFixed(1)} kg
          </span>
        </button>
      </div>
    </Modal>
  );
};
