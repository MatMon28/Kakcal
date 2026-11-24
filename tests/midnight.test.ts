import { describe, expect, it } from 'vitest';
import { msUntilNextMidnight } from '../src/utils/useToday';
import { widgetDates } from '../src/utils/widgetDates';
import type { DayLog } from '../src/types';

const day = (date: string) => ({ date }) as DayLog;

describe('midnight scheduling (item 12)', () => {
  it('aims at one second past the next local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 0, 5, 23, 59, 0))).toBe(61_000);
    expect(msUntilNextMidnight(new Date(2026, 0, 5, 0, 0, 0))).toBe(24 * 3600_000 + 1000);
  });
  it('never returns less than one second', () => {
    expect(msUntilNextMidnight(new Date(2026, 0, 5, 23, 59, 59, 999))).toBeGreaterThanOrEqual(1000);
  });
});

describe('widget dates (item 11)', () => {
  it('publishes today, yesterday and future days, never older history', () => {
    const logs = { '2026-01-01': day('2026-01-01'), '2026-01-04': day('2026-01-04'), '2026-01-06': day('2026-01-06') };
    expect(widgetDates('2026-01-05', logs).sort()).toEqual(['2026-01-04', '2026-01-05', '2026-01-06']);
  });
  it('always includes today even without entries', () => {
    expect(widgetDates('2026-01-05', {})).toEqual(['2026-01-05']);
  });
});
