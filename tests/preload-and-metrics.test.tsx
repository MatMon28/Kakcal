import { Suspense } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { preloadableLazy } from '../src/utils/preloadableLazy';
import { getDayBaseMetrics } from '../src/utils/dayMetricsCache';
import type { DayLog } from '../src/types';

afterEach(() => {
  cleanup();
});

describe('preloadableLazy & dayMetricsCache', () => {
  it('renders synchronously without Suspense fallback once preloaded', async () => {
    const Sample = ({ text }: { text: string }) => <div>{text}</div>;
    const LazySample = preloadableLazy(async () => ({ default: Sample }));

    expect(LazySample.isLoaded()).toBe(false);
    await LazySample.preload();
    expect(LazySample.isLoaded()).toBe(true);

    const Loaded = LazySample.Component;
    render(
      <Suspense fallback={<div>loading...</div>}>
        <Loaded text="ready-sync" />
      </Suspense>,
    );
    expect(screen.queryByText('loading...')).toBeNull();
    expect(screen.getByText('ready-sync')).toBeTruthy();
  });

  it('caches DayBaseMetrics per DayLog identity and computes accurate totals', () => {
    const log: DayLog = {
      date: '2026-11-26',
      meals: {
        breakfast: [
          { id: '1', foodId: 'f1', name: 'Bread', store: 'Generic', amount: 100, unit: 'g', calories: 250, carbs: 50, protein: 8, fat: 2, fiber: 4, salt: 1, sugar: 3, loggedAt: '' },
        ],
        mid_morning: [],
        lunch: [],
        midday_snack: [],
        dinner: [],
        extra: [],
      },
      activities: [{ id: 'a1', type: 'walking', method: 'duration', durationMin: 30, caloriesBurned: 120, timestamp: '' }],
    };

    const first = getDayBaseMetrics(log);
    const second = getDayBaseMetrics(log);
    expect(first).toBe(second);
    expect(first.intake).toBe(250);
    expect(first.actExp).toBe(120);
    expect(first.hasFood).toBe(true);
    expect(first.hasLog).toBe(true);
    expect(first.macros.carbsGrams).toBe(50);
  });
});
