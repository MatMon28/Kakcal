import { useSyncExternalStore } from 'react';
import type {
  FastingConfig,
  FastingData,
  FastingMood,
  FastingNote,
  FastingProtocol,
  FastingSession,
} from '../types/fasting';
import { addDaysToDateString } from './formatters';
import { offerRemovalUndo, restoreAt } from './undoRemoval';

/**
 * Module-level store for Intermittent Fasting (`useSyncExternalStore` + `localStorage`).
 * Follows the same pattern as `advancedStore.ts`. Off by default.
 */

export const FASTING_STORAGE_KEY = 'kcalsync_fasting';

export const FASTING_PROTOCOLS: readonly FastingProtocol[] = ['16:8', '18:6', '20:4', 'omad', 'custom'];

export const PROTOCOL_HOURS: Record<Exclude<FastingProtocol, 'custom'>, { fastingHours: number; eatingHours: number }> = {
  '16:8': { fastingHours: 16, eatingHours: 8 },
  '18:6': { fastingHours: 18, eatingHours: 6 },
  '20:4': { fastingHours: 20, eatingHours: 4 },
  omad: { fastingHours: 23, eatingHours: 1 },
};

export const FASTING_MOODS: readonly FastingMood[] = ['calm', 'focused', 'hungry', 'irritable', 'angry', 'tired'];

const DEFAULT_CONFIG: FastingConfig = {
  enabled: false,
  protocol: '16:8',
  customFastingHours: 16,
  customEatingHours: 8,
};

const DEFAULT_DATA: FastingData = {
  config: DEFAULT_CONFIG,
  activeSession: null,
  sessions: [],
  notes: [],
};

const HOUR_MS = 3_600_000;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isValidIso = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const clampHours = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 10) / 10)) : fallback;
};

const VALID_PROTOCOLS = new Set<string>(FASTING_PROTOCOLS);
const VALID_MOODS = new Set<string>(FASTING_MOODS);

function normalizeConfig(raw: unknown): FastingConfig {
  const src = isObject(raw) ? raw : {};
  const protocol = typeof src.protocol === 'string' && VALID_PROTOCOLS.has(src.protocol)
    ? (src.protocol as FastingProtocol)
    : DEFAULT_CONFIG.protocol;
  return {
    enabled: src.enabled === true,
    protocol,
    customFastingHours: clampHours(src.customFastingHours, 1, 168, DEFAULT_CONFIG.customFastingHours),
    customEatingHours: clampHours(src.customEatingHours, 1, 48, DEFAULT_CONFIG.customEatingHours),
  };
}

function normalizeSession(raw: unknown, allowNullEnd: boolean): FastingSession | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || !raw.id || !isValidIso(raw.startedAt)) return null;
  const endedAt = raw.endedAt === null ? null : isValidIso(raw.endedAt) ? raw.endedAt : null;
  if (!allowNullEnd && endedAt === null) return null;
  const protocol = typeof raw.protocol === 'string' && VALID_PROTOCOLS.has(raw.protocol)
    ? (raw.protocol as FastingProtocol)
    : '16:8';
  const preset = protocol === 'custom' ? { fastingHours: 16, eatingHours: 8 } : PROTOCOL_HOURS[protocol];
  return {
    id: raw.id,
    protocol,
    targetFastingHours: clampHours(raw.targetFastingHours, 1, 168, preset.fastingHours),
    targetEatingHours: clampHours(raw.targetEatingHours, 1, 48, preset.eatingHours),
    startedAt: new Date(raw.startedAt).toISOString(),
    endedAt: endedAt ? new Date(endedAt).toISOString() : null,
  };
}

function normalizeNote(raw: unknown): FastingNote | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || !raw.id || typeof raw.sessionId !== 'string' || !raw.sessionId) return null;
  if (!isValidIso(raw.timestamp)) return null;
  const mood = typeof raw.mood === 'string' && VALID_MOODS.has(raw.mood) ? (raw.mood as FastingMood) : 'calm';
  const hungerRaw = typeof raw.hunger === 'number' ? raw.hunger : Number(raw.hunger);
  const hunger = Number.isFinite(hungerRaw) ? Math.min(5, Math.max(1, Math.round(hungerRaw))) : 3;
  const elapsedRaw = typeof raw.elapsedMs === 'number' ? raw.elapsedMs : 0;
  return {
    id: raw.id,
    sessionId: raw.sessionId,
    timestamp: new Date(raw.timestamp).toISOString(),
    elapsedMs: Number.isFinite(elapsedRaw) && elapsedRaw >= 0 ? elapsedRaw : 0,
    mood,
    hunger,
    text: typeof raw.text === 'string' ? raw.text.slice(0, 1000) : '',
  };
}

export function normalizeFastingData(raw: unknown): FastingData {
  const src = isObject(raw) ? raw : {};
  const config = normalizeConfig(src.config);
  const activeSession = normalizeSession(src.activeSession, true);
  const active = activeSession && activeSession.endedAt === null ? activeSession : null;
  const rawSessions = Array.isArray(src.sessions) ? src.sessions : [];
  const seenSessions = new Set<string>();
  const sessions: FastingSession[] = [];
  for (const item of rawSessions) {
    const s = normalizeSession(item, false);
    if (!s || seenSessions.has(s.id)) continue;
    seenSessions.add(s.id);
    sessions.push(s);
  }
  sessions.sort((a, b) => (a.startedAt > b.startedAt ? -1 : a.startedAt < b.startedAt ? 1 : 0));

  const rawNotes = Array.isArray(src.notes) ? src.notes : [];
  const seenNotes = new Set<string>();
  const notes: FastingNote[] = [];
  for (const item of rawNotes) {
    const n = normalizeNote(item);
    if (!n || seenNotes.has(n.id)) continue;
    seenNotes.add(n.id);
    notes.push(n);
  }
  notes.sort((a, b) => (a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 : 0));

  return { config, activeSession: active, sessions, notes };
}

function read(): FastingData {
  try {
    const saved = localStorage.getItem(FASTING_STORAGE_KEY);
    return normalizeFastingData(saved ? JSON.parse(saved) : null);
  } catch {
    return DEFAULT_DATA;
  }
}

let state: FastingData = typeof localStorage === 'undefined' ? DEFAULT_DATA : read();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

function persist(next: FastingData) {
  try {
    localStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable or full */
  }
}

function commit(next: FastingData) {
  state = next;
  persist(next);
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === FASTING_STORAGE_KEY || event.key === null) {
      state = read();
      emit();
    }
  });
}

export const getFasting = (): FastingData => state;

export function useFasting(): FastingData {
  return useSyncExternalStore(subscribe, () => state, () => DEFAULT_DATA);
}

// ---------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------

export function getProtocolHours(config: Pick<FastingConfig, 'protocol' | 'customFastingHours' | 'customEatingHours'>): {
  fastingHours: number;
  eatingHours: number;
} {
  if (config.protocol === 'custom') {
    return {
      fastingHours: clampHours(config.customFastingHours, 1, 168, 16),
      eatingHours: clampHours(config.customEatingHours, 1, 48, 8),
    };
  }
  return PROTOCOL_HOURS[config.protocol];
}

export function computeFastTiming(session: FastingSession, nowMs = Date.now()) {
  const startMs = Date.parse(session.startedAt);
  const endRefMs = session.endedAt ? Date.parse(session.endedAt) : nowMs;
  const elapsedMs = Math.max(0, endRefMs - startMs);
  const targetMs = Math.max(HOUR_MS, session.targetFastingHours * HOUR_MS);
  const remainingMs = Math.max(0, targetMs - elapsedMs);
  const overtimeMs = Math.max(0, elapsedMs - targetMs);
  const progress = Math.min(1, elapsedMs / targetMs);
  const reached = elapsedMs >= targetMs;
  const projectedEndMs = startMs + targetMs;
  return { elapsedMs, targetMs, remainingMs, overtimeMs, progress, reached, projectedEndMs };
}

export function computeEatingWindow(data: FastingData, nowMs = Date.now()) {
  if (data.activeSession) return null;
  const latest = data.sessions[0];
  if (!latest || !latest.endedAt) return null;
  const startedAtMs = Date.parse(latest.endedAt);
  if (!Number.isFinite(startedAtMs)) return null;
  const eatingHours = latest.targetEatingHours || getProtocolHours(data.config).eatingHours;
  const targetMs = Math.max(HOUR_MS, eatingHours * HOUR_MS);
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  const remainingMs = Math.max(0, targetMs - elapsedMs);
  const progress = Math.min(1, elapsedMs / targetMs);
  const endsAtMs = startedAtMs + targetMs;
  return { startedAtMs, targetMs, elapsedMs, remainingMs, progress, endsAtMs, reached: elapsedMs >= targetMs };
}

export function toLocalDateString(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDurationCompact(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function filterFastingByPeriod(data: FastingData, fromDate: string, toDate: string): {
  sessions: FastingSession[];
  notes: FastingNote[];
} {
  const sessions = data.sessions.filter((s) => {
    const day = toLocalDateString(s.endedAt ?? s.startedAt);
    return day >= fromDate && day <= toDate;
  });
  const notes = data.notes.filter((n) => {
    const day = toLocalDateString(n.timestamp);
    return day >= fromDate && day <= toDate;
  });
  return { sessions, notes };
}

export interface FastingDayBar {
  date: string;
  hours: number;
  fastCount: number;
  onTarget: boolean;
}

export interface HungerHourPoint {
  hour: number;
  avgHunger: number;
  count: number;
}

export function computeFastingStats(
  sessions: FastingSession[],
  notes: FastingNote[],
  fromDate: string,
  toDate: string,
  defaultTargetHours: number,
) {
  const dayDates: string[] = [];
  let cursor = fromDate;
  let guard = 0;
  while (cursor <= toDate && guard < 400) {
    dayDates.push(cursor);
    cursor = addDaysToDateString(cursor, 1);
    guard++;
  }

  let totalMs = 0;
  let completedCount = 0;
  const byDay = new Map<string, { ms: number; count: number; targetMs: number }>();

  for (const s of sessions) {
    if (!s.endedAt) continue;
    const timing = computeFastTiming(s);
    totalMs += timing.elapsedMs;
    if (timing.reached) completedCount++;
    const day = toLocalDateString(s.endedAt);
    const prev = byDay.get(day) ?? { ms: 0, count: 0, targetMs: s.targetFastingHours * HOUR_MS };
    byDay.set(day, {
      ms: prev.ms + timing.elapsedMs,
      count: prev.count + 1,
      targetMs: Math.max(prev.targetMs, s.targetFastingHours * HOUR_MS),
    });
  }

  const totalCount = sessions.length;
  const avgDurationMs = totalCount > 0 ? totalMs / totalCount : 0;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalHours = Math.round((totalMs / HOUR_MS) * 10) / 10;
  const daysLogged = byDay.size;

  // Current streak inside the period ending at `toDate` (or yesterday if today has no logged fast yet).
  let currentStreak = 0;
  let streakDay = byDay.has(toDate) ? toDate : addDaysToDateString(toDate, -1);
  while (streakDay >= fromDate && byDay.has(streakDay)) {
    currentStreak++;
    streakDay = addDaysToDateString(streakDay, -1);
  }

  const dailyBars: FastingDayBar[] = dayDates.map((date) => {
    const entry = byDay.get(date);
    const hours = entry ? Math.round((entry.ms / HOUR_MS) * 10) / 10 : 0;
    const target = entry ? entry.targetMs / HOUR_MS : defaultTargetHours;
    return {
      date,
      hours,
      fastCount: entry?.count ?? 0,
      onTarget: Boolean(entry && hours >= target),
    };
  });

  // Group notes by elapsed fasting hour
  const hungerBuckets = new Map<number, { sum: number; count: number }>();
  for (const n of notes) {
    const hr = Math.max(0, Math.floor(n.elapsedMs / HOUR_MS));
    const prev = hungerBuckets.get(hr) ?? { sum: 0, count: 0 };
    hungerBuckets.set(hr, { sum: prev.sum + n.hunger, count: prev.count + 1 });
  }
  const hungerByHour: HungerHourPoint[] = Array.from(hungerBuckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, { sum, count }]) => ({
      hour,
      avgHunger: Math.round((sum / count) * 10) / 10,
      count,
    }));

  let peakHungerHour: { hour: number; avgHunger: number } | null = null;
  for (const pt of hungerByHour) {
    if (!peakHungerHour || pt.avgHunger > peakHungerHour.avgHunger) {
      peakHungerHour = { hour: pt.hour, avgHunger: pt.avgHunger };
    }
  }

  return {
    daysInPeriod: dayDates.length,
    daysLogged,
    avgDurationMs,
    completedCount,
    totalCount,
    completionRate,
    currentStreak,
    totalHours,
    peakHungerHour,
    dailyBars,
    hungerByHour,
  };
}

// ---------------------------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------------------------

export function setFastingEnabled(enabled: boolean) {
  commit({ ...state, config: { ...state.config, enabled } });
}

export function setFastingProtocol(
  protocol: FastingProtocol,
  customFastingHours?: number,
  customEatingHours?: number,
) {
  const nextConfig: FastingConfig = {
    ...state.config,
    protocol,
    customFastingHours: customFastingHours !== undefined
      ? clampHours(customFastingHours, 1, 168, state.config.customFastingHours)
      : state.config.customFastingHours,
    customEatingHours: customEatingHours !== undefined
      ? clampHours(customEatingHours, 1, 48, state.config.customEatingHours)
      : state.config.customEatingHours,
  };
  const hours = getProtocolHours(nextConfig);
  const activeSession = state.activeSession
    ? {
        ...state.activeSession,
        protocol,
        targetFastingHours: hours.fastingHours,
        targetEatingHours: hours.eatingHours,
      }
    : null;
  commit({ ...state, config: nextConfig, activeSession });
}

export function startFast(startedAtIso = new Date().toISOString()): FastingSession {
  const hours = getProtocolHours(state.config);
  const session: FastingSession = {
    id: `fast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    protocol: state.config.protocol,
    targetFastingHours: hours.fastingHours,
    targetEatingHours: hours.eatingHours,
    startedAt: new Date(startedAtIso).toISOString(),
    endedAt: null,
  };
  commit({ ...state, activeSession: session });
  return session;
}

export function endFast(endedAtIso = new Date().toISOString()): FastingSession | null {
  const active = state.activeSession;
  if (!active) return null;
  const endMs = Math.max(Date.parse(active.startedAt), Date.parse(endedAtIso));
  const completed: FastingSession = {
    ...active,
    endedAt: new Date(endMs).toISOString(),
  };
  const sessions = [completed, ...state.sessions].sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1));
  commit({ ...state, activeSession: null, sessions });
  return completed;
}

function recomputeSessionNoteElapsed(notes: FastingNote[], sessionId: string, startedAtIso: string): FastingNote[] {
  const startMs = Date.parse(startedAtIso);
  return notes.map((n) =>
    n.sessionId === sessionId
      ? { ...n, elapsedMs: Math.max(0, Date.parse(n.timestamp) - startMs) }
      : n,
  );
}

export function updateActiveFast(patch: {
  startedAt?: string;
  protocol?: FastingProtocol;
  targetFastingHours?: number;
  targetEatingHours?: number;
}) {
  const active = state.activeSession;
  if (!active) return;
  const startedAt = patch.startedAt && isValidIso(patch.startedAt)
    ? new Date(patch.startedAt).toISOString()
    : active.startedAt;
  const nextActive: FastingSession = {
    ...active,
    startedAt,
    protocol: patch.protocol ?? active.protocol,
    targetFastingHours: patch.targetFastingHours !== undefined
      ? clampHours(patch.targetFastingHours, 1, 168, active.targetFastingHours)
      : active.targetFastingHours,
    targetEatingHours: patch.targetEatingHours !== undefined
      ? clampHours(patch.targetEatingHours, 1, 48, active.targetEatingHours)
      : active.targetEatingHours,
  };
  const notes = patch.startedAt ? recomputeSessionNoteElapsed(state.notes, active.id, startedAt) : state.notes;
  commit({ ...state, activeSession: nextActive, notes });
}

export function addFastingNote(input: {
  sessionId: string;
  mood: FastingMood;
  hunger: number;
  text: string;
  timestamp?: string;
}): FastingNote | null {
  const session = state.activeSession?.id === input.sessionId
    ? state.activeSession
    : state.sessions.find((s) => s.id === input.sessionId);
  if (!session) return null;
  const ts = input.timestamp && isValidIso(input.timestamp) ? new Date(input.timestamp).toISOString() : new Date().toISOString();
  const elapsedMs = Math.max(0, Date.parse(ts) - Date.parse(session.startedAt));
  const note: FastingNote = {
    id: `fnote-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId: session.id,
    timestamp: ts,
    elapsedMs,
    mood: input.mood,
    hunger: Math.min(5, Math.max(1, Math.round(input.hunger))),
    text: input.text.trim().slice(0, 1000),
  };
  const notes = [note, ...state.notes].sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
  commit({ ...state, notes });
  return note;
}

export function updateFastingNote(
  id: string,
  patch: { mood?: FastingMood; hunger?: number; text?: string; timestamp?: string },
) {
  const idx = state.notes.findIndex((n) => n.id === id);
  if (idx < 0) return;
  const existing = state.notes[idx];
  const session = state.activeSession?.id === existing.sessionId
    ? state.activeSession
    : state.sessions.find((s) => s.id === existing.sessionId);
  const ts = patch.timestamp && isValidIso(patch.timestamp)
    ? new Date(patch.timestamp).toISOString()
    : existing.timestamp;
  const elapsedMs = session ? Math.max(0, Date.parse(ts) - Date.parse(session.startedAt)) : existing.elapsedMs;
  const updated: FastingNote = {
    ...existing,
    mood: patch.mood ?? existing.mood,
    hunger: patch.hunger !== undefined ? Math.min(5, Math.max(1, Math.round(patch.hunger))) : existing.hunger,
    text: patch.text !== undefined ? patch.text.trim().slice(0, 1000) : existing.text,
    timestamp: ts,
    elapsedMs,
  };
  const notes = state.notes.map((n) => (n.id === id ? updated : n)).sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
  commit({ ...state, notes });
}

export function removeFastingNote(id: string) {
  const index = state.notes.findIndex((n) => n.id === id);
  const removed = state.notes[index];
  if (!removed) return;
  commit({ ...state, notes: state.notes.filter((n) => n.id !== id) });
  offerRemovalUndo(() => {
    if (state.notes.some((n) => n.id === removed.id)) return;
    commit({ ...state, notes: restoreAt(state.notes, removed, index, (a, b) => a.id === b.id) });
  });
}

export function updatePastSession(
  id: string,
  patch: {
    startedAt?: string;
    endedAt?: string;
    protocol?: FastingProtocol;
    targetFastingHours?: number;
    targetEatingHours?: number;
  },
) {
  const existing = state.sessions.find((s) => s.id === id);
  if (!existing) return;
  const startedAt = patch.startedAt && isValidIso(patch.startedAt)
    ? new Date(patch.startedAt).toISOString()
    : existing.startedAt;
  const rawEnd = patch.endedAt && isValidIso(patch.endedAt)
    ? new Date(patch.endedAt).toISOString()
    : existing.endedAt;
  const endMs = rawEnd ? Math.max(Date.parse(startedAt), Date.parse(rawEnd)) : Date.parse(startedAt);
  const endedAt = new Date(endMs).toISOString();

  const updated: FastingSession = {
    ...existing,
    startedAt,
    endedAt,
    protocol: patch.protocol ?? existing.protocol,
    targetFastingHours: patch.targetFastingHours !== undefined
      ? clampHours(patch.targetFastingHours, 1, 168, existing.targetFastingHours)
      : existing.targetFastingHours,
    targetEatingHours: patch.targetEatingHours !== undefined
      ? clampHours(patch.targetEatingHours, 1, 48, existing.targetEatingHours)
      : existing.targetEatingHours,
  };
  const sessions = state.sessions
    .map((s) => (s.id === id ? updated : s))
    .sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1));
  const notes = patch.startedAt ? recomputeSessionNoteElapsed(state.notes, id, startedAt) : state.notes;
  commit({ ...state, sessions, notes });
}

export function removePastSession(id: string) {
  const index = state.sessions.findIndex((s) => s.id === id);
  const removed = state.sessions[index];
  if (!removed) return;
  const removedNotes = state.notes.filter((n) => n.sessionId === id);
  commit({
    ...state,
    sessions: state.sessions.filter((s) => s.id !== id),
    notes: state.notes.filter((n) => n.sessionId !== id),
  });
  offerRemovalUndo(() => {
    if (state.sessions.some((s) => s.id === removed.id)) return;
    const restoredSessions = restoreAt(state.sessions, removed, index, (a, b) => a.id === b.id);
    const existingNoteIds = new Set(state.notes.map((n) => n.id));
    const notesToRestore = removedNotes.filter((n) => !existingNoteIds.has(n.id));
    const restoredNotes = [...state.notes, ...notesToRestore].sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
    commit({ ...state, sessions: restoredSessions, notes: restoredNotes });
  });
}

// ---------------------------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------------------------

export function exportFasting(): FastingData {
  return state;
}

/** Restores fasting data from a backup. Missing data (older backups) leaves current data untouched. */
export function importFasting(raw: unknown) {
  if (raw === undefined || !isObject(raw)) return;
  commit(normalizeFastingData(raw));
}
