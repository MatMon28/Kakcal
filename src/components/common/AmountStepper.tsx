import React, { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { NumericInput } from './NumericInput';

interface Props {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  compact?: boolean;
  ariaLabel?: string;
  /**
   * Food portions: +10 g below 100, +20 g from 100, +50 g from 200 (water and trackers keep the plain steps).
   * A "−" pressed after a "+" steps back by only 10 g above 100 g and 20 g above 300 g.
   */
  foodSteps?: boolean;
  /** Fixed step increment/decrement (overrides adaptive 10/50 steps when provided). */
  step?: number;
  min?: number;
  max?: number;
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

/**
 * Food portions, "−" right after a "+": a fine step back, so one "+" can be undone gently.
 * Above 300 g → 20 g (never below 300), above 100 g → 10 g (never below 100); up to 100 g the normal steps apply.
 * Plain "−" presses (no "+" used before) keep `foodStepDown`.
 */
export const foodStepDownAfterPlus = (v: number) => {
  if (v <= 0) return 0;
  if (v > 300) return Math.max(300, v - 20);
  if (v > 100) return Math.max(100, v - 10);
  return foodStepDown(v);
};

export const AmountStepper: React.FC<Props> = ({ value, onChange, unit, compact, ariaLabel, foodSteps, step, min = 0, max }) => {
  const valRef = useRef(value);
  valRef.current = value;
  // Food portions: remembers that "+" was used, so the next "−" steps back gently (see `foodStepDownAfterPlus`).
  // `lastEmitted` is the value this stepper produced last; a different value means it was changed from outside
  // (typed, quick preset, another food), which forgets the "+".
  const usedPlus = useRef(false);
  const lastEmitted = useRef(value);
  const clamp = (v: number) => {
    const rounded = Math.round(v * 100) / 100;
    const clampedMin = Math.max(min, rounded);
    return max !== undefined ? Math.min(max, clampedMin) : clampedMin;
  };
  const up = (v: number) => (step !== undefined ? clamp(v + step) : foodSteps ? foodStepUp(v) : stepUp(v));
  const down = (v: number) => {
    if (step !== undefined) return clamp(v - step);
    if (!foodSteps) return stepDown(v);
    return usedPlus.current ? foodStepDownAfterPlus(v) : foodStepDown(v);
  };
  /** Applies one step in a direction and keeps the "+ was used" memory in step with the value. */
  const apply = (dir: 'up' | 'down', from: number) => {
    if (lastEmitted.current !== from) usedPlus.current = false;
    const next = dir === 'up' ? up(from) : down(from);
    if (dir === 'up' && next !== from) usedPlus.current = true;
    lastEmitted.current = next;
    return next;
  };
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
    holdTimeout.current = window.setTimeout(() => {
      didHoldRef.current = true;
      holdInterval.current = window.setInterval(() => {
        const next = apply(dir, valRef.current);
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
    onChange(apply(dir, value));
  };

  const btn = `pressable ${
    compact ? 'w-9 h-9' : 'w-11 h-11'
  } shrink-0 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center font-bold select-none disabled:opacity-35`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btn}
        disabled={value <= min}
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
