import React, { useEffect, useState } from 'react';
import { useJournalData, useSettings } from '../../context/AppContext';
import { LazyBody } from '../common/LazyBody';
import { getTodayDateString } from '../../utils/formatters';
import { Pill, Lock } from 'lucide-react';
import { CollapseArrow } from '../common/InlineCollapse';
import { SwitchVisual } from '../common/Switch';

/** Integer field validated on blur: clamps to [min,max], reverts empty/non-numeric to the last valid value. */
const IntField: React.FC<{
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
  hint?: string;
  label: string;
}> = ({ value, min, max, onCommit, hint, label }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = parseInt(text, 10);
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return (
    <div>
      <label className="block text-xs font-bold text-[var(--muted)] mb-1">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--text)] text-base font-bold tabular-nums focus:outline-none focus:border-[var(--muted)]"
      />
      {hint && <span className="text-[10px] font-medium text-[var(--muted)]">{hint}</span>}
    </div>
  );
};

export const PeriodSettingsAccordion: React.FC = () => {
  const { t } = useSettings();
  const { periodData, updatePeriodSettings } = useJournalData();
  const s = periodData.settings;
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pressable w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-extrabold text-[var(--text)]">
          {t.period.settingsTitle}
        </span>
        <CollapseArrow open={open} />
      </button>

      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <LazyBody open={open}>
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <IntField
                label={t.period.cycleLength}
                value={s.cycleLength}
                min={15}
                max={60}
                hint={t.period.cycleLengthHint}
                onCommit={(v) => updatePeriodSettings({ cycleLength: v })}
              />
              <IntField
                label={t.period.periodDuration}
                value={s.periodDuration}
                min={1}
                max={15}
                hint={t.period.periodDurationHint}
                onCommit={(v) => updatePeriodSettings({ periodDuration: v })}
              />
            </div>

            {/* Pill */}
            <button
              type="button"
              role="switch"
              aria-checked={s.trackPill}
              onClick={() => updatePeriodSettings({ trackPill: !s.trackPill })}
              className="pressable w-full flex items-center justify-between gap-2 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3.5 py-2.5 transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <Pill size={15} className="text-[var(--muted)] shrink-0" />
                <span>{t.period.trackPill}</span>
              </span>
              <SwitchVisual on={s.trackPill} />
            </button>

            {s.trackPill && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <IntField
                    label={t.period.packLength}
                    value={s.packLength}
                    min={1}
                    max={365}
                    hint={t.period.packLengthHint}
                    onCommit={(v) => updatePeriodSettings({ packLength: v })}
                  />
                  <IntField
                    label={t.period.inactiveDaysLabel}
                    value={s.inactiveDays}
                    min={0}
                    max={Math.max(0, s.packLength - 1)}
                    hint={t.period.inactiveHint}
                    onCommit={(v) => updatePeriodSettings({ inactiveDays: v })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] mb-1">{t.period.packStart}</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={s.packStart || ''}
                      onChange={(e) => e.target.value && updatePeriodSettings({ packStart: e.target.value })}
                      className="flex-1 bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
                    />
                    <button
                      type="button"
                      onClick={() => updatePeriodSettings({ packStart: getTodayDateString() })}
                      className="kc-action-pill pressable px-3 py-2 rounded-xl bg-fat hover:bg-fat-hover text-fat-ink text-xs font-extrabold whitespace-nowrap"
                    >
                      {t.period.startPackToday}
                    </button>
                  </div>
                  {!s.packStart && (
                    <p className="text-[11px] font-medium text-[var(--text-pos)] mt-1">{t.period.noPackStart}</p>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={s.showNutrition}
              onClick={() => updatePeriodSettings({ showNutrition: !s.showNutrition })}
              className="pressable w-full flex items-center justify-between gap-2 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3.5 py-2.5 transition-colors text-left"
            >
              <span className="text-sm font-bold text-[var(--text)]">{t.period.showNutrition}</span>
              <SwitchVisual on={s.showNutrition} />
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={s.showPhaseBandsInStats}
              onClick={() => updatePeriodSettings({ showPhaseBandsInStats: !s.showPhaseBandsInStats })}
              className="pressable w-full flex items-center justify-between gap-2 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3.5 py-2.5 transition-colors text-left"
            >
              <span className="text-sm font-bold text-[var(--text)]">{t.period.showBands}</span>
              <SwitchVisual on={s.showPhaseBandsInStats} />
            </button>

            <p className="flex items-start gap-1.5 text-[11px] font-medium text-[var(--muted)]">
              <Lock size={12} className="mt-0.5 shrink-0" /> {t.period.privacyNote}
            </p>
          </div>
          </LazyBody>
        </div>
      </div>
    </div>
  );
};
