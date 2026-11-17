import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CycleInfo,
  cycleStats,
  cycleDays,
  tagLabel,
  FLAG_SHORT_CYCLE,
  FLAG_LONG_CYCLE,
  FLAG_LONG_BLEED,
  PeriodStatus,
} from '../../utils/period';
import { formatDateDisplay, getTodayDateString } from '../../utils/formatters';
import { PeriodFlow } from '../../types';
import { ChevronDown, Info } from 'lucide-react';

const FLOW_RANK: Record<PeriodFlow, number> = { none: 0, light: 1, medium: 2, heavy: 3 };

export const CycleHistory: React.FC<{ status: PeriodStatus }> = ({ status }) => {
  const { t, language, periodData } = useApp();
  const [allTime, setAllTime] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const todayStr = getTodayDateString();
  const settings = periodData.settings;

  const cycles = status.cycles;
  const stats = useMemo(() => cycleStats(cycles, allTime), [cycles, allTime]);
  const newestFirst = useMemo(() => [...cycles].reverse(), [cycles]);

  const builtinLabel = (group: 'mood' | 'symptom', key: string) =>
    t.period[`${group === 'mood' ? 'mood' : 'sym'}_${key}` as keyof typeof t.period] as string;

  const detailsFor = (c: CycleInfo) => {
    const days = cycleDays(c, status.predicted.length, todayStr);
    let peak: PeriodFlow = 'none';
    const moodCount = new Map<string, number>();
    const symCount = new Map<string, number>();
    for (const d of days) {
      const l = periodData.logs[d];
      if (!l) continue;
      if (FLOW_RANK[l.flow] > FLOW_RANK[peak]) peak = l.flow;
      l.moods.forEach((m) => moodCount.set(m, (moodCount.get(m) || 0) + 1));
      l.symptoms.forEach((m) => symCount.set(m, (symCount.get(m) || 0) + 1));
    }
    const top = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, n]) => `${tagLabel(id, settings, builtinLabel)} ×${n}`);
    return { peak, moods: top(moodCount), symptoms: top(symCount) };
  };

  // gentle flags
  const completed = cycles.filter((c) => c.length !== null);
  const flags: string[] = [];
  if (completed.some((c) => (c.length as number) < FLAG_SHORT_CYCLE))
    flags.push(t.period.flagShort.replace('{n}', String(FLAG_SHORT_CYCLE)));
  if (completed.some((c) => (c.length as number) > FLAG_LONG_CYCLE))
    flags.push(t.period.flagLong.replace('{n}', String(FLAG_LONG_CYCLE)));
  if (cycles.some((c) => c.periodLength > FLAG_LONG_BLEED))
    flags.push(t.period.flagBleed.replace('{n}', String(FLAG_LONG_BLEED)));

  // bar chart data (completed cycles, oldest → newest)
  const chart = completed.slice(-12);
  const maxLen = Math.max(settings.cycleLength, ...chart.map((c) => c.length as number), 1);

  return (
    <div className="space-y-3.5">
      {/* Stats summary */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
            {t.period.statsTitle}
          </span>
          {stats && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[var(--muted)]">
                {t.period.nCycles.replace('{n}', String(stats.n))}
              </span>
              <div className="flex p-0.5 bg-[var(--inset)] rounded-full">
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setAllTime(v)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      allTime === v ? 'bg-[var(--text)] text-[var(--surface)]' : 'text-[var(--muted)]'
                    }`}
                  >
                    {v ? t.period.allTime : t.period.last6}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {!stats ? (
          <p className="text-xs font-medium text-[var(--muted)]">{t.period.needTwo}</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              [t.period.avgCycle, `${stats.avgCycle}`],
              [t.period.avgPeriod, `${stats.avgPeriod}`],
              [t.period.shortest, `${stats.shortest}`],
              [t.period.longest, `${stats.longest}`],
              [t.period.stdDev, `±${stats.sd}`],
            ].map(([label, val]) => (
              <div key={label} className="bg-[var(--inset)] rounded-2xl p-2.5 text-center">
                <span className="block text-[10px] font-bold uppercase text-[var(--muted)]">{label}</span>
                <span className="block text-base font-extrabold text-[var(--text)]">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bar chart */}
        {chart.length > 0 && (
          <div className="pt-1">
            <span className="block text-[11px] font-bold text-[var(--muted)] mb-1.5">
              {t.period.chartTitle} · <span className="text-[#7A2727]">— {t.period.reference} {settings.cycleLength}</span>
            </span>
            <div className="relative h-24">
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-[#7A2727]/60 pointer-events-none"
                style={{ bottom: `${(settings.cycleLength / maxLen) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-end gap-1">
                {chart.map((c) => (
                  <div key={c.start} className="flex-1 flex flex-col items-center justify-end h-full" title={`${formatDateDisplay(c.start, language)} · ${c.length}`}>
                    <span className="text-[9px] font-extrabold text-[var(--muted)] mb-0.5">{c.length}</span>
                    <div
                      className="w-full rounded-t-md bg-[#F4C6D8]"
                      style={{ height: `${((c.length as number) / maxLen) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {flags.length > 0 && (
          <div className="bg-[#FAE0B4] rounded-2xl p-3 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#7D4E14]">
              <Info size={13} /> {t.period.flagTitle}
            </span>
            {flags.map((f) => (
              <p key={f} className="text-[11px] font-medium text-[#7D4E14]">
                {f}
              </p>
            ))}
            <p className="text-[11px] font-medium text-[#A87C3F]">{t.period.flagNote}</p>
          </div>
        )}
      </div>

      {/* Cycle list */}
      {newestFirst.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
            {t.period.historyTitle}
          </span>
          {newestFirst.map((c) => {
            const open = openId === c.start;
            const d = open ? detailsFor(c) : null;
            return (
              <div key={c.start} className="bg-[var(--inset)] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : c.start)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-sm font-extrabold text-[var(--text)]">
                    {formatDateDisplay(c.start, language)}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] font-bold text-[var(--muted)]">
                    <span>
                      {t.period.cycleLen}:{' '}
                      {c.length !== null
                        ? `${c.length}`
                        : t.period.ongoing.replace('{n}', String(status.cycleDay ?? 1))}
                    </span>
                    <span>·</span>
                    <span>
                      {t.period.periodLen}: {c.periodLength}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {open && d && (
                  <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-bold">
                    <div className="bg-[var(--surface)] rounded-xl p-2">
                      <span className="block text-[var(--muted)] uppercase text-[10px]">{t.period.peakFlow}</span>
                      <span className="text-[var(--text)]">
                        {t.period[`flow_${d.peak}` as keyof typeof t.period] as string}
                      </span>
                    </div>
                    <div className="bg-[var(--surface)] rounded-xl p-2">
                      <span className="block text-[var(--muted)] uppercase text-[10px]">{t.period.topMoods}</span>
                      <span className="text-[var(--text)]">{d.moods.join(', ') || t.period.none}</span>
                    </div>
                    <div className="bg-[var(--surface)] rounded-xl p-2">
                      <span className="block text-[var(--muted)] uppercase text-[10px]">{t.period.topSymptoms}</span>
                      <span className="text-[var(--text)]">{d.symptoms.join(', ') || t.period.none}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
