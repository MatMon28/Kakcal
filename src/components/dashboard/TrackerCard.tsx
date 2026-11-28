import React from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useSettings } from '../../context/AppContext';
import { LazyBody } from '../common/LazyBody';

const palettes = {
  activity: { surface: 'var(--color-activity)', text: 'var(--color-activity-ink)', muted: 'var(--color-activity-accent)', inset: 'var(--color-activity-soft)', border: 'var(--color-activity-border)', hover: 'var(--color-activity-hover)' },
  water: { surface: '#CFE7FE', text: '#183B5E', muted: '#436B94', inset: '#E8F3FF', border: '#A9CFF5', hover: '#BDDDFC' },
  poop: { surface: '#FAE0B4', text: '#7D4E14', muted: '#9B6E32', inset: '#FDF3E0', border: '#E8C68E', hover: '#F7D69E' },
  custom: { surface: '#F7E9AA', text: '#6E5B14', muted: '#8A7224', inset: '#FCF4D6', border: '#E7D889', hover: '#F2E29A' },
};

interface TrackerCardProps {
  title: string;
  tone: keyof typeof palettes;
  icon: React.ReactNode;
  /** Header value, e.g. "213 kcal" (just "213" in Compact). */
  headline: React.ReactNode;
  /** Fixed-height compact summary keeps Activity and Water the same height. */
  summary: React.ReactNode;
  /** Water's block indicator needs a full-width row in Normal/Expanded. */
  summaryBelow?: boolean;
  onAdd: () => void;
  addLabel: string;
  open: boolean;
  onToggle: () => void;
  compact?: boolean;
  children: React.ReactNode;
}

/** Meal-like expand/collapse behaviour, with each tracker's own pastel background preserved. */
export const TrackerCard: React.FC<TrackerCardProps> = ({
  title,
  tone,
  icon,
  headline,
  summary,
  summaryBelow = false,
  onAdd,
  addLabel,
  open,
  onToggle,
  compact = false,
  children,
}) => {
  const { t, settings } = useSettings();
  const palette = palettes[tone];
  // In Classic theme, scope the pastel palette to this card; in the 6 new themes, inherit the coherent theme tokens.
  const style =
    settings.themeStyle === 'classic'
      ? (Object.fromEntries(Object.entries(palette).map(([name, value]) => [`--${name}`, value])) as React.CSSProperties)
      : undefined;

  const badge = (
    <div className={`kc-tracker-icon ${compact ? 'size-8 max-[359px]:size-7' : 'size-9'} rounded-full flex items-center justify-center shrink-0 bg-transparent text-[var(--text)]`}>
      {icon}
    </div>
  );

  const addButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onAdd();
      }}
      className={`pressable ${compact ? 'size-7 max-[359px]:size-6' : 'size-8'} shrink-0 rounded-full bg-transparent hover:opacity-75 text-[var(--text)] flex items-center justify-center`}
      title={addLabel}
      aria-label={addLabel}
    >
      <Plus size={compact ? 14 : 16} strokeWidth={2.5} />
    </button>
  );

  const chevron = (
    <ChevronDown
      size={compact ? 14 : 16}
      className={`${compact ? 'max-[359px]:size-3' : ''} shrink-0 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    />
  );

  return (
    <section
      aria-label={title}
      data-tracker={tone}
      style={style}
      className={`bg-[var(--surface)] border border-[var(--border)] overflow-hidden transition-colors ${compact ? 'rounded-2xl' : 'rounded-3xl'}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${title}: ${open ? t.common.collapse : t.common.expand}`}
        title={title}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`${compact ? 'px-3 py-3 max-[359px]:px-2.5' : 'px-4 py-3.5'} flex flex-col items-center gap-2.5 cursor-pointer select-none hover:bg-[var(--inset)]/40 transition-colors`}
      >
        {compact ? (
          <>
            <div className="flex items-center gap-2 max-[359px]:gap-1 w-full">
              {badge}
              <div data-tracker-headline className="min-w-0 flex-1 text-[15px] max-[359px]:text-sm font-extrabold tabular-nums text-[var(--text)] truncate">{headline}</div>
              {addButton}
              {chevron}
            </div>
            <div className="w-full h-[26px] flex items-center min-w-0">{summary}</div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {badge}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-[var(--text)] truncate">{title}</h4>
                  {!summaryBelow && <div className="mt-1 flex items-center min-w-0 min-h-[22px]">{summary}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span data-tracker-headline className="text-sm sm:text-base font-extrabold tabular-nums text-[var(--text)] whitespace-nowrap">{headline}</span>
                {addButton}
                {chevron}
              </div>
            </div>
            {summaryBelow && <div className="w-full min-w-0">{summary}</div>}
          </>
        )}
      </div>

      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className={`${compact ? 'px-3' : 'px-4'} py-3 border-t border-[var(--border)]`}><LazyBody open={open} defer>{children}</LazyBody></div>
        </div>
      </div>
    </section>
  );
};
