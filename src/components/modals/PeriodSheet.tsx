import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { PeriodDayLog, PeriodFlow } from '../../types';
import { emptyDayLog, isInactivePackDay, tagDefs } from '../../utils/period';
import { formatDateDisplay } from '../../utils/formatters';
import { Droplet, Check, Play, Square, StickyNote, Pill } from 'lucide-react';

const FLOWS: PeriodFlow[] = ['none', 'light', 'medium', 'heavy'];

/**
 * Bottom sheet from the Period dock button — the same content as the daily log
 * (period, flow, moods, symptoms, pill, notes) plus start/end shortcuts.
 * Writes to the same data as the daily log.
 */
export const PeriodSheet: React.FC = () => {
  const {
    t,
    language,
    isPeriodSheetOpen,
    setIsPeriodSheetOpen,
    periodSelectedDate: date,
    periodData,
    updatePeriodDay,
    markPeriodStart,
    markPeriodEnd,
    showToast,
  } = useApp();

  const s = periodData.settings;
  const stored = periodData.logs[date];
  const baseline: PeriodDayLog = stored || emptyDayLog();
  const [draft, setDraft] = useState<PeriodDayLog>(baseline);

  useEffect(() => {
    setDraft(baseline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPeriodSheetOpen, date, stored?.updatedAt]);

  const close = () => setIsPeriodSheetOpen(false);

  const patch = (p: Partial<PeriodDayLog>) =>
    setDraft((prev) => {
      let next = { ...prev, ...p };
      if (p.flow !== undefined && p.flow !== 'none') next.isPeriod = true;
      if (p.isPeriod === false) next = { ...next, flow: 'none' };
      if (p.isPeriod === true && next.flow === 'none') next.flow = 'medium';
      return next;
    });

  const save = () => {
    updatePeriodDay(date, draft);
    showToast(t.period.toastSaved);
    close();
  };

  const toggleTag = (group: 'mood' | 'symptom', id: string) =>
    setDraft((prev) => {
      const key = group === 'mood' ? 'moods' : 'symptoms';
      const list = prev[key];
      return { ...prev, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
    });

  const builtinLabel = (g: 'mood' | 'symptom') => (k: string) =>
    t.period[`${g === 'mood' ? 'mood' : 'sym'}_${k}` as keyof typeof t.period] as string;
  const labelOf = (id: string) => {
    const c = [...s.customMoods, ...s.customSymptoms].find((x) => x.id === id);
    if (c) return c.label;
    if (id.startsWith('mood.')) return builtinLabel('mood')(id.slice(5));
    if (id.startsWith('sym.')) return builtinLabel('symptom')(id.slice(4));
    return id;
  };

  const moodDefs = tagDefs('mood', s, builtinLabel('mood'));
  const symDefs = tagDefs('symptom', s, builtinLabel('symptom'));
  const pillInactive = s.trackPill && isInactivePackDay(s, date);

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
      active ? 'bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]' : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
    }`;

  const TagRow: React.FC<{ group: 'mood' | 'symptom'; title: string; defs: typeof moodDefs; selected: string[] }> = ({
    group,
    title,
    defs,
    selected,
  }) => (
    <div>
      <span className="block text-xs font-bold text-[var(--text)] mb-1.5">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {defs
          .filter((d) => !d.hidden || selected.includes(d.id))
          .map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleTag(group, d.id)}
              className={chip(selected.includes(d.id))}
              aria-pressed={selected.includes(d.id)}
            >
              {d.label}
            </button>
          ))}
        {selected
          .filter((id) => !defs.some((d) => d.id === id))
          .map((id) => (
            <button key={id} type="button" onClick={() => toggleTag(group, id)} className={chip(true)}>
              {labelOf(id)}
            </button>
          ))}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isPeriodSheetOpen}
      onClose={close}
      title={t.period.sheetTitle}
      subtitle={formatDateDisplay(date, language)}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Period day toggle */}
        <button
          type="button"
          onClick={() => patch({ isPeriod: !draft.isPeriod })}
          aria-pressed={draft.isPeriod}
          className={`w-full py-3 rounded-2xl text-sm font-extrabold border flex items-center justify-center gap-2 ${
            draft.isPeriod
              ? 'bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]'
              : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
          }`}
        >
          <Droplet size={16} />
          <span>{t.period.periodDay}</span>
          {draft.isPeriod && <Check size={15} />}
        </button>

        {/* Flow */}
        <div>
          <span className="block text-xs font-bold text-[var(--text)] mb-1.5">{t.period.flow}</span>
          <div className="flex flex-wrap gap-1.5">
            {FLOWS.map((f) => (
              <button key={f} type="button" onClick={() => patch({ flow: f })} className={chip(draft.flow === f)}>
                {t.period[`flow_${f}` as keyof typeof t.period] as string}
              </button>
            ))}
          </div>
        </div>

        {/* Moods & symptoms (same as daily log) */}
        <TagRow group="mood" title={t.period.mood} defs={moodDefs} selected={draft.moods} />
        <TagRow group="symptom" title={t.period.symptoms} defs={symDefs} selected={draft.symptoms} />

        {/* Pill */}
        {s.trackPill && (
          <div>
            <span className="block text-xs font-bold text-[var(--text)] mb-1.5">{t.period.pill}</span>
            <button
              type="button"
              disabled={pillInactive}
              onClick={() => patch({ pillTaken: !draft.pillTaken })}
              className={`w-full py-2.5 rounded-2xl text-sm font-extrabold border flex items-center justify-center gap-2 disabled:opacity-60 ${
                draft.pillTaken
                  ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                  : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
              }`}
            >
              <Pill size={15} />
              <span>
                {pillInactive ? t.period.breakDay : draft.pillTaken ? `✓ ${t.period.pillTakenToday}` : t.period.pillNotTaken}
              </span>
            </button>
          </div>
        )}

        {/* Day recap note */}
        <div>
          <span className="block text-xs font-bold text-[var(--text)] mb-1.5">
            <StickyNote size={13} className="inline mr-1.5 -mt-0.5 text-[var(--muted)]" />
            {t.period.recapAdd}
          </span>
          <textarea
            value={draft.notes || ''}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder={t.period.recapPlaceholder}
            rows={2}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none resize-y"
          />
        </div>

        {/* Quick start/end actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              markPeriodStart(date);
              showToast(t.period.toastStarted);
              close();
            }}
            className="py-3 rounded-2xl bg-[#F4C6D8] hover:bg-[#EFB3CC] text-[#6E2440] text-xs font-extrabold flex items-center justify-center gap-1.5"
          >
            <Play size={14} /> {t.period.startedHere}
          </button>
          <button
            type="button"
            onClick={() => {
              markPeriodEnd(date);
              showToast(t.period.toastEnded);
              close();
            }}
            className="py-3 rounded-2xl bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] text-xs font-extrabold flex items-center justify-center gap-1.5"
          >
            <Square size={13} /> {t.period.endedHere}
          </button>
        </div>

        <button
          type="button"
          onClick={save}
          className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>{t.period.logButton}</span>
        </button>
      </div>
    </Modal>
  );
};
