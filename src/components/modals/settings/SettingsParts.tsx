import React from 'react';

/**
 * Shared look of every Settings group and sub-section (Today, Custom page, Pages, Notifications, Backup, Delete...).
 * One colour per group (the badge in `Collapsible`), the same sub-section heading and the same toggle / action rows,
 * so no two sub-sections look alike by accident.
 */

/** Badge colours: each Settings group has its own colour, so the groups are easy to tell apart. */
export const TONE = {
  sky: 'bg-[#CFE7FE] text-[#183F66]',
  lilac: 'bg-[#E2D6FF] text-[#4D3582]',
  butter: 'bg-[#F7E9AA] text-[#6E5B14]',
  mint: 'bg-[#C9EFD3] text-[#174A2B]',
  peach: 'bg-[#FAE0B4] text-[#7D4E14]',
  sand: 'bg-[#EDE6D6] text-[#5B4D2E]',
  rose: 'bg-[#F4C6D8] text-[#6E2440]',
  slate: 'bg-[#D9DEE8] text-[#2F3A4E]',
  teal: 'bg-[#BFE9E4] text-[#14524B]',
  red: 'bg-[#F6D0D0] text-[#8C2D32]',
} as const;

/** The on / off switch drawing (the button or row around it owns the interaction). */
export const SwitchVisual: React.FC<{ on: boolean }> = ({ on }) => (
  <span
    aria-hidden="true"
    data-settings-switch={on ? 'on' : 'off'}
    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-150 shrink-0 inline-flex items-center border ${
      on
        ? 'bg-[#C9EFD3] border-[#9ADBB0]'
        : 'bg-[var(--border)] border-[var(--border)]'
    }`}
  >
    <span
      data-settings-switch-thumb
      className={`block w-5 h-5 rounded-full transition-transform [transition-duration:420ms] [transition-timing-function:var(--ease-bounce)] shadow-sm ${
        on ? 'translate-x-5 bg-[#1E5E3A]' : 'translate-x-0 bg-[#FBF8F2]'
      }`}
    />
  </span>
);

/** Heading of every sub-section inside a Settings group (same style everywhere), with an optional hint line. */
export const SubSection: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="space-y-2">
    <div>
      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{title}</span>
      {hint && <p className="text-[11px] font-medium text-[var(--muted)] mt-0.5 leading-snug">{hint}</p>}
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

/** A switch row: coloured icon badge, title, optional one-line description, switch on the right. */
export const ToggleRow: React.FC<{
  icon: React.ReactNode;
  tone: string;
  title: string;
  description?: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}> = ({ icon, tone, title, description, on, disabled = false, onToggle }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={title}
    disabled={disabled}
    onClick={onToggle}
    className="pressable w-full min-h-[52px] flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span className="flex items-center gap-2.5 min-w-0">
      <span data-settings-badge className={`size-8 rounded-full flex items-center justify-center shrink-0 ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">{title}</span>
        {description && <span className="block text-[11px] font-medium text-[var(--muted)] leading-snug mt-0.5">{description}</span>}
      </span>
    </span>
    <SwitchVisual on={on} />
  </button>
);

/** A button row that performs an action (used for the delete rows). Same shape as `ToggleRow`, no switch. */
export const ActionRow: React.FC<{
  icon: React.ReactNode;
  tone: string;
  title: string;
  description?: string;
  disabled?: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
}> = ({ icon, tone, title, description, disabled = false, onClick, trailing }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="pressable w-full min-h-[52px] flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span className="flex items-center gap-2.5 min-w-0">
      <span data-settings-badge className={`size-8 rounded-full flex items-center justify-center shrink-0 ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">{title}</span>
        {description && <span className="block text-[11px] font-medium text-[var(--muted)] leading-snug mt-0.5">{description}</span>}
      </span>
    </span>
    {trailing}
  </button>
);
