import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PeriodCalendar } from './PeriodCalendar';
import { CycleHistory } from './CycleHistory';
import { CycleNutrition } from './CycleNutrition';
import { PeriodSettingsAccordion } from './PeriodSettingsAccordion';
import {
  emptyDayLog,
  expectedWithdrawalBleed,
  getPeriodStatus,
  isInactivePackDay,
  packDay,
  tagDefs,
  tagLabel,
} from '../../utils/period';
import { formatDateDisplay, formatFullDate, getTodayDateString } from '../../utils/formatters';
import { PeriodDayLog, PeriodFlow } from '../../types';
import { Droplet, ChevronDown, Plus, Check, Pill, CalendarHeart, Trash2, StickyNote, Info } from 'lucide-react';

const FLOWS: PeriodFlow[] = ['none', 'light', 'medium', 'heavy'];

const sameLog = (a: PeriodDayLog, b: PeriodDayLog) =>
  a.isPeriod === b.isPeriod &&
  a.flow === b.flow &&
  a.pillTaken === b.pillTaken &&
  (a.notes || '') === (b.notes || '') &&
  a.moods.join('|') === b.moods.join('|') &&
  a.symptoms.join('|') === b.symptoms.join('|');

export const PeriodView: React.FC = () => {
  const {
    t,
    language,
    periodData,
    updatePeriodDay,
    clearPeriodDay,
    addPeriodTag,
    periodSelectedDate: selected,
    setPeriodSelectedDate: setSelected,
    showToast,
  } = useApp();

  const todayStr = getTodayDateString();
  const settings = periodData.settings;
  const pillMode = settings.trackPill;
  const status = useMemo(() => getPeriodStatus(periodData, todayStr), [periodData, todayStr]);

  // ---- draft for the daily log (saved by Log Day, auto-saved on date switch) ----
  const stored = periodData.logs[selected];
  const baseline = useMemo<PeriodDayLog>(() => stored || emptyDayLog(), [stored]);
  const [draft, setDraft] = useState<PeriodDayLog>(baseline);
  const [recapOpen, setRecapOpen] = useState(false);
  const [newTag, setNewTag] = useState<{ group: 'mood' | 'symptom'; text: string; error: boolean } | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const dirty = !sameLog(draft, baseline);

  // refresh draft when the stored day changes externally (dock, undo) or the date changes
  useEffect(() => {
    setDraft(baseline);
    setRecapOpen(Boolean(baseline.notes));
    setNewTag(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, stored?.updatedAt]);

  // auto-save unsaved changes when switching date
  const prevSelected = useRef(selected);
  useEffect(() => {
    const prev = prevSelected.current;
    if (prev !== selected) {
      prevSelected.current = selected;
    }
  }, [selected]);
  const selectDate = (d: string) => {
    if (d === selected) return;
    const cur = draftRef.current;
    const base = periodData.logs[selected] || emptyDayLog();
    if (!sameLog(cur, base)) {
      updatePeriodDay(selected, cur);
      showToast(t.period.toastSaved);
    }
    setSelected(d);
  };

  const patch = (p: Partial<PeriodDayLog>) =>
    setDraft((prev) => {
      let next = { ...prev, ...p };
      if (p.flow !== undefined && p.flow !== 'none') next.isPeriod = true;
      if (p.isPeriod === false) next = { ...next, flow: 'none' };
      if (p.isPeriod === true && next.flow === 'none') next.flow = 'medium';
      return next;
    });

  const saveDay = () => {
    updatePeriodDay(selected, draft);
    showToast(t.period.toastSaved);
  };

  const toggleTag = (group: 'mood' | 'symptom', id: string) =>
    setDraft((prev) => {
      const key = group === 'mood' ? 'moods' : 'symptoms';
      const list = prev[key];
      return { ...prev, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
    });

  const confirmNewTag = () => {
    if (!newTag) return;
    const id = addPeriodTag(newTag.group, newTag.text);
    if (!id) {
      setNewTag({ ...newTag, error: true });
      return;
    }
    toggleTag(newTag.group, id);
    setNewTag(null);
  };

  const builtinLabel = (g: 'mood' | 'symptom') => (k: string) =>
    t.period[`${g === 'mood' ? 'mood' : 'sym'}_${k}` as keyof typeof t.period] as string;
  const labelOf = (id: string) =>
    tagLabel(id, settings, (g, k) => builtinLabel(g)(k));

  const moodDefs = tagDefs('mood', settings, builtinLabel('mood'));
  const symDefs = tagDefs('symptom', settings, builtinLabel('symptom'));

  const phaseLabel = status.phase ? (t.period[`phase_${status.phase}` as keyof typeof t.period] as string) : '';
  const phaseNote = status.phase ? (t.period[`note_${status.phase}` as keyof typeof t.period] as string) : '';
  const pd = packDay(settings, todayStr);
  const bleed = expectedWithdrawalBleed(settings, todayStr);
  const selInactive = pillMode && isInactivePackDay(settings, selected);
  const loggedCount = Object.keys(periodData.logs).length;

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
      active ? 'bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]' : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
    }`;

  const TagGroup: React.FC<{ group: 'mood' | 'symptom'; title: string; defs: typeof moodDefs; selectedIds: string[] }> = ({
    group, title, defs, selectedIds,
  }) => {
    const visible = defs.filter((d) => !d.hidden || selectedIds.includes(d.id));
    // tags stored on this day but no longer defined (deleted customs) still show with their stored label/id
    const orphan = selectedIds.filter((id) => !defs.some((d) => d.id === id));
    return (
      <div>
        <span className="block text-xs font-bold text-[var(--text)] mb-1.5">{title}</span>
        <div className="flex flex-wrap gap-1.5">
          {visible.map((d) => (
            <button key={d.id} type="button" onClick={() => toggleTag(group, d.id)} className={chip(selectedIds.includes(d.id))} aria-pressed={selectedIds.includes(d.id)}>
              {d.label}
            </button>
          ))}
          {orphan.map((id) => (
            <button key={id} type="button" onClick={() => toggleTag(group, id)} className={chip(true)}>
              {labelOf(id)}
            </button>
          ))}
          {newTag?.group === group ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={newTag.text}
                maxLength={24}
                placeholder={t.period.tagPlaceholder}
                onChange={(e) => setNewTag({ ...newTag, text: e.target.value, error: false })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmNewTag();
                  if (e.key === 'Escape') setNewTag(null);
                }}
                className={`w-32 bg-[var(--inset)] border rounded-full px-3 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none ${
                  newTag.error ? 'border-[#B85C7A]' : 'border-[var(--border)]'
                }`}
              />
              <button type="button" onClick={confirmNewTag} className="w-7 h-7 rounded-full bg-[#C9EFD3] text-[#174A2B] flex items-center justify-center">
                <Check size={13} />
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setNewTag({ group, text: '', error: false })} className="px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-[var(--border)] text-[var(--muted)]">
              {t.period.addTag}
            </button>
          )}
        </div>
        {newTag?.group === group && newTag.error && (
          <p className="text-[11px] font-medium text-[#B85C7A] mt-1">{t.period.tagError}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3.5 pb-32">
      {/* Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#F4C6D8] text-[#6E2440] flex items-center justify-center shrink-0">
            <Droplet size={17} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text)]">{t.period.title}</h2>
            <p className="text-[11px] font-medium text-[var(--muted)]">{t.period.subtitle}</p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--inset)] text-[var(--muted)] shrink-0">
          {t.period.statsLogged.replace('{n}', String(loggedCount))}
        </span>
      </div>

      {/* 1. Status card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
            <CalendarHeart size={15} className="text-[#B85C7A]" />
            {t.period.statusTitle}
          </span>
          {!pillMode && status.hasData && status.predicted.fromHistory && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--inset)] text-[var(--muted)]">
              {t.period.basedOnHistory}
            </span>
          )}
        </div>

        {!status.hasData || status.cycleDay === null ? (
          <div className="rounded-2xl bg-[#FBF1F4] p-4 space-y-1">
            <p className="text-sm font-extrabold text-[#6E2440]">{t.period.emptyTitle}</p>
            <p className="text-xs font-medium text-[#8A455C] leading-relaxed">{t.period.emptyHint}</p>
          </div>
        ) : (
          <>
            {/* Cycle day + phase / pack day */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#FBF1F4] p-3.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A455C]">
                  {t.period.cycleDay}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-[#6E2440] leading-none">{status.cycleDay}</span>
                  <span className="text-xs font-bold text-[#8A455C]">/ {status.predicted.length}</span>
                </div>
                {status.daysLate > 0 && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[#F4C6D8] text-[#6E2440] text-[10px] font-extrabold">
                    {t.period.daysLate.replace('{n}', String(status.daysLate))}
                  </span>
                )}
              </div>

              <div className="rounded-2xl bg-[#F1ECFF] p-3.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5B4B93]">
                  {pillMode ? t.period.packDay : t.period.phase}
                </span>
                <span className="block text-lg font-extrabold text-[#3B2E6E] mt-1 leading-tight">
                  {pillMode
                    ? pd !== null
                      ? t.period.packDayOf.replace('{d}', String(pd)).replace('{n}', String(settings.packLength))
                      : '—'
                    : phaseLabel}
                </span>
                {!pillMode && (
                  <span className="block text-[10px] font-medium text-[#5B4B93] mt-1 leading-snug">{phaseNote}</span>
                )}
              </div>
            </div>

            {pillMode && !settings.packStart && (
              <p className="text-xs font-bold text-[#7D4E14]">{t.period.noPackStart}</p>
            )}

            {/* Predictions */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#FFF6E4] p-3.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A5617]">
                  {t.period.nextPeriod}
                </span>
                <span className="block text-sm font-extrabold text-[#2D1E0B] mt-1">
                  {status.nextPeriodRange
                    ? `${formatDateDisplay(status.nextPeriodRange[0], language)} – ${formatDateDisplay(status.nextPeriodRange[1], language)}`
                    : status.nextPeriod
                    ? formatDateDisplay(status.nextPeriod, language)
                    : '—'}
                </span>
                <span className="block text-[11px] font-bold text-[#8A5617] mt-0.5">
                  {status.daysLate > 0
                    ? t.period.daysLate.replace('{n}', String(status.daysLate))
                    : status.daysUntilNext === 0
                    ? t.period.today
                    : t.period.inDays.replace('{n}', String(status.daysUntilNext))}
                </span>
              </div>

              <div className={`rounded-2xl p-3.5 ${pillMode ? 'bg-[#E9FAEF]' : 'bg-[#E9FAEF]'}`}>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1D5C38]">
                  {pillMode ? t.period.withdrawalBleed : t.period.ovulation}
                </span>
                {pillMode ? (
                  <span className="block text-sm font-extrabold text-[#142E1F] mt-1">
                    {bleed
                      ? formatDateDisplay(bleed, language)
                      : settings.inactiveDays === 0
                      ? t.period.continuousUse
                      : '—'}
                  </span>
                ) : (
                  <>
                    <span className="block text-sm font-extrabold text-[#142E1F] mt-1">
                      {status.ovulation ? formatDateDisplay(status.ovulation, language) : '—'}
                    </span>
                    <span className="block text-[10px] font-medium text-[#1D5C38]">
                      ({t.period.estimate})
                    </span>
                  </>
                )}
              </div>
            </div>

            <p className="flex items-start gap-1.5 text-[10px] font-medium text-[var(--muted)]">
              <Info size={11} className="mt-0.5 shrink-0" />
              {pillMode ? t.period.pillHidesPhase : t.period.ovulationDisclaimer}
            </p>
          </>
        )}
      </div>

      {/* 2. Calendar */}
      <PeriodCalendar selected={selected} onSelect={selectDate} status={status} />

      {/* 3. Daily log */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">{t.period.selectedDay}</span>
            <span className="text-sm font-extrabold text-[var(--text)] capitalize">{formatFullDate(selected, language)}</span>
          </div>
          {dirty && <span className="text-[10px] font-bold text-[#7D4E14] text-right max-w-[45%]">{t.period.unsaved}</span>}
        </div>

        <button
          type="button"
          onClick={() => patch({ isPeriod: !draft.isPeriod })}
          aria-pressed={draft.isPeriod}
          className={`w-full py-3 rounded-2xl text-sm font-extrabold border transition-colors flex items-center justify-center gap-2 ${
            draft.isPeriod ? 'bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]' : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
          }`}
        >
          <Droplet size={16} />
          <span>{t.period.periodDay}</span>
          {draft.isPeriod && <Check size={15} />}
        </button>

        <div>
          <span className="block text-xs font-bold text-[var(--text)] mb-1.5">{t.period.flow}</span>
          <div className="flex flex-wrap gap-1.5">
            {FLOWS.map((f) => (
              <button key={f} type="button" onClick={() => patch({ flow: f })} className={chip(draft.flow === f)} aria-pressed={draft.flow === f}>
                {t.period[`flow_${f}` as keyof typeof t.period] as string}
              </button>
            ))}
          </div>
        </div>

        <TagGroup group="mood" title={t.period.mood} defs={moodDefs} selectedIds={draft.moods} />
        <TagGroup group="symptom" title={t.period.symptoms} defs={symDefs} selectedIds={draft.symptoms} />

        {pillMode && (
          <div>
            <span className="block text-xs font-bold text-[var(--text)] mb-1.5">{t.period.pill}</span>
            <button
              type="button"
              disabled={selInactive}
              onClick={() => patch({ pillTaken: !draft.pillTaken })}
              aria-pressed={Boolean(draft.pillTaken)}
              className={`w-full py-2.5 rounded-2xl text-sm font-extrabold border transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                draft.pillTaken ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]' : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
              }`}
            >
              <Pill size={15} />
              <span>{selInactive ? t.period.breakDay : draft.pillTaken ? `✓ ${t.period.pillTakenToday}` : t.period.pillNotTaken}</span>
            </button>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setRecapOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-[var(--inset)] hover:bg-[var(--border)] rounded-2xl px-3.5 py-2.5 transition-colors"
            aria-expanded={recapOpen}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
              <StickyNote size={15} className="text-[var(--muted)]" />
              {draft.notes ? t.period.recapEdit : t.period.recapAdd}
            </span>
            <ChevronDown size={16} className={`text-[var(--muted)] transition-transform ${recapOpen ? 'rotate-180' : ''}`} />
          </button>
          {recapOpen && (
            <textarea
              value={draft.notes || ''}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder={t.period.recapPlaceholder}
              rows={3}
              className="mt-2 w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none resize-y"
            />
          )}
        </div>

        {/* Log Day button at the bottom of the form, add-food style */}
        <button
          type="button"
          onClick={saveDay}
          className={`w-full py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-colors ${
            dirty ? 'bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B]' : 'bg-[var(--inset)] text-[var(--muted)]'
          }`}
        >
          {dirty ? <Plus size={16} strokeWidth={2.5} /> : <Check size={16} strokeWidth={2.5} />}
          <span>{dirty ? t.period.logButton : t.period.saved}</span>
        </button>

        {stored && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t.period.deleteConfirm)) {
                clearPeriodDay(selected);
                setRecapOpen(false);
              }
            }}
            className="w-full py-2 rounded-2xl text-xs font-bold text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0]/50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 size={13} />
            <span>{t.period.deleteDay}</span>
          </button>
        )}
      </div>

      {/* 4. Cycle history & stats */}
      <CycleHistory status={status} />

      {/* 5. Nutrition & weight (opt-in) */}
      {settings.showNutrition && <CycleNutrition status={status} />}

      {/* 6. Settings accordion */}
      <PeriodSettingsAccordion />
    </div>
  );
};
