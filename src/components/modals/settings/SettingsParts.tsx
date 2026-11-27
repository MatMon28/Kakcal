import React from 'react';
import { SwitchVisual } from '../../common/Switch';

export { SwitchVisual };

/**
 * Shared look of every Settings group and sub-section (Today, Custom page, Pages, Notifications, Backup, Delete...).
 * One colour per group (the badge in `Collapsible`), the same sub-section heading and the same toggle / action rows,
 * so no two sub-sections look alike by accident.
 */

export const TONE = {
  sky: 'bg-carbs text-carbs-ink',
  lilac: 'bg-fat text-fat-ink',
  butter: 'bg-nutrient text-nutrient-ink',
  mint: 'bg-intake text-intake-ink',
  peach: 'bg-protein text-protein-ink',
  sand: 'bg-[#EDE6D6] text-[#5B4D2E]',
  rose: 'bg-period text-period-ink',
  slate: 'bg-[#D9DEE8] text-[#2F3A4E]',
  teal: 'bg-teal text-teal-ink',
  red: 'bg-activity text-activity-ink',
} as const;

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
