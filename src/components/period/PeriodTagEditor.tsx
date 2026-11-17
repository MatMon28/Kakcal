import { useId, useState } from 'react';
import { Plus, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getDefaultPeriodTags, tagDefs, tagLabel, type PeriodTagGroup } from '../../utils/period';
import { Modal } from '../common/Modal';

export function PeriodTagEditor({ group, selected, onChange }: {
  group: PeriodTagGroup;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t, periodData, addPeriodTag, deletePeriodTag, resetPeriodTags } = useApp();
  const headingId = useId();
  const inputId = useId();
  const [managing, setManaging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [error, setError] = useState(false);
  const settings = periodData.settings;
  const title = group === 'mood' ? t.period.mood : t.period.symptoms;
  const addTitle = group === 'mood' ? t.period.addMood : t.period.addSymptom;
  const builtinLabel = (which: PeriodTagGroup, key: string) =>
    t.period[`${which === 'mood' ? 'mood' : 'sym'}_${key}` as keyof typeof t.period];
  const catalog = tagDefs(group, settings, (key) => builtinLabel(group, key));
  const options = [
    ...catalog,
    ...selected.filter((id) => !catalog.some((tag) => tag.id === id)).map((id) => ({ id, label: tagLabel(id, settings, builtinLabel) })),
  ];

  const closeAdd = () => { setCreating(false); setLabel(''); setError(false); };
  const createTag = () => {
    const id = addPeriodTag(group, label);
    if (!id) { setError(true); return; }
    onChange([...selected, id]);
    closeAdd();
  };
  const reset = () => {
    const originals = new Set(getDefaultPeriodTags(group).map((tag) => tag.id));
    onChange(selected.filter((id) => originals.has(id)));
    resetPeriodTags(group);
  };

  return (
    <section aria-labelledby={headingId} className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-xs font-extrabold text-[var(--text)]">{title}</h3>
        <button
          type="button"
          onClick={() => setManaging((value) => !value)}
          aria-expanded={managing}
          className="pressable min-h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:bg-[var(--inset)]"
        >
          <SlidersHorizontal size={13} />
          {managing ? t.period.doneManaging : t.period.manage}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((tag) => {
          const isSelected = selected.includes(tag.id);
          const tone = isSelected
            ? 'bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]'
            : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]';
          return managing ? (
            <div key={tag.id} className={`min-h-9 pl-3 pr-0.5 rounded-full border text-xs font-bold flex items-center gap-1 ${tone}`}>
              <span>{tag.label}</span>
              <button
                type="button"
                onClick={() => {
                  onChange(selected.filter((id) => id !== tag.id));
                  deletePeriodTag(group, tag.id);
                }}
                aria-label={t.period.removeTag.replace('{tag}', tag.label)}
                className="pressable w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F6D0D0] hover:text-[#7A2727]"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              key={tag.id}
              type="button"
              onClick={() => onChange(isSelected ? selected.filter((id) => id !== tag.id) : [...selected, tag.id])}
              aria-pressed={isSelected}
              className={`pressable min-h-8 px-3 rounded-full text-xs font-bold border ${tone}`}
            >
              {tag.label}
            </button>
          );
        })}
        {!managing && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label={addTitle}
            className="pressable min-h-8 px-3 rounded-full border border-dashed border-[var(--border)] text-xs font-bold text-[var(--muted)] hover:bg-[var(--inset)]"
          >
            {t.period.addTag}
          </button>
        )}
      </div>
      {managing && (
        <div className="rounded-xl bg-[var(--inset)] p-2.5 space-y-2">
          <p className="text-xs leading-relaxed text-[var(--muted)]">{t.period.tagDeleteHint}</p>
          <button
            type="button"
            onClick={reset}
            className="pressable min-h-8 px-3 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-extrabold text-[var(--text)] inline-flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            {t.period.resetTags}
          </button>
        </div>
      )}
      <Modal isOpen={creating} onClose={closeAdd} title={addTitle} maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); createTag(); }}>
          <input
            id={inputId}
            autoFocus
            maxLength={24}
            value={label}
            aria-label={addTitle}
            aria-invalid={error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            placeholder={t.period.tagPlaceholder}
            onChange={(event) => { setLabel(event.target.value); setError(false); }}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-base font-semibold text-[var(--text)]"
          />
          {error && <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-[var(--text-warn)]">{t.period.tagError}</p>}
          <button type="submit" disabled={!label.trim()} className="pressable w-full min-h-11 rounded-xl bg-[#F4C6D8] text-[#6E2440] hover:bg-[#EFB3CC] inline-flex items-center justify-center gap-1.5 text-sm font-extrabold disabled:opacity-40">
            <Plus size={16} />
            {addTitle}
          </button>
        </form>
      </Modal>
    </section>
  );
}
