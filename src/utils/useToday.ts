import { useEffect, useState } from 'react';
import { getTodayDateString } from './formatters';

/** Milliseconds from `now` to the next local midnight (plus a 1 s margin so the new date is certain). */
export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

/**
 * Today's date string (item 12): one timer aimed at the next midnight instead of a 60 s interval, plus a recheck
 * whenever the app returns to the foreground (timers are throttled or frozen while it is hidden).
 */
export function useToday(): string {
  const [today, setToday] = useState(getTodayDateString);
  useEffect(() => {
    let timer = 0;
    const update = () => setToday(getTodayDateString());
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { update(); schedule(); }, msUntilNextMidnight());
    };
    const recheck = () => { update(); schedule(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') recheck(); };
    schedule();
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return today;
}
