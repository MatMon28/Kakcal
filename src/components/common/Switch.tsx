import React from 'react';

/**
 * Shared on/off switch visual (the button or row around it owns the interaction).
 * Carries `data-settings-switch` / `data-settings-switch-thumb` hooks so all 9 theme styles skin it.
 */
export const SwitchVisual: React.FC<{ on: boolean; compact?: boolean }> = ({ on, compact = false }) => (
  <span
    aria-hidden="true"
    data-settings-switch={on ? 'on' : 'off'}
    className={`${compact ? 'w-9 h-5' : 'w-11 h-6'} rounded-full p-0.5 transition-colors duration-150 shrink-0 inline-flex items-center border ${
      on ? 'bg-intake border-intake-border' : 'bg-[var(--border)] border-[var(--border)]'
    }`}
  >
    <span
      data-settings-switch-thumb
      className={`block ${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded-full transition-transform [transition-duration:420ms] [transition-timing-function:var(--ease-bounce)] shadow-sm ${
        on ? `${compact ? 'translate-x-4' : 'translate-x-5'} bg-intake-ink` : 'translate-x-0 bg-[#FBF8F2]'
      }`}
    />
  </span>
);

/** Standalone interactive switch button with `role="switch"` and `.pressable`. */
export const Switch: React.FC<{
  on: boolean;
  onToggle: () => void;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}> = ({ on, onToggle, label, compact = false, disabled = false, className = '' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={onToggle}
    className={`pressable inline-flex items-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    <SwitchVisual on={on} compact={compact} />
  </button>
);
