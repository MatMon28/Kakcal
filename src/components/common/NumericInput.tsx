import React, { useState, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  unit?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  allowEmpty?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  placeholder = '0',
  unit,
  className = '',
  id,
  ariaLabel,
  autoFocus = false,
  disabled = false,
}) => {
  const [focused, setFocused] = useState(false);
  const [localVal, setLocalVal] = useState<string>(
    value === 0 && placeholder ? '' : String(value)
  );

  useEffect(() => {
    if (focused) return;
    const parsed = parseFloat(localVal);
    if ((isNaN(parsed) && value !== 0) || (!isNaN(parsed) && parsed !== value)) {
      setLocalVal(value === 0 && placeholder !== '0' ? '' : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(',', '.');
    if (sanitized === '' || /^-?\d*\.?\d*$/.test(sanitized)) {
      setLocalVal(sanitized);
      if (sanitized === '') {
        onChange(0);
      } else {
        const num = parseFloat(sanitized);
        if (!isNaN(num)) {
          onChange(num);
        }
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    // Select content on focus so users can overwrite portions in a single keystroke
    const input = e.currentTarget;
    requestAnimationFrame(() => {
      try {
        input.select();
      } catch {
        /* ignore */
      }
    });
  };

  const handleBlur = () => {
    setFocused(false);
    if (localVal === '' || isNaN(parseFloat(localVal))) {
      if (placeholder && placeholder !== '0' && min === 0) {
        setLocalVal('');
        onChange(0);
      } else {
        const fallback = min > 0 ? min : 0;
        setLocalVal(String(fallback));
        onChange(fallback);
      }
    } else {
      let num = parseFloat(localVal);
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      setLocalVal(String(num));
      onChange(num);
    }
  };

  const isCentered = className.includes('text-center');
  const isCompact = className.includes('text-xs');

  const padClass = unit
    ? isCentered
      ? isCompact
        ? 'pl-2.5 pr-7'
        : 'pl-8 pr-10'
      : 'px-3.5 pr-11'
    : 'px-3.5';

  return (
    <div className="relative flex items-center w-full">
      <input
        id={id}
        aria-label={ariaLabel}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoFocus={autoFocus}
        disabled={disabled}
        value={localVal}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        placeholder={placeholder}
        className={`w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl py-2.5 text-[var(--text)] placeholder-[var(--muted)]/60 text-base font-bold tabular-nums focus:outline-none focus:border-[var(--muted)] transition-colors ${padClass} ${className}`}
      />
      {unit && (
        <span
          className={`absolute ${
            isCompact ? 'right-2.5 text-[10px]' : 'right-3 text-xs'
          } font-bold text-[var(--muted)] pointer-events-none select-none`}
        >
          {unit}
        </span>
      )}
    </div>
  );
};
