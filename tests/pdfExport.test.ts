import { describe, expect, it } from 'vitest';
import { buildPdfReport, countPdfDaysWithLogs } from '../src/utils/pdfExport';
import type { DayLog, MealSlotId, UserProfile } from '../src/types';

const profile: UserProfile = {
  weightKg: 76,
  heightCm: 178,
  age: 32,
  sex: 'male',
  targetIntakeKcal: 2000,
};

const dayLogs: Record<string, DayLog> = {
  '2026-11-19': {
    date: '2026-11-19',
    weightKg: 76.4,
    meals: {
      breakfast: [
        {
          id: 'f1',
          foodId: 'oats',
          name: 'Rolled Oats',
          store: 'Generic',
          amount: 100,
          unit: 'g',
          calories: 380,
          carbs: 66,
          protein: 13,
          fat: 7,
          fiber: 10,
          salt: 0,
          loggedAt: '2026-11-19T08:00:00Z',
        },
      ],
      mid_morning: [],
      lunch: [],
      midday_snack: [],
      dinner: [],
      extra: [],
    },
    activities: [
      {
        id: 'a1',
        type: 'running',
        method: 'duration',
        durationMin: 35,
        caloriesBurned: 360,
        timestamp: '2026-11-19T18:00:00Z',
      },
    ],
    waterEntries: [{ id: 'w1', ml: 2200, timestamp: '2026-11-19T12:00:00Z' }],
  },
  '2026-11-25': {
    date: '2026-11-25',
    weightKg: 75.8,
    meals: {
      breakfast: [],
      mid_morning: [],
      lunch: [],
      midday_snack: [],
      dinner: [],
      extra: [],
    },
    activities: [],
    waterEntries: [{ id: 'w2', ml: 1800, timestamp: '2026-11-25T15:00:00Z' }],
  },
};

const slotLabel = (slot: MealSlotId) => slot;
const text = (en: string) => en;

async function readPdfText(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return Buffer.from(buf).toString('latin1');
}

describe('buildPdfReport', () => {
  it('generates a valid PDF blob for a 7-day range with only the summary page when toggles are off', async () => {
    const blob = buildPdfReport({
      dayLogs,
      profile,
      slotLabel,
      text,
      dateRange: { from: '2026-11-19', to: '2026-11-25' },
      options: { includeDailyLog: false, includeMealDiary: false },
      language: 'en',
      generatedDate: '2026-11-26',
    });

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);
    const raw = await readPdfText(blob);
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toContain('Page 1 of 1');
    expect(raw).toContain('WEIGHT EVOLUTION');
  });

  it('adds Daily Overview and Detailed Meal Diary pages when both toggles are enabled', async () => {
    const blob = buildPdfReport({
      dayLogs,
      profile,
      slotLabel,
      text,
      dateRange: { from: '2026-11-19', to: '2026-11-25' },
      options: { includeDailyLog: true, includeMealDiary: true },
      language: 'en',
      memories: {
        '2026-11-19:breakfast': { note: 'Felt energized', favorite: false },
      },
      generatedDate: '2026-11-26',
    });

    const raw = await readPdfText(blob);
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toContain('Page 1 of 3');
    expect(raw).toContain('Page 2 of 3');
    expect(raw).toContain('Page 3 of 3');
    expect(raw).toContain('Rolled Oats');
  });

  it('supports a 30-day range and Italian labels', async () => {
    const blob = buildPdfReport({
      dayLogs,
      profile,
      slotLabel,
      text: (_en, itText) => itText,
      dateRange: { from: '2026-10-27', to: '2026-11-25' },
      options: { includeDailyLog: true, includeMealDiary: false },
      language: 'it',
      generatedDate: '2026-11-26',
    });

    const raw = await readPdfText(blob);
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toContain('Pagina 1 di 2');
    expect(raw).toContain('ANDAMENTO DEL PESO');
  });

  it('counts days with logs inside the selected date range', () => {
    expect(countPdfDaysWithLogs(dayLogs, { from: '2026-11-19', to: '2026-11-25' })).toBe(2);
    expect(countPdfDaysWithLogs(dayLogs, { from: '2026-11-20', to: '2026-11-24' })).toBe(0);
  });
});
