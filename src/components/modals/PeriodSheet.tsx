import { Droplet, Check, Play, Square, StickyNote, Pill } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { PeriodTagEditor } from '../period/PeriodTagEditor';
import type { PeriodFlow } from '../../types';
import { isInactivePackDay } from '../../utils/period';
import { usePeriodDayDraft } from '../../utils/usePeriodDayDraft';
import { formatFullDate } from '../../utils/formatters';

const FLOWS: PeriodFlow[] = ['none', 'light', 'medium', 'heavy'];

/** Centered quick log for the cycle calendar's selected day, opened from the Daily Log. */
export function PeriodSheet() {
  const {
    t, language, isPeriodSheetOpen, setIsPeriodSheetOpen, periodSelectedDate: date,
    periodData, updatePeriodDay, markPeriodStart, markPeriodEnd,
  } = useApp();
  const settings = periodData.settings;
  const { draft, dirty, patch } = usePeriodDayDraft(date, periodData.logs[date]);
  const close = () => setIsPeriodSheetOpen(false);
  const saveDraft = () => { if (dirty) updatePeriodDay(date, draft); };
  const pillInactive = settings.trackPill && isInactivePackDay(settings, date);

  const chip = (active: boolean) => `pressable min-h-8 px-3 rounded-full text-xs font-bold border ${active
    ? 'kc-period-chip bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]'
    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'}`;

  return (
    <Modal dockId="cycle" isOpen={isPeriodSheetOpen} onClose={close} title={t.period.quickLog} subtitle={formatFullDate(date, language)} maxWidth="max-w-md">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => patch({ isPeriod: !draft.isPeriod })}
          aria-pressed={draft.isPeriod}
          className={`w-full py-3 rounded-2xl text-sm font-extrabold border flex items-center justify-center gap-2 ${draft.isPeriod
            ? 'kc-period-chip bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]'
            : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'}`}
        >
          <Droplet size={16} /> {t.period.periodDay} {draft.isPeriod && <Check size={15} />}
        </button>
        <div className="space-y-1.5">
          <span className="block text-xs font-bold text-[var(--text)]">{t.period.flow}</span>
          <div className="flex flex-wrap gap-1.5">
            {FLOWS.map((flow) => (
              <button key={flow} type="button" onClick={() => patch({ flow })} className={chip(draft.flow === flow)} aria-pressed={draft.flow === flow}>
                {t.period[`flow_${flow}`]}
              </button>
            ))}
          </div>
        </div>
        <PeriodTagEditor group="mood" selected={draft.moods} onChange={(moods) => patch({ moods })} />
        <PeriodTagEditor group="symptom" selected={draft.symptoms} onChange={(symptoms) => patch({ symptoms })} />
        {settings.trackPill && (
          <button
            type="button"
            disabled={pillInactive}
            onClick={() => patch({ pillTaken: !draft.pillTaken })}
            aria-pressed={Boolean(draft.pillTaken)}
            className={`pressable w-full py-2.5 rounded-2xl text-sm font-extrabold border flex items-center justify-center gap-2 disabled:opacity-60 ${draft.pillTaken
              ? 'kc-chip-active bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
              : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'}`}
          >
            <Pill size={15} />
            {pillInactive ? t.period.breakDay : draft.pillTaken ? t.period.pillTaken : t.period.pillNotTaken}
          </button>
        )}
        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text)]"><StickyNote size={14} /> {t.period.recapEdit}</span>
          <textarea
            value={draft.notes ?? ''}
            onChange={(event) => patch({ notes: event.target.value })}
            placeholder={t.period.recapPlaceholder}
            rows={2}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] resize-y"
          />
        </label>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { saveDraft(); markPeriodStart(date); close(); }}
            className="kc-period-pill pressable py-3 px-2 rounded-2xl bg-[#F4C6D8] hover:bg-[#EFB3CC] text-[#6E2440] text-xs font-extrabold flex items-center justify-center gap-1.5"
          >
            <Play size={14} /> {t.period.startedHere}
          </button>
          <button
            type="button"
            onClick={() => { saveDraft(); markPeriodEnd(date); close(); }}
            className="pressable py-3 px-2 rounded-2xl bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] text-xs font-extrabold flex items-center justify-center gap-1.5"
          >
            <Square size={13} /> {t.period.endedHere}
          </button>
        </div>
        <button
          type="button"
          onClick={() => { saveDraft(); close(); }}
          disabled={!dirty}
          className="kc-primary-btn pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
        >
          <Check size={18} strokeWidth={2.5} /> {t.period.logButton}
        </button>
      </div>
    </Modal>
  );
}
