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
  autoFocus?: boolean;
  disabled?: boolean;
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
  autoFocus = false,
  disabled = false,
}) => {
  const [localVal, setLocalVal] = useState<string>(
    value === 0 && placeholder ? '' : String(value)
  );

  useEffect(() => {
    const parsed = parseFloat(localVal);
    if ((isNaN(parsed) && value !== 0) || (!isNaN(parsed) && parsed !== value)) {
      setLocalVal(value === 0 ? '' : String(value));
    }
  }, [value]);

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

  const handleBlur = () => {
    if (localVal === '' || isNaN(parseFloat(localVal))) {
      setLocalVal('0');
      onChange(0);
    } else {
      let num = parseFloat(localVal);
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      setLocalVal(String(num));
      onChange(num);
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        disabled={disabled}
        value={localVal}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-base font-bold focus:outline-none focus:border-[var(--muted)] transition-colors ${
          unit ? 'pr-12' : ''
        } ${className}`}
      />
      {unit && (
        <span className="absolute right-3.5 text-xs font-bold text-[var(--muted)] pointer-events-none select-none uppercase">
          {unit}
        </span>
      )}
    </div>
  );
};
