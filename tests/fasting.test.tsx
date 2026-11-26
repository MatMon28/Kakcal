import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp } from '../src/context/AppContext';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { resetBootForTests } from '../src/storage/boot';
import { flushWrites } from '../src/storage/writeQueue';
import {
  addFastingNote,
  computeEatingWindow,
  computeFastingStats,
  computeFastTiming,
  endFast,
  exportFasting,
  filterFastingByPeriod,
  getFasting,
  importFasting,
  setFastingEnabled,
  setFastingProtocol,
  startFast,
  updateFastingNote,
  updatePastSession,
} from '../src/utils/fastingStore';

const wrapper = ({ children }: { children: ReactNode }) => <StrictMode><AppProvider>{children}</AppProvider></StrictMode>;

const resetFasting = async () => {
  await deleteDatabase();
  resetDbForTests();
  resetBootForTests();
  localStorage.clear();
  importFasting({
    config: { enabled: false, protocol: '16:8', customFastingHours: 16, customEatingHours: 8 },
    activeSession: null,
    sessions: [],
    notes: [],
  });
};

beforeEach(resetFasting);
afterEach(async () => {
  cleanup();
  await flushWrites();
});

describe('Intermittent Fasting store & logic', () => {
  it('starts and ends a fast, computing elapsed/remaining time and eating window', () => {
    setFastingEnabled(true);
    const startIso = '2026-11-20T20:00:00.000Z';
    const session = startFast(startIso);
    expect(getFasting().activeSession?.id).toBe(session.id);

    const midMs = Date.parse('2026-11-21T04:00:00.000Z'); // 8h elapsed
    const timing = computeFastTiming(session, midMs);
    expect(timing.elapsedMs).toBe(8 * 3_600_000);
    expect(timing.remainingMs).toBe(8 * 3_600_000);
    expect(timing.progress).toBeCloseTo(0.5, 5);
    expect(timing.reached).toBe(false);

    const endIso = '2026-11-21T12:30:00.000Z'; // 16.5h fast
    const ended = endFast(endIso);
    expect(ended?.endedAt).toBe(endIso);
    expect(getFasting().activeSession).toBeNull();
    expect(getFasting().sessions).toHaveLength(1);

    // Eating window starts when fast ended (8h target)
    const ew = computeEatingWindow(getFasting(), Date.parse('2026-11-21T16:30:00.000Z'));
    expect(ew).not.toBeNull();
    expect(ew!.elapsedMs).toBe(4 * 3_600_000);
    expect(ew!.remainingMs).toBe(4 * 3_600_000);
    expect(ew!.progress).toBeCloseTo(0.5, 5);
  });

  it('supports custom fasting and eating window durations', () => {
    setFastingEnabled(true);
    setFastingProtocol('custom', 19, 5);
    const session = startFast('2026-11-20T18:00:00.000Z');
    expect(session.protocol).toBe('custom');
    expect(session.targetFastingHours).toBe(19);
    expect(session.targetEatingHours).toBe(5);

    const ended = endFast('2026-11-21T13:00:00.000Z');
    expect(ended?.targetEatingHours).toBe(5);

    const ew = computeEatingWindow(getFasting(), Date.parse('2026-11-21T15:30:00.000Z'));
    expect(ew?.targetMs).toBe(5 * 3_600_000);
    expect(ew?.progress).toBeCloseTo(0.5, 5);
  });

  it('filters sessions, notes, and stats by selected period', () => {
    setFastingEnabled(true);
    setFastingProtocol('16:8');

    const s1 = startFast('2026-11-01T20:00:00.000Z');
    addFastingNote({ sessionId: s1.id, mood: 'hungry', hunger: 4, text: 'Old note', timestamp: '2026-11-02T08:00:00.000Z' });
    endFast('2026-11-02T12:00:00.000Z');

    const s2 = startFast('2026-11-20T20:00:00.000Z');
    addFastingNote({ sessionId: s2.id, mood: 'focused', hunger: 2, text: 'Recent note', timestamp: '2026-11-21T06:00:00.000Z' });
    endFast('2026-11-21T12:00:00.000Z');

    const filtered = filterFastingByPeriod(getFasting(), '2026-11-18', '2026-11-22');
    expect(filtered.sessions).toHaveLength(1);
    expect(filtered.sessions[0].id).toBe(s2.id);
    expect(filtered.notes).toHaveLength(1);
    expect(filtered.notes[0].text).toBe('Recent note');

    const stats = computeFastingStats(filtered.sessions, filtered.notes, '2026-11-18', '2026-11-22', 16);
    expect(stats.totalCount).toBe(1);
    expect(stats.completedCount).toBe(1);
    expect(stats.completionRate).toBe(100);
    expect(stats.totalHours).toBe(16);
    expect(stats.hungerByHour).toEqual([{ hour: 10, avgHunger: 2, count: 1 }]);
  });

  it('edits notes and past sessions and recomputes note elapsed time', () => {
    setFastingEnabled(true);
    const s = startFast('2026-11-20T20:00:00.000Z');
    const note = addFastingNote({
      sessionId: s.id,
      mood: 'calm',
      hunger: 1,
      text: 'Initial',
      timestamp: '2026-11-21T02:00:00.000Z',
    })!;
    expect(note.elapsedMs).toBe(6 * 3_600_000);

    updateFastingNote(note.id, { mood: 'angry', hunger: 5, text: 'Edited note' });
    const updatedNote = getFasting().notes.find((n) => n.id === note.id)!;
    expect(updatedNote.mood).toBe('angry');
    expect(updatedNote.hunger).toBe(5);
    expect(updatedNote.text).toBe('Edited note');

    endFast('2026-11-21T12:00:00.000Z');
    // Move session start 2 hours earlier -> note elapsedMs should increase from 6h to 8h
    updatePastSession(s.id, {
      startedAt: '2026-11-20T18:00:00.000Z',
      endedAt: '2026-11-21T13:00:00.000Z',
      protocol: '18:6',
      targetFastingHours: 18,
      targetEatingHours: 6,
    });
    const updatedSession = getFasting().sessions.find((x) => x.id === s.id)!;
    expect(updatedSession.protocol).toBe('18:6');
    expect(getFasting().notes.find((n) => n.id === note.id)!.elapsedMs).toBe(8 * 3_600_000);
  });

  it('round-trips fasting data in JSON backup and keeps old backups backwards-compatible', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    setFastingEnabled(true);
    setFastingProtocol('custom', 17, 7);
    const s = startFast('2026-11-20T20:00:00.000Z');
    addFastingNote({ sessionId: s.id, mood: 'focused', hunger: 2, text: 'Great focus' });

    const json = await result.current.exportDataJson();
    const parsed = JSON.parse(json);
    expect(parsed.fasting).toBeDefined();
    expect(parsed.fasting.config.enabled).toBe(true);
    expect(parsed.fasting.activeSession.targetFastingHours).toBe(17);

    // Clear and restore from v2 backup
    await resetFasting();
    expect(getFasting().config.enabled).toBe(false);
    let ok = false;
    await act(async () => {
      ok = await result.current.importDataJson(json);
    });
    expect(ok).toBe(true);
    expect(getFasting().config.enabled).toBe(true);
    expect(getFasting().activeSession?.id).toBe(s.id);
    expect(getFasting().notes).toHaveLength(1);

    // Backwards compatibility: importing an older backup without `fasting` leaves current fasting data intact
    const legacyBackup = { ...parsed };
    delete legacyBackup.fasting;
    await act(async () => {
      ok = await result.current.importDataJson(JSON.stringify(legacyBackup));
    });
    expect(ok).toBe(true);
    expect(getFasting().config.enabled).toBe(true);
    expect(getFasting().activeSession?.id).toBe(s.id);
    expect(exportFasting().notes).toHaveLength(1);
  });
});
