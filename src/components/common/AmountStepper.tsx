import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { NumericInput } from './NumericInput';

interface Props {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  compact?: boolean;
}

// Below 100 → step 10, at/above 100 → step 50
export const stepUp = (v: number) =>
  v < 100 ? Math.min(100, Math.floor(v / 10) * 10 + 10) : Math.floor(v / 50) * 50 + 50;

export const stepDown = (v: number) => {
  if (v <= 0) return 0;
  if (v <= 100) return Math.max(0, Math.ceil(v / 10) * 10 - 10);
  return Math.max(100, Math.ceil(v / 50) * 50 - 50);
};

export const AmountStepper: React.FC<Props> = ({ value, onChange, unit, compact }) => {
  const btn = `${
    compact ? 'w-9 h-9' : 'w-11 h-11'
  } shrink-0 rounded-xl bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--inset)] flex items-center justify-center active:scale-95 transition-colors font-bold`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btn}
        onClick={() => onChange(stepDown(value))}
        aria-label="Decrease"
      >
        <Minus size={compact ? 15 : 18} />
      </button>
      <div className={compact ? 'w-24' : 'flex-1'}>
        <NumericInput
          value={value}
          onChange={onChange}
          unit={unit}
          className={compact ? 'py-1.5 text-xs text-center' : 'text-center'}
        />
      </div>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(stepUp(value))}
        aria-label="Increase"
      >
        <Plus size={compact ? 15 : 18} />
      </button>
    </div>
  );
};
