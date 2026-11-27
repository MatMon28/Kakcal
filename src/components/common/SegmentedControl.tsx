import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  variant?: 'pill' | 'tray';
  ariaLabel?: string;
  className?: string;
  fullWidth?: boolean;
}

/**
 * Shared segmented control:
 * - `pill`: floating pill switcher for page ranges / layouts (`bg-[var(--surface)]` + `bg-[var(--text)]`).
 * - `tray`: inset tray switcher for in-modal / card modes (`bg-[var(--inset)]` + `bg-[var(--surface)]`).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'tray',
  ariaLabel,
  className = '',
  fullWidth = false,
}: SegmentedControlProps<T>) {
  if (variant === 'pill') {
    return (
      <div
        role="group"
        aria-label={ariaLabel}
        className={`${fullWidth ? 'flex w-full' : 'inline-flex'} items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 ${className}`}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              aria-label={opt.ariaLabel}
              onClick={() => onChange(opt.value)}
              className={`pressable ${fullWidth ? 'flex-1' : ''} px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[var(--text)] text-[var(--on-text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-1 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={`pressable flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors text-center truncate ${
              active
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
