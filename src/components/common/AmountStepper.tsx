import React, { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { NumericInput } from './NumericInput';

interface Props {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  compact?: boolean;
  ariaLabel?: string;
  /** Food portions: +10 g below 100, +20 g from 100, +50 g from 200 (water and trackers keep the plain steps). */
  foodSteps?: boolean;
}

// Below 100 → step 10, at/above 100 → step 50
export const stepUp = (v: number) =>
  v < 100 ? Math.min(100, Math.floor(v / 10) * 10 + 10) : Math.floor(v / 50) * 50 + 50;

export const stepDown = (v: number) => {
  if (v <= 0) return 0;
  if (v <= 100) return Math.max(0, Math.ceil(v / 10) * 10 - 10);
  return Math.max(100, Math.ceil(v / 50) * 50 - 50);
};

// Food portions: below 100 → step 10, from 100 up to 200 → step 20, from 200 → step 50
export const foodStepUp = (v: number) => {
  if (v < 100) return Math.min(100, Math.floor(v / 10) * 10 + 10);
  if (v < 200) return Math.min(200, Math.floor(v / 20) * 20 + 20);
  return Math.floor(v / 50) * 50 + 50;
};

export const foodStepDown = (v: number) => {
  if (v <= 0) return 0;
  if (v <= 100) return Math.max(0, Math.ceil(v / 10) * 10 - 10);
  if (v <= 200) return Math.max(100, Math.ceil(v / 20) * 20 - 20);
  return Math.max(200, Math.ceil(v / 50) * 50 - 50);
};

export const AmountStepper: React.FC<Props> = ({ value, onChange, unit, compact, ariaLabel, foodSteps }) => {
  const up = foodSteps ? foodStepUp : stepUp;
  const down = foodSteps ? foodStepDown : stepDown;
  const valRef = useRef(value);
  valRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const holdTimeout = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const didHoldRef = useRef(false);

  const stopHold = () => {
    if (holdTimeout.current) window.clearTimeout(holdTimeout.current);
    if (holdInterval.current) window.clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  };

  useEffect(() => stopHold, []);

  const startHold = (dir: 'up' | 'down') => {
    stopHold();
    didHoldRef.current = false;
    const stepFn = dir === 'up' ? up : down;
    holdTimeout.current = window.setTimeout(() => {
      didHoldRef.current = true;
      holdInterval.current = window.setInterval(() => {
        const next = stepFn(valRef.current);
        if (next !== valRef.current) {
          valRef.current = next;
          onChangeRef.current(next);
        }
      }, 90);
    }, 360);
  };

  const handleClick = (dir: 'up' | 'down') => {
    if (didHoldRef.current) {
      didHoldRef.current = false;
      return;
    }
    const stepFn = dir === 'up' ? up : down;
    onChange(stepFn(value));
  };

  const btn = `pressable ${
    compact ? 'w-9 h-9' : 'w-11 h-11'
  } shrink-0 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center font-bold select-none disabled:opacity-35`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btn}
        disabled={value <= 0}
        onPointerDown={() => startHold('down')}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onClick={() => handleClick('down')}
        aria-label="Decrease"
      >
        <Minus size={compact ? 15 : 18} />
      </button>
      <div className={compact ? 'flex-1 min-w-[96px]' : 'flex-1'}>
        <NumericInput
          value={value}
          onChange={onChange}
          unit={unit}
          ariaLabel={ariaLabel}
          className={compact ? 'py-2 text-xs text-center' : 'text-center'}
        />
      </div>
      <button
        type="button"
        className={btn}
        onPointerDown={() => startHold('up')}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onClick={() => handleClick('up')}
        aria-label="Increase"
      >
        <Plus size={compact ? 15 : 18} />
      </button>
    </div>
  );
};
