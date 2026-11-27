import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Droplets,
  Footprints,
  History,
  NotebookPen,
  Pencil,
  Play,
  Scale,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { CollapseArrow, CollapseBody } from '../common/InlineCollapse';
import { useSettings, useShell } from '../../context/AppContext';
import { useFastingText } from '../../i18n/fasting';
import type { FastingMood, FastingNote, FastingSession } from '../../types/fasting';
import { addDaysToDateString, formatDateDisplay, getTodayDateString } from '../../utils/formatters';
import {
  computeEatingWindow,
  computeFastingStats,
  computeFastTiming,
  endFast,
  FASTING_PROTOCOLS,
  filterFastingByPeriod,
  formatDurationCompact,
  getProtocolHours,
  PROTOCOL_HOURS,
  removeFastingNote,
  setFastingProtocol,
  startFast,
  updateActiveFast,
  useFasting,
} from '../../utils/fastingStore';
import { usePersistentState } from '../../utils/usePersistentState';
import { ActionDock, type DockAction } from '../common/ActionDock';
import { PoopIcon } from '../common/PoopIcon';
import { TrackerIcon } from '../common/TrackerIcon';
import { FastingDaysBarChart, FastingHungerChart } from './FastingCharts';
import { FastingNoteModal, MOOD_TONE } from './FastingNoteModal';
import { FastingSessionModal, toLocalDateTimeInput } from './FastingSessionModal';

type FastingRangeKey = '7d' | '30d' | 'custom';

const MARKER_COLOR: Record<FastingMood, string> = {
  calm: '#1E5E3A',
  focused: '#183F66',
  hungry: '#8A6D1B',
  irritable: '#7D4E14',
  angry: '#7A2727',
  tired: '#49346F',
};

function formatClock(ms: number, lang: 'en' | 'it'): string {
  return new Date(ms).toLocaleString(lang === 'it' ? 'it-IT' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const FastingView: React.FC = () => {
  const { language, settings, t } = useSettings();
  const {
    setIsLogActivityOpen,
    setIsWaterOpen,
    setIsPoopOpen,
    setIsWeightOpen,
    setCustomButtonOpenId,
    setIsCustomPickerOpen,
  } = useShell();
  const ft = useFastingText();
  const fasting = useFasting();
  const ultra = settings.ultraMinimal;

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const id = window.setInterval(tick, 15_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Timer card collapsed by default
  const [timerExpanded, setTimerExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [diaryHintOpen, setDiaryHintOpen] = useState(false);

  // Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<FastingNote | null>(null);
  const [selectedSession, setSelectedSession] = useState<FastingSession | null>(null);

  // Period selector (persisted via kcak_* keys so collectPreferences backs them up automatically)
  const today = getTodayDateString();
  const [range, setRange] = usePersistentState<FastingRangeKey>('kcak_fasting_range', '7d');
  const [customFrom, setCustomFrom] = usePersistentState<string>('kcak_fasting_custom_from', addDaysToDateString(today, -6));
  const [customTo, setCustomTo] = usePersistentState<string>('kcak_fasting_custom_to', today);

  const { from, to } = useMemo(() => {
    if (range === '7d') return { from: addDaysToDateString(today, -6), to: today };
    if (range === '30d') return { from: addDaysToDateString(today, -29), to: today };
    return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
  }, [range, customFrom, customTo, today]);

  const { sessions: periodSessions, notes: periodNotes } = useMemo(
    () => filterFastingByPeriod(fasting, from, to),
    [fasting, from, to],
  );

  const { fastingHours, eatingHours } = getProtocolHours(fasting.config);
  const stats = useMemo(
    () => computeFastingStats(periodSessions, periodNotes, from, to, fastingHours),
    [periodSessions, periodNotes, from, to, fastingHours],
  );

  const active = fasting.activeSession;
  useEffect(() => {
    if (active) {
      setDiaryHintOpen(false);
      return;
    }
    if (!diaryHintOpen) return;
    const id = window.setTimeout(() => setDiaryHintOpen(false), 3000);
    return () => window.clearTimeout(id);
  }, [active, diaryHintOpen]);

  const activeTiming = active ? computeFastTiming(active, nowMs) : null;
  const activeNotes = useMemo(
    () => (active ? fasting.notes.filter((n) => n.sessionId === active.id) : []),
    [active, fasting.notes],
  );
  const eatingWindow = !active ? computeEatingWindow(fasting, nowMs) : null;

  // ActionDock: non-food only, Log Note next to Activity
  const quick = settings.quickAdd;
  const dockActions: DockAction[] = [
    {
      id: 'fast-note',
      icon: <NotebookPen size={20} />,
      label: ft.dock.note,
      tone: `bg-[#F7E9AA] text-[#5D4911]${active ? '' : ' opacity-65'}`,
      onClick: () => {
        if (!active) {
          setDiaryHintOpen(true);
          return;
        }
        setEditingNote(null);
        setNoteModalOpen(true);
      },
    },
  ];
  if (quick.movement) {
    dockActions.push({
      id: 'activity',
      icon: <Footprints size={20} />,
      tone: 'bg-activity text-activity-ink',
      onClick: () => setIsLogActivityOpen(true),
      label: t.quickAdd.movement,
    });
  }
  if (quick.water) {
    dockActions.push({
      id: 'water',
      icon: <Droplets size={20} />,
      tone: 'bg-[#CFE7FE] text-[#183F66]',
      onClick: () => setIsWaterOpen(true),
      label: t.quickAdd.water,
    });
  }
  if (quick.poop && !settings.hidePoop) {
    dockActions.push({
      id: 'poop',
      icon: <PoopIcon size={20} />,
      tone: 'bg-[#FAE0B4] text-[#7D4E14]',
      onClick: () => setIsPoopOpen(true),
      label: t.quickAdd.poop,
    });
  }
  if (quick.weight) {
    dockActions.push({
      id: 'weight',
      icon: <Scale size={20} />,
      tone: 'bg-weight text-weight-ink',
      onClick: () => setIsWeightOpen(true),
      label: t.quickAdd.weight,
    });
  }
  if (quick.custom && settings.customButtons.length) {
    const single = settings.customButtons.length === 1 ? settings.customButtons[0] : undefined;
    dockActions.push({
      id: 'custom',
      icon: single ? <TrackerIcon icon={single.icon} size={20} /> : <Sparkles size={20} />,
      tone: 'bg-[#F7E9AA] text-[#6E5B14]',
      onClick: () => (single ? setCustomButtonOpenId(single.id) : setIsCustomPickerOpen(true)),
      label: single?.name ?? t.quickAdd.custom,
    });
  }

  const timerPct = activeTiming ? Math.round(activeTiming.progress * 100) : eatingWindow ? Math.round(eatingWindow.progress * 100) : 0;
  const activeProtocol = active ? active.protocol : fasting.config.protocol;

  const handleSelectProtocol = (p: (typeof FASTING_PROTOCOLS)[number]) => {
    setFastingProtocol(p);
    if (active) {
      const h = p === 'custom'
        ? { fastingHours: fasting.config.customFastingHours, eatingHours: fasting.config.customEatingHours }
        : PROTOCOL_HOURS[p];
      updateActiveFast({ protocol: p, targetFastingHours: h.fastingHours, targetEatingHours: h.eatingHours });
    }
  };

  return (
    <div className={ultra ? 'space-y-3' : 'space-y-4'}>
      {/* 1. Fasting Timer Card (collapsed by default) */}
      <section
        aria-label={ft.pageTitle}
        data-kc-tone="diary"
        className={`rounded-3xl bg-nutrient text-nutrient-ink ${ultra ? 'p-3.5' : 'p-4 sm:p-5'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div data-kc-tone-ink className="text-[11px] font-extrabold uppercase tracking-wider opacity-85">
              {active
                ? `${ft.status.fasting} · ${ft.protocols[active.protocol]}`
                : eatingWindow
                ? `${ft.status.eatingWindow} · ${ft.protocols[fasting.config.protocol]}`
                : `${ft.status.ready} · ${ft.protocols[fasting.config.protocol]}`}
            </div>
            <div className="mt-1 flex items-baseline gap-2 tabular-nums">
              <span className="text-3xl sm:text-4xl font-extrabold leading-none">
                {activeTiming
                  ? formatDurationCompact(activeTiming.elapsedMs)
                  : eatingWindow
                  ? formatDurationCompact(eatingWindow.elapsedMs)
                  : `${fastingHours}h : ${eatingHours}h`}
              </span>
              {(activeTiming || eatingWindow) && (
                <span className="text-sm font-extrabold opacity-80">{timerPct}%</span>
              )}
            </div>
            <div className="mt-1 text-xs font-bold opacity-80 tabular-nums">
              {activeTiming
                ? activeTiming.reached
                  ? ft.status.overtime.replace('{time}', formatDurationCompact(activeTiming.overtimeMs))
                  : ft.status.remaining.replace('{time}', formatDurationCompact(activeTiming.remainingMs))
                : eatingWindow
                ? eatingWindow.reached
                  ? ft.status.targetReached
                  : ft.status.remaining.replace('{time}', formatDurationCompact(eatingWindow.remainingMs))
                : `${ft.timer.target}: ${fastingHours}h · ${ft.timer.eatingTarget}: ${eatingHours}h`}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {active && (
              <button
                type="button"
                onClick={() => {
                  setEditingNote(null);
                  setNoteModalOpen(true);
                }}
                aria-label={ft.notes.logNote}
                title={ft.notes.logNote}
                className="kc-fast-icon-btn pressable size-9 rounded-full bg-[#FCF4D6]/85 hover:bg-[#FCF4D6] border border-[#8A6D1B]/25 text-[#5D4911] flex items-center justify-center"
              >
                <NotebookPen size={16} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setTimerExpanded((v) => !v)}
              aria-expanded={timerExpanded}
              aria-label={timerExpanded ? t.common.collapse : t.common.expand}
              className="kc-fast-icon-btn pressable size-9 rounded-full bg-[#FCF4D6]/85 hover:bg-[#FCF4D6] border border-[#8A6D1B]/25 text-[#5D4911] flex items-center justify-center"
            >
              <CollapseArrow open={timerExpanded} className="!text-current" />
            </button>
          </div>
        </div>

        {/* Linear progress bar with note markers */}
        <div className="kc-fast-track relative mt-3.5 h-3 w-full rounded-full bg-[#FCF4D6]/85 overflow-visible">
          <div
            className="kc-fast-fill h-full rounded-full bg-[#8A6D1B] transition-[width] duration-300"
            style={{ width: `${Math.min(100, timerPct)}%` }}
          />
          {activeTiming &&
            activeNotes.map((n) => {
              const leftPct = Math.min(98, Math.max(2, (n.elapsedMs / activeTiming.targetMs) * 100));
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setEditingNote(n);
                    setNoteModalOpen(true);
                  }}
                  title={`${formatDurationCompact(n.elapsedMs)} · ${ft.moods[n.mood]}`}
                  aria-label={`${ft.notes.editNote}: ${ft.moods[n.mood]}`}
                  className="pressable absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-7 flex items-center justify-center rounded-full"
                  style={{ left: `${leftPct}%` }}
                >
                  <span
                    data-fast-marker={n.mood}
                    className="size-3.5 rounded-full border-2 border-[var(--surface)] shadow-sm block"
                    style={{ backgroundColor: MARKER_COLOR[n.mood] }}
                  />
                </button>
              );
            })}
        </div>

        {/* Expanded settings: protocol presets, custom hours, start time & projected end */}
        <CollapseBody open={timerExpanded}>
          <div className="kc-fast-divider mt-4 pt-3.5 border-t border-[#8A6D1B]/20 space-y-3">
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider opacity-75 mb-1.5">
                {ft.timer.protocol}
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={ft.timer.protocol}>
                {FASTING_PROTOCOLS.map((p) => {
                  const selected = activeProtocol === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={selected}
                      data-active={selected ? 'true' : undefined}
                      onClick={() => handleSelectProtocol(p)}
                      className={`kc-fast-chip pressable px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                        selected
                          ? 'bg-[#8A6D1B] text-[#FFFDF7] border-[#8A6D1B]'
                          : 'bg-[#FCF4D6]/85 hover:bg-[#FCF4D6] text-[#5D4911] border-[#8A6D1B]/25'
                      }`}
                    >
                      {ft.protocols[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeProtocol === 'custom' && (
              <div className="grid grid-cols-2 gap-2.5">
                <label className="text-[11px] font-extrabold space-y-1">
                  <span className="block opacity-80">{ft.timer.fastingHours}</span>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={fasting.config.customFastingHours}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(168, Number(e.target.value) || 1));
                      setFastingProtocol('custom', v, fasting.config.customEatingHours);
                    }}
                    className="kc-fast-input w-full rounded-xl bg-[#FCF4D6]/90 border border-[#8A6D1B]/25 px-3 py-1.5 text-sm font-extrabold text-[#5D4911] tabular-nums"
                  />
                </label>
                <label className="text-[11px] font-extrabold space-y-1">
                  <span className="block opacity-80">{ft.timer.eatingHours}</span>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={fasting.config.customEatingHours}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(48, Number(e.target.value) || 1));
                      setFastingProtocol('custom', fasting.config.customFastingHours, v);
                    }}
                    className="kc-fast-input w-full rounded-xl bg-[#FCF4D6]/90 border border-[#8A6D1B]/25 px-3 py-1.5 text-sm font-extrabold text-[#5D4911] tabular-nums"
                  />
                </label>
              </div>
            )}

            {active && activeTiming && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="text-[11px] font-extrabold space-y-1">
                  <span className="block opacity-80">{ft.timer.startTime}</span>
                  <input
                    type="datetime-local"
                    value={toLocalDateTimeInput(active.startedAt)}
                    onChange={(e) => {
                      const ms = Date.parse(e.target.value);
                      if (Number.isFinite(ms)) {
                        updateActiveFast({ startedAt: new Date(ms).toISOString() });
                      }
                    }}
                    className="kc-fast-input w-full rounded-xl bg-[#FCF4D6]/90 border border-[#8A6D1B]/25 px-3 py-1.5 text-xs font-extrabold text-[#5D4911]"
                  />
                </label>
                <div className="kc-fast-subbox rounded-xl bg-[#FCF4D6]/75 border border-[#8A6D1B]/20 px-3 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
                    {ft.timer.projectedEnd}
                  </span>
                  <span className="text-xs font-extrabold tabular-nums mt-0.5">
                    {formatClock(activeTiming.projectedEndMs, language)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapseBody>

        <button
          type="button"
          data-active-fast={active ? 'true' : undefined}
          onClick={() => (active ? endFast() : startFast())}
          className={`kc-fast-cta pressable mt-3.5 w-full py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 ${
            active
              ? 'bg-[#FCF4D6] hover:bg-[#F2E29A] text-[#5D4911] border border-[#8A6D1B]/30'
              : 'bg-[#8A6D1B] hover:bg-[#765C15] text-[#FFFDF7]'
          }`}
        >
          {active ? (
            <>
              <Square size={14} aria-hidden="true" />
              <span>{ft.status.endFast}</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" aria-hidden="true" />
              <span>{ft.status.startFast}</span>
            </>
          )}
        </button>
      </section>

      {/* 2. Period Selector */}
      <div className="space-y-2.5">
        <div className="flex justify-center">
          <div
            role="group"
            aria-label={ft.range.label}
            data-range-switch
            className="inline-flex w-fit max-w-full items-center justify-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full"
          >
            {(
              [
                ['7d', ultra ? '7d' : ft.range.r7d, ft.range.r7d],
                ['30d', ultra ? '30d' : ft.range.r30d, ft.range.r30d],
                ['custom', ft.range.custom, ft.range.custom],
              ] as const
            ).map(([key, short, long]) => (
              <button
                key={key}
                type="button"
                aria-pressed={range === key}
                aria-label={long}
                title={long}
                onClick={() => setRange(key)}
                data-range-btn
                data-active={range === key ? 'true' : undefined}
                className={`pressable px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap ${
                  range === key ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {key === 'custom' && ultra ? <CalendarDays size={14} /> : short}
              </button>
            ))}
          </div>
        </div>

        {range === 'custom' && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 px-1">
            {(
              [
                [ft.range.from, customFrom, setCustomFrom],
                [ft.range.to, customTo, setCustomTo],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label} className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
                <span>{label}</span>
                <input
                  type="date"
                  aria-label={label}
                  value={value}
                  onChange={(e) => e.target.value && setter(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
                />
              </label>
            ))}
          </div>
        )}

        <p className="text-center text-xs font-bold text-[var(--muted)] tabular-nums">
          {ft.range.daysLogged
            .replace('{logged}', String(stats.daysLogged))
            .replace('{total}', String(stats.daysInPeriod))}
        </p>
      </div>

      {/* 3. Summary KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div
          data-kc-tone="foods"
          className="rounded-3xl bg-intake text-intake-ink p-3.5 sm:p-4"
        >
          <div data-kc-tone-ink className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
            {ft.stats.avgDuration}
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums">
            {stats.totalCount > 0 ? formatDurationCompact(stats.avgDurationMs) : '–'}
          </div>
          <div className="kc-fast-track mt-2 h-1.5 w-full rounded-full bg-[#FBF8F2]/60 overflow-hidden">
            <div
              className="kc-fast-fill h-full rounded-full bg-[#286540]"
              style={{ width: `${Math.min(100, Math.round((stats.avgDurationMs / (fastingHours * 3_600_000)) * 100))}%` }}
            />
          </div>
        </div>

        <div
          data-kc-tone="photo"
          className="rounded-3xl bg-activity text-activity-ink p-3.5 sm:p-4"
        >
          <div className="flex items-center justify-between gap-1">
            <span data-kc-tone-ink className="text-[10px] font-extrabold uppercase tracking-wider opacity-80 truncate">
              {ft.stats.completionRate}
            </span>
            <span className="kc-fast-badge rounded-full bg-activity-ink text-[#FBF8F2] px-2 py-0.5 text-[10px] font-extrabold tabular-nums shrink-0">
              {stats.completionRate}%
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
            <span className="text-xl sm:text-2xl font-extrabold">
              {ft.stats.fastsFraction.replace('{done}', String(stats.completedCount)).replace('{total}', String(stats.totalCount))}
            </span>
            <span className="text-xs font-bold opacity-80">{ft.stats.fastsUnit}</span>
          </div>
          <div className="kc-fast-track mt-2 h-1.5 w-full rounded-full bg-[#FBF8F2]/60 overflow-hidden">
            <div className="kc-fast-fill h-full rounded-full bg-[#904149]" style={{ width: `${stats.completionRate}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div
          data-kc-tone="planner"
          className="rounded-3xl bg-carbs text-carbs-ink p-3 text-center"
        >
          <div data-kc-tone-ink className="text-[10px] font-extrabold uppercase tracking-wider opacity-80 truncate">
            {ft.stats.currentStreak}
          </div>
          <div className="mt-1 text-base sm:text-lg font-extrabold tabular-nums">
            {stats.currentStreak === 1
              ? ft.stats.dayUnit
              : ft.stats.daysUnit.replace('{count}', String(stats.currentStreak))}
          </div>
        </div>

        <div
          data-kc-tone="meals"
          className="rounded-3xl bg-protein text-protein-ink p-3 text-center"
        >
          <div data-kc-tone-ink className="text-[10px] font-extrabold uppercase tracking-wider opacity-80 truncate">
            {ft.stats.totalHours}
          </div>
          <div className="mt-1 text-base sm:text-lg font-extrabold tabular-nums">{stats.totalHours} h</div>
        </div>

        <div
          data-kc-tone="recipes"
          className="rounded-3xl bg-fat text-fat-ink p-3 text-center"
        >
          <div data-kc-tone-ink className="text-[10px] font-extrabold uppercase tracking-wider opacity-80 truncate">
            {ft.stats.peakHungerHr}
          </div>
          <div className="mt-1 text-base sm:text-lg font-extrabold tabular-nums">
            {stats.peakHungerHour
              ? `${ft.stats.hrLabel.replace('{hour}', String(stats.peakHungerHour.hour))} · ${stats.peakHungerHour.avgHunger}`
              : '–'}
          </div>
        </div>
      </div>

      {/* 4. Charts */}
      <FastingDaysBarChart
        bars={stats.dailyBars}
        avgDurationMs={stats.avgDurationMs}
        totalHours={stats.totalHours}
        targetHours={fastingHours}
        ultra={ultra}
      />

      <FastingHungerChart points={stats.hungerByHour} ultra={ultra} />

      {/* 5. Fast Notes (collapsed by default) */}
      <section className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden">
        <button
          type="button"
          aria-expanded={notesOpen}
          onClick={() => setNotesOpen((v) => !v)}
          className="pressable w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[var(--hover)] transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <NotebookPen size={16} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
            <span className="text-sm font-extrabold text-[var(--text)]">{ft.notes.title}</span>
            <span data-fast-pill="neutral" className="px-2 py-0.5 rounded-full bg-[var(--inset)] border border-[var(--border)] text-[11px] font-extrabold text-[var(--muted)] tabular-nums">
              {periodNotes.length}
            </span>
          </span>
          <CollapseArrow open={notesOpen} />
        </button>

        <CollapseBody open={notesOpen}>
          <div className="px-3.5 pb-3.5 space-y-2 border-t border-[var(--border)] pt-3">
            {periodNotes.length === 0 ? (
              <p className="py-4 text-center text-xs font-bold text-[var(--muted)]">{ft.notes.empty}</p>
            ) : (
              periodNotes.map((n) => (
                <div
                  key={n.id}
                  className="kc-fast-row rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5 flex items-start justify-between gap-2.5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                      <span data-fast-pill="time" className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] tabular-nums">
                        {formatDurationCompact(n.elapsedMs)}
                      </span>
                      <span data-fast-pill="hunger" className="px-2 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14]">
                        {ft.notes.hungerBadge.replace('{value}', String(n.hunger))}
                      </span>
                      <span data-fast-mood={n.mood} className={`px-2 py-0.5 rounded-full ${MOOD_TONE[n.mood]}`}>
                        {ft.moods[n.mood]}
                      </span>
                      <span className="text-[var(--muted)] font-bold tabular-nums">
                        {formatClock(Date.parse(n.timestamp), language)}
                      </span>
                    </div>
                    {n.text && <p className="text-xs font-medium text-[var(--text)] break-words">{n.text}</p>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNote(n);
                        setNoteModalOpen(true);
                      }}
                      aria-label={ft.notes.editNote}
                      title={ft.notes.editNote}
                      className="kc-fast-row-btn pressable size-8 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFastingNote(n.id)}
                      aria-label={t.common.delete}
                      title={t.common.delete}
                      className="kc-fast-row-btn kc-fast-row-danger pressable size-8 rounded-full bg-[var(--surface)] hover:bg-[#F6D0D0] border border-[var(--border)] text-[var(--muted)] hover:text-[#7A2727] flex items-center justify-center"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CollapseBody>
      </section>

      {/* 6. Session History (collapsed by default) */}
      <section className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden">
        <button
          type="button"
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen((v) => !v)}
          className="pressable w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[var(--hover)] transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <History size={16} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
            <span className="text-sm font-extrabold text-[var(--text)]">{ft.history.title}</span>
            <span data-fast-pill="neutral" className="px-2 py-0.5 rounded-full bg-[var(--inset)] border border-[var(--border)] text-[11px] font-extrabold text-[var(--muted)] tabular-nums">
              {periodSessions.length}
            </span>
          </span>
          <CollapseArrow open={historyOpen} />
        </button>

        <CollapseBody open={historyOpen}>
          <div className="px-3.5 pb-3.5 space-y-2 border-t border-[var(--border)] pt-3">
            {periodSessions.length === 0 ? (
              <p className="py-4 text-center text-xs font-bold text-[var(--muted)]">{ft.history.empty}</p>
            ) : (
              periodSessions.map((s) => {
                const timing = computeFastTiming(s);
                const pct = Math.min(100, Math.round(timing.progress * 100));
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSession(s)}
                    className="kc-fast-row pressable w-full rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] px-3.5 py-2.5 text-left flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[var(--text)]">
                          {ft.protocols[s.protocol]}
                        </span>
                        <span
                          data-fast-pill={timing.reached ? 'reached' : 'partial'}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                            timing.reached ? 'bg-intake text-intake-ink' : 'bg-protein text-protein-ink'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[var(--muted)] mt-0.5 truncate">
                        {formatDateDisplay(s.startedAt.slice(0, 10), language)} · {formatClock(Date.parse(s.startedAt), language)}
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-[var(--text)] tabular-nums shrink-0">
                      {formatDurationCompact(timing.elapsedMs)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </CollapseBody>
      </section>

      <FastingNoteModal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          setEditingNote(null);
        }}
        sessionId={active?.id ?? null}
        editingNote={editingNote}
      />

      <FastingSessionModal
        session={selectedSession ? fasting.sessions.find((s) => s.id === selectedSession.id) ?? null : null}
        notes={fasting.notes}
        onClose={() => setSelectedSession(null)}
      />

      {diaryHintOpen &&
        createPortal(
          <div
            role="status"
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 px-3 pointer-events-none"
          >
            <div className="kc-fast-toast rounded-2xl border border-[var(--border)] bg-[var(--surface-solid,var(--surface))] text-[var(--text)] px-4 py-2.5 shadow-lg text-xs font-extrabold whitespace-nowrap">
              {ft.notes.noActiveFast}
            </div>
          </div>,
          document.body,
        )}

      <ActionDock activeOn="fasting" label={ft.dock.label} actions={dockActions} />
    </div>
  );
};
