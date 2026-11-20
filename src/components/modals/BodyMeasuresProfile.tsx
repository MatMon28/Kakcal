import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useAdvancedText } from '../../i18n/advanced';
import {
  addCustomMeasure,
  DEFAULT_MEASURES,
  removeCustomMeasure,
  toggleTrackedMeasure,
  useAdvanced,
} from '../../utils/advancedStore';
import type { CustomMeasure } from '../../types/advanced';
import { BodyPartIcon } from '../common/BodyPartIcon';
import { ConfirmDialog } from '../common/ConfirmDialog';

/**
 * Profile > Body measurements (only when Settings > Advanced > Body measurements is on).
 * Pick which measures to track (changes apply immediately) and add personalised ones.
 */
export const BodyMeasuresProfile: React.FC = () => {
  const text = useAdvancedText();
  const { body } = useAdvanced();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('cm');
  const [pendingRemove, setPendingRemove] = useState<CustomMeasure | null>(null);

  if (!body.enabled) return null;

  const tile = (id: string, label: string, icon: React.ReactNode) => {
    const on = body.tracked.includes(id);
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => toggleTrackedMeasure(id)}
        className={`pressable flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-left min-w-0 ${
          on
            ? 'bg-[#E2D6FF] text-[#49346F] border-[#C9B6F5]'
            : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
        }`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1 min-w-0 truncate text-xs font-extrabold">{label}</span>
        {on && <Check size={14} strokeWidth={3} className="shrink-0" aria-hidden="true" />}
      </button>
    );
  };

  const add = () => {
    if (addCustomMeasure(name, unit)) {
      setName('');
      setUnit('cm');
    }
  };

  return (
    <section aria-label={text.profile.title} className="space-y-2.5 rounded-3xl border border-[var(--border)] p-3">
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">{text.profile.title}</h3>
        <p className="text-[11px] font-medium text-[var(--muted)]">{text.profile.track}</p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {DEFAULT_MEASURES.map(({ id }) => tile(id, text.measure[id], <BodyPartIcon id={id} size={22} />))}
      </div>

      {body.custom.length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
            {text.profile.customGroup}
          </span>
          {body.custom.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0 grid">{tile(m.id, `${m.name} (${m.unit})`, <BodyPartIcon id="custom" size={22} />)}</div>
              <button
                type="button"
                onClick={() => setPendingRemove(m)}
                aria-label={`${text.profile.remove}: ${m.name}`}
                title={text.profile.remove}
                className="pressable size-9 shrink-0 rounded-full bg-[var(--inset)] hover:bg-[#F6D0D0] hover:text-[#7A2727] text-[var(--muted)] flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New personalised measure */}
      <div className="space-y-1.5">
        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{text.profile.addCustom}</span>
        <div className="flex items-end gap-1.5">
          <label className="flex-1 min-w-0">
            <span className="sr-only">{text.profile.customName}</span>
            <input
              type="text"
              value={name}
              maxLength={40}
              placeholder={text.profile.customNamePlaceholder}
              aria-label={text.profile.customName}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)]/60 focus:outline-none focus:border-[var(--muted)]"
            />
          </label>
          <label className="w-16 shrink-0">
            <span className="sr-only">{text.profile.customUnit}</span>
            <input
              type="text"
              value={unit}
              maxLength={8}
              aria-label={text.profile.customUnit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-2 py-2.5 text-sm font-bold text-center text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
            />
          </label>
          <button
            type="button"
            onClick={add}
            disabled={!name.trim()}
            aria-label={text.profile.add}
            title={text.profile.add}
            className="pressable size-[2.65rem] shrink-0 rounded-xl bg-[#E2D6FF] text-[#49346F] disabled:opacity-40 flex items-center justify-center"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={text.profile.removeTitle}
        message={text.profile.removeText.replace('{name}', pendingRemove?.name ?? '')}
        confirmLabel={text.profile.remove}
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) removeCustomMeasure(pendingRemove.id);
          setPendingRemove(null);
        }}
      />
    </section>
  );
};
