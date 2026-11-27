import React, { useState } from 'react';
import { Check, ChevronLeft, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAdvancedText } from '../../i18n/advanced';
import {
  DEFAULT_MEASURES,
  groupOfMeasure,
  BODY_SIDES,
  isDefaultMeasure,
  isPairedMeasure,
  removeBodyEntry,
  seriesKey,
  setBodyEntry,
  useAdvanced,
  useBodyEntries,
} from '../../utils/advancedStore';
import type { BodyGroup, BodySide } from '../../types/advanced';
import { formatDateDisplay, getTodayDateString } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { BodyPartIcon } from '../common/BodyPartIcon';

interface MeasureInfo {
  id: string;
  name: string;
  unit: string;
  /** Recorded for both sides (left and right). */
  paired: boolean;
}

/** Tracked measures that belong to a group, in display order. */
export function useTrackedMeasures(group?: BodyGroup): MeasureInfo[] {
  const { body } = useAdvanced();
  const text = useAdvancedText();
  const all: MeasureInfo[] = [
    ...DEFAULT_MEASURES.map(({ id }) => ({ id: id as string, name: text.measure[id], unit: 'cm', paired: isPairedMeasure(id) })),
    ...body.custom.map((m) => ({ id: m.id, name: m.name, unit: m.unit, paired: false })),
  ];
  return all.filter((m) => body.tracked.includes(m.id) && (!group || groupOfMeasure(m.id) === group));
}

/** Value + date form for one measure. Mounted per selection, so its state starts fresh. */
const MeasureForm: React.FC<{ measure: MeasureInfo; onSaved: () => void; onBack: () => void }> = ({ measure, onSaved, onBack }) => {
  const { language } = useApp();
  const text = useAdvancedText();
  const all = useBodyEntries();
  const today = getTodayDateString();
  const lastOf = (side?: BodySide) => {
    const list = all[seriesKey(measure.id, side)] ?? [];
    return list[list.length - 1];
  };
  // Paired measures: start on the side that has no value for today yet (left first).
  const hasToday = (side: BodySide) => (all[seriesKey(measure.id, side)] ?? []).some((e) => e.date === today);
  const [side, setSide] = useState<BodySide>(measure.paired && hasToday('left') && !hasToday('right') ? 'right' : 'left');
  const activeSide = measure.paired ? side : undefined;
  const key = seriesKey(measure.id, activeSide);
  const entries = all[key] ?? [];
  const last = entries[entries.length - 1];
  const [value, setValue] = useState<number>(lastOf(activeSide)?.value ?? 0);
  const [date, setDate] = useState(today);
  const sideName = (s: BodySide) => text.side[s];

  const chooseSide = (next: BodySide) => {
    setSide(next);
    setValue(lastOf(next)?.value ?? 0);
  };

  const save = () => {
    if (!(value > 0) || !date) return;
    setBodyEntry(key, date > today ? today : date, value);
    onSaved();
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="pressable inline-flex items-center gap-1 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
      >
        <ChevronLeft size={14} />
        <span>{text.body.back}</span>
      </button>

      <div className="flex items-center gap-3">
        <span data-body-icon className="size-12 rounded-2xl bg-weight text-weight-ink flex items-center justify-center shrink-0">
          <BodyPartIcon id={isDefaultMeasure(measure.id) ? measure.id : 'custom'} size={28} />
        </span>
        <div className="min-w-0">
          <div className="text-base font-extrabold text-[var(--text)] truncate">{measure.name}</div>
          <div className="text-xs font-bold text-[var(--muted)] tabular-nums">
            {last ? text.body.lastValue.replace('{value}', `${last.value} ${measure.unit}`) : text.body.noDataYet}
          </div>
        </div>
      </div>

      {/* Left / right side of a paired measure (biceps, forearms, thighs, calves). */}
      {measure.paired && (
        <div role="group" aria-label={text.side.choose} className="grid grid-cols-2 gap-1 p-1 bg-[var(--inset)] border border-[var(--border)] rounded-2xl">
          {BODY_SIDES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              data-side={s}
              onClick={() => chooseSide(s)}
              className={`pressable py-2 rounded-xl text-xs font-extrabold ${
                side === s ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {sideName(s)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-bold text-[var(--muted)] mb-1">{text.body.value}</label>
          <NumericInput value={value} onChange={setValue} unit={measure.unit} min={0} max={1000} placeholder="0" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--muted)] mb-1" htmlFor="body-date">{text.body.date}</label>
          <input
            id="body-date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-base font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!(value > 0)}
        className="kc-primary-btn pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        <Check size={18} strokeWidth={2.5} />
        <span>{text.body.save}</span>
      </button>

      {entries.length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{text.body.history}</span>
          <ul className="divide-y divide-[var(--border)] bg-[var(--inset)] border border-[var(--border)] rounded-2xl">
            {entries.slice(-5).reverse().map((entry) => (
              <li key={entry.date} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-xs font-bold text-[var(--muted)]">{formatDateDisplay(entry.date, language)}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-extrabold tabular-nums text-[var(--text)]">{entry.value} {measure.unit}</span>
                  <button
                    type="button"
                    onClick={() => removeBodyEntry(key, entry.date)}
                    aria-label={`${text.body.remove}: ${formatDateDisplay(entry.date, language)}`}
                    title={text.body.remove}
                    className="kc-danger-icon-hover pressable size-7 rounded-full text-[var(--muted)] hover:bg-[#F6D0D0] hover:text-[#7A2727] flex items-center justify-center"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/** Pop-up opened by the Upper body / Lower body / Custom buttons: pick the body part, then update it. */
export const BodyMeasureModal: React.FC<{ group: BodyGroup | null; onClose: () => void }> = ({ group, onClose }) => {
  const text = useAdvancedText();
  const measures = useTrackedMeasures(group ?? undefined);
  const entries = useBodyEntries();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const close = () => {
    setSelectedId(null);
    setSavedId(null);
    onClose();
  };
  const selected = measures.find((m) => m.id === selectedId) ?? null;

  return (
    <Modal
      isOpen={group !== null}
      onClose={close}
      title={group ? text.group[group] : text.body.updateTitle}
      subtitle={selected ? undefined : text.body.pickPrompt}
      maxWidth="max-w-md"
      dockId={group ?? undefined}
    >
      {selected ? (
        <MeasureForm
          key={selected.id}
          measure={selected}
          onBack={() => setSelectedId(null)}
          onSaved={() => { setSavedId(selected.id); setSelectedId(null); }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {measures.map((m) => {
            const lastOf = (key: string) => entries[key]?.[entries[key].length - 1];
            const last = lastOf(m.id);
            const lastLeft = lastOf(seriesKey(m.id, 'left'));
            const lastRight = lastOf(seriesKey(m.id, 'right'));
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { setSelectedId(m.id); setSavedId(null); }}
                className="pressable relative flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--inset)] hover:bg-[var(--hover)] px-2 py-3.5 text-center"
              >
                <span data-body-icon className="size-12 rounded-2xl bg-weight text-weight-ink flex items-center justify-center">
                  <BodyPartIcon id={isDefaultMeasure(m.id) ? m.id : 'custom'} size={28} />
                </span>
                <span className="text-xs font-extrabold text-[var(--text)] max-w-full truncate">{m.name}</span>
                <span className="text-[11px] font-bold tabular-nums text-[var(--muted)]">
                  {m.paired
                    ? `${text.side.leftShort} ${lastLeft ? lastLeft.value : '–'} · ${text.side.rightShort} ${lastRight ? lastRight.value : '–'} ${m.unit}`
                    : last ? `${last.value} ${m.unit}` : '–'}
                </span>
                {savedId === m.id && (
                  <span
                    role="img"
                    aria-label={text.body.saved}
                    title={text.body.saved}
                    className="absolute top-1.5 right-1.5 inline-flex size-4 items-center justify-center rounded-full bg-[#C9EFD3] text-[#174A2B]"
                  >
                    <Check size={10} strokeWidth={3.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
