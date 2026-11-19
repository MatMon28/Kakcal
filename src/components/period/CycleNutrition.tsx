import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CycleInfo, cycleDays, isInactivePackDay, phaseOfDate, PeriodStatus, tagDefs } from '../../utils/period';
import { calculateBMR, calculateMacros, calculateTEF, calculateTotalActivityCalories, calculateTotalCalories } from '../../utils/calculations';
import { diffDays, formatDateDisplay, getTodayDateString } from '../../utils/formatters';
import { CyclePhase, DayLog } from '../../types';

type Bucket = { intake: number; burned: number; net: number; c: number; p: number; f: number; n: number };
const emptyBucket = (): Bucket => ({ intake: 0, burned: 0, net: 0, c: 0, p: 0, f: 0, n: 0 });

const PHASE_COLORS: Record<CyclePhase, string> = {
  menstrual: '#F4C6D8',
  follicular: '#CFE7FE',
  ovulation: '#C9EFD3',
  luteal: '#E2D6FF',
};

export const CycleNutrition: React.FC<{ status: PeriodStatus }> = ({ status }) => {
  const { t, language, periodData, allDayLogs, userProfile } = useApp();
  const todayStr = getTodayDateString();
  const settings = periodData.settings;
  const pillMode = settings.trackPill;
  const [relative, setRelative] = useState(false);
  const [tag, setTag] = useState('sym.cravings');

  const bmr = calculateBMR(userProfile);
  const dayMetrics = (log: DayLog | undefined) => {
    if (!log) return null;
    const items = [...log.meals.breakfast, ...log.meals.mid_morning, ...log.meals.lunch, ...log.meals.midday_snack, ...log.meals.dinner, ...log.meals.extra];
    if (items.length === 0) return null;
    const intake = calculateTotalCalories(items);
    const m = calculateMacros(items);
    const burned = bmr + calculateTotalActivityCalories(log.activities) + calculateTEF(m.carbsGrams, m.proteinGrams, m.fatGrams).totalTEF;
    return { intake, burned, net: intake - burned, c: m.carbsGrams, p: m.proteinGrams, f: m.fatGrams };
  };

  const cycles = status.cycles;
  const current = cycles.length ? cycles[cycles.length - 1] : null;
  const last3 = cycles.filter((c) => c.length !== null).slice(-3);

  const groupKey = (d: string): string | null => {
    if (pillMode) return isInactivePackDay(settings, d) ? 'inactive' : 'active';
    return phaseOfDate(periodData, d, status);
  };
  const groups: string[] = pillMode ? ['active', 'inactive'] : ['menstrual', 'follicular', 'ovulation', 'luteal'];
  const groupLabel = (g: string) =>
    pillMode
      ? g === 'active' ? t.period.activeDays : t.period.inactiveDays
      : (t.period[`phase_${g}` as keyof typeof t.period] as string);

  const aggregate = (cs: CycleInfo[]) => {
    const buckets: Record<string, Bucket> = {};
    groups.forEach((g) => (buckets[g] = emptyBucket()));
    for (const c of cs) {
      for (const d of cycleDays(c, status.predicted.length, todayStr)) {
        const g = groupKey(d);
        const m = dayMetrics(allDayLogs[d]);
        if (!g || !m || !buckets[g]) continue;
        const b = buckets[g];
        b.intake += m.intake; b.burned += m.burned; b.net += m.net; b.c += m.c; b.p += m.p; b.f += m.f; b.n += 1;
      }
    }
    return buckets;
  };

  const curAgg = useMemo(() => (current ? aggregate([current]) : null), [current, allDayLogs, periodData]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastAgg = useMemo(() => aggregate(last3), [last3, allDayLogs, periodData]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderTable = (title: string, agg: Record<string, Bucket>) => (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{title}</span>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-[11px] font-bold">
          <thead>
            <tr className="text-[var(--muted)]">
              <th className="text-left py-1 pr-2 font-bold">{t.period.phase}</th>
              <th className="text-right py-1 px-1 text-[var(--intake-on-surface)]">{t.period.intake}</th>
              <th className="text-right py-1 px-1 text-[var(--activity-on-surface)]">{t.period.burned}</th>
              <th className="text-right py-1 px-1">{t.period.net}</th>
              <th className="text-right py-1 px-1">C/P/F</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const b = agg[g];
              const enough = b.n >= 3;
              const r = (v: number) => Math.round(v / b.n);
              return (
                <tr key={g} className="border-t border-[var(--border)]">
                  <td className="py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1.5 text-[var(--text)]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: pillMode ? (g === 'active' ? '#E2D6FF' : '#FAE0B4') : PHASE_COLORS[g as CyclePhase] }} />
                      {groupLabel(g)}
                      <span className="text-[var(--muted)]">· {t.period.days.replace('{n}', String(b.n))}</span>
                    </span>
                  </td>
                  {enough ? (
                    <>
                      <td className="text-right px-1 text-[var(--intake-on-surface)]">{r(b.intake)}</td>
                      <td className="text-right px-1 text-[var(--activity-on-surface)]">{r(b.burned)}</td>
                      <td className={`text-right px-1 tabular-nums ${r(b.net) > 0 ? 'text-[var(--intake-on-surface)]' : 'text-[var(--activity-on-surface)]'}`}>
                        {r(b.net) > 0 ? '+' : ''}
                        {r(b.net)}
                      </td>
                      <td className="text-right px-1 text-[var(--muted)]">{r(b.c)}/{r(b.p)}/{r(b.f)}</td>
                    </>
                  ) : (
                    <td colSpan={4} className="text-right px-1 text-[var(--muted)]">{t.period.notEnough}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---- weight by cycle day ----
  const weightCycles = useMemo(() => {
    const cs = cycles.slice(-3);
    return cs.map((c, i) => {
      const pts = cycleDays(c, status.predicted.length, todayStr)
        .map((d) => ({ day: diffDays(c.start, d) + 1, kg: allDayLogs[d]?.weightKg }))
        .filter((p): p is { day: number; kg: number } => typeof p.kg === 'number');
      const meanKg = pts.length ? pts.reduce((a, p) => a + p.kg, 0) / pts.length : 0;
      return { c, pts, meanKg, idx: i };
    });
  }, [cycles, allDayLogs, status.predicted.length, todayStr]);
  const allPts = weightCycles.flatMap((w) => w.pts.map((p) => ({ ...p, v: relative ? p.kg - w.meanKg : p.kg })));
  const hasWeight = allPts.length > 0;
  const maxDay = Math.max(status.predicted.length, ...allPts.map((p) => p.day), 1);
  const vMin = hasWeight ? Math.min(...allPts.map((p) => p.v)) : 0;
  const vMax = hasWeight ? Math.max(...allPts.map((p) => p.v)) : 1;
  const vRange = Math.max(0.5, vMax - vMin);
  const W = 320, H = 120, PAD = 12;
  const x = (day: number) => PAD + ((day - 1) / Math.max(1, maxDay - 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - vMin) / vRange) * (H - 2 * PAD);
  const cycleLines = [
    { color: 'var(--weight-on-surface)', dash: undefined },
    { color: '#8D6ABB', dash: '5 3' },
    { color: '#AF89CE', dash: '2 3' },
  ];
  // phase bands for the typical cycle (menstrual / follicular / ovulation / luteal)
  const avgPeriod = Math.max(1, Math.round(cycles.reduce((a, c) => a + c.periodLength, 0) / Math.max(1, cycles.length)) || settings.periodDuration);
  const ovDay = status.predicted.length - 14;
  const bands: { from: number; to: number; phase: CyclePhase }[] = pillMode
    ? []
    : [
        { from: 1, to: avgPeriod, phase: 'menstrual' },
        { from: avgPeriod + 1, to: Math.max(avgPeriod + 1, ovDay - 2), phase: 'follicular' },
        { from: Math.max(1, ovDay - 1), to: ovDay + 1, phase: 'ovulation' },
        { from: ovDay + 2, to: maxDay, phase: 'luteal' },
      ];

  // ---- symptom comparison ----
  const builtinLabel = (k: string, g: 'mood' | 'symptom') =>
    t.period[`${g === 'mood' ? 'mood' : 'sym'}_${k}` as keyof typeof t.period] as string;
  const tagOptions = [
    ...tagDefs('mood', settings, (k) => builtinLabel(k, 'mood')),
    ...tagDefs('symptom', settings, (k) => builtinLabel(k, 'symptom')),
  ];
  const selectedTag = tagOptions.some((option) => option.id === tag) ? tag : tagOptions[0]?.id ?? '';
  const compare = useMemo(() => {
    let tagged = { sum: 0, n: 0 };
    let other = { sum: 0, n: 0 };
    for (const d of Object.keys(allDayLogs)) {
      const m = dayMetrics(allDayLogs[d]);
      if (!m) continue;
      const l = periodData.logs[d];
      const has = Boolean(l && (l.moods.includes(selectedTag) || l.symptoms.includes(selectedTag)));
      if (has) { tagged.sum += m.intake; tagged.n++; } else { other.sum += m.intake; other.n++; }
    }
    return {
      tagged: tagged.n ? Math.round(tagged.sum / tagged.n) : null,
      taggedN: tagged.n,
      other: other.n ? Math.round(other.sum / other.n) : null,
      otherN: other.n,
    };
  }, [allDayLogs, periodData.logs, selectedTag]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 space-y-4">
      <div>
        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t.period.nutritionTitle}</span>
        <p className="text-[11px] font-medium text-[var(--muted)]">{t.period.nutritionNote}</p>
      </div>
      {pillMode && <p className="text-[11px] font-medium text-[var(--muted)]">{t.period.pillHidesPhase}</p>}

      {curAgg && renderTable(t.period.currentCycle, curAgg)}
      {last3.length > 0 && renderTable(`${t.period.last3} (${last3.length})`, lastAgg)}

      {/* Weight chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t.period.weightByDay}</span>
          <div className="flex p-0.5 bg-[var(--inset)] rounded-full">
            {[false, true].map((v) => (
              <button key={String(v)} type="button" onClick={() => setRelative(v)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${relative === v ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)]'}`}>
                {v ? t.period.relative : t.period.absolute}
              </button>
            ))}
          </div>
        </div>
        {!hasWeight ? (
          <p className="text-xs font-medium text-[var(--muted)]">{t.period.noWeight}</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
              {bands.map((b) => b.to >= b.from && (
                <rect key={b.phase} x={x(b.from) - 2} y={0} width={Math.max(0, x(b.to) - x(b.from) + 4)} height={H} fill={PHASE_COLORS[b.phase]} opacity={0.35} />
              ))}
              {weightCycles.map((w, i) => {
                const pts = w.pts.map((p) => ({ x: x(p.day), y: y(relative ? p.kg - w.meanKg : p.kg) }));
                return (
                  <g key={w.c.start}>
                    {pts.length > 1 && (
                      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={cycleLines[i].color} strokeDasharray={cycleLines[i].dash} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    )}
                    {pts.map((p, j) => <circle key={j} cx={p.x} cy={p.y} r={2.5} fill={cycleLines[i].color} />)}
                  </g>
                );
              })}
            </svg>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-[var(--muted)]">
              {weightCycles.map((w, i) => {
                const first = w.pts[0]?.kg;
                const last = w.pts[w.pts.length - 1]?.kg;
                return (
                  <span key={w.c.start} className="flex items-center gap-1.5">
                    <svg width={16} height={6} aria-hidden="true"><line x1={1} y1={3} x2={15} y2={3} stroke={cycleLines[i].color} strokeDasharray={cycleLines[i].dash} strokeWidth={2} strokeLinecap="round" /></svg>
                    {formatDateDisplay(w.c.start, language)}
                    {first !== undefined && last !== undefined && (
                      <span className="text-[var(--text)]">· {t.period.startVsEnd} {first.toFixed(1)} → {last.toFixed(1)} kg</span>
                    )}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Symptom comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t.period.symptomCompare}</span>
          <select aria-label={t.period.chooseTag} value={selectedTag} disabled={!selectedTag} onChange={(e) => setTag(e.target.value)}
            className="bg-[var(--inset)] border border-[var(--border)] rounded-xl px-2 py-1 text-[11px] font-bold text-[var(--text)] focus:outline-none">
            {!selectedTag && <option value="">{t.period.noTagOptions}</option>}
            {tagOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        {selectedTag && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#F4C6D8] rounded-2xl p-3">
            <span className="block text-[10px] font-bold uppercase text-[#6E2440]">{t.period.taggedDays} · {t.period.days.replace('{n}', String(compare.taggedN))}</span>
            <span className="block text-lg font-extrabold text-[#6E2440]">{compare.taggedN >= 3 && compare.tagged !== null ? `${compare.tagged} kcal` : t.period.notEnough}</span>
          </div>
          <div className="bg-[var(--inset)] rounded-2xl p-3">
            <span className="block text-[10px] font-bold uppercase text-[var(--muted)]">{t.period.otherDays} · {t.period.days.replace('{n}', String(compare.otherN))}</span>
            <span className="block text-lg font-extrabold text-[var(--text)]">{compare.otherN >= 3 && compare.other !== null ? `${compare.other} kcal` : t.period.notEnough}</span>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
