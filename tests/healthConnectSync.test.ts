import { describe, expect, it } from 'vitest';
import type { DayLog, UserProfile } from '../src/types';
import {
  createEmptyDayLog,
  getHealthConnectWindowDates,
  mergeHealthConnectData,
} from '../src/utils/healthConnectSync';

const profile: UserProfile = {
  weightKg: 70,
  heightCm: 175,
  age: 30,
  sex: 'male',
  targetIntakeKcal: 2200,
};

describe('healthConnectSync', () => {
  it('computes a rolling 7-day window ending on today', () => {
    const window = getHealthConnectWindowDates(new Date(2026, 10, 28, 12, 0, 0));
    expect(window).toHaveLength(7);
    expect(window[0]).toBe('2026-11-22');
    expect(window[6]).toBe('2026-11-28');
  });

  it('filters out entries outside the 7-day window', () => {
    const windowDates = getHealthConnectWindowDates(new Date(2026, 10, 28, 12, 0, 0));
    const res = mergeHealthConnectData({
      dayLogs: {},
      data: {
        workouts: [
          {
            externalId: 'old-w1',
            date: '2026-11-20',
            timestamp: '2026-11-20T08:00:00Z',
            exerciseType: 56,
            durationMin: 30,
            caloriesBurned: 300,
            startEpochMs: 1,
            endEpochMs: 2,
          },
          {
            externalId: 'in-w1',
            date: '2026-11-27',
            timestamp: '2026-11-27T08:00:00Z',
            exerciseType: 56,
            durationMin: 30,
            caloriesBurned: 320,
            startEpochMs: 3,
            endEpochMs: 4,
          },
        ],
        daily: [],
      },
      userProfile: profile,
      windowDates,
    });

    expect(res.changedDates).toEqual(['2026-11-27']);
    expect(res.addedCount).toBe(1);
    expect(res.updatedDays['2026-11-20']).toBeUndefined();
    expect(res.updatedDays['2026-11-27'].activities).toHaveLength(1);
    expect(res.updatedDays['2026-11-27'].activities[0].type).toBe('running');
  });

  it('aggregates activities of the same type into one line and updates in-place during the day', () => {
    const windowDates = ['2026-11-28'];
    const first = mergeHealthConnectData({
      dayLogs: {},
      data: {
        workouts: [
          {
            externalId: 'run-1',
            date: '2026-11-28',
            timestamp: '2026-11-28T07:00:00Z',
            exerciseType: 56,
            durationMin: 20,
            distanceKm: 3.1,
            caloriesBurned: 220,
            startEpochMs: 1,
            endEpochMs: 2,
          },
          {
            externalId: 'run-2',
            date: '2026-11-28',
            timestamp: '2026-11-28T18:00:00Z',
            exerciseType: 57, // treadmill run -> also maps to 'running'
            durationMin: 15,
            distanceKm: 2.4,
            caloriesBurned: 180,
            startEpochMs: 3,
            endEpochMs: 4,
          },
        ],
        daily: [
          {
            externalId: 'hc-daily:2026-11-28',
            date: '2026-11-28',
            steps: 3000,
            distanceKm: 2.1,
            caloriesBurned: 95,
          },
        ],
      },
      userProfile: profile,
      windowDates,
    });

    const day1 = first.updatedDays['2026-11-28'];
    expect(day1.activities).toHaveLength(2);
    const run1 = day1.activities.find((a) => a.type === 'running')!;
    expect(run1.distanceKm).toBe(5.5);
    expect(run1.durationMin).toBe(35);
    expect(run1.caloriesBurned).toBe(400);

    // Later in the day, walking increases: updates existing line in-place, never adds a new one
    const second = mergeHealthConnectData({
      dayLogs: { '2026-11-28': day1 },
      data: {
        workouts: [
          {
            externalId: 'run-1',
            date: '2026-11-28',
            timestamp: '2026-11-28T07:00:00Z',
            exerciseType: 56,
            durationMin: 20,
            distanceKm: 3.1,
            caloriesBurned: 220,
            startEpochMs: 1,
            endEpochMs: 2,
          },
          {
            externalId: 'run-2',
            date: '2026-11-28',
            timestamp: '2026-11-28T18:00:00Z',
            exerciseType: 57,
            durationMin: 15,
            distanceKm: 2.4,
            caloriesBurned: 180,
            startEpochMs: 3,
            endEpochMs: 4,
          },
        ],
        daily: [
          {
            externalId: 'hc-daily:2026-11-28',
            date: '2026-11-28',
            steps: 4400,
            distanceKm: 3.31,
            caloriesBurned: 150,
          },
        ],
      },
      userProfile: profile,
      windowDates,
    });

    expect(second.addedCount).toBe(0);
    expect(second.updatedCount).toBe(1);
    expect(second.updatedDays['2026-11-28'].activities).toHaveLength(2);
    const walk2 = second.updatedDays['2026-11-28'].activities.find((a) => a.type === 'walking')!;
    expect(walk2.steps).toBe(4400);
    expect(walk2.distanceKm).toBe(3.31);
    expect(walk2.caloriesBurned).toBe(150);
  });

  it('prunes legacy stale unedited Health Connect entries when switching to grouped lines', () => {
    const windowDates = ['2026-11-28'];
    const day: DayLog = {
      ...createEmptyDayLog('2026-11-28'),
      activities: [
        {
          id: 'manual-1',
          type: 'walking',
          method: 'distance',
          distanceKm: 1.0,
          caloriesBurned: 50,
          timestamp: '2026-11-28T06:00:00Z',
        },
        {
          id: 'hc-old-session-1',
          type: 'walking',
          method: 'distance',
          distanceKm: 3.31,
          caloriesBurned: 140,
          timestamp: '2026-11-28T09:00:00Z',
          source: 'health_connect',
          externalId: 'old-session-1',
        },
        {
          id: 'hc-old-session-2',
          type: 'walking',
          method: 'distance',
          distanceKm: 3.31,
          caloriesBurned: 140,
          timestamp: '2026-11-28T10:00:00Z',
          source: 'health_connect',
          externalId: 'old-session-2',
        },
      ],
    };

    const res = mergeHealthConnectData({
      dayLogs: { '2026-11-28': day },
      data: {
        workouts: [],
        daily: [
          {
            externalId: 'hc-daily:2026-11-28',
            date: '2026-11-28',
            steps: 4400,
            distanceKm: 3.31,
            caloriesBurned: 150,
          },
        ],
      },
      userProfile: profile,
      windowDates,
    });

    const acts = res.updatedDays['2026-11-28'].activities;
    expect(acts).toHaveLength(2); // manual-1 preserved + single grouped HC walking line
    expect(acts.find((a) => a.id === 'manual-1')).toBeDefined();
    const hcWalk = acts.find((a) => a.source === 'health_connect')!;
    expect(hcWalk.distanceKm).toBe(3.31);
  });

  it('preserves editedLocally entries when Health Connect returns updated values', () => {
    const windowDates = ['2026-11-28'];
    const day: DayLog = {
      ...createEmptyDayLog('2026-11-28'),
      activities: [
        {
          id: 'hc-type:2026-11-28:other:bike-general',
          type: 'other',
          activityId: 'bike-general',
          method: 'duration',
          durationMin: 45,
          caloriesBurned: 420,
          customName: 'My Edited Ride',
          timestamp: '2026-11-28T09:00:00Z',
          source: 'health_connect',
          externalId: 'hc-type:2026-11-28:other:bike-general',
          editedLocally: true,
        },
      ],
    };

    const res = mergeHealthConnectData({
      dayLogs: { '2026-11-28': day },
      data: {
        workouts: [
          {
            externalId: 'w-123',
            date: '2026-11-28',
            timestamp: '2026-11-28T09:00:00Z',
            exerciseType: 8,
            durationMin: 60,
            caloriesBurned: 550,
            startEpochMs: 10,
            endEpochMs: 20,
          },
        ],
        daily: [],
      },
      userProfile: profile,
      windowDates,
    });

    expect(res.changedDates).toEqual([]);
    expect(res.addedCount).toBe(0);
    expect(res.updatedCount).toBe(0);
  });

  it('skips externalIds in healthConnectDismissedIds', () => {
    const windowDates = ['2026-11-28'];
    const res = mergeHealthConnectData({
      dayLogs: {},
      data: {
        workouts: [
          {
            externalId: 'deleted-workout',
            date: '2026-11-28',
            timestamp: '2026-11-28T10:00:00Z',
            exerciseType: 56,
            durationMin: 25,
            caloriesBurned: 250,
            startEpochMs: 1,
            endEpochMs: 2,
          },
        ],
        daily: [],
      },
      userProfile: profile,
      dismissedIds: ['hc-type:2026-11-28:running'],
      windowDates,
    });

    expect(res.changedDates).toEqual([]);
    expect(res.addedCount).toBe(0);
  });

  it('falls back to Kakcal calorie calculation when Health Connect returns 0 kcal', () => {
    const windowDates = ['2026-11-28'];
    const res = mergeHealthConnectData({
      dayLogs: {},
      data: {
        workouts: [
          {
            externalId: 'zero-kcal-run',
            date: '2026-11-28',
            timestamp: '2026-11-28T07:00:00Z',
            exerciseType: 56,
            durationMin: 30,
            distanceKm: 5,
            caloriesBurned: 0,
            startEpochMs: 1,
            endEpochMs: 2,
          },
        ],
        daily: [
          {
            externalId: 'hc-daily:2026-11-28',
            date: '2026-11-28',
            steps: 4000,
            distanceKm: 3,
            caloriesBurned: 0,
          },
        ],
      },
      userProfile: profile,
      windowDates,
    });

    const acts = res.updatedDays['2026-11-28'].activities;
    expect(acts).toHaveLength(2);
    expect(acts[0].caloriesBurned).toBeGreaterThan(0);
    expect(acts[1].caloriesBurned).toBeGreaterThan(0);
  });
});
