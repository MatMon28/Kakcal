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
          className={`flex-1 min-w-[44px] rounded-xl ${
            compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs'
          } font-bold transition-colors border ${
            value === q
              ? 'bg-[#C9EFD3] text-[#1A5632] border-[#9ADBB0]'
              : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--inset)]'
          }`}
        >
          {q}{unit}
        </button>
      ))}
    </div>
  </div>
);
