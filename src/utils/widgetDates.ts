import type { DayLog } from '../types';
import { addDaysToDateString } from './formatters';

/**
 * The dates the home-screen widgets need (item 11): today (always, even without entries), yesterday (time-zone
 * changes) and any recorded future date (offline roll-over). Older history is never touched or serialised.
 */
export function widgetDates(today: string, logs: Record<string, DayLog>): string[] {
  const earliest = addDaysToDateString(today, -1);
  const dates = new Set<string>([today]);
  for (const date in logs) if (date >= earliest) dates.add(date);
  return [...dates];
}
