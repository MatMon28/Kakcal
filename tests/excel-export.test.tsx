import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildExcelExport, countExcelRecords } from '../src/utils/excelExport';
import { ExcelExportModal } from '../src/components/modals/ExcelExportModal';
import type { DayLog, FoodItem, PreBuiltMeal, UserProfile } from '../src/types';

vi.mock('../src/i18n/journal', () => ({
  useJournalText: () => (en: string) => en,
}));
vi.mock('../src/context/AppContext', () => ({
  useSettings: () => ({ t: { common: { back: 'Back', close: 'Close' } } }),
}));

afterEach(() => {
  cleanup();
});

async function readZipEntries(blob: Blob): Promise<Record<string, string>> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const decoder = new TextDecoder();
  const out: Record<string, string> = {};
  let offset = 0;
  while (offset + 4 <= bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const size = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    out[name] = decoder.decode(bytes.slice(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return out;
}

const profile: UserProfile = {
  weightKg: 70,
  heightCm: 175,
  age: 30,
  sex: 'male',
  targetIntakeKcal: 2100,
};

const sampleFoods: FoodItem[] = [
  {
    id: 'oats',
    name_de: 'Hafer',
    name_en: 'Oats',
    name_it: 'Avena',
    store: 'Generic',
    category: 'grains_pasta',
    unit: 'g',
    calories: 380,
    carbs: 60,
    protein: 13,
    fat: 7,
    fiber: 10,
    salt: 0.02,
    sugar: 1,
  },
  {
    id: 'rec-1',
    name_de: 'Porridge',
    name_en: 'Porridge',
    name_it: 'Porridge',
    store: 'Custom',
    category: 'prepared',
    unit: 'g',
    calories: 180,
    carbs: 28,
    protein: 8,
    fat: 4,
    fiber: 4,
    salt: 0.1,
    sugar: 2,
    isCustom: true,
    isRecipe: true,
    portion: 250,
    recipeIngredients: [{ foodId: 'oats', amount: 50 }],
  },
];

const sampleMeals: PreBuiltMeal[] = [
  {
    id: 'm1',
    name: 'Morning bowl',
    slot: 'breakfast',
    ingredients: [{ foodId: 'oats', amount: 60 }],
    createdAt: '2026-11-20T08:00:00Z',
  },
];

const dayLogs: Record<string, DayLog> = {
  '2026-11-20': {
    date: '2026-11-20',
    meals: {
      breakfast: [{ id: '1', foodId: 'oats', name: 'Oats', store: 'Generic', amount: 100, unit: 'g', calories: 380, carbs: 60, protein: 13, fat: 7, fiber: 10, salt: 0.02, sugar: 1, loggedAt: '' }],
      mid_morning: [],
      lunch: [],
      midday_snack: [],
      dinner: [],
      extra: [],
    },
    activities: [{ id: 'a1', type: 'running', method: 'duration', durationMin: 30, caloriesBurned: 320, timestamp: '2026-11-20T18:10:00Z' }],
    waterEntries: [{ id: 'w1', ml: 500, timestamp: '2026-11-20T09:00:00Z' }],
    poops: [{ id: 'p1', size: 'normal', bristol: 4, timestamp: '2026-11-20T07:30:00Z', description: 'fine' }],
    weightKg: 70.2,
    custom: { t1: true },
    customEntries: { t2: [{ id: 'e1', amount: 2, timestamp: '2026-11-20T12:00:00Z' }] },
  },
  '2026-11-25': {
    date: '2026-11-25',
    meals: {
      breakfast: [],
      mid_morning: [],
      lunch: [{ id: '2', foodId: 'oats', name: 'Oats', store: 'Generic', amount: 50, unit: 'g', calories: 380, carbs: 60, protein: 13, fat: 7, fiber: 10, salt: 0.02, sugar: 1, loggedAt: '' }],
      midday_snack: [],
      dinner: [],
      extra: [],
    },
    activities: [],
    waterEntries: [{ id: 'w2', ml: 750, timestamp: '2026-11-25T10:00:00Z' }],
    weightKg: 69.8,
  },
};

describe('Excel export', () => {
  it('builds valid OOXML with styles, autoFilter, live formulas, Summary and all requested sheets', async () => {
    const blob = buildExcelExport({
      dayLogs,
      profile,
      plans: [],
      slotLabel: (s) => s,
      text: (en) => en,
      sheets: {
        summary: true,
        days: true,
        foods: true,
        activities: true,
        water: true,
        poop: true,
        customTrackers: true,
        mealNotes: true,
        plans: true,
        savedLibrary: true,
        body: true,
        period: true,
      },
      customButtons: [
        { id: 't1', name: 'Creatine', type: 'toggle' },
        { id: 't2', name: 'Coffee', type: 'quantity', unit: 'cups' },
      ],
      memories: { '2026-11-20:breakfast': { favorite: true, note: 'Great oats' } },
      preBuiltMeals: sampleMeals,
      allFoods: sampleFoods,
      bodyEntries: { waist: [{ date: '2026-11-20', value: 80 }], 'biceps:left': [{ date: '2026-11-25', value: 34 }] },
      periodData: {
        settings: {
          cycleLength: 28,
          periodDuration: 5,
          trackPill: false,
          packLength: 28,
          inactiveDays: 7,
          packStart: null,
          pillTrackingSince: null,
          showNutrition: false,
          showPhaseBandsInStats: false,
          moodTags: [{ id: 'mood.happy', label: 'Happy' }],
          symptomTags: [{ id: 'sym.cramps', label: 'Cramps' }],
        },
        logs: {
          '2026-11-20': { isPeriod: true, flow: 'medium', moods: ['mood.happy'], symptoms: ['sym.cramps'], updatedAt: '' },
        },
      },
    });

    const entries = await readZipEntries(blob);
    const workbook = entries['xl/workbook.xml'];
    expect(workbook).toContain('Summary');
    expect(workbook).toContain('Days');
    expect(workbook).toContain('Poop');
    expect(workbook).toContain('Custom trackers');
    expect(workbook).toContain('Meal notes');
    expect(workbook).toContain('Meals &amp; Recipes');
    expect(workbook).toContain('Body measurements');
    expect(workbook).toContain('Period');

    // Styles: OOXML requires none and gray125 first, plus custom number formats.
    const styles = entries['xl/styles.xml'];
    expect(styles).toContain('<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>');
    expect(styles).toContain('formatCode="#,##0"');
    expect(styles).toContain('formatCode="0.0%"');

    // Summary (sheet1) has live formulas referencing 'Days' and no autoFilter.
    const summaryXml = entries['xl/worksheets/sheet1.xml'];
    expect(summaryXml).not.toContain('<autoFilter');
    expect(summaryXml).toContain("AVERAGE('Days'!B2:B3)");
    expect(summaryXml).toContain("SUM('Days'!B2:B3)");

    // Days (sheet2) has autoFilter excluding footer Total/Average rows, plus formulas.
    const daysXml = entries['xl/worksheets/sheet2.xml'];
    expect(daysXml).toContain('<autoFilter ref="A1:P3"/>');
    expect(daysXml).toContain('<f>D2+E2+F2</f>');
    expect(daysXml).toContain('<f>B2-C2</f>');
    expect(daysXml).toContain('<f>SUM(B2:B3)</f>');
    expect(daysXml).toContain('<f>AVERAGE(B2:B3)</f>');

    // Extra sheets carry expected values
    expect(entries['xl/worksheets/sheet6.xml']).toContain('fine'); // Poop
    expect(entries['xl/worksheets/sheet7.xml']).toContain('Creatine'); // Custom trackers
    expect(entries['xl/worksheets/sheet8.xml']).toContain('Great oats'); // Meal notes
    expect(entries['xl/worksheets/sheet10.xml']).toContain('Morning bowl'); // Meals & Recipes
    expect(entries['xl/worksheets/sheet11.xml']).toContain('Left'); // Body
    expect(entries['xl/worksheets/sheet12.xml']).toContain('happy'); // Period

    // Days footer caches exact Activity (E) and TEF (F) sums & averages (not sumBurned - BMR).
    expect(daysXml).toContain('<f>SUM(E2:E3)</f><v>320</v>');
    expect(daysXml).toContain('<f>SUM(F2:F3)</f><v>47</v>');
    expect(daysXml).toContain('<f>AVERAGE(E2:E3)</f><v>160</v>');
    expect(daysXml).toContain('<f>AVERAGE(F2:F3)</f><v>24</v>');

    // Activities sheet uses local time HH:MM rather than raw UTC slice.
    const expectedActTime = `${String(new Date('2026-11-20T18:10:00Z').getHours()).padStart(2, '0')}:${String(new Date('2026-11-20T18:10:00Z').getMinutes()).padStart(2, '0')}`;
    expect(entries['xl/worksheets/sheet4.xml']).toContain(expectedActTime);
  });

  it('filters records by dateRange and respects sheet selection', async () => {
    const range = { from: '2026-11-24', to: '2026-11-26' };
    const counts = countExcelRecords({ dayLogs, plans: [] }, range);
    expect(counts.days).toBe(1);
    expect(counts.foods).toBe(1);
    expect(counts.activities).toBe(0);
    expect(counts.poop).toBe(0);

    const blob = buildExcelExport({
      dayLogs,
      profile,
      plans: [],
      slotLabel: (s) => s,
      text: (en) => en,
      dateRange: range,
      sheets: { days: true, foods: true },
    });
    const entries = await readZipEntries(blob);
    expect(entries['xl/workbook.xml']).toContain('Days');
    expect(entries['xl/workbook.xml']).toContain('Foods');
    expect(entries['xl/workbook.xml']).not.toContain('Summary');
    expect(entries['xl/worksheets/sheet1.xml']).toContain('<autoFilter ref="A1:P2"/>');
  });

  it('lets the user pick period and sheets in ExcelExportModal before exporting', () => {
    const onExport = vi.fn();
    render(
      <ExcelExportModal
        isOpen
        onClose={vi.fn()}
        exportInput={{ dayLogs, profile, plans: [] }}
        onExport={onExport}
      />,
    );

    expect(screen.getByText('2 day(s) with logs')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-24' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-26' } });
    expect(screen.getByText('1 day(s) with logs')).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox', { name: /Poop/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Body measurements/i }));
    fireEvent.click(screen.getByRole('button', { name: /Export \.xlsx/i }));

    expect(onExport).toHaveBeenCalledTimes(1);
    const arg = onExport.mock.calls[0][0];
    expect(arg.dateRange).toEqual({ from: '2026-11-24', to: '2026-11-26' });
    expect(arg.sheets.poop).toBe(false);
    expect(arg.sheets.body).toBe(true);
    expect(arg.filenameSuffix).toBe('2026-11-24_2026-11-26');
  });
});
