import { CyclePhase, PeriodData, PeriodDayLog, PeriodSettings } from '../types';
import { addDaysToDateString, diffDays, getTodayDateString } from './formatters';

/** A period start is a marked day with no marked day in the previous N days. */
export const PERIOD_START_GAP_DAYS = 3;
/** Luteal phase length used for the ovulation estimate (next period − 14). */
export const LUTEAL_DAYS = 14;
/** Gentle-flag thresholds (verify against a current clinical source before shipping). */
export const FLAG_SHORT_CYCLE = 21;
export const FLAG_LONG_CYCLE = 35;
export const FLAG_LONG_BLEED = 7;

export const BUILTIN_MOODS = ['happy', 'calm', 'tired', 'irritable', 'anxious'] as const;
export const BUILTIN_SYMPTOMS = ['cramps', 'bloating', 'headache', 'fatigue', 'cravings'] as const;
export const moodId = (k: string) => `mood.${k}`;
export const symId = (k: string) => `sym.${k}`;

type Logs = PeriodData['logs'];

export function emptyDayLog(): PeriodDayLog {
  return { isPeriod: false, flow: 'none', moods: [], symptoms: [], updatedAt: new Date().toISOString() };
}

// ---------- period runs & starts ----------
export function getPeriodStarts(logs: Logs): string[] {
  const days = Object.keys(logs).filter((d) => logs[d]?.isPeriod).sort();
  const set = new Set(days);
  return days.filter((d) => {
    for (let i = 1; i <= PERIOD_START_GAP_DAYS; i++) {
      if (set.has(addDaysToDateString(d, -i))) return false;
    }
    return true;
  });
}

/** Last marked day of the run that starts at `start` (gaps ≤ GAP days keep the run going). */
export function getPeriodRunEnd(logs: Logs, start: string): string {
  let cur = start;
  for (;;) {
    let next: string | null = null;
    for (let i = 1; i <= PERIOD_START_GAP_DAYS; i++) {
      const d = addDaysToDateString(cur, i);
      if (logs[d]?.isPeriod) {
        next = d;
        break;
      }
    }
    if (!next) return cur;
    cur = next;
  }
}

export function getLastPeriodStart(logs: Logs): string | null {
  const s = getPeriodStarts(logs);
  return s.length ? s[s.length - 1] : null;
}

// ---------- cycles (derived, never stored) ----------
export interface CycleInfo {
  start: string;
  nextStart: string | null;
  length: number | null; // null = ongoing
  periodEnd: string;
  periodLength: number;
}

export function deriveCycles(logs: Logs): CycleInfo[] {
  const starts = getPeriodStarts(logs);
  return starts.map((start, i) => {
    const nextStart = i + 1 < starts.length ? starts[i + 1] : null;
    const periodEnd = getPeriodRunEnd(logs, start);
    return {
      start,
      nextStart,
      length: nextStart ? diffDays(start, nextStart) : null,
      periodEnd,
      periodLength: diffDays(start, periodEnd) + 1,
    };
  });
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const stdev = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) ** 2)));
};

export interface PredictedLength {
  length: number;
  range: [number, number] | null;
  fromHistory: boolean;
}

/** Mean of the last 3–6 completed cycles if ≥3 exist, otherwise the setting. */
export function predictedCycleLength(cycles: CycleInfo[], settings: PeriodSettings): PredictedLength {
  const completed = cycles.map((c) => c.length).filter((l): l is number => l !== null).slice(-6);
  if (completed.length >= 3) {
    const m = mean(completed);
    const sd = stdev(completed);
    return {
      length: Math.round(m),
      range: sd >= 2 ? [Math.round(m - sd), Math.round(m + sd)] : null,
      fromHistory: true,
    };
  }
  return { length: settings.cycleLength, range: null, fromHistory: false };
}

export interface CycleStats {
  n: number;
  avgCycle: number;
  avgPeriod: number;
  shortest: number;
  longest: number;
  sd: number;
}

export function cycleStats(cycles: CycleInfo[], allTime: boolean): CycleStats | null {
  const completed = cycles.filter((c) => c.length !== null);
  const used = allTime ? completed : completed.slice(-6);
  if (cycles.length < 2 || used.length === 0) return null;
  const lens = used.map((c) => c.length as number);
  return {
    n: used.length,
    avgCycle: Math.round(mean(lens) * 10) / 10,
    avgPeriod: Math.round(mean(used.map((c) => c.periodLength)) * 10) / 10,
    shortest: Math.min(...lens),
    longest: Math.max(...lens),
    sd: Math.round(stdev(lens) * 10) / 10,
  };
}

// ---------- pill pack ----------
export function packDay(settings: PeriodSettings, date: string): number | null {
  if (!settings.trackPill || !settings.packStart || settings.packLength < 1) return null;
  const d = diffDays(settings.packStart, date);
  if (d < 0) return null;
  return (d % settings.packLength) + 1;
}

export function isInactivePackDay(settings: PeriodSettings, date: string): boolean {
  const pd = packDay(settings, date);
  if (pd === null) return false;
  return pd > settings.packLength - settings.inactiveDays;
}

/** First inactive day of the current (or next) pack. null for continuous use or no pack start. */
export function expectedWithdrawalBleed(settings: PeriodSettings, today: string): string | null {
  if (!settings.trackPill || !settings.packStart || settings.inactiveDays <= 0) return null;
  const d = diffDays(settings.packStart, today);
  const k = d < 0 ? 0 : Math.floor(d / settings.packLength);
  const firstInactive = addDaysToDateString(
    settings.packStart,
    k * settings.packLength + (settings.packLength - settings.inactiveDays)
  );
  if (firstInactive >= today) return firstInactive;
  return addDaysToDateString(firstInactive, settings.packLength);
}

export type PillMarker = 'taken' | 'missed' | 'break' | 'due' | 'future' | 'none';

export function pillMarkerFor(settings: PeriodSettings, logs: Logs, date: string, today: string): PillMarker {
  if (!settings.trackPill || !settings.packStart) return 'none';
  if (date < settings.packStart) return 'none';
  if (settings.pillTrackingSince && date < settings.pillTrackingSince) return 'none';
  const taken = Boolean(logs[date]?.pillTaken);
  if (isInactivePackDay(settings, date)) return taken ? 'taken' : 'break';
  if (taken) return 'taken';
  if (date > today) return 'future';
  if (date === today) return 'due';
  return 'missed';
}

// ---------- status ----------
export interface PeriodStatus {
  hasData: boolean;
  lastStart: string | null;
  cycleDay: number | null;
  phase: CyclePhase | null;
  nextPeriod: string | null;
  nextPeriodRange: [string, string] | null;
  ovulation: string | null;
  daysUntilNext: number | null;
  daysLate: number;
  predicted: PredictedLength;
  cycles: CycleInfo[];
}

export function getPeriodStatus(data: PeriodData, today: string = getTodayDateString()): PeriodStatus {
  const cycles = deriveCycles(data.logs);
  const predicted = predictedCycleLength(cycles, data.settings);
  const lastStart = cycles.length ? cycles[cycles.length - 1].start : null;
  if (!lastStart) {
    return {
      hasData: false, lastStart: null, cycleDay: null, phase: null, nextPeriod: null,
      nextPeriodRange: null, ovulation: null, daysUntilNext: null, daysLate: 0, predicted, cycles,
    };
  }
  const since = Math.max(0, diffDays(lastStart, today));
  const cycleDay = since + 1;
  const nextPeriod = addDaysToDateString(lastStart, predicted.length);
  const nextPeriodRange: [string, string] | null = predicted.range
    ? [addDaysToDateString(lastStart, predicted.range[0]), addDaysToDateString(lastStart, predicted.range[1])]
    : null;
  const ovulation = addDaysToDateString(nextPeriod, -LUTEAL_DAYS);
  const until = diffDays(today, nextPeriod);
  const daysLate = until < 0 ? -until : 0;

  let phase: CyclePhase;
  if (data.logs[today]?.isPeriod) phase = 'menstrual';
  else {
    const dOv = diffDays(ovulation, today);
    if (Math.abs(dOv) <= 1) phase = 'ovulation';
    else if (dOv < -1) phase = 'follicular';
    else phase = 'luteal';
  }
  return {
    hasData: true, lastStart, cycleDay, phase, nextPeriod, nextPeriodRange, ovulation,
    daysUntilNext: Math.max(0, until), daysLate, predicted, cycles,
  };
}

/** Phase of any date, using the cycle that contains it (for history/nutrition). */
export function phaseOfDate(data: PeriodData, date: string, status?: PeriodStatus): CyclePhase | null {
  const st = status || getPeriodStatus(data);
  const cycles = st.cycles;
  let cycle: CycleInfo | null = null;
  for (const c of cycles) if (c.start <= date) cycle = c;
  if (!cycle) return null;
  if (data.logs[date]?.isPeriod) return 'menstrual';
  const end = cycle.nextStart || addDaysToDateString(cycle.start, st.predicted.length);
  if (date >= end) return null;
  const ov = addDaysToDateString(end, -LUTEAL_DAYS);
  const dOv = diffDays(ov, date);
  if (Math.abs(dOv) <= 1) return 'ovulation';
  if (dOv < -1) return 'follicular';
  return 'luteal';
}

/** Days of a cycle (start .. end-1 or today for ongoing). */
export function cycleDays(c: CycleInfo, predictedLength: number, today: string): string[] {
  const end = c.nextStart || addDaysToDateString(c.start, predictedLength);
  const last = c.nextStart ? addDaysToDateString(end, -1) : today < end ? today : addDaysToDateString(end, -1);
  const out: string[] = [];
  let d = c.start;
  let guard = 0;
  while (d <= last && guard < 400) {
    out.push(d);
    d = addDaysToDateString(d, 1);
    guard++;
  }
  return out;
}

// ---------- tags ----------
export interface TagDef {
  id: string;
  label: string;
  builtin: boolean;
  hidden: boolean;
}

export function tagDefs(
  group: 'mood' | 'symptom',
  settings: PeriodSettings,
  builtinLabel: (key: string) => string
): TagDef[] {
  const builtins = (group === 'mood' ? BUILTIN_MOODS : BUILTIN_SYMPTOMS).map((k) => {
    const id = group === 'mood' ? moodId(k) : symId(k);
    return { id, label: builtinLabel(k), builtin: true, hidden: settings.hiddenBuiltins.includes(id) };
  });
  const customs = (group === 'mood' ? settings.customMoods : settings.customSymptoms).map((c) => ({
    id: c.id,
    label: c.label,
    builtin: false,
    hidden: false,
  }));
  return [...builtins, ...customs];
}

/** Label for any stored tag id (deleted custom tags fall back to their stored label if given). */
export function tagLabel(
  id: string,
  settings: PeriodSettings,
  builtinLabel: (group: 'mood' | 'symptom', key: string) => string
): string {
  if (id.startsWith('mood.')) return builtinLabel('mood', id.slice(5));
  if (id.startsWith('sym.')) return builtinLabel('symptom', id.slice(4));
  const c = [...settings.customMoods, ...settings.customSymptoms].find((x) => x.id === id);
  return c ? c.label : id;
}
