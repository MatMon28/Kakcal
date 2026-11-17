import React from 'react';
import { AmountStepper } from './AmountStepper';

interface Props {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  compact?: boolean;
}

const QUICK = [10, 50, 100, 150, 200, 250];

export const AmountSelector: React.FC<Props> = ({ value, onChange, unit, compact }) => (
  <div className="space-y-2">
    <AmountStepper value={value} onChange={onChange} unit={unit} compact={compact} />
    <div className="flex gap-1.5 flex-wrap">
      {QUICK.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onChange(q)}
          className={`pressable flex-1 min-w-[46px] rounded-xl tabular-nums ${
            compact ? 'py-1.5 text-[11px]' : 'py-1.5 text-xs'
          } font-bold border ${
            value === q
              ? 'bg-[#C9EFD3] text-[#1A5632] border-[#9ADBB0]'
              : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
          }`}
        >
          {q}{unit}
        </button>
      ))}
    </div>
  </div>
);
