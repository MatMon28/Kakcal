import React, { useMemo, useState } from 'react';
import { useJournalData, useSettings, useUiState } from '../../context/AppContext';
import { DeferredBody } from '../common/DeferredBody';
import { PeriodCalendar } from './PeriodCalendar';
import { CycleHistory } from './CycleHistory';
import { CycleNutrition } from './CycleNutrition';
import { PeriodSettingsAccordion } from './PeriodSettingsAccordion';
import { PeriodTagEditor } from './PeriodTagEditor';
import { PeriodDayInfoModal } from './PeriodDayInfoModal';
import { Modal } from '../common/Modal';
import { ActionDock, type DockAction } from '../common/ActionDock';
import { usePeriodDayDraft } from '../../utils/usePeriodDayDraft';
import {
  expectedWithdrawalBleed,
  getPeriodStatus,
  isInactivePackDay,
  packDay,
} from '../../utils/period';
import { formatDateDisplay, formatFullDate, getTodayDateString } from '../../utils/formatters';
import type { PeriodFlow } from '../../types';
import { Droplet, ChevronRight, Plus, Check, Pill, CalendarHeart, Trash2, StickyNote, Info, Heart } from 'lucide-react';

const FLOWS: PeriodFlow[] = ['none', 'light', 'medium', 'heavy'];

export const PeriodView: React.FC = () => {
  const { t, language } = useSettings();
  const { periodData, updatePeriodDay, clearPeriodDay } = useJournalData();
  const {
    setIsPeriodSheetOpen,
    periodSelectedDate: selected,
    setPeriodSelectedDate: setSelected,
  } = useUiState();

  const todayStr = getTodayDateString();
  const settings = periodData.settings;
  const pillMode = settings.trackPill;
  const status = useMemo(() => getPeriodStatus(periodData, todayStr), [periodData, todayStr]);

  const stored = periodData.logs[selected];
  const { draft, dirty, patch, discard } = usePeriodDayDraft(selected, stored);
  const [recapText, setRecapText] = useState<string | null>(null);
  const [inspectedDay, setInspectedDay] = useState<string | null>(null);
  const saveDay = () => {
    if (dirty) updatePeriodDay(selected, draft);
    discard();
  };
  const selectDate = (date: string) => {
    if (date === selected) return;
    saveDay();
    setSelected(date);
  };
  const inspectDate = (date: string) => {
    saveDay();
    setInspectedDay(date);
  };
  const openQuickLog = () => {
    saveDay();
    setIsPeriodSheetOpen(true);
  };

  const phaseLabel = status.phase ? (t.period[`phase_${status.phase}` as keyof typeof t.period] as string) : '';
  const phaseNote = status.phase ? (t.period[`note_${status.phase}` as keyof typeof t.period] as string) : '';
  const pd = packDay(settings, todayStr);
  const bleed = expectedWithdrawalBleed(settings, todayStr);
  const selInactive = pillMode && isInactivePackDay(settings, selected);
  const loggedCount = Object.keys(periodData.logs).length;

  const cycleActions: DockAction[] = [
    { id: 'cycle', icon: <Droplet size={21} />, label: t.period.dockCycle, tone: 'bg-[#F4C6D8] text-[#6E2440]', onClick: openQuickLog },
  ];
  if (pillMode) cycleActions.push({
    id: 'pill',
    icon: (
      <span className="relative">
        <Pill size={21} />
        {stored?.pillTaken && (
          <span className="absolute -right-1.5 -bottom-1 size-3.5 rounded-full bg-[#1E5E3A] text-white flex items-center justify-center">
            <Check size={9} strokeWidth={3} />
          </span>
        )}
      </span>
    ),
    label: t.period.dockPill,
    title: selInactive ? t.period.breakDay : undefined,
    pressed: Boolean(stored?.pillTaken),
    disabled: selInactive,
    tone: stored?.pillTaken ? 'bg-[#C9EFD3] text-[#174A2B] ring-1 ring-[#1E5E3A]/45' : 'bg-[#E2D6FF] text-[#4D3582]',
    onClick: () => {
      const pillTaken = !stored?.pillTaken;
      patch({ pillTaken });
      updatePeriodDay(selected, { pillTaken });
    },
  });
  cycleActions.push({
    id: 'intercourse',
    icon: <Heart size={20} fill={stored?.intercourse ? 'currentColor' : 'none'} />,
    label: t.period.dockIntercourse,
    pressed: Boolean(stored?.intercourse),
    tone: stored?.intercourse ? 'bg-[#B83B5E] text-[#FFF0F5]' : 'bg-[#F6D0D0] text-[#7A2727]',
    onClick: () => updatePeriodDay(selected, { intercourse: stored?.intercourse ? undefined : true }),
  });

  const chip = (active: boolean) =>
    `pressable px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
      active
        ? 'kc-period-chip bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]'
        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
    }`;

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="kc-period-header-icon w-9 h-9 rounded-full bg-transparent text-[#6E2440] flex items-center justify-center shrink-0">
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
            <CalendarHeart size={15} className="kc-period-header-icon text-[#B85C7A]" />
            {t.period.statusTitle}
          </span>
          {!pillMode && status.hasData && status.predicted.fromHistory && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--inset)] text-[var(--muted)]">
              {t.period.basedOnHistory}
            </span>
          )}
        </div>

        {!status.hasData || status.cycleDay === null ? (
          <div data-period-card="empty" className="rounded-2xl bg-[#FBF1F4] p-4 space-y-1">
            <p data-period-value className="text-sm font-extrabold text-[#6E2440]">{t.period.emptyTitle}</p>
            <p data-period-label className="text-xs font-medium text-[#8A455C] leading-relaxed">{t.period.emptyHint}</p>
          </div>
        ) : (
          <>
            {/* Cycle day + phase / pack day */}
            <div className="grid grid-cols-2 gap-2.5">
              <div data-period-card="cycle" className="rounded-2xl bg-[#FBF1F4] p-3.5">
                <span data-period-label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A455C]">
                  {t.period.cycleDay}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span data-period-value className="text-3xl font-extrabold text-[#6E2440] leading-none">{status.cycleDay}</span>
                  <span data-period-label className="text-xs font-bold text-[#8A455C]">/ {status.predicted.length}</span>
                </div>
                {status.daysLate > 0 && (
                  <span className="kc-period-pill inline-block mt-2 px-2 py-0.5 rounded-full bg-[#F4C6D8] text-[#6E2440] text-[10px] font-extrabold">
                    {t.period.daysLate.replace('{n}', String(status.daysLate))}
                  </span>
                )}
              </div>

              <div data-period-card="phase" className="rounded-2xl bg-[#F1ECFF] p-3.5">
                <span data-period-label className="block text-[10px] font-bold uppercase tracking-wider text-[#5B4B93]">
                  {pillMode ? t.period.packDay : t.period.phase}
                </span>
                <span data-period-value className="block text-lg font-extrabold text-[#3B2E6E] mt-1 leading-tight">
                  {pillMode
                    ? pd !== null
                      ? t.period.packDayOf.replace('{d}', String(pd)).replace('{n}', String(settings.packLength))
                      : '—'
                    : phaseLabel}
                </span>
                {!pillMode && (
                  <span data-period-label className="block text-[10px] font-medium text-[#5B4B93] mt-1 leading-snug">{phaseNote}</span>
                )}
              </div>
            </div>

            {pillMode && !settings.packStart && (
              <p className="text-xs font-bold text-[var(--text-pos)]">{t.period.noPackStart}</p>
            )}

            {/* Predictions */}
            <div className="grid grid-cols-2 gap-2.5">
              <div data-period-card="next" className="rounded-2xl bg-[#FFF6E4] p-3.5">
                <span data-period-label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A5617]">
                  {t.period.nextPeriod}
                </span>
                <span data-period-value className="block text-sm font-extrabold text-[#2D1E0B] mt-1">
                  {status.nextPeriodRange
                    ? `${formatDateDisplay(status.nextPeriodRange[0], language)} – ${formatDateDisplay(status.nextPeriodRange[1], language)}`
                    : status.nextPeriod
                    ? formatDateDisplay(status.nextPeriod, language)
                    : '—'}
                </span>
                <span data-period-label className="block text-[11px] font-bold text-[#8A5617] mt-0.5">
                  {status.daysLate > 0
                    ? t.period.daysLate.replace('{n}', String(status.daysLate))
                    : status.daysUntilNext === 0
                    ? t.period.today
                    : t.period.inDays.replace('{n}', String(status.daysUntilNext))}
                </span>
              </div>

              <div data-period-card="ovulation" className={`rounded-2xl p-3.5 ${pillMode ? 'bg-[#E9FAEF]' : 'bg-[#E9FAEF]'}`}>
                <span data-period-label className="block text-[10px] font-bold uppercase tracking-wider text-[#1D5C38]">
                  {pillMode ? t.period.withdrawalBleed : t.period.ovulation}
                </span>
                {pillMode ? (
                  <span data-period-value className="block text-sm font-extrabold text-[#142E1F] mt-1">
                    {bleed
                      ? formatDateDisplay(bleed, language)
                      : settings.inactiveDays === 0
                      ? t.period.continuousUse
                      : '—'}
                  </span>
                ) : (
                  <>
                    <span data-period-value className="block text-sm font-extrabold text-[#142E1F] mt-1">
                      {status.ovulation ? formatDateDisplay(status.ovulation, language) : '—'}
                    </span>
                    <span data-period-label className="block text-[10px] font-medium text-[#1D5C38]">
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
      <PeriodCalendar selected={selected} onSelect={selectDate} onInspectDay={inspectDate} status={status} />

      {/* 3. Daily log */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">{t.period.selectedDay}</span>
            <span className="text-sm font-extrabold text-[var(--text)] capitalize">{formatFullDate(selected, language)}</span>
          </div>
          <button
            type="button"
            onClick={openQuickLog}
            className="kc-period-pill pressable min-h-9 px-3 rounded-full bg-[#F4C6D8] text-[#6E2440] text-xs font-extrabold shrink-0 flex items-center gap-1.5"
          >
            <Plus size={14} /> {t.period.quickLog}
          </button>
        </div>
        {dirty && <p className="text-xs font-semibold text-[var(--text-pos)]">{t.period.unsaved}</p>}

        <button
          type="button"
          onClick={() => patch({ isPeriod: !draft.isPeriod })}
          aria-pressed={draft.isPeriod}
          className={`w-full py-3 rounded-2xl text-sm font-extrabold border transition-colors flex items-center justify-center gap-2 ${
            draft.isPeriod ? 'kc-period-chip bg-[#F4C6D8] text-[#6E2440] border-[#E79CBB]' : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
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

        <PeriodTagEditor key={`mood-${selected}`} group="mood" selected={draft.moods} onChange={(moods) => patch({ moods })} />
        <PeriodTagEditor key={`symptom-${selected}`} group="symptom" selected={draft.symptoms} onChange={(symptoms) => patch({ symptoms })} />

        {pillMode && (
          <div>
            <span className="block text-xs font-bold text-[var(--text)] mb-1.5">{t.period.pill}</span>
            <button
              type="button"
              disabled={selInactive}
              onClick={() => patch({ pillTaken: !draft.pillTaken })}
              aria-pressed={Boolean(draft.pillTaken)}
              className={`w-full py-2.5 rounded-2xl text-sm font-extrabold border transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                draft.pillTaken ? 'kc-chip-active bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]' : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
              }`}
            >
              <Pill size={15} />
              <span>{selInactive ? t.period.breakDay : draft.pillTaken ? `✓ ${t.period.pillTaken}` : t.period.pillNotTaken}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setRecapText(draft.notes ?? '')}
          className="pressable w-full flex items-center justify-between bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3.5 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
            <StickyNote size={15} className="text-[var(--muted)]" />
            {draft.notes ? t.period.recapEdit : t.period.recapAdd}
          </span>
          <ChevronRight size={16} className="text-[var(--muted)]" />
        </button>
        {draft.notes && <p className="text-xs whitespace-pre-wrap break-words px-1 text-[var(--muted)]">{draft.notes}</p>}
        <Modal isOpen={recapText !== null} onClose={() => setRecapText(null)} title={draft.notes ? t.period.recapEdit : t.period.recapAdd} maxWidth="max-w-md">
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            patch({ notes: recapText?.trim() || undefined });
            setRecapText(null);
          }}>
            <textarea
              autoFocus
              value={recapText ?? ''}
              onChange={(event) => setRecapText(event.target.value)}
              aria-label={t.period.recapEdit}
              placeholder={t.period.recapPlaceholder}
              rows={3}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-base text-[var(--text)] resize-y"
            />
            <button type="submit" className="kc-primary-btn pressable w-full py-3 rounded-2xl bg-[#C9EFD3] text-[#174A2B] font-extrabold text-sm">{t.common.save}</button>
          </form>
        </Modal>

        {/* Log Day button at the bottom of the form, add-food style */}
        <button
          type="button"
          onClick={saveDay}
          disabled={!dirty}
          className={`w-full py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-colors ${
            dirty ? 'kc-primary-btn bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B]' : 'bg-[var(--inset)] text-[var(--muted)]'
          }`}
        >
          {dirty ? <Plus size={16} strokeWidth={2.5} /> : <Check size={16} strokeWidth={2.5} />}
          <span>{dirty || !stored ? t.period.logButton : t.period.saved}</span>
        </button>

        {stored && (
          <button
            type="button"
            onClick={() => {
              clearPeriodDay(selected);
              discard();
            }}
            className="pressable w-full py-2.5 rounded-2xl text-xs font-bold text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} />
            <span>{t.period.deleteDay}</span>
          </button>
        )}
      </div>

      {/* 4. Cycle history & stats + 5. Nutrition & weight (deferred below the fold so Period opens immediately) */}
      <DeferredBody className="space-y-3.5">
        <CycleHistory status={status} />
        {settings.showNutrition && <CycleNutrition status={status} />}
      </DeferredBody>

      {/* 6. Settings accordion */}
      <PeriodSettingsAccordion />
      {inspectedDay && <PeriodDayInfoModal date={inspectedDay} onClose={() => setInspectedDay(null)} />}
      <ActionDock activeOn="period" label={t.period.dockLabel} actions={cycleActions} />
    </div>
  );
};
