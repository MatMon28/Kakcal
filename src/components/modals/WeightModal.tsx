import React, { useEffect, useMemo, useRef, useState } from 'react';
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

  const todayWeight = allDayLogs[selectedDate]?.weightKg;

  // Most recent weight before the selected day (scans up to 60 days back)
  const previous = useMemo(() => {
    for (let i = 1; i <= 60; i++) {
      const d = addDaysToDateString(selectedDate, -i);
      const w = allDayLogs[d]?.weightKg;
      if (typeof w === 'number') return { kg: w, date: d };
    }
    return null;
  }, [allDayLogs, selectedDate]);

  const defaultKg = typeof todayWeight === 'number' ? todayWeight : previous?.kg ?? userProfile.weightKg;
  const [kg, setKg] = useState(defaultKg);
  const kgRef = useRef(kg);
  kgRef.current = kg;

  const holdTimeout = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const didHold = useRef(false);

  const stopHold = () => {
    if (holdTimeout.current) window.clearTimeout(holdTimeout.current);
    if (holdInterval.current) window.clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  };

  useEffect(() => stopHold, []);

  useEffect(() => {
    if (isWeightOpen) {
      setKg(defaultKg);
    }
  }, [isWeightOpen, defaultKg]);

  const step = (delta: number) =>
    setKg((v) => Math.max(20, Math.round((v + delta) * 10) / 10));

  const startHold = (delta: number) => {
    stopHold();
    didHold.current = false;
    holdTimeout.current = window.setTimeout(() => {
      didHold.current = true;
      holdInterval.current = window.setInterval(() => {
        const next = Math.max(20, Math.round((kgRef.current + delta) * 10) / 10);
        kgRef.current = next;
        setKg(next);
      }, 95);
    }, 360);
  };

  const handleStepClick = (delta: number) => {
    if (didHold.current) {
      didHold.current = false;
      return;
    }
    step(delta);
  };

  const handleSave = () => {
    if (!Number.isFinite(kg) || kg < 20) return;
    const rounded = Math.round(kg * 10) / 10;
    logWeight(rounded);
    setIsWeightOpen(false);
  };

  const refWeight = previous?.kg ?? userProfile.weightKg;
  const delta = Math.round((kg - refWeight) * 10) / 10;

  return (
    <Modal
      isOpen={isWeightOpen}
      onClose={() => setIsWeightOpen(false)}
      title={t.weight.title}
      subtitle={formatDateDisplay(selectedDate, language)}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="bg-[#F6D0D0] rounded-3xl p-4 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5 text-sm font-extrabold text-[#7A2727]">
            <span className="w-9 h-9 rounded-full bg-[#FBE9E9] flex items-center justify-center shrink-0">
              <Scale size={17} />
            </span>
            {typeof todayWeight === 'number' ? t.weight.loggedForDay : previous ? t.weight.lastRecorded : t.stats.profileWeight}
          </span>
          <span className="text-right tabular-nums">
            <span className="block text-lg font-extrabold text-[#7A2727]">
              {typeof todayWeight === 'number'
                ? `${todayWeight.toFixed(1)} kg`
                : previous
                ? `${previous.kg.toFixed(1)} kg`
                : `${userProfile.weightKg.toFixed(1)} kg`}
            </span>
            {typeof todayWeight !== 'number' && previous && (
              <span className="block text-[11px] font-bold text-[#A05A5A]">
                {formatDateDisplay(previous.date, language)}
              </span>
            )}
            {delta !== 0 && (
              <span className="block text-[11px] font-bold text-[#8C3A3A]">
                {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} kg
              </span>
            )}
          </span>
        </div>

        {/* Stepper: ± 100 g (0.1 kg), supports hold-to-repeat */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={() => startHold(-0.1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onClick={() => handleStepClick(-0.1)}
            className="pressable w-12 h-12 shrink-0 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center select-none"
            aria-label="-100 g"
          >
            <Minus size={19} />
          </button>
          <div className="flex-1">
            <NumericInput
              value={kg}
              onChange={setKg}
              unit="kg"
              ariaLabel={t.weight.current}
              min={20}
              className="text-center text-lg"
            />
          </div>
          <button
            type="button"
            onPointerDown={() => startHold(0.1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onClick={() => handleStepClick(0.1)}
            className="pressable w-12 h-12 shrink-0 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center select-none"
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
              className="pressable flex-1 py-2 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] text-xs font-extrabold tabular-nums"
            >
              {d > 0 ? `+${d}` : d} kg
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!Number.isFinite(kg) || kg < 20}
          className="pressable w-full py-3 bg-[#F6D0D0] hover:bg-[#F2BFBF] text-[#7A2727] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40"
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
